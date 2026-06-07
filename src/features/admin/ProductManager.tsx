import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, FileSpreadsheet } from 'lucide-react';
import { BulkImportModal } from './components/BulkImportModal';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../../shared/lib/firebase';
import { FeedbackBanner } from '../../shared/ui/FeedbackBanner';
import type { ManagedProduct, FeedbackState, StorePrice, StoreId } from '../../shared/types';
import { DEFAULT_STORE_PRICE } from '../../shared/types';
import { PRODUCT_CATEGORIES, STORE_IDS, ADMIN_STORES } from '../../shared/utils/constants';
import { auth } from '../../shared/lib/firebase';
import { logger } from '../../shared/utils/logger';

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
        <button onClick={onCancel} className="flex-1 py-2.5 border border-border rounded-[8px] text-[14px] font-[600]">Cancelar</button>
        <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-600 text-white rounded-[8px] text-[14px] font-extrabold">Sim, remover</button>
      </div>
    </div>
  </div>
);

export const ProductManager: React.FC = () => {
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
    const unsubscribe = onSnapshot(collection(db, 'produtos'), (snapshot) => {
      const prods: ManagedProduct[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const rawPrecos = (data.precos || {}) as Record<string, StorePrice>;
        const safePrecos = STORE_IDS.reduce((acc, id) => ({
          ...acc,
          [id]: rawPrecos[id] || { ...DEFAULT_STORE_PRICE },
        }), {} as Record<StoreId, StorePrice>);

        return { id: docSnap.id, ...data, precos: safePrecos } as ManagedProduct;
      });
      setProdutos(prods.sort((a, b) => (a.nome || '').localeCompare(b.nome || '')));
    });
    return () => unsubscribe();
  }, []);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handlePriceChange = (loja: StoreId, value: string) => {
    const numVal = parseFloat(value) || 0;
    setFormData((prev) => ({
      ...prev,
      precos: {
        ...prev.precos,
        [loja]: { ...(prev.precos[loja] || DEFAULT_STORE_PRICE), valor: numVal },
      },
    }));
  };

  const handleStorePriceFlag = (loja: StoreId, key: 'emOferta' | 'esgotado', checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      precos: {
        ...prev.precos,
        [loja]: { ...(prev.precos[loja] || DEFAULT_STORE_PRICE), [key]: checked },
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
      showFeedback('error', 'Chave ImgBB não configurada.');
      return;
    }

    setIsUploadingImage(true);
    try {
      const body = new FormData();
      body.append('image', file);
      const response = await fetch(IMGBB_UPLOAD_URL, { method: 'POST', body });
      const data = await response.json();
      if (data?.data?.url) setFormData((prev) => ({ ...prev, imageUrl: data.data.url }));
    } catch {
      showFeedback('error', 'Falha no upload.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      showFeedback('error', 'Nome é obrigatório.');
      return;
    }
    setLoading(true);
    try {
      if (editingId) {
        // Verificar se algum produto entrou em oferta para disparar notificação
        const oldProductDoc = await getDoc(doc(db, 'produtos', editingId));
        const oldProduct = oldProductDoc.data() as ManagedProduct | undefined;

        await updateDoc(doc(db, 'produtos', editingId), formData);

        // Verificar se algum store entrou em oferta e disparar notificação
        if (oldProduct) {
          for (const storeId of STORE_IDS) {
            const oldInOffer = oldProduct.precos[storeId]?.emOferta || false;
            const newInOffer = formData.precos[storeId]?.emOferta || false;

            if (!oldInOffer && newInOffer) {
              // Produto entrou em oferta - disparar notificação
              await sendPromoNotificationForProduct(formData.nome, storeId);
            }
          }
        }

        showFeedback('success', 'Produto atualizado.');
      } else {
        await addDoc(collection(db, 'produtos'), formData);
        showFeedback('success', 'Produto adicionado.');
      }
      handleCancel();
    } catch {
      showFeedback('error', 'Erro ao salvar.');
    } finally {
      setLoading(false);
    }
  };

  const sendPromoNotificationForProduct = async (productName: string, storeId: StoreId) => {
    try {
      // [HP-07 FIX] Rate limiting: verifica se já enviou notificação recentemente
      const lastNotificationKey = `lastPromoNotification_${storeId}`;
      const lastNotificationTime = localStorage.getItem(lastNotificationKey);
      const now = Date.now();
      const SIX_HOURS = 6 * 60 * 60 * 1000; // 6 horas em ms

      if (lastNotificationTime) {
        const timeSinceLastNotification = now - parseInt(lastNotificationTime, 10);
        if (timeSinceLastNotification < SIX_HOURS) {
          const remainingMinutes = Math.ceil((SIX_HOURS - timeSinceLastNotification) / 60000);
          logger.info(`[ProductManager] Rate limit ativo. Próxima notificação em ${remainingMinutes} minutos.`);
          showFeedback('error', `Aguarde ${remainingMinutes} minutos antes de enviar outra notificação de oferta.`);
          return;
        }
      }

      // Buscar configurações de notificação de promoção
      const settingsDoc = await getDoc(doc(db, 'settings', 'delivery'));
      const settings = settingsDoc.data();

      const title = settings?.promoNotificationTitle || '🔥 Promoção Especial!';
      const body = `${productName} está em oferta! ${settings?.promoNotificationBody || 'Confira nossas ofertas imperdíveis!'}`;

      // Obter token do usuário atual para autenticação
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        console.warn('Usuário não autenticado para enviar notificação');
        return;
      }

      // Chamar API de notificação
      const response = await fetch('/api/notify-offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ title, body, link: '/' })
      });

      if (response.ok) {
        const data = await response.json();
        // [HP-07 FIX] Salva timestamp da última notificação
        localStorage.setItem(lastNotificationKey, now.toString());
        showFeedback('success', `Notificação enviada para ${data.sent || 0} dispositivos!`);
      } else {
        const errorData = await response.json();
        showFeedback('error', errorData.error || 'Erro ao enviar notificação');
      }
    } catch (error) {
      console.error('Erro ao enviar notificação de promoção:', error);
      // Não mostrar erro ao usuário pois o produto já foi salvo
    }
  };

  const filteredProdutos = produtos.filter(p => (p.nome || '').toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <BulkImportModal isOpen={isBulkImportOpen} onClose={() => setIsBulkImportOpen(false)} onSuccess={(count) => showFeedback('success', `${count} importado(s).`)} />
      {deleteTarget && <DeleteConfirmModal nomeProduto={deleteTarget.nome} onConfirm={async () => { await deleteDoc(doc(db, 'produtos', deleteTarget.id)); setDeleteTarget(null); showFeedback('success', 'Removido.'); }} onCancel={() => setDeleteTarget(null)} />}

      <div className="bg-white p-8 rounded-[12px] border border-border shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div><h1 className="text-[20px] font-[800] text-primary">Produtos</h1><p className="text-muted text-[13px]">Gerencie seu catálogo.</p></div>
        <div className="flex gap-3 flex-wrap">
          <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-[#F0F2F2] border border-transparent rounded-[8px] px-4 py-2 text-[14px] outline-none focus:border-primary focus:bg-white transition-all" />
          <button onClick={() => setIsBulkImportOpen(true)} className="bg-accent text-on-accent px-5 py-2.5 rounded-[8px] font-extrabold text-[14px] flex items-center gap-2"><FileSpreadsheet size={18} /> Importar</button>
          <button onClick={() => { setIsAdding(true); setEditingId(null); setFormData(EMPTY_FORM); }} className="bg-primary text-white px-5 py-2.5 rounded-[8px] font-extrabold text-[14px] flex items-center gap-2"><Plus size={18} /> Novo</button>
        </div>
      </div>

      <FeedbackBanner feedback={feedback} onDismiss={() => setFeedback(null)} />

      {isAdding && (
        <div className="bg-white rounded-[12px] border-2 border-primary p-8 space-y-8">
          <h2 className="text-[20px] font-[700] text-text">{editingId ? 'Editar' : 'Novo'} Produto</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[13px] font-[600] text-muted">Nome</label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome do produto"
                className="w-full bg-[#F0F2F2] px-4 py-3 rounded-[8px] outline-none border border-transparent focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-[600] text-muted">Categoria</label>
              <select
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                className="w-full bg-[#F0F2F2] px-4 py-3 rounded-[8px] outline-none border border-transparent focus:border-primary"
              >
                {PRODUCT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[13px] font-[600] text-muted">Descrição</label>
            <textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Descrição do produto"
              rows={4}
              className="w-full bg-[#F0F2F2] px-4 py-3 rounded-[8px] outline-none border border-transparent focus:border-primary resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[13px] font-[600] text-muted">Unidade de venda</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value as 'un' | 'kg' })}
                className="w-full bg-[#F0F2F2] px-4 py-3 rounded-[8px] outline-none border border-transparent focus:border-primary"
              >
                <option value="un">Unidade (un)</option>
                <option value="kg">Quilograma (kg)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-[600] text-muted">Imagem</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageFileChange}
                disabled={isUploadingImage}
                className="w-full text-[13px] file:mr-3 file:rounded-[8px] file:border-0 file:bg-primary file:px-4 file:py-2 file:text-white file:font-bold"
              />
              {isUploadingImage && <p className="text-[12px] text-muted">Enviando imagem…</p>}
              {formData.imageUrl ? (
                <img src={formData.imageUrl} alt="" className="mt-2 max-h-32 rounded-lg border border-border object-contain bg-[#f8f8f8]" />
              ) : null}
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(formData.freteGratis)}
              onChange={(e) => setFormData({ ...formData, freteGratis: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-[14px] font-[600] text-text">Frete grátis para este produto (quando a política permitir)</span>
          </label>

          <div className="space-y-4">
            <h3 className="text-[16px] font-[800] text-primary border-b border-border pb-2">Preços por loja</h3>
            <p className="text-[13px] text-muted">Defina valor, oferta e disponibilidade em cada unidade.</p>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {ADMIN_STORES.map(({ id, label }) => {
                  const sp = formData.precos[id] || DEFAULT_STORE_PRICE;
                  return (
                    <div key={id} className="rounded-[12px] border border-border bg-[#FAFAFA] p-4 space-y-3">
                      <p className="font-[800] text-[14px] text-text">{label}</p>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted uppercase">Preço (R$)</label>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={sp.valor === 0 ? '' : sp.valor}
                          onChange={(e) => handlePriceChange(id, e.target.value)}
                          placeholder="0,00"
                          className="w-full bg-white px-3 py-2.5 rounded-[8px] border border-gray-200 outline-none focus:border-primary text-[14px]"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sp.emOferta}
                          onChange={(e) => handleStorePriceFlag(id, 'emOferta', e.target.checked)}
                          className="rounded border-gray-300 text-primary"
                        />
                        Em oferta
                      </label>
                      <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sp.esgotado}
                          onChange={(e) => handleStorePriceFlag(id, 'esgotado', e.target.checked)}
                          className="rounded border-gray-300 text-primary"
                        />
                        Esgotado
                      </label>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="flex gap-4 justify-end pt-2 border-t border-border">
            <button type="button" onClick={handleCancel} className="px-6 py-2.5 border rounded-[8px] font-[600]">
              Cancelar
            </button>
            <button type="button" onClick={handleSave} disabled={loading} className="px-6 py-2.5 bg-primary text-white rounded-[8px] font-extrabold">
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProdutos.map(p => (
          <div key={p.id} className="bg-white rounded-[12px] border border-border shadow-sm overflow-hidden p-6 space-y-4">
            {p.imageUrl && <img src={p.imageUrl} alt={p.nome} className="w-full h-40 object-contain" />}
            <h3 className="font-[800] text-text">{p.nome}</h3>
            <div className="flex gap-2">
              <button onClick={() => handleEdit(p)} className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-[8px] font-bold text-[13px] flex items-center justify-center gap-1"><Edit2 size={14}/> Editar</button>
              <button onClick={() => setDeleteTarget(p)} className="flex-1 py-2 bg-red-50 text-red-600 rounded-[8px] font-bold text-[13px] flex items-center justify-center gap-1"><Trash2 size={14}/> Remover</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
