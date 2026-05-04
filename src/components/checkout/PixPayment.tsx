// src/components/checkout/PixPayment.tsx
// ============================================================
// Componente de pagamento Pix: QR Code + Copia e Cola + polling.
//
// - Exibe o QR Code base64 retornado pelo Mercado Pago
// - Botão "Copiar código Pix" usa a Clipboard API
// - Timer visual de 15 minutos
// - Polling a cada 5s como fallback ao webhook
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Copy, CheckCircle2, Timer, QrCode } from 'lucide-react';
import { usePaymentStore } from '../../store/usePaymentStore';

const PIX_TIMEOUT_SECONDS = 15 * 60; // 15 minutos
const POLL_INTERVAL_MS = 5_000; // 5 segundos

export const PixPayment: React.FC = () => {
  const { pixQrBase64, pixCode, mpPaymentId, orderId, setApproved, setError } =
    usePaymentStore();

  const [copied, setCopied] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(PIX_TIMEOUT_SECONDS);

  // Timer regressivo
  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setError('O prazo do Pix expirou. Gere um novo QR Code.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [setError]);

  // Polling de status (fallback ao webhook)
  useEffect(() => {
    if (!mpPaymentId || !orderId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/${mpPaymentId}/status?order=${encodeURIComponent(orderId)}`);
        const data = await res.json();

        if (data.status === 'approved') {
          setApproved(mpPaymentId, orderId);
          clearInterval(interval);
        }
      } catch {
        // Silenciar erros de polling — o webhook é o canal principal
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [mpPaymentId, orderId, setApproved]);

  // Copiar código Pix
  const handleCopy = useCallback(async () => {
    if (!pixCode) return;
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback para browsers mais antigos
      const textarea = document.createElement('textarea');
      textarea.value = pixCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  }, [pixCode]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Timer */}
      <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-4 py-2 rounded-full">
        <Timer size={16} />
        <span>Pix válido por <strong>{formatTime(remainingSeconds)}</strong></span>
      </div>

      {/* QR Code */}
      {pixQrBase64 ? (
        <div className="bg-white border-2 border-gray-100 rounded-2xl p-4 shadow-sm">
          <img
            src={`data:image/png;base64,${pixQrBase64}`}
            alt="QR Code Pix"
            className="w-56 h-56 mx-auto"
          />
        </div>
      ) : (
        <div className="w-56 h-56 bg-gray-100 rounded-2xl flex items-center justify-center">
          <QrCode size={64} className="text-gray-300" />
        </div>
      )}

      {/* Instruções */}
      <p className="text-sm text-gray-600 text-center max-w-xs">
        Abra o app do seu banco, escaneie o QR Code acima ou use o código "copia e cola" abaixo.
      </p>

      {/* Código Pix (copia e cola) */}
      {pixCode && (
        <div className="w-full">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center gap-2">
            <code className="flex-1 text-xs text-gray-600 break-all line-clamp-2">
              {pixCode}
            </code>
            <button
              onClick={handleCopy}
              className={`shrink-0 px-3 py-2 rounded-lg font-semibold text-xs transition-all flex items-center gap-1.5 ${
                copied
                  ? 'bg-green-100 text-green-700'
                  : 'bg-primary text-white hover:bg-primary-dark'
              }`}
            >
              {copied ? (
                <>
                  <CheckCircle2 size={14} />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy size={14} />
                  Copiar
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Status de aguardando */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
        Aguardando pagamento...
      </div>
    </div>
  );
};
