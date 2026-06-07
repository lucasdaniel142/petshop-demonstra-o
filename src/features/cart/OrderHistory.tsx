import React, { useEffect, useMemo, useState } from 'react';
import { collection, documentId, onSnapshot, query, where, type Unsubscribe } from 'firebase/firestore';
import { db } from '../../shared/lib/firebase';
import { getOrderHistory } from '../../shared/utils/orderHistory';
import type { LocalOrderHistoryEntry, Order } from '../../shared/types';
import { formatCurrency } from '../../shared/utils/currency';
import { Clock, Package } from 'lucide-react';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'text-amber-700' },
  preparing: { label: 'Em Separação', color: 'text-blue-700' },
  shipped: { label: 'Saiu p/ Entrega', color: 'text-purple-700' },
  delivered: { label: 'Entregue', color: 'text-green-700' },
  cancelled: { label: 'Cancelado', color: 'text-red-700' },
};

function formatDate(timestamp: unknown): string {
  if (!timestamp) return '—';
  const date = typeof timestamp === 'number' ? new Date(timestamp) : 'toDate' in (timestamp as any) ? (timestamp as any).toDate() : new Date(timestamp as any);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

interface OrderHistoryProps {
  onOpenCart: () => void;
}

export const OrderHistory: React.FC<OrderHistoryProps> = ({ onOpenCart }) => {
  const [historyEntries, setHistoryEntries] = useState<LocalOrderHistoryEntry[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const entries = getOrderHistory();
    setHistoryEntries(entries);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (historyEntries.length === 0) {
      setOrders([]);
      return;
    }

    setLoading(true);
    setError(null);

    const orderIds = historyEntries.map((entry) => entry.orderId);
    const chunks = chunkArray(orderIds, 10);
    const unsubscribeList: Unsubscribe[] = [];
    const ordersMap: Record<string, Order> = {};

    chunks.forEach((chunk) => {
      const q = query(collection(db, 'pedidos'), where(documentId(), 'in', chunk));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          snapshot.docs.forEach((doc) => {
            ordersMap[doc.id] = {
              id: doc.id,
              ...(doc.data() as any),
            } as Order;
          });
          const mergedOrders = Object.values(ordersMap).sort((a, b) => {
            const aTime = typeof a.createdAt === 'number' ? a.createdAt : 'toDate' in (a.createdAt as any) ? (a.createdAt as any).toDate().getTime() : new Date(a.createdAt as any).getTime();
            const bTime = typeof b.createdAt === 'number' ? b.createdAt : 'toDate' in (b.createdAt as any) ? (b.createdAt as any).toDate().getTime() : new Date(b.createdAt as any).getTime();
            return bTime - aTime;
          });
          setOrders(mergedOrders);
          setLoading(false);
        },
        (err) => {
          console.error('[OrderHistory] Erro ao ouvir histórico:', err);
          setError('Não foi possível carregar o histórico. Tente novamente mais tarde.');
          setLoading(false);
        }
      );
      unsubscribeList.push(unsubscribe);
    });

    return () => unsubscribeList.forEach((unsubscribe) => unsubscribe());
  }, [historyEntries]);

  const hasHistory = historyEntries.length > 0;

  return (
    <div className="flex flex-col min-h-[420px]">
      <div className="px-2 py-3 border-b border-gray-100 bg-gray-50 text-sm text-muted">
        Histórico dos últimos 7 dias
      </div>
      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
        {!hasHistory ? (
          <div className="h-full flex flex-col items-center justify-center text-muted gap-3">
            <Clock size={40} className="opacity-30" />
            <p className="text-[15px] font-semibold">Nenhum pedido salvo no histórico.</p>
            <p className="text-[13px] text-center max-w-sm">
              Faça um pedido e ele será exibido aqui. O histórico é mantido por 7 dias.
            </p>
          </div>
        ) : loading ? (
          <div className="h-full flex items-center justify-center text-muted">
            Carregando histórico...
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700">
            <p className="font-semibold mb-2">Aguardando pedidos...</p>
            <p className="text-[13px]">Seu histórico está sincronizado, mas ainda não há pedidos visíveis para os IDs salvos.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {historyEntries.map((entry) => {
              const order = orders.find((orderItem) => orderItem.id === entry.orderId);
              const statusKey = order?.paymentStatus ?? 'pending';
              const status = STATUS_LABELS[statusKey] || { label: statusKey, color: 'text-gray-700' };

              return (
                <article key={entry.orderId} className="rounded-3xl border border-border bg-white shadow-sm p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[13px] text-muted">Pedido #{entry.orderId.slice(0, 8)}</p>
                      <p className="text-[15px] font-semibold mt-1">
                        {order ? status.label : 'Pedido registrado'}
                      </p>
                    </div>
                    <span className={`text-[11px] font-bold ${status.color} bg-white/80 px-3 py-1 rounded-full border border-current`}> 
                      {status.label}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-3 text-[13px] text-slate-700">
                      <p className="font-semibold">Criado em</p>
                      <p className="mt-1">{formatDate(entry.createdAt)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3 text-[13px] text-slate-700">
                      <p className="font-semibold">Telefone</p>
                      <p className="mt-1">{entry.phone}</p>
                    </div>
                  </div>

                  {order ? (
                    <div className="mt-4 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-slate-50 p-3 text-[13px] text-slate-700">
                          <p className="font-semibold">Total</p>
                          <p className="mt-1 font-semibold">{formatCurrency(order.total)}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-3 text-[13px] text-slate-700">
                          <p className="font-semibold">Loja</p>
                          <p className="mt-1">{order.storeId || '—'}</p>
                        </div>
                      </div>
                      <div className="rounded-3xl border border-dashed border-slate-200 p-3 bg-slate-50">
                        <p className="text-[13px] font-semibold mb-2">Itens</p>
                        <div className="space-y-2">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex justify-between text-[13px] text-slate-700">
                              <span>{item.quantity}× {item.name}</span>
                              <span>{formatCurrency((item.price || 0) * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-3 text-[13px] text-amber-900">
                      Pedido encontrado no histórico, mas os detalhes ainda não foram carregados ou o pedido não existe mais.
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
        <button
          type="button"
          onClick={onOpenCart}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-primary bg-white px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
        >
          <Package size={16} /> Voltar ao carrinho
        </button>
      </div>
    </div>
  );
};
