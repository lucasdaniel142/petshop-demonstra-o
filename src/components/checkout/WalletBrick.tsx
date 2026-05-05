// src/components/checkout/WalletBrick.tsx
// ============================================================
// Wallet Brick — Pagamento rápido via conta Mercado Pago.
// Erros são tratados LOCALMENTE para não bloquear o Payment Brick.
// ============================================================

import React, { useEffect, useRef, useState } from 'react';

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
  // FIX: Erro local — não afeta o estado global do checkout
  const [localError, setLocalError] = useState<string | null>(null);

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

        if (!res.ok) {
          setLocalError('Pagamento rápido indisponível.');
          return;
        }

        const data = await res.json();
        if (data.id) {
          setPreferenceId(data.id);
        } else {
          setLocalError('Pagamento rápido indisponível.');
        }
      } catch {
        // FIX: Em localhost, /api/preference não existe — erro local, não bloqueia checkout
        setLocalError('Pagamento rápido indisponível no momento.');
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
        await loadMercadoPago();
        
        // @ts-ignore — SDK é carregado em window.MercadoPago
        const mpInstance = new window.MercadoPago(import.meta.env.VITE_MP_PUBLIC_KEY, { locale: 'pt-BR' });
        const bricksBuilder = mpInstance.bricks();

        const settings = {
          initialization: {
            preferenceId: preferenceId,
          },
          customization: {
            visual: {
              borderRadius: '12px',
            },
          },
          callbacks: {
            onReady: () => {
              if (import.meta.env.DEV) console.log('Wallet Brick ready');
            },
            onError: (error: any) => {
              if (import.meta.env.DEV) console.error('Wallet Brick Error:', error);
            },
          },
        };

        if (mounted && containerRef.current) {
          brickControllerRef.current = await bricksBuilder.create('wallet', 'wallet-brick-container', settings);
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error('Failed to load MP SDK:', err);
        setLocalError('Pagamento rápido indisponível.');
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

  // Se falhou, mostra mensagem discreta (não bloqueia o resto do checkout)
  if (localError) {
    return (
      <div className="text-center py-3 text-xs text-gray-400 italic">
        {localError}
      </div>
    );
  }

  return (
    <div id="wallet-brick-container" ref={containerRef}>
      {!preferenceId && (
        <div className="h-12 w-full bg-gray-100 animate-pulse rounded-xl" />
      )}
    </div>
  );
};
