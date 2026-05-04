// src/components/checkout/CheckoutModal.tsx
// ============================================================
// Modal principal do checkout — Orquestrado via Mercado Pago Bricks.
// Utiliza Payment Brick para seleção/pagamento e Status Brick para pós-pagamento.
// ============================================================

import React from 'react';
import { X } from 'lucide-react';
import { usePaymentStore } from '../../store/usePaymentStore';
import { PaymentBrick } from './PaymentBrick';
import { StatusScreenBrick } from './StatusScreenBrick';
import { WalletBrick } from './WalletBrick';
import type { CartItem } from '../../types';

interface CheckoutModalProps {
  customerName: string;
  customerEmail: string;
  customerCpf: string;
  deliveryAddress: string;
  cep: string;
  storeId: string;
  storeLabel: string;
  distanceKm: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  items: CartItem[];
  onClose: () => void;
  onSuccess: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  customerName,
  customerEmail,
  customerCpf,
  deliveryAddress,
  cep,
  storeId,
  storeLabel,
  distanceKm,
  subtotal,
  deliveryFee,
  total,
  items,
  onClose,
  onSuccess,
}) => {
  const { status, mpPaymentId, isCheckoutOpen } = usePaymentStore();

  if (!isCheckoutOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900">Finalizar Pedido</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Total: <strong className="text-primary">R$ {total.toFixed(2).replace('.', ',')}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Fechar"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
          
          {/* 1. Opções de Pagamento */}
          {status === 'idle' && (
            <div className="space-y-6">
              {/* Wallet Brick (Express) */}
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <p className="text-[11px] font-bold text-blue-600 uppercase tracking-widest mb-3 text-center">
                  Pagamento Rápido
                </p>
                <WalletBrick
                  total={total}
                  items={items}
                  customerEmail={customerEmail}
                  customerName={customerName}
                  customerCpf={customerCpf}
                  deliveryAddress={deliveryAddress}
                  cep={cep}
                  storeId={storeId}
                  distanceKm={distanceKm}
                  subtotal={subtotal}
                  deliveryFee={deliveryFee}
                />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-gray-400 font-medium">Ou pague com Pix ou Cartão</span>
                </div>
              </div>

              {/* Payment Brick (Multi-method) */}
              <PaymentBrick
                total={total}
                items={items}
                customerEmail={customerEmail}
                customerCpf={customerCpf}
                customerName={customerName}
                storeId={storeId}
                distanceKm={distanceKm}
                onSuccess={onSuccess}
              />
            </div>
          )}

          {/* 2. Processando */}
          {status === 'processing' && (
            <div className="flex flex-col items-center gap-4 py-12">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-semibold text-gray-600">Processando pagamento...</p>
              <p className="text-xs text-gray-400 text-center">
                Aguarde alguns segundos. Estamos validando sua transação com segurança.
              </p>
            </div>
          )}

          {/* 3. Status Final ou Pix Pendente (Brick) */}
          {(status === 'approved' || status === 'rejected' || status === 'pending') && mpPaymentId && (
            <div className="space-y-4">
              <StatusScreenBrick
                paymentId={mpPaymentId}
                onSuccess={onSuccess}
              />
              
              {/* Botão de conclusão para quando estiver aprovado */}
              {status === 'approved' && (
                <div className="px-4 pb-4">
                  <button
                    onClick={onSuccess}
                    className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-extrabold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 animate-bounce"
                  >
                    🚀 FINALIZAR E IR PARA WHATSAPP
                  </button>
                  <p className="text-[10px] text-gray-400 text-center mt-2 uppercase tracking-tighter">
                    Clique acima para enviar o comprovante e os detalhes do pedido
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 4. Erro Genérico */}
          {status === 'error' && (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
                <X size={32} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Algo deu errado</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Não conseguimos processar o carregamento do checkout. 
                  Tente atualizar a página ou entre em contato.
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          )}
        </div>

        {/* Footer Informativo */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-center gap-4">
          <div className="flex items-center gap-1.5 opacity-50 grayscale">
             {/* Simulação de logos de pagamento */}
             <img src="https://img.icons8.com/color/48/000000/visa.png" className="h-6" alt="Visa" />
             <img src="https://img.icons8.com/color/48/000000/mastercard.png" className="h-6" alt="Mastercard" />
             <img src="https://img.icons8.com/color/48/000000/pix.png" className="h-6" alt="Pix" />
          </div>
          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
            Pagamento 100% Seguro via Mercado Pago
          </span>
        </div>
      </div>
    </div>
  );
};
