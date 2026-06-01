import React, { useState, useEffect, useRef } from 'react';
import { Search, Check, Truck } from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../shared/lib/firebase';
import { getPlaceholderImage } from '../../shared/utils/placeholderImage';
import { ToggleSwitch } from '../../shared/ui/ToggleSwitch';
import { FeedbackBanner } from '../../shared/ui/FeedbackBanner';
import type { AdminProduct, SaveStatus, FeedbackState, StoreId, StorePrice } from '../../shared/types';
import { DEFAULT_STORE_PRICE } from '../../shared/types';
import { ADMIN_STORES, STORE_IDS } from '../../shared/utils/constants';

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
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const timeoutRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // [HP-06 FIX] Debounce timers para evitar writes desnecessários no Firestore
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

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
        setFeedback({ type: 'error', message: 'Não foi possível conectar ao banco de dados.' });
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
      // [HP-06 FIX] Limpa todos os timers ao desmontar
      Object.values(timeoutRefs.current).forEach(clearTimeout);
      Object.values(debounceTimers.current).forEach(clearTimeout);
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
      setFeedback({ type: 'error', message: 'Falha ao salvar.' });
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
    } finally {
      clearTimeout(timeoutRefs.current[productId]);
      timeoutRefs.current[productId] = setTimeout(() => {
        setSaveStatuses((prev) => ({ ...prev, [productId]: 'idle' }));
      }, 2500);
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
      <div className="bg-white p-6 rounded-[12px] border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div>
            <h1 className="text-[20px] font-[800] text-primary">Gestão de Preços e Estoque</h1>
            <p className="text-muted text-[13px] mt-1">Atualize valores, ofertas e disponibilidade por loja.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="appearance-none bg-[#F0F2F2] border border-transparent text-text font-[600] text-[14px] rounded-[8px] pl-4 pr-10 py-2.5 outline-none focus:border-primary focus:bg-white transition-colors w-full sm:w-auto cursor-pointer"
            >
              {ADMIN_STORES.map((store) => (
                <option key={store.id} value={store.id}>{store.label}</option>
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

      <div className="bg-white rounded-[12px] border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAFAFA] border-b border-border text-[12px] text-muted uppercase tracking-wider">
                <th className="p-4 font-[600]">Produto</th>
                <th className="p-4 font-[600] w-[160px]">Preço</th>
                <th className="p-4 font-[600] w-[120px] text-center">Em Oferta</th>
                <th className="p-4 font-[600] w-[120px] text-center">Esgotado</th>
                <th className="p-4 font-[600] w-[120px] text-center"><div className="flex items-center justify-center gap-1"><Truck size={14} /> Frete Grátis</div></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? <TableSkeleton /> : (
                <>
                  {filteredProducts.map((product) => {
                    const storeData: StorePrice = isOverview
                      ? product.precos[STORE_IDS[0]] || DEFAULT_STORE_PRICE
                      : product.precos[selectedStore as StoreId] ?? DEFAULT_STORE_PRICE;

                    const isOffer = storeData.emOferta;
                    const isEsgotado = storeData.esgotado;
                    const price = storeData.valor;
                    const status = saveStatuses[product.id] ?? 'idle';

                    return (
                      <tr key={product.id} className={`transition-colors hover:bg-[#F9F9F9] ${isEsgotado ? 'bg-gray-100 opacity-60 grayscale-[50%]' : isOffer ? 'bg-green-50/50' : ''}`}>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white border border-border rounded-[6px] overflow-hidden shrink-0 flex items-center justify-center p-1">
                              <img src={product.imageUrl} alt={product.nome} className="w-full h-full object-contain" />
                            </div>
                            <div className="flex flex-col"><span className="font-[600] text-[14px] text-text line-clamp-1">{product.nome}</span><span className="text-[12px] text-muted">{product.categoria}</span></div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="text-muted text-[14px] font-[600] shrink-0">R$</span>
                            <input
                              type="number" step="0.01" min="0"
                              value={priceInputs[product.id] ?? ((price || 0) === 0 ? '' : (price || 0).toFixed(2))}
                              disabled={isOverview || isEsgotado}
                              onChange={(e) => setPriceInputs((prev) => ({ ...prev, [product.id]: e.target.value }))}
                              onBlur={(e) => {
                                const newPrice = parseFloat(e.target.value.replace(',', '.'));
                                if (!isNaN(newPrice) && newPrice !== price && newPrice >= 0) {
                                  // [HP-06 FIX] Debounce de 500ms para evitar writes múltiplos
                                  clearTimeout(debounceTimers.current[product.id]);
                                  debounceTimers.current[product.id] = setTimeout(() => {
                                    handleUpdateField(product.id, 'valor', newPrice);
                                  }, 500);
                                }
                              }}
                              className={`min-w-[100px] w-full bg-white border rounded-[6px] px-3 py-2 text-[14px] font-[600] outline-none transition-all ${status === 'success' ? 'border-green-500' : status === 'error' ? 'border-red-400' : 'border-border focus:border-primary'}`}
                            />
                            {status === 'success' && <Check size={16} className="text-green-500 shrink-0" />}
                          </div>
                        </td>
                        <td className="p-4 text-center"><ToggleSwitch checked={isOffer} onChange={() => handleUpdateField(product.id, 'emOferta', !isOffer)} disabled={isOverview || isEsgotado} colorClass="bg-secondary" /></td>
                        <td className="p-4 text-center"><ToggleSwitch checked={isEsgotado} onChange={() => handleUpdateField(product.id, 'esgotado', !isEsgotado)} disabled={isOverview} colorClass="bg-red-500" /></td>
                        <td className="p-4 text-center"><ToggleSwitch checked={product.freteGratis === true} onChange={() => handleToggleFreteGratis(product.id, product.freteGratis === true)} disabled={isOverview} colorClass="bg-emerald-500" /></td>
                      </tr>
                    );
                  })}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
