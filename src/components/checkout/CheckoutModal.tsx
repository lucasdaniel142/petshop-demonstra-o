// src/components/checkout/CheckoutModal.tsx
// ============================================================
// Modal principal do checkout — orquestra o fluxo de pagamento.
// Step 1: Escolher método (Pix ou Cartão)
// Step 2: Formulário do método escolhido
// Step 3: Status do pagamento
// ============================================================

import React from 'react';
import { X, CreditCard, QrCode } from 'lucide-react';
import { usePaymentStore } from '../../store/usePaymentStore';
import { CardForm } from './CardForm';
import { PixPayment } from './PixPayment';
import { PaymentStatusView } from './PaymentStatus';
import type { PaymentMethodType } from '../../types';

interface CheckoutModalProps {
  customerName: string;
  customerEmail: string;
  customerCpf: string;
  deliveryAddress: string;
  cep: string;
  storeId: string;
  storeLabel: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  items: any[];
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
  subtotal,
  deliveryFee,
  total,
  items,
  onClose,
  onSuccess,
}) => {
  const { status, method, setMethod, isCheckoutOpen } = usePaymentStore();

  if (!isCheckoutOpen) return null;

  const handleSelectMethod = (m: PaymentMethodType) => {
    setMethod(m);
  };

  const commonProps = {
    customerName,
    customerEmail,
    customerCpf,
    deliveryAddress,
    cep,
    storeId,
    storeLabel,
    subtotal,
    deliveryFee,
    total,
    items,
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900">Pagamento Online</h2>
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
        <div className="flex-1 overflow-y-auto p-6">
          {/* Status final (aprovado/rejeitado/erro) */}
          {(status === 'approved' || status === 'rejected' || status === 'error') && (
            <PaymentStatusView onClose={onClose} onRetry={() => setMethod(method!)} onSuccess={onSuccess} />
          )}

          {/* Pix pendente — mostra QR Code */}
          {status === 'pending' && method === 'pix' && (
            <PixPayment />
          )}

          {/* Processando */}
          {status === 'processing' && (
            <div className="flex flex-col items-center gap-4 py-12">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-semibold text-gray-600">Processando pagamento...</p>
              <p className="text-xs text-gray-400">Não feche esta janela</p>
            </div>
          )}

          {/* Escolha do método */}
          {status === 'idle' && !method && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-4">Escolha a forma de pagamento:</p>

              <button
                onClick={() => handleSelectMethod('pix')}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-primary hover:bg-primary/5 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center group-hover:bg-teal-100 transition-colors">
                  <QrCode size={24} className="text-teal-600" />
                </div>
                <div className="text-left">
                  <span className="font-bold text-gray-900">Pix</span>
                  <p className="text-xs text-gray-500">Pagamento instantâneo via QR Code</p>
                </div>
                <span className="ml-auto text-xs font-semibold text-teal-600 bg-teal-50 px-2 py-1 rounded-full">
                  Aprovação imediata
                </span>
              </button>

              <button
                onClick={() => handleSelectMethod('credit_card')}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-primary hover:bg-primary/5 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <CreditCard size={24} className="text-blue-600" />
                </div>
                <div className="text-left">
                  <span className="font-bold text-gray-900">Cartão de Crédito</span>
                  <p className="text-xs text-gray-500">Visa, Mastercard, Elo, Amex</p>
                </div>
              </button>
            </div>
          )}

          {/* Formulário do cartão */}
          {(status === 'idle' && method === 'credit_card') && (
            <CardForm {...commonProps} />
          )}

          {/* Formulário Pix (direto, sem campos extras) */}
          {(status === 'idle' && method === 'pix') && (
            <div className="space-y-4">
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                <p className="text-sm text-teal-800">
                  <strong>Pix</strong> — Ao confirmar, um QR Code será gerado para você escanear com o app do seu banco.
                </p>
              </div>

              {/* Resumo do pedido */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Taxa de entrega</span>
                    <span>R$ {deliveryFee.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-900">
                  <span>Total</span>
                  <span>R$ {total.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>

              <button
                onClick={async () => {
                  const { setProcessing, setPixPending, setError } = usePaymentStore.getState();
                  setProcessing();

                  try {
                    const res = await fetch('/api/payment', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        method: 'pix',
                        amount: total,
                        email: customerEmail,
                        cpf: customerCpf,
                        description: `Pedido — ${storeLabel}`,
                      }),
                    });

                    const data = await res.json();

                    if (!res.ok) {
                      setError(data.error || 'Erro ao gerar Pix');
                      return;
                    }

                    setPixPending({
                      mpPaymentId: data.paymentId,
                      orderId: data.paymentId.toString(),
                      pixQrBase64: data.pixQrBase64,
                      pixCode: data.pixCode,
                      pixExpiration: data.pixExpiration,
                    });
                  } catch {
                    setError('Erro de conexão. Tente novamente.');
                  }
                }}
                className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <QrCode size={20} />
                Gerar QR Code Pix
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
