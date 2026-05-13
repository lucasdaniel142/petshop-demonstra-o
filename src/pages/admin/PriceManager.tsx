import React, { useState, useEffect, useRef } from 'react';
import { Search, Check, Tag, X, Bell, Truck } from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { getPlaceholderImage } from '../../utils/placeholderImage';
import { ToggleSwitch } from '../../components/ui/ToggleSwitch';
import { FeedbackBanner } from '../../components/ui/FeedbackBanner';
import type { AdminProduct, SaveStatus, FeedbackState } from '../../types';
import { DEFAULT_STORE_PRICE, type StorePrice } from '../../types';
import { ADMIN_STORES, STORE_IDS } from '../../utils/constants';

// TableSkeleton é local — específico desta tabela, sem valor de reutilização
const TableSkeleton: React.FC = () => (
  <>
    {Array.from({ length: 6 }).map((_, i) => (
      <tr key={i} className="border-b border-border animate-pulse">
        <td className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-[6px] shrink-0" />
            <div className="flex flex-col gap-1">
              <div className="h-4 w-40 bg-gray-200 rounded" />
              <div className="h-3 w-24 bg-gray-200 rounded" />
            </div>
          </div>
        </td>
        <td className="p-4"><div className="h-8 w-28 bg-gray-200 rounded-[6px]" /></td>
        <td className="p-4"><div className="h-6 w-11 bg-gray-200 rounded-full mx-auto" /></td>
        <td className="p-4"><div className="h-6 w-11 bg-gray-200 rounded-full mx-auto" /></td>
      </tr>
    ))}
  </>
);

export const PriceManager: React.FC = () => {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>(STORE_IDS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [saveStatuses, setSaveStatuses] = useState<Record<string, SaveStatus>>({});
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isNotifying, setIsNotifying] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const timeoutRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'produtos'),
      (snapshot) => {
        const loadedProducts: AdminProduct[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            nome: data.nome || data.name || 'Produto Sem Nome',
            categoria: data.categoria || data.category || 'Geral',
            imageUrl: getPlaceholderImage(data.imageUrl || data.imagem),
            unit: data.unit || 'un',
            precos: data.precos || STORE_IDS.reduce((acc, id) => ({
              ...acc,
              [id]: DEFAULT_STORE_PRICE
            }), {}),
            freteGratis: data.freteGratis === true,
          };
        });
        setProducts(loadedProducts);
        setFeedback(null);
        setIsLoading(false);
      },
      (err) => {
        console.error('Erro ao buscar produtos:', err);
        setFeedback({ type: 'error', message: 'Não foi possível conectar ao banco de dados. Verifique as permissões do Firestore.' });
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
      Object.values(timeoutRefs.current).forEach(clearTimeout);
    };
  }, []);

  const handleUpdateField = async (
    productId: string,
    field: 'valor' | 'emOferta' | 'esgotado',
    newValue: number | boolean
  ) => {
    if (selectedStore === 'visao_geral') return;

    setSaveStatuses((prev) => ({ ...prev, [productId]: 'saving' }));

    try {
      await updateDoc(doc(db, 'produtos', productId), {
        [`precos.${selectedStore}.${field}`]: newValue,
      });

      setSaveStatuses((prev) => ({ ...prev, [productId]: 'success' }));
      if (field === 'valor') {
        setPriceInputs((prev) => {
          const next = { ...prev };
          delete next[productId];
          return next;
        });
      }
    } catch (err) {
      console.error(`Erro ao atualizar ${field}:`, err);
      setSaveStatuses((prev) => ({ ...prev, [productId]: 'error' }));
      setFeedback({ type: 'error', message: 'Falha ao salvar. Verifique sua conexão e tente novamente.' });
    } finally {
      clearTimeout(timeoutRefs.current[productId]);
      timeoutRefs.current[productId] = setTimeout(() => {
        setSaveStatuses((prev) => ({ ...prev, [productId]: 'idle' }));
      }, 2500);
    }
  };

  const handleToggleFreteGratis = async (productId: string, currentValue: boolean) => {
    setSaveStatuses((prev) => ({ ...prev, [productId]: 'saving' }));

    try {
      await updateDoc(doc(db, 'produtos', productId), {
        freteGratis: !currentValue,
      });

      setSaveStatuses((prev) => ({ ...prev, [productId]: 'success' }));
    } catch (err) {
      console.error('Erro ao atualizar frete grátis:', err);
      setSaveStatuses((prev) => ({ ...prev, [productId]: 'error' }));
      setFeedback({ type: 'error', message: 'Falha ao atualizar frete grátis. Verifique sua conexão.' });
    } finally {
      clearTimeout(timeoutRefs.current[productId]);
      timeoutRefs.current[productId] = setTimeout(() => {
        setSaveStatuses((prev) => ({ ...prev, [productId]: 'idle' }));
      }, 2500);
    }
  };

  const handleNotifyOffers = async () => {
    setIsNotifying(true);
    setFeedback(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Não autenticado');

      const response = await fetch('/api/notify-offers', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: '🚨 Novas Ofertas Disponíveis!',
          body: 'Corra para o app e confira os produtos com desconto especial hoje.'
        }),
      });
      
      const data = await response.json();
      if (response.ok) {
        setFeedback({ type: 'success', message: `Notificações enviadas com sucesso! (${data.sent} entregues, ${data.failed} falhas)` });
      } else {
        setFeedback({ type: 'error', message: data.error || 'Erro ao enviar notificações' });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Erro de conexão ao tentar enviar notificações.' });
    } finally {
      setIsNotifying(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.categoria.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isOverview = selectedStore === 'visao_geral';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-[12px] border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div>
            <h1 className="text-[20px] font-[800] text-primary">Gestão de Preços e Estoque</h1>
            <p className="text-muted text-[13px] mt-1">Atualize valores, ofertas e disponibilidade por loja.</p>
          </div>
          <button 
            onClick={handleNotifyOffers}
            disabled={isNotifying}
            className="self-start mt-2 bg-primary text-white px-4 py-2 rounded-[8px] font-bold text-sm hover:bg-primary-dark transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <Bell size={16} />
            {isNotifying ? 'Enviando...' : 'Notificar Clientes sobre Ofertas'}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="appearance-none bg-[#F0F2F2] border border-transparent text-text font-[600] text-[14px] rounded-[8px] pl-4 pr-10 py-2.5 outline-none focus:border-primary focus:bg-white transition-colors w-full sm:w-auto cursor-pointer"
            >
              {ADMIN_STORES.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.label}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted">▼</div>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Buscar produto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-[250px] bg-[#F0F2F2] border border-transparent rounded-[8px] pl-10 pr-4 py-2.5 text-[14px] outline-none focus:border-primary focus:bg-white transition-colors"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted opacity-50" size={18} />
          </div>
        </div>
      </div>

      <FeedbackBanner feedback={feedback} onDismiss={() => setFeedback(null)} />

      {/* Tabela */}
      <div className="bg-white rounded-[12px] border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAFAFA] border-b border-border text-[12px] text-muted uppercase tracking-wider">
                <th className="p-4 font-[600]">Produto</th>
                <th className="p-4 font-[600] w-[160px]">Preço ({isOverview ? 'Ref.' : 'Atual'})</th>
                <th className="p-4 font-[600] w-[120px] text-center">Em Oferta</th>
                <th className="p-4 font-[600] w-[120px] text-center">Esgotado</th>
                <th className="p-4 font-[600] w-[120px] text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Truck size={14} />
                    Frete Grátis
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <TableSkeleton />
              ) : (
                <>
                  {filteredProducts.map((product) => {
                    const storeData: StorePrice = isOverview
                      ? product.precos[STORE_IDS[0]] || DEFAULT_STORE_PRICE
                      : product.precos[selectedStore as StoreId] ?? DEFAULT_STORE_PRICE;

                    const isOffer = storeData.emOferta;
                    const isEsgotado = storeData.esgotado;
                    const price = storeData.valor;
                    const status = saveStatuses[product.id] ?? 'idle';

                    let rowClass = 'transition-colors hover:bg-[#F9F9F9]';
                    if (isEsgotado && !isOverview) rowClass = 'bg-gray-100 opacity-60 grayscale-[50%]';
                    else if (isOffer && !isOverview) rowClass = 'bg-green-50/50';

                    return (
                      <tr key={product.id} className={rowClass}>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white border border-border rounded-[6px] overflow-hidden shrink-0 flex items-center justify-center p-1">
                              <img src={product.imageUrl} alt={product.nome} className="w-full h-full object-contain" loading="lazy" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-[600] text-[14px] text-text line-clamp-1">{product.nome}</span>
                              <span className="text-[12px] text-muted">{product.categoria}</span>
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="text-muted text-[14px] font-[600] shrink-0">R$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={
                                priceInputs[product.id] ??
                                ((price || 0) === 0 ? '' : (price || 0).toFixed(2))
                              }
                              disabled={isOverview || isEsgotado}
                              placeholder="0.00"
                              onChange={(e) =>
                                setPriceInputs((prev) => ({ ...prev, [product.id]: e.target.value }))
                              }
                              onBlur={(e) => {
                                const newPrice = parseFloat(e.target.value.replace(',', '.'));
                                if (!isNaN(newPrice) && newPrice !== price && newPrice >= 0) {
                                  handleUpdateField(product.id, 'valor', newPrice);
                                }
                              }}
                              className={`min-w-[100px] w-full bg-white border rounded-[6px] px-3 py-2 text-[14px] font-[600] outline-none focus:ring-1 transition-all disabled:bg-transparent disabled:border-transparent disabled:text-muted ${
                                status === 'success'
                                  ? 'border-green-500 focus:border-green-500 focus:ring-green-500'
                                  : status === 'error'
                                  ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
                                  : 'border-border focus:border-primary focus:ring-primary'
                              }`}
                            />
                            {status === 'success' && (
                              <Check size={16} className="text-green-500 shrink-0" />
                            )}
                            {status === 'error' && (
                              <X size={16} className="text-red-500 shrink-0" />
                            )}
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="flex justify-center">
                            <ToggleSwitch
                              checked={isOffer}
                              onChange={() => handleUpdateField(product.id, 'emOferta', !isOffer)}
                              disabled={isOverview || isEsgotado}
                              colorClass="bg-secondary"
                              ariaLabel={`${product.nome} em oferta`}
                            />
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="flex justify-center">
                            <ToggleSwitch
                              checked={isEsgotado}
                              onChange={() => handleUpdateField(product.id, 'esgotado', !isEsgotado)}
                              disabled={isOverview}
                              colorClass="bg-red-500"
                              ariaLabel={`${product.nome} esgotado`}
                            />
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="flex flex-col items-center gap-1">
                            <ToggleSwitch
                              checked={product.freteGratis === true}
                              onChange={() => handleToggleFreteGratis(product.id, product.freteGratis === true)}
                              disabled={isOverview}
                              colorClass="bg-emerald-500"
                              ariaLabel={`${product.nome} frete grátis`}
                            />
                            {product.freteGratis && (
                              <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide">Ativo</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted">
                        <Tag size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="text-[15px] font-[500]">Nenhum produto encontrado.</p>
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
