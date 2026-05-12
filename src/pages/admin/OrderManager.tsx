// src/pages/admin/OrderManager.tsx
// ============================================================
// Painel de Pedidos — Lista e gerencia pedidos em tempo real.
//
// Features:
// - Listagem em tempo real via Firestore onSnapshot
// - Filtro por status (Todos / Pendente / Aprovado / Rejeitado)
// - Badge de status colorido
// - Notificação sonora ao receber pedido aprovado
// - Impressão térmica (80mm) via CSS @media print
// ============================================================

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
  Lock,
  Unlock
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';

// ── Tipos ──
interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  customerName: string;
  customerEmail: string;
  customerCpf: string;
  deliveryAddress: string;
  cep: string;
  storeId: string;
  paymentMethod: string;
  paymentStatus: string;
  mpPaymentId?: number;
  createdAt?: any;
  updatedAt?: any;
  isEncrypted?: boolean;
}

// ── Status Config ──
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  approved: { label: 'Aprovado', color: 'text-green-700', bg: 'bg-green-100' },
  pending: { label: 'Pendente', color: 'text-amber-700', bg: 'bg-amber-100' },
  processing: { label: 'Processando', color: 'text-blue-700', bg: 'bg-blue-100' },
  rejected: { label: 'Rejeitado', color: 'text-red-700', bg: 'bg-red-100' },
  cancelled: { label: 'Cancelado', color: 'text-gray-700', bg: 'bg-gray-100' },
  refunded: { label: 'Reembolsado', color: 'text-purple-700', bg: 'bg-purple-100' },
  charged_back: { label: 'Chargeback', color: 'text-red-700', bg: 'bg-red-100' },
  in_process: { label: 'Em análise', color: 'text-blue-700', bg: 'bg-blue-100' },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: '📱 Pix',
  credit_card: '💳 Cartão de Crédito',
  debit_card: '💳 Cartão de Débito',
};

const FILTER_OPTIONS = [
  { id: 'all', label: 'Todos' },
  { id: 'approved', label: 'Aprovados' },
  { id: 'pending', label: 'Pendentes' },
  { id: 'processing', label: 'Processando' },
  { id: 'rejected', label: 'Rejeitados' },
];

// ── Beep sonoro usando Web Audio API (sem arquivo externo) ──
function playNotificationBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime); // Nota A5
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);

    // Segundo beep (duplo)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1100, ctx.currentTime + 0.6);
    gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.6);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.1);
    osc2.start(ctx.currentTime + 0.6);
    osc2.stop(ctx.currentTime + 1.1);
  } catch {
    // Web Audio API não disponível — silenciar
  }
}

// ── Formatação ──
function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
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

// ── Skeleton ──
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

// ── Componente de Card de Pedido ──
const OrderCard: React.FC<{ 
  order: Order; 
  decryptedData?: any;
  isDecrypting?: boolean;
  onDecrypt: (id: string) => void;
  onPrint: (order: Order, decData?: any) => void;
}> = ({
  order,
  decryptedData,
  isDecrypting,
  onDecrypt,
  onPrint,
}) => {
  const status = STATUS_CONFIG[order.paymentStatus] || {
    label: order.paymentStatus,
    color: 'text-gray-700',
    bg: 'bg-gray-100',
  };

  const isSecured = order.isEncrypted && !decryptedData;

  const customerName = decryptedData ? decryptedData.customerName : (isSecured ? '*** DADO PROTEGIDO ***' : order.customerName);
  const customerEmail = decryptedData ? decryptedData.customerEmail : (isSecured ? '***' : order.customerEmail);
  const deliveryAddress = decryptedData ? decryptedData.deliveryAddress : (isSecured ? '*** ENDEREÇO PROTEGIDO ***' : order.deliveryAddress);

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Header */}
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
          {isSecured ? (
            <button
              onClick={() => onDecrypt(order.id)}
              disabled={isDecrypting}
              className="px-2 py-1 bg-primary text-white text-[10px] font-bold rounded hover:bg-primary-dark transition-colors flex items-center gap-1 disabled:opacity-50"
              title="Descriptografar PII"
            >
              <Lock size={12} />
              {isDecrypting ? 'Lendo...' : 'Descriptografar'}
            </button>
          ) : (
            <button
              onClick={() => onPrint(order, decryptedData)}
              className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
              aria-label="Imprimir pedido"
              title="Imprimir"
            >
              <Printer size={14} className="text-muted" />
            </button>
          )}
          <button
            onClick={async () => {
              if (window.confirm('Tem certeza que deseja EXCLUIR permanentemente este pedido?')) {
                try {
                  const { deleteDoc, doc } = await import('firebase/firestore');
                  const { db } = await import('../../lib/firebase');
                  await deleteDoc(doc(db, 'pedidos', order.id));
                } catch (err) {
                  alert('Erro ao excluir pedido.');
                  console.error(err);
                }
              }
            }}
            className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
            aria-label="Excluir pedido"
            title="Excluir"
          >
            <Trash2 size={14} className="text-red-500" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-3">
        {/* Cliente */}
        <div className="flex items-start gap-2 text-sm">
          <User size={14} className="text-muted mt-0.5 shrink-0" />
          <div>
            <span className={`font-semibold ${isSecured ? 'text-primary' : 'text-text'}`}>
              {customerName}
            </span>
            {customerEmail && (
              <span className="text-muted text-xs ml-2">{customerEmail}</span>
            )}
          </div>
        </div>

        {/* Endereço */}
        {deliveryAddress && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin size={14} className="text-muted mt-0.5 shrink-0" />
            <span className={`text-xs ${isSecured ? 'text-primary font-medium' : 'text-muted'}`}>
              {deliveryAddress}
            </span>
          </div>
        )}

        {/* Método de pagamento */}
        <div className="flex items-center gap-2 text-sm">
          <CreditCard size={14} className="text-muted shrink-0" />
          <span className="text-xs text-muted">
            {PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod}
          </span>
        </div>

        {/* Itens */}
        <div className="border-t border-dashed border-gray-200 pt-3 space-y-1.5">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-xs">
              <span className="text-text">
                {item.quantity}× {item.name}
              </span>
              <span className="text-muted font-medium">
                {formatCurrency(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>

        {/* Totais */}
        <div className="border-t border-gray-200 pt-3 space-y-1">
          <div className="flex justify-between text-xs text-muted">
            <span>Subtotal</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          {order.deliveryFee > 0 && (
            <div className="flex justify-between text-xs text-muted">
              <span>Entrega</span>
              <span>{formatCurrency(order.deliveryFee)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold text-text pt-1">
            <span>Total</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Componente Principal ──
export const OrderManager: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [decryptedOrders, setDecryptedOrders] = useState<Record<string, any>>({});
  const [decryptingIds, setDecryptingIds] = useState<Record<string, boolean>>({});

  // Rastreia IDs conhecidos para detectar novos pedidos
  const knownOrderIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  // ── Decrypt Logic ──
  const handleDecrypt = async (orderId: string) => {
    setDecryptingIds(prev => ({ ...prev, [orderId]: true }));
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Sessão expirada. Faça login novamente.');

      const response = await fetch('/api/admin/decrypt-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ orderId })
      });

      const data = await response.json();
      if (data.success) {
        setDecryptedOrders(prev => ({ ...prev, [orderId]: data.decryptedData }));
      } else {
        alert(data.error || 'Erro ao descriptografar');
      }
    } catch (err: any) {
      alert(err.message || 'Erro de conexão.');
    } finally {
      setDecryptingIds(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // ── Impressão Térmica ──
  const handlePrint = useCallback((order: Order, decData?: any) => {
    const status = STATUS_CONFIG[order.paymentStatus] || { label: order.paymentStatus };
    
    // Usa os dados descriptografados se existirem
    const customerName = decData ? decData.customerName : order.customerName;
    const deliveryAddress = decData ? decData.deliveryAddress : order.deliveryAddress;
    const cep = decData ? decData.cep : order.cep;

    const printWindow = window.open('', '_blank', 'width=302,height=600');
    if (!printWindow) return;

    const itemsHtml = order.items
      .map(
        (item) =>
          `<tr>
            <td style="text-align:left;padding:2px 0">${item.quantity}× ${item.name}</td>
            <td style="text-align:right;padding:2px 0">${formatCurrency(item.price * item.quantity)}</td>
          </tr>`
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
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            width: 72mm;
            margin: 4mm auto;
            padding: 0;
            color: #000;
          }
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
        <p class="info"><strong>Cliente:</strong> ${customerName}</p>
        <p class="info"><strong>Endereço:</strong> ${deliveryAddress || '—'}</p>
        <p class="info"><strong>CEP:</strong> ${cep || '—'}</p>
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

  // ── Firestore Listener ──
  useEffect(() => {
    const q = query(
      collection(db, 'pedidos'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loadedOrders: Order[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            items: data.items || [],
            subtotal: data.subtotal || 0,
            deliveryFee: data.deliveryFee || 0,
            total: data.total || 0,
            customerName: data.customerName || 'Cliente',
            customerEmail: data.customerEmail || '',
            customerCpf: data.customerCpf || '',
            deliveryAddress: data.deliveryAddress || '',
            cep: data.cep || '',
            storeId: data.storeId || '',
            paymentMethod: data.paymentMethod || '',
            paymentStatus: data.paymentStatus || 'processing',
            mpPaymentId: data.mpPaymentId,
            isEncrypted: data.isEncrypted || false,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        });

        // Detectar novos pedidos aprovados para notificação sonora
        if (!isFirstLoad.current && soundEnabled) {
          for (const order of loadedOrders) {
            if (
              order.paymentStatus === 'approved' &&
              !knownOrderIds.current.has(order.id)
            ) {
              playNotificationBeep();
              break; // Um beep por batch
            }
          }
        }

        // Atualizar IDs conhecidos
        knownOrderIds.current = new Set(loadedOrders.map((o) => o.id));
        isFirstLoad.current = false;

        setOrders(loadedOrders);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Erro ao buscar pedidos:', err);
        setError('Não foi possível carregar os pedidos. Verifique suas permissões.');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [soundEnabled]);

  // ── Filtro e Busca ──
  const filteredOrders = orders
    .filter((o) => filter === 'all' || o.paymentStatus === filter)
    .filter((o) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        o.customerName.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        o.deliveryAddress.toLowerCase().includes(q)
      );
    });

  // Contadores por status
  const counts = {
    all: orders.length,
    approved: orders.filter((o) => o.paymentStatus === 'approved').length,
    pending: orders.filter((o) => o.paymentStatus === 'pending').length,
    processing: orders.filter((o) => o.paymentStatus === 'processing').length,
    rejected: orders.filter((o) => o.paymentStatus === 'rejected').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-[800] text-primary flex items-center gap-2">
            <ClipboardList size={22} />
            Pedidos
          </h1>
          <p className="text-muted text-[13px] mt-1">
            Acompanhe os pedidos em tempo real. {orders.length} pedido{orders.length !== 1 ? 's' : ''} carregado{orders.length !== 1 ? 's' : ''}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Busca */}
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar pedido..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-[220px] bg-[#F0F2F2] border border-transparent rounded-lg pl-9 pr-4 py-2.5 text-[13px] outline-none focus:border-primary focus:bg-white transition-colors"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted opacity-50" size={16} />
          </div>

          {/* Alerta sonoro */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playNotificationBeep(); // Preview do som
            }}
            className={`p-2.5 rounded-lg border transition-colors ${
              soundEnabled
                ? 'bg-primary/10 border-primary text-primary'
                : 'bg-gray-100 border-transparent text-muted'
            }`}
            title={soundEnabled ? 'Som de notificação ligado' : 'Som de notificação desligado'}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </div>

      {/* Filtros por status */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setFilter(opt.id)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              filter === opt.id
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white text-muted border border-border hover:bg-gray-50'
            }`}
          >
            {opt.label}
            <span className="ml-1.5 opacity-70">
              ({counts[opt.id as keyof typeof counts] ?? 0})
            </span>
          </button>
        ))}
      </div>

      {/* Erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Lista de Pedidos */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <OrderSkeleton key={i} />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <Package size={48} className="mx-auto mb-4 text-muted opacity-30" />
          <p className="text-muted font-medium">
            {filter !== 'all'
              ? `Nenhum pedido com status "${FILTER_OPTIONS.find((f) => f.id === filter)?.label}".`
              : 'Nenhum pedido recebido ainda.'}
          </p>
          <p className="text-xs text-muted mt-1">
            Os pedidos aparecerão aqui automaticamente quando forem realizados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrders.map((order) => (
            <OrderCard 
              key={order.id} 
              order={order} 
              decryptedData={decryptedOrders[order.id]}
              isDecrypting={decryptingIds[order.id]}
              onDecrypt={handleDecrypt}
              onPrint={handlePrint} 
            />
          ))}
        </div>
      )}
    </div>
  );
};
