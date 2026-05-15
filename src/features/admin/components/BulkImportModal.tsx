import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, FileSpreadsheet, ImagePlus, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import { parseCSV, toFirestorePayload, normalizeName, MAX_CSV_SIZE_BYTES, type ParseResult } from '../../../shared/utils/csvParser';

const IMGBB_UPLOAD_URL = `https://api.imgbb.com/1/upload?key=${import.meta.env.VITE_IMGBB_API_KEY}`;

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

type Step = 'upload-csv' | 'preview' | 'upload-images' | 'importing' | 'done';

interface ImageMatch {
  file: File;
  matchedTo: string | null;
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

  const handleCSVFile = useCallback((file: File) => {
    if (file.size > MAX_CSV_SIZE_BYTES) {
      setImportError(`Arquivo muito grande. Máximo: 5MB.`);
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

  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

  const handleImageFiles = useCallback((files: FileList) => {
    if (!parseResult) return;
    const validProducts = parseResult.rows.filter((r) => r.product !== null).map((r) => r.product!);
    const validFiles = Array.from(files).filter((f) => ALLOWED_IMAGE_TYPES.includes(f.type));

    const matches: ImageMatch[] = validFiles.map((file) => {
      const normalizedFileName = normalizeName(file.name);
      const matched = validProducts.find((p) => {
        const normalizedProduct = normalizeName(p.nome);
        return normalizedFileName.includes(normalizedProduct) || normalizedProduct.includes(normalizedFileName);
      });

      const matchedByCSV = !matched ? validProducts.find((p) => {
        if (!p.imagemNomeArquivo) return false;
        const normalizedCSVName = normalizeName(p.imagemNomeArquivo);
        return normalizedFileName === normalizedCSVName || normalizedFileName.includes(normalizedCSVName) || normalizedCSVName.includes(normalizedFileName);
      }) : null;

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
    if (e.dataTransfer.files.length > 0) handleImageFiles(e.dataTransfer.files);
  }, [handleImageFiles]);

  const handleImageInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) handleImageFiles(e.target.files);
    e.target.value = '';
  }, [handleImageFiles]);

  const uploadImageToImgBB = async (file: File): Promise<string> => {
    const body = new FormData();
    body.append('image', file);
    const res = await fetch(IMGBB_UPLOAD_URL, { method: 'POST', body });
    const data = await res.json();
    if (!res.ok || !data?.data?.url) throw new Error('Falha no upload');
    return data.data.url as string;
  };

  const handleImport = useCallback(async () => {
    if (!parseResult) return;
    const validRows = parseResult.rows.filter((r) => r.product !== null);
    const total = validRows.length;
    setStep('importing');
    setImportProgress({ current: 0, total, phase: 'Enviando imagens...' });

    try {
      const imageUrlMap = new Map<string, string>();
      if (imageMatches.length > 0 && import.meta.env.VITE_IMGBB_API_KEY) {
        const matchedImages = imageMatches.filter((m) => m.matchedTo !== null);
        for (let i = 0; i < matchedImages.length; i++) {
          const match = matchedImages[i];
          setImportProgress({ current: i + 1, total: matchedImages.length, phase: `Enviando imagem ${i + 1}/${matchedImages.length}...` });
          try {
            const url = await uploadImageToImgBB(match.file);
            imageUrlMap.set(match.matchedTo!, url);
          } catch {
            console.warn(`Falha na imagem de "${match.matchedTo}"`);
          }
        }
      }

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
      setImportError('Erro na importação.');
      setStep('done');
    }
  }, [parseResult, imageMatches, onSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] rounded-[16px] bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div>
            <h2 className="text-[18px] font-[800] text-text">Importar Produtos</h2>
            <p className="text-[13px] text-muted">{step === 'importing' ? importProgress.phase : 'Gerencie seu catálogo via planilha.'}</p>
          </div>
          <button onClick={handleClose} className="text-muted hover:text-text p-1 rounded transition-colors"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload-csv' && (
            <div className="space-y-4">
              <div onDragOver={(e) => e.preventDefault()} onDrop={handleCSVDrop} onClick={() => csvInputRef.current?.click()} className="border-2 border-dashed border-gray-300 rounded-[12px] p-12 text-center cursor-pointer hover:border-primary transition-all">
                <FileSpreadsheet size={48} className="mx-auto mb-4 opacity-40" />
                <p className="font-[600] text-text text-[15px]">Arraste o arquivo CSV aqui</p>
                <input ref={csvInputRef} type="file" accept=".csv,text/csv" onChange={handleCSVInput} className="hidden" />
              </div>
            </div>
          )}

          {step === 'preview' && parseResult && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1 bg-green-50 rounded-[10px] p-3 text-center border border-green-200">
                  <div className="text-[22px] font-[800] text-green-700">{parseResult.validCount}</div>
                  <div className="text-[12px] text-green-600 font-[500]">Válidos</div>
                </div>
              </div>
              <div className="border border-border rounded-[10px] overflow-hidden max-h-[320px] overflow-y-auto">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-gray-50 sticky top-0"><tr className="border-b border-border text-[11px] text-muted uppercase">
                    <th className="px-3 py-2">Produto</th><th className="px-3 py-2">Status</th>
                  </tr></thead>
                  <tbody className="divide-y divide-border">
                    {parseResult.rows.map((row, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-[500] text-text">{row.product?.nome ?? '—'}</td>
                        <td className="px-3 py-2">{row.error ? <span className="text-red-600 text-[12px]">{row.error}</span> : <span className="text-green-600 text-[12px]">✓</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 'upload-images' && (
            <div className="space-y-4">
              <div onDragOver={(e) => e.preventDefault()} onDrop={handleImageDrop} onClick={() => imageInputRef.current?.click()} className="border-2 border-dashed border-gray-300 rounded-[12px] p-12 text-center cursor-pointer hover:border-primary transition-all">
                <ImagePlus size={48} className="mx-auto mb-4 opacity-40" />
                <p className="font-[600] text-text text-[15px]">Arraste as imagens aqui</p>
                <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={handleImageInput} className="hidden" />
              </div>
              {imageMatches.length > 0 && <div className="grid grid-cols-4 gap-3 max-h-[280px] overflow-y-auto">
                {imageMatches.map((m, i) => (
                  <div key={i} className={`rounded-[8px] border overflow-hidden ${m.matchedTo ? 'border-green-300' : 'border-orange-300'}`}>
                    <img src={m.previewUrl} className="w-full h-16 object-cover" />
                    <p className="text-[10px] p-1 truncate">{m.matchedTo || 'Sem match'}</p>
                  </div>
                ))}
              </div>}
            </div>
          )}

          {step === 'importing' && (
            <div className="py-12 text-center space-y-6">
              <Loader2 size={48} className="mx-auto text-primary animate-spin" />
              <p className="font-[600]">{importProgress.phase}</p>
              <div className="w-full max-w-xs mx-auto bg-gray-200 rounded-full h-2">
                <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }} />
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="py-12 text-center space-y-4">
              <CheckCircle2 size={48} className="mx-auto text-green-500" />
              <p className="font-[600] text-[18px]">Importação concluída!</p>
              <p className="text-muted text-[14px]">{importedCount} produtos adicionados.</p>
            </div>
          )}
        </div>

        <div className="border-t border-border px-6 py-4 flex gap-3 justify-end bg-gray-50/50">
          {step === 'upload-csv' && <button onClick={handleClose} className="px-5 py-2.5 border border-border rounded-[8px] text-[14px] font-[600]">Cancelar</button>}
          {step === 'preview' && <button onClick={() => setStep('upload-images')} disabled={!parseResult || parseResult.validCount === 0} className="px-5 py-2.5 bg-primary text-white rounded-[8px] text-[14px] font-extrabold">Adicionar Imagens</button>}
          {step === 'upload-images' && <button onClick={handleImport} className="px-5 py-2.5 bg-accent text-on-accent rounded-[8px] text-[14px] font-extrabold">Importar Agora</button>}
          {step === 'done' && <button onClick={handleClose} className="px-5 py-2.5 bg-primary text-white rounded-[8px] text-[14px] font-extrabold">Fechar</button>}
        </div>
      </div>
    </div>
  );
};
