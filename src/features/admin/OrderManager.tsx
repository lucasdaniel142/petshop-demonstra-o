import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ClipboardList,
  Search,
  Printer,
  Volume2,
  VolumeX,
  RefreshCw,
  Clock,
  Package,
  User,
  MapPin,
  CreditCard,
  Trash2,
  MessageCircle
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, limit, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../shared/lib/firebase';
import type { Order, PaymentMethodType, OrderStatus } from '../../shared/types';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; whatsappMessage: string }> = {
  pending: { label: '🔔 Novo Pedido', color: 'text-amber-700', bg: 'bg-amber-100', whatsappMessage: 'Olá! Recebemos seu pedido e já estamos começando a prepará-lo. Em breve você receberá atualizações sobre o status.' },
  preparing: { label: '📦 Em Separação', color: 'text-blue-700', bg: 'bg-blue-100', whatsappMessage: 'Olá! Seu pedido está sendo separado e preparado com carinho. Em breve sairá para entrega.' },
  shipped: { label: '🚚 Saiu para Entrega', color: 'text-purple-700', bg: 'bg-purple-100', whatsappMessage: 'Olá! Seu pedido saiu para entrega e está a caminho. Fique atento para recebê-lo!' },
  delivered: { label: '✅ Entregue', color: 'text-green-700', bg: 'bg-green-100', whatsappMessage: 'Olá! Seu pedido foi entregue com sucesso. Agradecemos a preferência!' },
  cancelled: { label: '❌ Cancelado', color: 'text-red-700', bg: 'bg-red-100', whatsappMessage: 'Olá! Informamos que seu pedido foi cancelado. Entre em contato conosco para mais informações.' },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix_presencial: '📱 Pix na Entrega',
  dinheiro: '💵 Dinheiro',
  maquininha: '💳 Crédito/Débito',
  ticket: '🎫 Ticket (Alim./Refeição)',
};

const FILTER_OPTIONS = [
  { id: 'all', label: 'Todos' },
  { id: 'pending', label: 'Novos Pedidos' },
  { id: 'preparing', label: 'Em Separação' },
  { id: 'shipped', label: 'Em Rota' },
  { id: 'delivered', label: 'Entregues' },
];

let audioContext: AudioContext | null = null;

function playNotificationBeep() {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    // Resume se estiver suspenso (política do Chrome)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    gain.gain.setValueAtTime(0.3, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (err) {
    console.error('Audio error:', err);
  }
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrency(value: any): string {
  if (value === null || value === undefined) return 'R$ 0,00';
  let num = 0;
  if (typeof value === 'object') {
    if ('valor' in value) {
      num = typeof value.valor === 'number' ? value.valor : parseFloat(value.valor) || 0;
    }
  } else {
    num = typeof value === 'number' ? value : parseFloat(value) || 0;
  }
  if (isNaN(num)) return 'R$ 0,00';
  return `R$ ${num.toFixed(2).replace('.', ',')}`;
}

function getItemPrice(item: any): number {
  if (!item || item.price === null || item.price === undefined) return 0;
  let price = 0;
  if (typeof item.price === 'object') {
    if ('valor' in item.price) {
      price = typeof item.price.valor === 'number' ? item.price.valor : parseFloat(item.price.valor) || 0;
    }
  } else {
    price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
  }
  return isNaN(price) ? 0 : price;
}

function formatDate(timestamp: any): string {
  if (!timestamp) return '—';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const OrderSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl border border-border p-5 animate-pulse space-y-3">
    <div className="flex justify-between">
      <div className="h-5 w-32 bg-gray-200 rounded" />
      <div className="h-5 w-20 bg-gray-200 rounded-full" />
    </div>
    <div className="h-4 w-48 bg-gray-200 rounded" />
    <div className="h-4 w-36 bg-gray-200 rounded" />
    <div className="h-8 w-full bg-gray-200 rounded" />
  </div>
);

const OrderCard: React.FC<{ 
  order: Order; 
  onPrint: (order: Order) => void;
  onUpdateStatus: (id: string, newStatus: string) => void;
}> = ({ order, onPrint, onUpdateStatus }) => {
  const status = STATUS_CONFIG[order.paymentStatus] || {
    label: order.paymentStatus,
    color: 'text-gray-700',
    bg: 'bg-gray-100',
  };

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted">#{order.id.slice(0, 8)}</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
            {status.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted flex items-center gap-1">
            <Clock size={12} />
            {formatDate(order.createdAt)}
          </span>
          <button onClick={() => onPrint(order)} className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors" title="Imprimir">
            <Printer size={14} className="text-muted" />
          </button>
          <button
            onClick={async () => {
              if (window.confirm('Tem certeza que deseja EXCLUIR permanentemente este pedido?')) {
                try {
                  await deleteDoc(doc(db, 'pedidos', order.id));
                } catch (err) {
                  alert('Erro ao excluir pedido.');
                }
              }
            }}
            className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
            title="Excluir"
          >
            <Trash2 size={14} className="text-red-500" />
          </button>
          <button
            onClick={() => {
              if (!order.phone) {
                alert('Este pedido não possui número de telefone cadastrado.');
                return;
              }
              const statusConfig = STATUS_CONFIG[order.paymentStatus];
              const statusMsg = `Olá *${order.customerName}*! Seu pedido *#${order.id.slice(0, 8)}* - ${statusConfig?.label || order.paymentStatus}.\n\n${statusConfig?.whatsappMessage || ''}`;
              const formattedPhone = order.phone.replace(/\D/g, '');
              const whatsappUrl = `https://wa.me/55${formattedPhone}?text=${encodeURIComponent(statusMsg)}`;
              window.open(whatsappUrl, '_blank');
            }}
            className="p-1.5 hover:bg-green-100 rounded-lg transition-colors"
            title="Avisar no WhatsApp"
          >
            <MessageCircle size={14} className="text-green-600" />
          </button>
        </div>
      </div>

      <div className="px-5 py-4 space-y-3">
        <div className="flex items-start gap-2 text-sm">
          <User size={14} className="text-muted mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold text-text">{order.customerName}</span>
            {order.phone && <span className="text-muted ml-2">({order.phone})</span>}
          </div>
        </div>
        {order.deliveryAddress && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin size={14} className="text-muted mt-0.5 shrink-0" />
            <span className="text-xs text-muted">{order.deliveryAddress}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <CreditCard size={14} className="text-muted shrink-0" />
          <span className="text-xs text-muted">
            {PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod}
            {order.changeFor && ` (Troco p/ ${formatCurrency(order.changeFor)})`}
          </span>
        </div>
        <div className="border-t border-dashed border-gray-200 pt-3 space-y-1.5">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-xs">
              <span className="text-text">{item.quantity}× {item.name}</span>
              <span className="text-muted font-medium">{formatCurrency(getItemPrice(item) * item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-200 pt-3 space-y-1">
          <div className="flex justify-between text-xs text-muted"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
          {order.deliveryFee > 0 && <div className="flex justify-between text-xs text-muted"><span>Entrega</span><span>{formatCurrency(order.deliveryFee)}</span></div>}
          <div className="flex justify-between text-sm font-bold text-text pt-1"><span>Total</span><span>{formatCurrency(order.total)}</span></div>
        </div>
        <div className="border-t border-gray-200 pt-3 mt-3 flex gap-2 overflow-x-auto custom-scrollbar pb-1">
          {order.paymentStatus === 'pending' && <button onClick={() => onUpdateStatus(order.id, 'preparing')} className="px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-200 whitespace-nowrap">Em Separação</button>}
          {(order.paymentStatus === 'pending' || order.paymentStatus === 'preparing') && <button onClick={() => onUpdateStatus(order.id, 'shipped')} className="px-3 py-1.5 bg-purple-100 text-purple-700 text-xs font-bold rounded-lg hover:bg-purple-200 whitespace-nowrap">Saiu p/ Entrega</button>}
          {order.paymentStatus === 'shipped' && <button onClick={() => onUpdateStatus(order.id, 'delivered')} className="px-3 py-1.5 bg-green-100 text-green-700 text-xs font-bold rounded-lg hover:bg-green-200 whitespace-nowrap">Entregue</button>}
          {order.paymentStatus !== 'cancelled' && order.paymentStatus !== 'delivered' && <button onClick={() => onUpdateStatus(order.id, 'cancelled')} className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-bold rounded-lg hover:bg-red-200 whitespace-nowrap">Cancelar</button>}
        </div>
      </div>
    </div>
  );
};

export const OrderManager: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const knownOrderIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'pedidos', orderId), {
        paymentStatus: newStatus,
        updatedAt: new Date()
      });

      const order = orders.find(o => o.id === orderId);
      const fcmToken = (order as any).fcmToken;
      if (fcmToken) {
        const label = STATUS_CONFIG[newStatus]?.label || newStatus;
        const idToken = await auth.currentUser?.getIdToken();

        try {
          const res = await fetch('/api/notify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              token: fcmToken,
              title: 'Sagrada Família: Pedido Atualizado!',
              body: `Seu pedido #${order?.id.slice(0, 8)} agora está: ${label}.`,
              link: '/',
            }),
          });
          if (!res.ok) {
            const raw = await res.text();
            let detail = `HTTP ${res.status}`;
            let isNotRegistered = res.status === 410;
            try {
              const j = JSON.parse(raw) as { error?: string };
              if (j.error) {
                detail = j.error;
                if (j.error === 'NotRegistered') isNotRegistered = true;
              }
            } catch {
              /* ignore */
            }
            if (isNotRegistered) {
              console.log('[notify] Notificação ignorada: O token FCM do cliente expirou ou foi descadastrado.');
            } else {
              console.warn('[notify] Push não enviado:', detail);
            }
          }
        } catch (e) {
          console.warn('[notify] Falha na requisição:', e);
        }
      }
    } catch (err) {
      alert('Erro ao atualizar status do pedido.');
    }
  };

  const handlePrint = useCallback((order: Order) => {
    const status = STATUS_CONFIG[order.paymentStatus] || { label: order.paymentStatus };
    const printWindow = window.open('', '_blank', 'width=302,height=600');
    if (!printWindow) return;

    const itemsHtml = order.items
      .map(
        (item) =>
          `<tr><td style="text-align:left;padding:2px 0">${item.quantity}× ${escapeHtml(item.name)}</td><td style="text-align:right;padding:2px 0">${escapeHtml(formatCurrency(getItemPrice(item) * item.quantity))}</td></tr>`
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Pedido #${order.id.slice(0, 8)}</title>
        <style>
          @page { margin: 0; size: 80mm auto; }
          body { font-family: 'Courier New', monospace; font-size: 12px; width: 72mm; margin: 4mm auto; color: #000; }
          h2 { text-align: center; font-size: 14px; margin: 0 0 8px; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          table { width: 100%; border-collapse: collapse; }
          .total { font-size: 14px; font-weight: bold; }
          .info { font-size: 11px; margin: 2px 0; }
          .center { text-align: center; }
        </style>
      </head>
      <body>
        <h2>PEDIDO #${order.id.slice(0, 8).toUpperCase()}</h2>
        <p class="center info">${formatDate(order.createdAt)}</p>
        <p class="center info"><strong>${status.label.toUpperCase()}</strong></p>
        <div class="divider"></div>
        <p class="info"><strong>Cliente:</strong> ${escapeHtml(order.customerName)}</p>
        <p class="info"><strong>Endereço:</strong> ${escapeHtml(order.deliveryAddress || '—')}</p>
        <p class="info"><strong>CEP:</strong> ${escapeHtml(order.cep || '—')}</p>
        <p class="info"><strong>Pagamento:</strong> ${PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod}</p>
        <div class="divider"></div>
        <table>${itemsHtml}</table>
        <div class="divider"></div>
        <table>
          <tr><td>Subtotal</td><td style="text-align:right">${formatCurrency(order.subtotal)}</td></tr>
          ${order.deliveryFee > 0 ? `<tr><td>Entrega</td><td style="text-align:right">${formatCurrency(order.deliveryFee)}</td></tr>` : ''}
          <tr class="total"><td>TOTAL</td><td style="text-align:right">${formatCurrency(order.total)}</td></tr>
        </table>
        <div class="divider"></div>
        <p class="center info">Obrigado pela preferência!</p>
        <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'pedidos'), orderBy('createdAt', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedOrders: Order[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data
        } as Order;
      });

      if (!isFirstLoad.current && soundEnabled) {
        for (const order of loadedOrders) {
          if (order.paymentStatus === 'pending' && !knownOrderIds.current.has(order.id)) {
            playNotificationBeep();
            break;
          }
        }
      }

      knownOrderIds.current = new Set(loadedOrders.map((o) => o.id));
      isFirstLoad.current = false;
      setOrders(loadedOrders);
      setIsLoading(false);
      setError(null);
    }, (err) => {
      setError('Não foi possível carregar os pedidos. Verifique suas permissões.');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [soundEnabled]);

  const filteredOrders = orders
    .filter((o) => filter === 'all' || o.paymentStatus === filter)
    .filter((o) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return o.customerName.toLowerCase().includes(q) || o.id.toLowerCase().includes(q) || o.deliveryAddress.toLowerCase().includes(q);
    });

  const counts = {
    all: orders.length,
    pending: orders.filter((o) => o.paymentStatus === 'pending').length,
    preparing: orders.filter((o) => o.paymentStatus === 'preparing').length,
    shipped: orders.filter((o) => o.paymentStatus === 'shipped').length,
    delivered: orders.filter((o) => o.paymentStatus === 'delivered').length,
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-[800] text-primary flex items-center gap-2"><ClipboardList size={22} /> Pedidos</h1>
          <p className="text-muted text-[13px] mt-1">Acompanhe os pedidos em tempo real.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input type="text" placeholder="Buscar pedido..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full sm:w-[220px] bg-[#F0F2F2] border border-transparent rounded-lg pl-9 pr-4 py-2.5 text-[13px] outline-none focus:border-primary focus:bg-white transition-colors" />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted opacity-50" size={16} />
          </div>
          <button onClick={() => { setSoundEnabled(!soundEnabled); if (!soundEnabled) playNotificationBeep(); }} className={`p-2.5 rounded-lg border transition-colors ${soundEnabled ? 'bg-primary/10 border-primary text-primary' : 'bg-gray-100 border-transparent text-muted'}`}>
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTER_OPTIONS.map((opt) => (
          <button key={opt.id} onClick={() => setFilter(opt.id)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${filter === opt.id ? 'bg-primary text-white shadow-sm' : 'bg-white text-muted border border-border hover:bg-gray-50'}`}>
            {opt.label} <span className="ml-1.5 opacity-70">({(counts as any)[opt.id] ?? 0})</span>
          </button>
        ))}
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-center gap-2"><span>⚠️</span> {error}</div>}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <OrderSkeleton key={i} />)}</div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <Package size={48} className="mx-auto mb-4 text-muted opacity-30" />
          <p className="text-muted font-medium">{filter !== 'all' ? `Nenhum pedido com status "${FILTER_OPTIONS.find((f) => f.id === filter)?.label}".` : 'Nenhum pedido recebido ainda.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrders.map((order) => <OrderCard key={order.id} order={order} onPrint={handlePrint} onUpdateStatus={handleUpdateStatus} />)}
        </div>
      )}
    </div>
  );
};
