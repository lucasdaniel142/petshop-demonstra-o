// src/components/checkout/CardForm.tsx
// ============================================================
// Formulário de cartão de crédito com tokenização PCI-compliant.
// Os dados do cartão NUNCA passam pelo nosso servidor —
// o SDK MercadoPago.js tokeniza direto no browser.
// ============================================================

import React, { useState } from 'react';
import { CreditCard, ArrowLeft } from 'lucide-react';
import { usePaymentStore } from '../../store/usePaymentStore';
import type { CartItem } from '../../types';

interface CardFormProps {
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
}

export const CardForm: React.FC<CardFormProps> = ({
  customerName,
  customerEmail,
  customerCpf,
  deliveryAddress,
  cep,
  storeId,
  storeLabel,
  distanceKm,
  total,
  subtotal,
  deliveryFee,
  items,
}) => {
  const { setProcessing, setApproved, setRejected, setError, setMethod } = usePaymentStore();

  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState(customerName);
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Formata número do cartão: 0000 0000 0000 0000
  const handleCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  // Formata validade: MM/AA
  const handleExpiry = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) {
      setExpiry(digits);
    } else {
      setExpiry(`${digits.slice(0, 2)}/${digits.slice(2)}`);
    }
  };

  // Detecta bandeira pelo BIN (primeiros dígitos)
  const getCardBrand = (number: string): string => {
    const clean = number.replace(/\D/g, '');
    if (/^4/.test(clean)) return 'visa';
    if (/^5[1-5]/.test(clean)) return 'master';
    if (/^(636368|438935|504175|451416|636297|5067|4576|4011)/.test(clean)) return 'elo';
    if (/^3[47]/.test(clean)) return 'amex';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanCard = cardNumber.replace(/\D/g, '');
    if (cleanCard.length < 13) {
      setFormError('Número do cartão inválido.');
      return;
    }
    if (!expiry || expiry.length < 5) {
      setFormError('Data de validade inválida.');
      return;
    }
    if (cvv.length < 3) {
      setFormError('CVV inválido.');
      return;
    }

    setProcessing();

    try {
      // Importar SDK do MP dinamicamente
      const { loadMercadoPago } = await import('@mercadopago/sdk-js');
      const mp = await loadMercadoPago();

      const publicKey = import.meta.env.VITE_MP_PUBLIC_KEY;
      if (!publicKey) {
        setError('Chave pública do Mercado Pago não configurada.');
        return;
      }

      // @ts-ignore - MercadoPago SDK types
      const mpInstance = new mp.MercadoPago(publicKey);

      // Tokenizar o cartão (PCI-compliant)
      const [expiryMonth, expiryYear] = expiry.split('/');

      const tokenResponse = await mpInstance.createCardToken({
        cardNumber: cleanCard,
        cardholderName: cardName,
        cardExpirationMonth: expiryMonth,
        cardExpirationYear: `20${expiryYear}`,
        securityCode: cvv,
        identificationType: 'CPF',
        identificationNumber: customerCpf.replace(/\D/g, ''),
      });

      if (!tokenResponse?.id) {
        setRejected('Não foi possível validar os dados do cartão.');
        return;
      }

      const brand = getCardBrand(cleanCard);

      // Enviar token para o backend
      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'credit_card',
          items: items.map(i => ({ id: i.id, quantity: i.quantity })),
          storeId,
          distanceKm,
          customerName,
          email: customerEmail,
          cpf: customerCpf,
          deliveryAddress,
          cep,
          description: `Pedido — ${storeLabel}`,
          token: tokenResponse.id,
          paymentMethodId: brand || 'visa',
          installments: 1,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setRejected(data.error || 'Pagamento recusado.');
        return;
      }

      if (data.status === 'approved') {
        setApproved(data.paymentId, data.orderId || data.paymentId.toString());
      } else {
        setRejected(data.statusDetail || 'Pagamento não aprovado.');
      }

    } catch (err: any) {
      setError(err?.message || 'Erro ao processar pagamento.');
    }
  };

  const brand = getCardBrand(cardNumber);

  return (
    <div className="space-y-4">
      <button
        onClick={() => setMethod(null as any)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft size={16} />
        Voltar
      </button>

      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {formError}
          </div>
        )}

        {/* Número do cartão */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Número do Cartão</label>
          <div className="relative">
            <input
              type="text"
              value={cardNumber}
              onChange={(e) => handleCardNumber(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary transition-colors pr-12"
              placeholder="0000 0000 0000 0000"
              inputMode="numeric"
              required
              autoComplete="cc-number"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {brand === 'visa' && <span className="text-lg">💳</span>}
              {brand === 'master' && <span className="text-lg">💳</span>}
              {brand === 'elo' && <span className="text-lg">💳</span>}
              {!brand && <CreditCard size={18} className="text-gray-300" />}
            </div>
          </div>
        </div>

        {/* Nome no cartão */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nome no Cartão</label>
          <input
            type="text"
            value={cardName}
            onChange={(e) => setCardName(e.target.value.toUpperCase())}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary transition-colors uppercase"
            placeholder="NOME COMO ESTÁ NO CARTÃO"
            required
            autoComplete="cc-name"
          />
        </div>

        {/* Validade + CVV */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Validade</label>
            <input
              type="text"
              value={expiry}
              onChange={(e) => handleExpiry(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary transition-colors"
              placeholder="MM/AA"
              inputMode="numeric"
              maxLength={5}
              required
              autoComplete="cc-exp"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">CVV</label>
            <input
              type="text"
              value={cvv}
              onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary transition-colors"
              placeholder="000"
              inputMode="numeric"
              maxLength={4}
              required
              autoComplete="cc-csc"
            />
          </div>
        </div>

        {/* Resumo */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
          </div>
          {deliveryFee > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Entrega</span>
              <span>R$ {deliveryFee.toFixed(2).replace('.', ',')}</span>
            </div>
          )}
          <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-900">
            <span>Total</span>
            <span>R$ {total.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <CreditCard size={20} />
          Pagar R$ {total.toFixed(2).replace('.', ',')}
        </button>
      </form>
    </div>
  );
};
