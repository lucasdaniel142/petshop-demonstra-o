// src/components/admin/BulkImportModal.tsx
// ============================================================
// Modal de importação em massa de produtos via CSV + imagens.
//
// Fluxo:
//   1. Usuário arrasta/seleciona um arquivo CSV
//   2. Sistema parseia e mostra pré-visualização em tabela
//   3. Usuário arrasta/seleciona imagens (opcional)
//   4. Sistema faz matching automático por nome de arquivo
//   5. Upload das imagens para ImgBB + criação em batch no Firestore
// ============================================================

import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, FileSpreadsheet, ImagePlus, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { parseCSV, toFirestorePayload, normalizeName, MAX_CSV_SIZE_BYTES, type ParseResult } from '../../utils/csvParser';

const IMGBB_UPLOAD_URL = `https://api.imgbb.com/1/upload?key=${import.meta.env.VITE_IMGBB_API_KEY}`;

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

type Step = 'upload-csv' | 'preview' | 'upload-images' | 'importing' | 'done';

interface ImageMatch {
  file: File;
  matchedTo: string | null; // nome do produto que fez match
  previewUrl: string;
  uploadedUrl: string | null;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState<Step>('upload-csv');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [imageMatches, setImageMatches] = useState<ImageMatch[]>([]);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, phase: '' });
  const [importError, setImportError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);

  const csvInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // ── Reset state ──
  const handleReset = useCallback(() => {
    setStep('upload-csv');
    setParseResult(null);
    setImageMatches([]);
    setImportProgress({ current: 0, total: 0, phase: '' });
    setImportError(null);
    setImportedCount(0);
  }, []);

  const handleClose = useCallback(() => {
    handleReset();
    onClose();
  }, [handleReset, onClose]);

  // ── Step 1: CSV Upload ──
  const handleCSVFile = useCallback((file: File) => {
    // SECURITY: Limitar tamanho do arquivo para evitar DoS
    if (file.size > MAX_CSV_SIZE_BYTES) {
      setImportError(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo: 5MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const result = parseCSV(content);
      setParseResult(result);
      setImportError(null);
      setStep('preview');
    };
    reader.readAsText(file, 'UTF-8');
  }, []);

  const handleCSVDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
      handleCSVFile(file);
    }
  }, [handleCSVFile]);

  const handleCSVInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleCSVFile(file);
    e.target.value = '';
  }, [handleCSVFile]);

  // ── Step 3: Image Upload + Matching ──
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

  const handleImageFiles = useCallback((files: FileList) => {
    if (!parseResult) return;

    const validProducts = parseResult.rows
      .filter((r) => r.product !== null)
      .map((r) => r.product!);

    // SECURITY: Filtrar apenas imagens válidas pelo MIME type
    const validFiles = Array.from(files).filter((f) => ALLOWED_IMAGE_TYPES.includes(f.type));

    const matches: ImageMatch[] = validFiles.map((file) => {
      const normalizedFileName = normalizeName(file.name);

      // Tentar match pelo nome do arquivo com nome do produto
      const matched = validProducts.find((p) => {
        const normalizedProduct = normalizeName(p.nome);
        return normalizedFileName.includes(normalizedProduct) || normalizedProduct.includes(normalizedFileName);
      });

      // Também tentar match pelo campo imagemNomeArquivo do CSV
      const matchedByCSV = !matched
        ? validProducts.find((p) => {
            if (!p.imagemNomeArquivo) return false;
            const normalizedCSVName = normalizeName(p.imagemNomeArquivo);
            return normalizedFileName === normalizedCSVName ||
                   normalizedFileName.includes(normalizedCSVName) ||
                   normalizedCSVName.includes(normalizedFileName);
          })
        : null;

      const finalMatch = matched || matchedByCSV;

      return {
        file,
        matchedTo: finalMatch?.nome ?? null,
        previewUrl: URL.createObjectURL(file),
        uploadedUrl: null,
      };
    });

    setImageMatches(matches);
    setStep('upload-images');
  }, [parseResult]);

  const handleImageDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      handleImageFiles(e.dataTransfer.files);
    }
  }, [handleImageFiles]);

  const handleImageInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleImageFiles(e.target.files);
    }
    e.target.value = '';
  }, [handleImageFiles]);

  // ── Upload de imagem para ImgBB ──
  const uploadImageToImgBB = async (file: File): Promise<string> => {
    const body = new FormData();
    body.append('image', file);
    const res = await fetch(IMGBB_UPLOAD_URL, { method: 'POST', body });
    const data = await res.json();
    if (!res.ok || !data?.data?.url) throw new Error('Falha no upload da imagem');
    return data.data.url as string;
  };

  // ── Step Final: Importar tudo ──
  const handleImport = useCallback(async () => {
    if (!parseResult) return;

    const validRows = parseResult.rows.filter((r) => r.product !== null);
    const total = validRows.length;

    setStep('importing');
    setImportProgress({ current: 0, total, phase: 'Enviando imagens...' });
    setImportError(null);

    try {
      // 1. Upload imagens para ImgBB
      const imageUrlMap = new Map<string, string>(); // nome do produto → URL

      if (imageMatches.length > 0 && import.meta.env.VITE_IMGBB_API_KEY) {
        const matchedImages = imageMatches.filter((m) => m.matchedTo !== null);

        for (let i = 0; i < matchedImages.length; i++) {
          const match = matchedImages[i];
          setImportProgress({ current: i + 1, total: matchedImages.length, phase: `Enviando imagem ${i + 1}/${matchedImages.length}...` });

          try {
            const url = await uploadImageToImgBB(match.file);
            imageUrlMap.set(match.matchedTo!, url);
          } catch {
            // Continua mesmo se uma imagem falhar
            console.warn(`Falha ao enviar imagem para "${match.matchedTo}"`);
          }
        }
      }

      // 2. Criar produtos no Firestore em batch
      setImportProgress({ current: 0, total, phase: 'Salvando produtos...' });

      // Firestore batch write suporta no máximo 500 operações
      const BATCH_SIZE = 450;
      let created = 0;

      for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
        const chunk = validRows.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);

        for (const row of chunk) {
          const product = row.product!;
          const imageUrl = imageUrlMap.get(product.nome) || product.imagemUrl || '';
          const payload = toFirestorePayload(product, imageUrl);
          const docRef = doc(collection(db, 'produtos'));
          batch.set(docRef, payload);
          created++;
        }

        await batch.commit();
        setImportProgress({ current: Math.min(created, total), total, phase: 'Salvando produtos...' });
      }

      setImportedCount(created);
      setStep('done');
      onSuccess(created);
    } catch (err) {
      console.error('Erro na importação:', err);
      setImportError('Erro durante a importação. Alguns produtos podem ter sido criados. Verifique o catálogo.');
      setStep('done');
    }
  }, [parseResult, imageMatches, onSuccess]);

  // ── Pular etapa de imagens ──
  const handleSkipImages = useCallback(() => {
    handleImport();
  }, [handleImport]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] rounded-[16px] bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div>
            <h2 className="text-[18px] font-[800] text-text">Importar Produtos em Massa</h2>
            <p className="text-[13px] text-muted mt-0.5">
              {step === 'upload-csv' && 'Envie um arquivo CSV com os dados dos produtos.'}
              {step === 'preview' && `${parseResult?.validCount ?? 0} produtos válidos encontrados.`}
              {step === 'upload-images' && 'Associe imagens aos produtos (opcional).'}
              {step === 'importing' && importProgress.phase}
              {step === 'done' && (importError ? 'Importação concluída com erros.' : 'Importação concluída!')}
            </p>
          </div>
          <button onClick={handleClose} className="text-muted hover:text-text p-1 rounded transition-colors" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ── STEP 1: Upload CSV ── */}
          {step === 'upload-csv' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleCSVDrop}
                onClick={() => csvInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-[12px] p-12 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
              >
                <FileSpreadsheet size={48} className="mx-auto mb-4 text-muted opacity-40" />
                <p className="font-[600] text-text text-[15px]">Arraste o arquivo CSV aqui</p>
                <p className="text-muted text-[13px] mt-1">ou clique para selecionar</p>
                <input ref={csvInputRef} type="file" accept=".csv,text/csv" onChange={handleCSVInput} className="hidden" />
              </div>

              <div className="bg-gray-50 rounded-[10px] p-4 text-[13px] text-muted space-y-2">
                <p className="font-[600] text-text">Formato esperado do CSV:</p>
                <code className="block bg-white rounded px-3 py-2 text-[12px] font-mono border border-border">
                  nome,categoria,unidade,preco,imagem<br />
                  Arroz Branco 5kg,Mercearia,un,22.90,<br />
                  Banana Prata,Hortifruti,kg,5.99,banana.jpg
                </code>
                <p>
                  📄 <a href="/modelo-importacao.csv" download className="text-primary font-[600] hover:underline">Baixar modelo CSV de exemplo</a>
                </p>
              </div>
            </div>
          )}

          {/* ── STEP 2: Preview ── */}
          {step === 'preview' && parseResult && (
            <div className="space-y-4">
              {/* Resumo */}
              <div className="flex gap-3">
                <div className="flex-1 bg-green-50 rounded-[10px] p-3 text-center border border-green-200">
                  <div className="text-[22px] font-[800] text-green-700">{parseResult.validCount}</div>
                  <div className="text-[12px] text-green-600 font-[500]">Válidos</div>
                </div>
                {parseResult.errorCount > 0 && (
                  <div className="flex-1 bg-red-50 rounded-[10px] p-3 text-center border border-red-200">
                    <div className="text-[22px] font-[800] text-red-700">{parseResult.errorCount}</div>
                    <div className="text-[12px] text-red-600 font-[500]">Com erro</div>
                  </div>
                )}
                <div className="flex-1 bg-blue-50 rounded-[10px] p-3 text-center border border-blue-200">
                  <div className="text-[22px] font-[800] text-blue-700">{parseResult.categories.length}</div>
                  <div className="text-[12px] text-blue-600 font-[500]">Categorias</div>
                </div>
              </div>

              {/* Tabela de preview */}
              <div className="border border-border rounded-[10px] overflow-hidden max-h-[320px] overflow-y-auto">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="border-b border-border text-[11px] text-muted uppercase tracking-wider">
                      <th className="px-3 py-2 font-[600]">Linha</th>
                      <th className="px-3 py-2 font-[600]">Produto</th>
                      <th className="px-3 py-2 font-[600]">Categoria</th>
                      <th className="px-3 py-2 font-[600]">Preço</th>
                      <th className="px-3 py-2 font-[600]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {parseResult.rows.map((row, i) => (
                      <tr key={i} className={row.error ? 'bg-red-50/50' : 'hover:bg-gray-50'}>
                        <td className="px-3 py-2 text-muted">{row.line}</td>
                        <td className="px-3 py-2 font-[500] text-text">{row.product?.nome ?? '—'}</td>
                        <td className="px-3 py-2 text-muted">{row.product?.categoria ?? '—'}</td>
                        <td className="px-3 py-2 text-muted">
                          {row.product ? `R$ ${row.product.preco.toFixed(2).replace('.', ',')}` : '—'}
                        </td>
                        <td className="px-3 py-2">
                          {row.error ? (
                            <span className="text-red-600 text-[12px] flex items-center gap-1">
                              <AlertCircle size={12} /> {row.error}
                            </span>
                          ) : (
                            <span className="text-green-600 text-[12px]">✓</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── STEP 3: Upload Images ── */}
          {step === 'upload-images' && (
            <div className="space-y-4">
              {imageMatches.length === 0 ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleImageDrop}
                  onClick={() => imageInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-[12px] p-12 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <ImagePlus size={48} className="mx-auto mb-4 text-muted opacity-40" />
                  <p className="font-[600] text-text text-[15px]">Arraste as imagens dos produtos aqui</p>
                  <p className="text-muted text-[13px] mt-1">O sistema vai associar pelo nome do arquivo</p>
                  <p className="text-muted text-[12px] mt-3 italic">
                    Ex: "arroz-branco-5kg.jpg" → associa ao produto "Arroz Branco 5kg"
                  </p>
                  <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={handleImageInput} className="hidden" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[14px] font-[600] text-text">
                      {imageMatches.filter((m) => m.matchedTo).length} de {imageMatches.length} imagens associadas
                    </p>
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      className="text-primary text-[13px] font-[600] hover:underline"
                    >
                      + Adicionar mais
                    </button>
                    <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={handleImageInput} className="hidden" />
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[280px] overflow-y-auto">
                    {imageMatches.map((match, i) => (
                      <div key={i} className={`rounded-[8px] border overflow-hidden ${match.matchedTo ? 'border-green-300' : 'border-orange-300'}`}>
                        <img src={match.previewUrl} alt={match.file.name} className="w-full h-20 object-cover" />
                        <div className="px-2 py-1.5">
                          <p className="text-[11px] font-[500] text-text truncate">{match.file.name}</p>
                          <p className={`text-[10px] truncate ${match.matchedTo ? 'text-green-600' : 'text-orange-500'}`}>
                            {match.matchedTo ? `→ ${match.matchedTo}` : 'Sem associação'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 4: Importing ── */}
          {step === 'importing' && (
            <div className="py-12 text-center space-y-6">
              <Loader2 size={48} className="mx-auto text-primary animate-spin" />
              <div>
                <p className="font-[600] text-text text-[16px]">{importProgress.phase}</p>
                <p className="text-muted text-[14px] mt-1">
                  {importProgress.current} de {importProgress.total}
                </p>
              </div>
              <div className="w-full max-w-xs mx-auto bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-primary h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* ── STEP 5: Done ── */}
          {step === 'done' && (
            <div className="py-12 text-center space-y-4">
              {importError ? (
                <>
                  <AlertCircle size={48} className="mx-auto text-orange-500" />
                  <p className="font-[600] text-text text-[16px]">Importação concluída com avisos</p>
                  <p className="text-muted text-[14px]">{importError}</p>
                </>
              ) : (
                <>
                  <CheckCircle2 size={48} className="mx-auto text-green-500" />
                  <p className="font-[600] text-text text-[16px]">
                    {importedCount} produto{importedCount !== 1 ? 's' : ''} importado{importedCount !== 1 ? 's' : ''} com sucesso!
                  </p>
                  <p className="text-muted text-[14px]">Os produtos já estão disponíveis no catálogo.</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer — Ações */}
        <div className="border-t border-border px-6 py-4 flex items-center gap-3 justify-end shrink-0 bg-gray-50/50">
          {step === 'upload-csv' && (
            <button onClick={handleClose} className="px-5 py-2.5 border border-border rounded-[8px] text-[14px] font-[600] text-text hover:bg-gray-100 transition-colors">
              Cancelar
            </button>
          )}

          {step === 'preview' && (
            <>
              <button onClick={handleReset} className="px-5 py-2.5 border border-border rounded-[8px] text-[14px] font-[600] text-text hover:bg-gray-100 transition-colors">
                Voltar
              </button>
              <button
                onClick={() => setStep('upload-images')}
                disabled={!parseResult || parseResult.validCount === 0}
                className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-[8px] text-[14px] font-extrabold transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
              >
                <ImagePlus size={16} /> Adicionar Imagens
              </button>
              <button
                onClick={handleSkipImages}
                disabled={!parseResult || parseResult.validCount === 0}
                className="px-5 py-2.5 bg-accent hover:bg-accent-dark text-on-accent rounded-[8px] text-[14px] font-extrabold transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
              >
                <Upload size={16} /> Importar Sem Imagens
              </button>
            </>
          )}

          {step === 'upload-images' && (
            <>
              <button onClick={() => setStep('preview')} className="px-5 py-2.5 border border-border rounded-[8px] text-[14px] font-[600] text-text hover:bg-gray-100 transition-colors">
                Voltar
              </button>
              <button
                onClick={handleImport}
                className="px-5 py-2.5 bg-accent hover:bg-accent-dark text-on-accent rounded-[8px] text-[14px] font-extrabold transition-colors flex items-center gap-2 shadow-sm"
              >
                <Upload size={16} /> Importar {parseResult?.validCount ?? 0} Produtos
              </button>
            </>
          )}

          {step === 'done' && (
            <button onClick={handleClose} className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-[8px] text-[14px] font-extrabold transition-colors shadow-sm">
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
