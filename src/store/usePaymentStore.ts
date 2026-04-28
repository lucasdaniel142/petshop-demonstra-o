// src/store/usePaymentStore.ts
// ============================================================
// Store Zustand para gerenciar o estado do checkout/pagamento.
// Separado do carrinho para manter responsabilidades isoladas.
// ============================================================

import { create } from 'zustand';
import type { PaymentStatus, PaymentMethodType } from '../types';

interface PaymentState {
  /** Status atual do pagamento */
  status: PaymentStatus;
  /** Método escolhido pelo usuário */
  method: PaymentMethodType | null;
  /** ID do pagamento no Mercado Pago */
  mpPaymentId: number | null;
  /** ID do pedido no Firestore */
  orderId: string | null;
  /** QR Code base64 para Pix */
  pixQrBase64: string | null;
  /** Código Pix copia-e-cola */
  pixCode: string | null;
  /** Data de expiração do Pix */
  pixExpiration: string | null;
  /** Mensagem de erro */
  errorMessage: string | null;
  /** Se o modal de checkout está aberto */
  isCheckoutOpen: boolean;

  // Actions
  openCheckout: () => void;
  closeCheckout: () => void;
  setMethod: (method: PaymentMethodType) => void;
  setProcessing: () => void;
  setPixPending: (data: {
    mpPaymentId: number;
    orderId: string;
    pixQrBase64: string;
    pixCode: string;
    pixExpiration: string;
  }) => void;
  setApproved: (mpPaymentId: number, orderId: string) => void;
  setRejected: (errorMessage: string) => void;
  setError: (errorMessage: string) => void;
  reset: () => void;
}

const INITIAL_STATE = {
  status: 'idle' as PaymentStatus,
  method: null as PaymentMethodType | null,
  mpPaymentId: null as number | null,
  orderId: null as string | null,
  pixQrBase64: null as string | null,
  pixCode: null as string | null,
  pixExpiration: null as string | null,
  errorMessage: null as string | null,
  isCheckoutOpen: false,
};

export const usePaymentStore = create<PaymentState>()((set) => ({
  ...INITIAL_STATE,

  openCheckout: () => set({ isCheckoutOpen: true, status: 'idle', method: null, errorMessage: null }),

  closeCheckout: () => set({ ...INITIAL_STATE }),

  setMethod: (method) => set({ method, errorMessage: null }),

  setProcessing: () => set({ status: 'processing', errorMessage: null }),

  setPixPending: (data) => set({
    status: 'pending',
    mpPaymentId: data.mpPaymentId,
    orderId: data.orderId,
    pixQrBase64: data.pixQrBase64,
    pixCode: data.pixCode,
    pixExpiration: data.pixExpiration,
  }),

  setApproved: (mpPaymentId, orderId) => set({
    status: 'approved',
    mpPaymentId,
    orderId,
  }),

  setRejected: (errorMessage) => set({
    status: 'rejected',
    errorMessage,
  }),

  setError: (errorMessage) => set({
    status: 'error',
    errorMessage,
  }),

  reset: () => set({ ...INITIAL_STATE }),
}));
