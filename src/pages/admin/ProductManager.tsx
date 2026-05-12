import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Package, FileSpreadsheet } from 'lucide-react';
import { BulkImportModal } from '../../components/admin/BulkImportModal';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { FeedbackBanner } from '../../components/ui/FeedbackBanner';
import type { ManagedProduct, FeedbackState, StorePrice, StoreId } from '../../types';
import { DEFAULT_STORE_PRICE } from '../../types';
import { PRODUCT_CATEGORIES, STORE_IDS, ADMIN_STORES } from '../../utils/constants';

// FIX #1: Chave nunca deve ir hardcoded no bundle.
// Adicione ao .env.local a sua chave do ImgBB (VITE_IMGBB_API_KEY)
const IMGBB_UPLOAD_URL = `https://api.imgbb.com/1/upload?key=${import.meta.env.VITE_IMGBB_API_KEY}`;

const EMPTY_FORM: Omit<ManagedProduct, 'id'> = {
  nome: '',
  descricao: '',
  imageUrl: '',
  categoria: 'Mercearia',
  unit: 'un',
  precos: STORE_IDS.reduce((acc, id) => ({
    ...acc,
    [id]: { ...DEFAULT_STORE_PRICE }
  }), {} as Record<StoreId, StorePrice>),
};

const DeleteConfirmModal: React.FC<{
  nomeProduto: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ nomeProduto, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div className="w-full max-w-sm rounded-[16px] bg-white shadow-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
          <Trash2 size={20} className="text-red-600" />
        </div>
        <h3 className="font-[700] text-text text-[16px]">Remover Produto</h3>
      </div>
      <p className="text-[14px] text-muted mb-6">
        Tem certeza que deseja remover <strong className="text-text">"{nomeProduto}"</strong>? Esta ação não pode ser desfeita.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 border border-border rounded-[8px] text-[14px] font-[600] text-text hover:bg-[#F0F2F2] transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-[8px] text-[14px] font-extrabold transition-colors"
        >
          Sim, remover
        </button>
      </div>
    </div>
  </div>
);

export default function ProductManager() {
  const [produtos, setProdutos] = useState<ManagedProduct[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ManagedProduct | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<Omit<ManagedProduct, 'id'>>(EMPTY_FORM);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'produtos'),
      (snapshot) => {
        const prods: ManagedProduct[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<ManagedProduct, 'id'>),
        }));
        setProdutos(prods.sort((a, b) => a.nome.localeCompare(b.nome)));
      },
      (err) => {
        console.error('Erro ao carregar produtos:', err);
        setFeedback({ type: 'error', message: 'Erro ao carregar produtos do banco de dados.' });
      }
    );
    return () => unsubscribe();
  }, []);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handlePriceChange = (loja: keyof ManagedProduct['precos'], value: string) => {
    const numVal = parseFloat(value) || 0;
    setFormData((prev) => ({
      ...prev,
      precos: {
        ...prev.precos,
        [loja]: { ...prev.precos[loja], valor: numVal },
      },
    }));
  };

  const handleEdit = (produto: ManagedProduct) => {
    const { id, ...rest } = produto;
    setFormData(rest);
    setEditingId(id);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setFormData(EMPTY_FORM);
    setEditingId(null);
    setIsAdding(false);
    setIsUploadingImage(false);
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!import.meta.env.VITE_IMGBB_API_KEY) {
      showFeedback('error', 'Chave ImgBB não configurada. Adicione VITE_IMGBB_API_KEY ao .env.local');
      return;
    }

    setIsUploadingImage(true);
    try {
      const body = new FormData();
      body.append('image', file);

      const response = await fetch(IMGBB_UPLOAD_URL, { method: 'POST', body });
      const data = await response.json();

      if (!response.ok || !data?.data?.url) {
        showFeedback('error', 'Falha ao enviar a imagem. Tente novamente.');
        return;
      }

      setFormData((prev) => ({ ...prev, imageUrl: data.data.url }));
    } catch (err) {
      console.error('Upload ImgBB:', err);
      showFeedback('error', 'Falha ao enviar a imagem. Tente novamente.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      setFeedback({ type: 'error', message: 'O nome do produto é obrigatório.' });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        nome: formData.nome.trim(),
        descricao: formData.descricao ?? '',
        imageUrl: formData.imageUrl ?? '',
        categoria: formData.categoria,
        unit: formData.unit,
        precos: formData.precos,
        freteGratis: formData.freteGratis || false,
      };

      if (editingId) {
        await updateDoc(doc(db, 'produtos', editingId), payload);
        showFeedback('success', `"${formData.nome}" atualizado com sucesso.`);
      } else {
        await addDoc(collection(db, 'produtos'), payload);
        showFeedback('success', `"${formData.nome}" adicionado ao catálogo.`);
      }
      handleCancel();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      showFeedback('error', 'Erro ao salvar produto. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'produtos', deleteTarget.id));
      showFeedback('success', `"${deleteTarget.nome}" removido do catálogo.`);
    } catch (error) {
      console.error('Erro ao deletar:', error);
      showFeedback('error', 'Erro ao remover produto. Tente novamente.');
    } finally {
      setLoading(false);
      setDeleteTarget(null);
    }
  };

  const filteredProdutos = produtos.filter(
    (p) =>
      p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onSuccess={(count) => showFeedback('success', `${count} produto(s) importado(s) com sucesso!`)}
      />

      {deleteTarget && (
        <DeleteConfirmModal
          nomeProduto={deleteTarget.nome}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="bg-white p-8 lg:p-10 rounded-[12px] border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] lg:text-[24px] font-[800] text-primary">Gerenciar Produtos</h1>
          <p className="text-muted text-[13px] mt-1">Adicione, edite ou remova produtos do catálogo.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-[220px] bg-[#F0F2F2] border border-transparent rounded-[8px] pl-4 pr-4 py-2.5 text-[14px] outline-none focus:border-primary focus:bg-white transition-colors"
          />
          <button
            onClick={() => setIsBulkImportOpen(true)}
            className="bg-accent hover:bg-accent-dark text-on-accent px-5 py-3 rounded-[8px] flex items-center gap-2 text-[14px] font-extrabold transition-colors whitespace-nowrap shadow-sm"
          >
            <FileSpreadsheet size={18} /> Importar Planilha
          </button>
          <button
            onClick={() => { setIsAdding(true); setEditingId(null); setFormData(EMPTY_FORM); }}
            className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-[8px] flex items-center gap-2 text-[14px] font-extrabold transition-colors whitespace-nowrap shadow-sm"
          >
            <Plus size={18} /> Novo Produto
          </button>
        </div>
      </div>

      <FeedbackBanner feedback={feedback} onDismiss={() => setFeedback(null)} />

      {isAdding && (
        <div className="bg-white rounded-[12px] border-2 border-primary shadow-sm p-8 lg:p-10">
          <h2 className="text-[20px] lg:text-[22px] font-[700] text-text mb-6">
            {editingId ? 'Editar Produto' : 'Novo Produto'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-[13px] font-[600] text-text mb-2">Nome *</label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="w-full bg-[#F0F2F2] border border-transparent rounded-[8px] px-4 py-3 text-[14px] outline-none focus:border-primary focus:bg-white transition-colors"
                placeholder="Ex: Arroz Branco Tipo 1 5kg"
              />
            </div>

            <div>
              <label className="block text-[13px] font-[600] text-text mb-2">Categoria</label>
              <select
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                className="w-full bg-[#F0F2F2] border border-transparent rounded-[8px] px-4 py-3 text-[14px] outline-none focus:border-primary focus:bg-white transition-colors"
              >
                {PRODUCT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[13px] font-[600] text-text mb-2">Unidade de Venda</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value as 'un' | 'kg' })}
                className="w-full bg-[#F0F2F2] border border-transparent rounded-[8px] px-4 py-3 text-[14px] outline-none focus:border-primary focus:bg-white transition-colors"
              >
                <option value="un">Unidade (un)</option>
                <option value="kg">Quilograma (kg)</option>
              </select>
            </div>

            <div>
              <label className="block text-[13px] font-[600] text-text mb-2">Promoções Especiais</label>
              <label className="flex items-center gap-2 cursor-pointer mt-3">
                <input
                  type="checkbox"
                  checked={formData.freteGratis || false}
                  onChange={(e) => setFormData({ ...formData, freteGratis: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-[14px] text-text">Oferecer Frete Grátis neste produto</span>
              </label>
              <p className="text-[11px] text-muted mt-1">Ao adicionar este produto ao carrinho, a taxa de entrega de todo o pedido será R$ 0,00.</p>
            </div>

            <div>
              <label htmlFor="product-image-file" className="block text-[13px] font-[600] text-text mb-2">
                Imagem do produto
              </label>
              <input
                id="product-image-file"
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                disabled={isUploadingImage}
                className="w-full text-[14px] file:mr-4 file:rounded-[8px] file:border-0 file:bg-primary file:px-4 file:py-2.5 file:text-[13px] file:font-extrabold file:text-white hover:file:bg-primary-dark disabled:opacity-60"
              />
              {isUploadingImage && (
                <p className="mt-2 text-[13px] font-[600] text-primary">Enviando imagem, aguarde...</p>
              )}
              {formData.imageUrl && !isUploadingImage && (
                <div className="mt-3 flex items-center gap-3">
                  <img
                    src={formData.imageUrl}
                    alt=""
                    className="h-16 w-16 rounded-[8px] object-cover border border-border shrink-0 bg-[#F0F2F2]"
                  />
                  <span className="text-[12px] text-muted leading-snug">
                    Imagem vinculada. Clique em Salvar para gravar.
                  </span>
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-[13px] font-[600] text-text mb-2">Descrição</label>
              <textarea
                value={formData.descricao ?? ''}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                className="w-full bg-[#F0F2F2] border border-transparent rounded-[8px] px-4 py-3 text-[14px] outline-none focus:border-primary focus:bg-white transition-colors resize-none"
                rows={3}
                placeholder="Descrição opcional do produto"
              />
            </div>
          </div>

          <div className="border-t border-border pt-6 mb-6">
            <h3 className="text-[15px] lg:text-[16px] font-[700] text-text mb-4">Preço por Loja (R$)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {ADMIN_STORES.map((loja) => {
                return (
                  <div key={loja.id}>
                    <label className="block text-[13px] font-[600] text-text mb-2">{loja.label}</label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted text-[14px] font-[600] shrink-0">R$</span>
                      <input
                        type="number"
                        value={formData.precos[loja.id].valor === 0 ? '' : formData.precos[loja.id].valor}
                        onChange={(e) => handlePriceChange(loja.id, e.target.value)}
                        step="0.01"
                        min="0"
                        className="w-full bg-[#F0F2F2] border border-transparent rounded-[8px] px-4 py-3 text-[14px] outline-none focus:border-primary focus:bg-white transition-colors"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-4 justify-end">
            <button
              onClick={handleCancel}
              className="px-6 py-3 border border-border rounded-[8px] text-[14px] font-[600] text-text hover:bg-[#F0F2F2] flex items-center gap-2 transition-colors shadow-sm"
            >
              <X size={16} /> Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={loading || isUploadingImage}
              className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-[8px] text-[14px] font-extrabold flex items-center gap-2 transition-colors disabled:opacity-60 shadow-sm"
            >
              <Save size={16} /> {loading ? 'Salvando...' : 'Salvar Produto'}
            </button>
          </div>
        </div>
      )}

      {filteredProdutos.length === 0 && !isAdding ? (
        <div className="bg-white rounded-[12px] border border-border p-12 lg:p-16 text-center text-muted">
          <Package size={56} className="mx-auto mb-4 opacity-20" />
          <p className="font-medium text-lg">Nenhum produto encontrado.</p>
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="mt-3 text-primary text-sm hover:underline font-semibold">
              Limpar busca
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProdutos.map((produto) => (
            <div key={produto.id} className="bg-white rounded-[12px] border border-border shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
              {produto.imageUrl && (
                <img src={produto.imageUrl} alt={produto.nome} className="w-full h-48 lg:h-52 object-cover" loading="lazy" />
              )}
              <div className="p-6 lg:p-8">
                <h3 className="font-[800] text-text text-[15px] lg:text-[16px] line-clamp-2 mb-2">{produto.nome}</h3>
                <div className="flex gap-2 mb-4 flex-wrap">
                  <span className="text-[12px] bg-gray-50 text-muted px-3 py-1.5 rounded-full font-medium">{produto.categoria}</span>
                  <span className="text-[12px] bg-gray-50 text-muted px-3 py-1.5 rounded-full font-medium">/{produto.unit}</span>
                </div>

                <div className="text-[13px] lg:text-[14px] text-muted space-y-1 mb-5">
                  {ADMIN_STORES.map((loja) => {
                    const storePrice: StorePrice | undefined = produto.precos?.[loja.id];
                    return storePrice?.valor ? (
                      <div key={loja.id}>
                        <strong className="text-text font-semibold">{loja.label}:</strong> R$ {(storePrice.valor || 0).toFixed(2)}
                      </div>
                    ) : null;
                  })}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleEdit(produto)}
                    className="flex-1 py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 text-[14px] font-extrabold rounded-[8px] flex items-center justify-center gap-2 transition-all duration-200"
                  >
                    <Edit2 size={16} /> Editar
                  </button>
                  <button
                    onClick={() => setDeleteTarget(produto)}
                    disabled={loading}
                    className="flex-1 py-3 bg-red-50 hover:bg-red-100 text-red-600 text-[14px] font-extrabold rounded-[8px] flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50"
                  >
                    <Trash2 size={16} /> Remover
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {produtos.length > 0 && (
        <div className="bg-white rounded-[12px] border border-border shadow-sm p-8 lg:p-10">
          <div className="grid grid-cols-3 gap-6 lg:gap-8 text-center">
            <div>
              <div className="text-[32px] lg:text-[36px] font-[800] text-primary">{produtos.length}</div>
              <div className="text-[13px] lg:text-[14px] text-muted font-[500] mt-2">Total de Produtos</div>
            </div>
            <div>
              <div className="text-[32px] lg:text-[36px] font-[800] text-accent">
                {produtos.filter((p) =>
                  Object.values(p.precos ?? {}).some((pr: StorePrice) => pr?.emOferta)
                ).length}
              </div>
              <div className="text-[13px] lg:text-[14px] text-muted font-[500] mt-2">Em Oferta</div>
            </div>
            <div>
              <div className="text-[32px] lg:text-[36px] font-[800] text-muted">
                {new Set(produtos.map((p) => p.categoria)).size}
              </div>
              <div className="text-[13px] lg:text-[14px] text-muted font-[500] mt-2">Categorias</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
