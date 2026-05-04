// src/components/checkout/StatusScreenBrick.tsx
import React, { useEffect, useRef } from 'react';
import { usePaymentStore } from '../../store/usePaymentStore';

interface StatusScreenBrickProps {
  paymentId: number;
  onSuccess: () => void;
}

export const StatusScreenBrick: React.FC<StatusScreenBrickProps> = ({
  paymentId,
  onSuccess,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const brickControllerRef = useRef<any>(null);
  const { setError, reset } = usePaymentStore();

  useEffect(() => {
    let mounted = true;

    const initBrick = async () => {
      try {
        const { loadMercadoPago } = await import('@mercadopago/sdk-js');
        const mp = await loadMercadoPago();
        
        const publicKey = import.meta.env.VITE_MP_PUBLIC_KEY;
        if (!publicKey) {
          setError('Chave pública do Mercado Pago não configurada.');
          return;
        }

        // @ts-ignore
        const mpInstance = new mp.MercadoPago(publicKey, { locale: 'pt-BR' });
        const bricksBuilder = mpInstance.bricks();

        const renderStatusScreenBrick = async (builder: any) => {
          const settings = {
            initialization: {
              paymentId: paymentId.toString(),
            },
            callbacks: {
              onReady: () => {
                console.log('Status Screen Brick ready');
              },
              onError: (error: any) => {
                console.error('Status Screen Brick Error:', error);
                setError('Erro ao carregar o status do pagamento.');
              },
            },
            customization: {
              visual: {
                style: {
                  theme: 'default',
                  customVariables: {
                    colorPrimary: '#1e293b',
                    borderRadius: '12px',
                  }
                },
              },
              backUrls: {
                'return': window.location.origin,
              }
            },
          };

          if (mounted && containerRef.current) {
            brickControllerRef.current = await builder.create('statusScreen', 'status-screen-brick-container', settings);
          }
        };

        await renderStatusScreenBrick(bricksBuilder);
      } catch (err) {
        console.error('Failed to load MP SDK:', err);
        setError('Erro ao inicializar o status do pagamento.');
      }
    };

    initBrick();

    return () => {
      mounted = false;
      if (brickControllerRef.current) {
        brickControllerRef.current.unmount();
      }
    };
  }, [paymentId]);

  return (
    <div className="min-h-[400px] w-full">
      <div id="status-screen-brick-container" ref={containerRef}></div>
    </div>
  );
};
