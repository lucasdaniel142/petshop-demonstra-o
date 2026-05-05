// src/components/checkout/PaymentBrick.tsx
import React, { useEffect, useRef } from 'react';
import { usePaymentStore } from '../../store/usePaymentStore';
import type { CartItem } from '../../types';

interface PaymentBrickProps {
  total: number;
  items: CartItem[];
  customerEmail: string;
  customerCpf: string;
  customerName: string;
  storeId: string;
  distanceKm: number;
  onSuccess: () => void;
}

export const PaymentBrick: React.FC<PaymentBrickProps> = ({
  total,
  items,
  customerEmail,
  customerCpf,
  customerName,
  storeId,
  distanceKm,
  onSuccess,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const brickControllerRef = useRef<any>(null);
  const { setProcessing, setPixPending, setApproved, setRejected, setError } = usePaymentStore();

  useEffect(() => {
    let mounted = true;

    const initBrick = async () => {
      try {
        const { loadMercadoPago } = await import('@mercadopago/sdk-js');
        await loadMercadoPago();
        
        const publicKey = import.meta.env.VITE_MP_PUBLIC_KEY;
        if (!publicKey) {
          setError('Chave pública do Mercado Pago não configurada.');
          return;
        }

        // @ts-ignore — SDK é carregado em window.MercadoPago
        const mpInstance = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
        const bricksBuilder = mpInstance.bricks();

        const renderPaymentBrick = async (builder: any) => {
          const settings = {
            initialization: {
              amount: total,
              payer: {
                email: customerEmail,
                identification: {
                  type: 'CPF',
                  number: customerCpf.replace(/\D/g, ''),
                },
                firstName: customerName.split(' ')[0],
                lastName: customerName.split(' ').slice(1).join(' ') || ' ',
              },
            },
            customization: {
              paymentMethods: {
                ticket: 'all',
                bankTransfer: 'all',
                creditCard: 'all',
                debitCard: 'all',
                mercadoPago: 'all',
              },
              visual: {
                style: {
                  theme: 'default',
                },
              },
            },
            callbacks: {
              onReady: () => {
                if (import.meta.env.DEV) console.log('Payment Brick ready');
              },
              onSubmit: async (formData: any) => {
                setProcessing();
                try {
                  const res = await fetch('/api/payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      ...formData, // Inclui o payload do Brick (token, installments, etc)
                      items: items.map(i => ({ id: i.id, quantity: i.quantity })),
                      storeId,
                      distanceKm,
                      customerName,
                      email: customerEmail,
                      cpf: customerCpf,
                    }),
                  });

                  const data = await res.json();

                  if (!res.ok) {
                    setRejected(data.error || 'Erro ao processar pagamento.');
                    return;
                  }

                  if (data.status === 'approved') {
                    setApproved(data.paymentId, data.orderId);
                    // O onSuccess será chamado pelo botão no CheckoutModal após o usuário ver a tela de sucesso
                  } else if (data.pixQrBase64) {
                    setPixPending({
                      mpPaymentId: data.paymentId,
                      orderId: data.orderId,
                      pixQrBase64: data.pixQrBase64,
                      pixCode: data.pixCode,
                      pixExpiration: data.pixExpiration,
                    });
                  } else {
                    setRejected(data.statusDetail || 'Pagamento não aprovado.');
                  }
                } catch (err) {
                  setError('Erro de conexão com o servidor.');
                }
              },
              onError: (error: any) => {
                if (import.meta.env.DEV) console.error('Payment Brick Error:', error);
                setError('Erro ao carregar o checkout do Mercado Pago.');
              },
            },
          };

          if (mounted && containerRef.current) {
            brickControllerRef.current = await builder.create('payment', 'payment-brick-container', settings);
          }
        };

        await renderPaymentBrick(bricksBuilder);
      } catch (err) {
        if (import.meta.env.DEV) console.error('Failed to load MP SDK:', err);
        setError('Erro ao inicializar o sistema de pagamentos.');
      }
    };

    initBrick();

    return () => {
      mounted = false;
      if (brickControllerRef.current) {
        brickControllerRef.current.unmount();
      }
    };
  }, []); // Re-render only on mount

  return (
    <div className="min-h-[400px] w-full">
      <div id="payment-brick-container" ref={containerRef}></div>
    </div>
  );
};
