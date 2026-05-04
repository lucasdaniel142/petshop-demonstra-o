// src/components/checkout/PaymentStatus.tsx
// ============================================================
// Tela de status final do pagamento:
// ✅ Aprovado  |  ❌ Recusado  |  ⚠️ Erro
// ============================================================

import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, ShoppingBag, RotateCcw, MessageCircle } from 'lucide-react';
import { usePaymentStore } from '../../store/usePaymentStore';
import { generateWhatsAppLink, STORE_WHATSAPP_NUMBERS } from '../../utils/whatsapp';
import type { CartItem, StoreId } from '../../types';

interface PaymentStatusViewProps {
  onClose: () => void;
  onRetry: () => void;
  onSuccess: () => void;
  // Dados para fallback WhatsApp
  items?: CartItem[];
  subtotal?: number;
  deliveryFee?: number;
  customerName?: string;
  deliveryAddress?: string;
  storeId?: string;
  storeLabel?: string;
}

export const PaymentStatusView: React.FC<PaymentStatusViewProps> = ({
  onClose,
  onRetry,
  onSuccess,
  items = [],
  subtotal = 0,
  deliveryFee = 0,
  customerName = 'Cliente',
  deliveryAddress = '',
  storeId = 'benedito_bentes',
  storeLabel = 'Loja',
}) => {
  const { status, errorMessage, mpPaymentId, reset } = usePaymentStore();

  /** Abre o WhatsApp com a mensagem formatada do pedido como fallback */
  const handleWhatsAppFallback = () => {
    const storePhone = STORE_WHATSAPP_NUMBERS[storeId as StoreId] || '';
    if (!storePhone) {
      alert('Número de WhatsApp da loja não configurado. Entre em contato diretamente.');
      return;
    }
    const link = generateWhatsAppLink(
      items,
      subtotal,
      customerName,
      deliveryAddress,
      'Pagamento online falhou',
      storeLabel,
      storePhone,
      deliveryFee,
      'delivery'
    );
    if (link) {
      window.open(link, '_blank');
      reset();
      onClose();
    }
  };

  if (status === 'approved') {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle2 size={40} className="text-green-600" />
        </div>
        <h3 className="text-xl font-extrabold text-gray-900">Pagamento Aprovado!</h3>
        <p className="text-sm text-gray-500 text-center max-w-xs">
          Seu pedido foi confirmado e está sendo preparado.
          {mpPaymentId && (
            <span className="block mt-1 text-xs text-gray-400">
              ID: #{mpPaymentId}
            </span>
          )}
        </p>
        <button
          onClick={() => {
            reset();
            onSuccess();
          }}
          className="mt-4 px-8 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition-colors flex items-center gap-2"
        >
          <ShoppingBag size={18} />
          Voltar à Loja
        </button>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
          <XCircle size={40} className="text-red-600" />
        </div>
        <h3 className="text-xl font-extrabold text-gray-900">Pagamento Recusado</h3>
        <p className="text-sm text-gray-500 text-center max-w-xs">
          {errorMessage || 'O pagamento não foi aprovado. Verifique os dados e tente novamente.'}
        </p>
         <div className="flex flex-col gap-3 mt-4">
          <div className="flex gap-3">
            <button
              onClick={() => {
                reset();
                onRetry();
              }}
              className="px-6 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition-colors flex items-center gap-2"
            >
              <RotateCcw size={18} />
              Tentar Novamente
            </button>
            <button
              onClick={() => {
                reset();
                onClose();
              }}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
            >
              Cancelar
            </button>
          </div>
          {/* Fallback WhatsApp — não perder a venda */}
          {items.length > 0 && (
            <button
              onClick={handleWhatsAppFallback}
              className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <MessageCircle size={18} />
              Finalizar pelo WhatsApp
            </button>
          )}
        </div>
      </div>
    );
  }

  // Error genérico
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
        <AlertTriangle size={40} className="text-amber-600" />
      </div>
      <h3 className="text-xl font-extrabold text-gray-900">Erro no Pagamento</h3>
      <p className="text-sm text-gray-500 text-center max-w-xs">
        {errorMessage || 'Ocorreu um erro inesperado. Tente novamente.'}
      </p>
      <button
        onClick={() => {
          reset();
          onRetry();
        }}
        className="mt-4 px-8 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition-colors flex items-center gap-2"
      >
        <RotateCcw size={18} />
        Tentar Novamente
      </button>
      {/* Fallback WhatsApp — não perder a venda */}
      {items.length > 0 && (
        <button
          onClick={handleWhatsAppFallback}
          className="mt-2 w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <MessageCircle size={18} />
          Finalizar pelo WhatsApp
        </button>
      )}
    </div>
  );
};
