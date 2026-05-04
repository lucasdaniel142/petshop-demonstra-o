// src/components/checkout/WalletBrick.tsx
import React, { useEffect, useRef, useState } from 'react';
import { usePaymentStore } from '../../store/usePaymentStore';

interface WalletBrickProps {
  total: number;
  items: any[];
  customerEmail: string;
  customerName: string;
  customerCpf: string;
  deliveryAddress: string;
  cep: string;
  storeId: string;
  distanceKm: number;
  subtotal: number;
  deliveryFee: number;
}

export const WalletBrick: React.FC<WalletBrickProps> = ({
  total,
  items,
  customerEmail,
  customerName,
  customerCpf,
  deliveryAddress,
  cep,
  storeId,
  distanceKm,
  subtotal,
  deliveryFee,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const brickControllerRef = useRef<any>(null);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const { setError } = usePaymentStore();

  useEffect(() => {
    const fetchPreference = async () => {
      try {
        const res = await fetch('/api/preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items,
            total,
            customerEmail,
            customerName,
            customerCpf,
            deliveryAddress,
            cep,
            storeId,
            distanceKm,
            subtotal,
            deliveryFee,
          }),
        });
        const data = await res.json();
        if (data.id) {
          setPreferenceId(data.id);
        } else {
          setError('Erro ao gerar link de pagamento Mercado Pago.');
        }
      } catch {
        setError('Erro de conexão ao gerar pagamento.');
      }
    };

    fetchPreference();
  }, [total, customerEmail]);

  useEffect(() => {
    if (!preferenceId) return;

    let mounted = true;

    const initBrick = async () => {
      try {
        const { loadMercadoPago } = await import('@mercadopago/sdk-js');
        const mp = await loadMercadoPago();
        
        // @ts-ignore
        const mpInstance = new mp.MercadoPago(import.meta.env.VITE_MP_PUBLIC_KEY, { locale: 'pt-BR' });
        const bricksBuilder = mpInstance.bricks();

        const settings = {
          initialization: {
            preferenceId: preferenceId,
          },
          customization: {
            visual: {
              buttonBackground: 'default', // 'default' | 'black' | 'blue' | 'white'
              borderRadius: '12px',
            },
          },
          callbacks: {
            onReady: () => {
              console.log('Wallet Brick ready');
            },
            onError: (error: any) => {
              console.error('Wallet Brick Error:', error);
            },
          },
        };

        if (mounted && containerRef.current) {
          brickControllerRef.current = await bricksBuilder.create('wallet', 'wallet-brick-container', settings);
        }
      } catch (err) {
        console.error('Failed to load MP SDK:', err);
      }
    };

    initBrick();

    return () => {
      mounted = false;
      if (brickControllerRef.current) {
        brickControllerRef.current.unmount();
      }
    };
  }, [preferenceId]);

  return (
    <div id="wallet-brick-container" ref={containerRef}>
      {!preferenceId && (
        <div className="h-12 w-full bg-gray-100 animate-pulse rounded-xl" />
      )}
    </div>
  );
};
