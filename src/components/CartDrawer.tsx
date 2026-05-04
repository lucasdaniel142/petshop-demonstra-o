import React, { useEffect, useState, useCallback, useRef } from 'react';
import { X, Trash2, ShoppingBag, MessageCircle, MapPin, Loader2, CreditCard } from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { generateWhatsAppLink, STORE_WHATSAPP_NUMBERS } from '../utils/whatsapp';
import { DEFAULT_PLACEHOLDER_IMAGE } from '../utils/placeholderImage';
import { fetchAddressFromCEP, geocodeAddress, haversineDistance } from '../utils/geolocation';
import { formatCPF, isValidCPF, cleanCPF } from '../utils/cpf';
import { STORE_COORDINATES, calculateDeliveryFee, DELIVERY_BASE_FEE, DELIVERY_MAX_RADIUS_KM } from '../config/delivery';
import { CheckoutModal } from './checkout/CheckoutModal';
import { usePaymentStore } from '../store/usePaymentStore';
import { isStoreOpen, getStoreHoursLabel } from '../config/businessHours';
import type { StoreId } from '../types';
import { Link } from 'react-router-dom';

interface CartDrawerProps {
  selectedStoreLabel: string;
  selectedStoreId: StoreId;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ selectedStoreLabel, selectedStoreId }) => {
  const {
    items,
    isCartOpen,
    toggleCart,
    updateQuantity,
    removeItem,
    clearCart,
    cartTotal,
    delivery,
    setDeliveryInfo,
    totalWithDelivery,
  } = useCart();

  // Taxa de entrega: dinâmica (por distância) ou fallback estático
  const deliveryFee = delivery?.fee ?? DELIVERY_BASE_FEE;
  const totalGeral = delivery ? totalWithDelivery : cartTotal + DELIVERY_BASE_FEE;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro');
  const [paymentLocation, setPaymentLocation] = useState<'online' | 'delivery'>('delivery');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const [cep, setCep] = useState('');
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  // Estado de email e CPF (para pagamento online)
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerCpf, setCustomerCpf] = useState('');
  const [cpfError, setCpfError] = useState<string | null>(null);

  // LGPD: Consentimento de política de privacidade
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  // Payment store
  const { openCheckout, isCheckoutOpen, closeCheckout, reset: resetPayment } = usePaymentStore();

  const isNameInvalid = checkoutError !== null && !customerName.trim();
  const isAddressInvalid = checkoutError !== null && !deliveryAddress.trim();
  const isCepInvalid = checkoutError !== null && cep.replace(/\D/g, '').length !== 8;

  // ── Busca de CEP + Geocoding + Cálculo de distância ──
  const handleCepLookup = useCallback(async (rawCep: string) => {
    const cleanCep = rawCep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setIsLoadingCep(true);
    setCepError(null);

    try {
      // 1. ViaCEP: CEP → Endereço
      const address = await fetchAddressFromCEP(cleanCep);
      if (!address) {
        setCepError('CEP não encontrado.');
        setIsLoadingCep(false);
        return;
      }

      // Preenche o campo de endereço automaticamente
      setDeliveryAddress(address.formatted || '');

      // 2. Nominatim: Endereço → Coordenadas
      const geocodeString = `${address.logradouro}, ${address.bairro}, ${address.localidade}, ${address.uf}, Brasil`;
      const coords = await geocodeAddress(geocodeString);
      if (!coords) {
        // Geocoding falhou — usa taxa fixa como fallback
        setCepError(null);
        setIsLoadingCep(false);
        return;
      }

      // 3. Haversine: Coordenadas → Distância
      const distanceKm = haversineDistance(STORE_COORDINATES[selectedStoreId], coords);

      // 4. Cálculo da taxa
      const result = calculateDeliveryFee(distanceKm);
      setDeliveryInfo(result);

      if (!result.isInRange) {
        setCepError(`Endereço fora da área de entrega (${result.distanceKm} km). Máximo: ${DELIVERY_MAX_RADIUS_KM} km.`);
      }
    } catch {
      setCepError('Erro ao buscar o CEP. Tente novamente.');
    } finally {
      setIsLoadingCep(false);
    }
  }, [setDeliveryInfo]);

  // SECURITY: Debounce para evitar flood de requests ao Nominatim (limite: 1 req/s)
  const lastCepLookupRef = useRef<number>(0);

  // Formata CEP enquanto digita (00000-000)
  const handleCepChange = useCallback((value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    const formatted = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    setCep(formatted);
    setCepError(null);

    // Auto-busca quando completa 8 dígitos (com debounce de 1s)
    if (digits.length === 8) {
      const now = Date.now();
      if (now - lastCepLookupRef.current < 1000) return; // Cooldown de 1s
      lastCepLookupRef.current = now;
      handleCepLookup(digits);
    }
  }, [handleCepLookup]);

  // Trava scroll do body quando o drawer está aberto
  useEffect(() => {
    document.body.style.overflow = isCartOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isCartOpen]);

  const handleCheckout = () => {
    if (items.length === 0) return;
    if (!isStoreOpen()) {
      setCheckoutError(`Estamos fechados no momento. Horário de funcionamento: ${getStoreHoursLabel()}.`);
      // We don't open the modal, but the error will now be shown in the cart drawer
      return;
    }
    setCheckoutError(null);
    setIsModalOpen(true);
  };

  const handleConfirmOrder = () => {
    if (!customerName.trim() || !deliveryAddress.trim() || cep.replace(/\D/g, '').length !== 8) {
      setCheckoutError('Por favor, informe nome, CEP e endereço para concluir o pedido.');
      return;
    }

    const storePhone = STORE_WHATSAPP_NUMBERS[selectedStoreId];
    const link = generateWhatsAppLink(
      items,
      cartTotal,
      customerName,
      deliveryAddress,
      paymentMethod,
      selectedStoreLabel,
      storePhone,
      deliveryFee,
      paymentLocation
    );

    if (!link) {
      setCheckoutError(
        'Número do WhatsApp desta loja não configurado. ' +
        'Entre em contato diretamente pela loja ou tente novamente mais tarde.'
      );
      return;
    }

    window.open(link, '_blank', 'noopener,noreferrer');

    // Limpa estado após enviar
    clearCart();
    setIsModalOpen(false);
    setCustomerName('');
    setDeliveryAddress('');
    toggleCart();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCheckoutError(null);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 backdrop-blur-sm ${
          isCartOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={toggleCart}
        aria-hidden="true"
      />

      {/* Drawer — sempre no DOM para permitir animação de saída */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Carrinho de compras"
        className={`fixed inset-y-0 right-0 w-full max-w-[360px] bg-white border-l border-gray-100/90 shadow-xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${
          isCartOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 font-[700] text-[16px] flex justify-between items-center text-text shrink-0">
          <span>Meu Carrinho</span>
          <button
            onClick={toggleCart}
            className="text-muted hover:text-text transition-colors p-1 rounded"
            aria-label="Fechar carrinho"
          >
            <X size={20} />
          </button>
        </div>

        {/* Itens */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted space-y-4">
              <ShoppingBag size={48} className="opacity-30" />
              <p className="font-medium text-[15px]">Seu carrinho está vazio</p>
              <p className="text-[13px] text-center">
                Adicione produtos da vitrine para começar seu pedido.
              </p>
            </div>
          ) : (
            <ul>
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex gap-[12px] mb-[16px] pb-[16px] border-b border-dashed border-border last:border-0"
                >
                  <div className="w-[40px] h-[40px] bg-[#f0f0f0] rounded-[4px] flex items-center justify-center shrink-0 overflow-hidden">
                    <img
                      src={item.imageUrl || DEFAULT_PLACEHOLDER_IMAGE}
                      alt={item.name}
                      className="w-full h-full object-contain p-1"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = DEFAULT_PLACEHOLDER_IMAGE;
                      }}
                    />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <div className="flex justify-between items-start">
                      <h3 className="text-[13px] font-[500] text-text line-clamp-2 pr-2">
                        {item.name}
                      </h3>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-muted hover:text-red-500 transition-colors p-1 -mt-1 -mr-1 rounded shrink-0"
                        aria-label={`Remover ${item.name} do carrinho`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-[4px]">
                      <span className="text-[13px] text-primary font-[600]">
                        R$ {((item.price || 0) * (item.quantity || 0)).toFixed(2).replace('.', ',')}
                      </span>
                      <div
                        className="flex items-center bg-primary rounded-[4px] text-white h-[24px] px-[2px]"
                        role="group"
                        aria-label={`Quantidade de ${item.name}`}
                      >
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-[20px] h-[20px] flex items-center justify-center hover:bg-white/20 rounded-[2px] transition-colors text-[14px]"
                          aria-label="Diminuir quantidade"
                        >−</button>
                        <span className="w-[20px] text-center font-semibold text-[12px]">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-[20px] h-[20px] flex items-center justify-center hover:bg-white/20 rounded-[2px] transition-colors text-[14px]"
                          aria-label="Aumentar quantidade"
                        >+</button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer — Resumo financeiro */}
        {items.length > 0 && (
          <div className="px-6 py-5 border-t border-gray-100 bg-gray-50/50 shrink-0 space-y-3">
            {/* Subtotal */}
            <div className="flex justify-between text-[14px] text-muted">
              <span>Subtotal</span>
              <span>R$ {(cartTotal || 0).toFixed(2).replace('.', ',')}</span>
            </div>
            {/* Taxa de Entrega */}
            <div className="flex justify-between text-[14px] text-muted">
              <div className="flex items-center gap-1">
                <span>Taxa de Entrega</span>
                {delivery && <MapPin size={12} className="text-primary" />}
              </div>
              <div className="text-right">
                <span className={deliveryFee === 0 ? 'text-green-600 font-semibold' : ''}>
                  {deliveryFee === 0 ? 'Grátis' : `R$ ${deliveryFee.toFixed(2).replace('.', ',')}`}
                </span>
                {delivery && (
                  <div className="text-[11px] text-muted">{delivery.description}</div>
                )}
              </div>
            </div>
            {/* Linha divisória */}
            <div className="border-t border-dashed border-gray-200" />
            {/* Total Geral */}
            <div className="flex justify-between font-[700] text-[18px] text-text">
              <span>Total</span>
              <span>R$ {(totalGeral || 0).toFixed(2).replace('.', ',')}</span>
            </div>
            {/* Error Message na gaveta */}
            {checkoutError && !isModalOpen && (
              <div className="rounded-[10px] bg-red-50 border border-red-200 p-3 text-sm text-red-700 flex items-start gap-2">
                <span className="shrink-0 mt-0.5">⚠️</span>
                <span>{checkoutError}</span>
              </div>
            )}
            <button
              onClick={handleCheckout}
              className="w-full min-h-[52px] px-4 bg-accent text-on-accent rounded-xl font-extrabold text-[14px] tracking-wide flex items-center justify-center gap-2 shadow-sm transition-colors hover:bg-accent-dark active:bg-accent-dark"
            >
              <MessageCircle size={20} className="text-on-accent shrink-0" strokeWidth={2.25} />
              FINALIZAR PEDIDO
            </button>
          </div>
        )}
      </div>

      {/* Modal de Checkout */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Finalizar pedido"
        >
          <div className="w-full max-w-md rounded-[16px] bg-white shadow-xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="flex items-start justify-between border-b border-border p-6 shrink-0">
              <div>
                <h2 className="text-[18px] font-[800] text-text">Finalizar Pedido</h2>
                <p className="text-[13px] text-muted mt-1">
                  Complete os dados para enviar ao WhatsApp.
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-muted hover:text-text p-1 rounded"
                aria-label="Fechar modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {checkoutError && (
                <div className="rounded-[10px] bg-red-50 border border-red-200 p-3 text-sm text-red-700 flex items-start gap-2">
                  <span className="shrink-0 mt-0.5">⚠️</span>
                  <span>{checkoutError}</span>
                </div>
              )}

              <div>
                <label htmlFor="cart-customer-name" className="flex justify-between items-center text-[13px] font-[600] text-text mb-2">
                  <span>Nome</span>
                  <span className={isNameInvalid ? 'text-red-600 font-bold opacity-100 transition-all duration-300' : 'text-red-500 opacity-50'}>
                    * Obrigatório preencher.
                  </span>
                </label>
                <input
                  id="cart-customer-name"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className={`w-full rounded-[10px] border px-4 py-3 text-[14px] outline-none transition-colors ${isNameInvalid ? 'border-red-500 bg-red-50' : 'border-border focus:border-primary'}`}
                  placeholder="Seu nome completo"
                  autoComplete="name"
                />
              </div>

              {/* CEP com busca automática */}
              <div>
                <label htmlFor="cart-cep" className="flex justify-between items-center text-[13px] font-[600] text-text mb-2">
                  <span>CEP</span>
                  <span className={isCepInvalid ? 'text-red-600 font-bold opacity-100 transition-all duration-300' : 'text-red-500 opacity-50'}>
                    * Obrigatório preencher.
                  </span>
                </label>
                <div className="relative">
                  <input
                    id="cart-cep"
                    type="text"
                    value={cep}
                    onChange={(e) => handleCepChange(e.target.value)}
                    className={`w-full rounded-[10px] border px-4 py-3 text-[14px] outline-none transition-colors pr-10 ${isCepInvalid ? 'border-red-500 bg-red-50' : cepError ? 'border-red-500 bg-red-50' : 'border-border focus:border-primary'}`}
                    placeholder="00000-000"
                    inputMode="numeric"
                    maxLength={9}
                  />
                  {isLoadingCep && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 size={16} className="animate-spin text-primary" />
                    </div>
                  )}
                </div>
                {cepError && (
                  <p className="text-red-600 text-[12px] mt-1 flex items-center gap-1">
                    <span>⚠️</span> {cepError}
                  </p>
                )}
                {delivery && delivery.isInRange && (
                  <p className="text-green-600 text-[12px] mt-1 flex items-center gap-1">
                    <MapPin size={12} /> {delivery.description} — R$ {delivery.fee.toFixed(2).replace('.', ',')}
                  </p>
                )}
              </div>

              {/* Endereço (preenchido automaticamente pelo CEP) */}
              <div>
                <label htmlFor="cart-address" className="flex justify-between items-center text-[13px] font-[600] text-text mb-2">
                  <span>Endereço de Entrega</span>
                  <span className={isAddressInvalid ? 'text-red-600 font-bold opacity-100 transition-all duration-300' : 'text-red-500 opacity-50'}>
                    * Obrigatório preencher.
                  </span>
                </label>
                <textarea
                  id="cart-address"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className={`w-full rounded-[10px] border px-4 py-3 text-[14px] outline-none transition-colors resize-none h-[80px] ${isAddressInvalid ? 'border-red-500 bg-red-50' : 'border-border focus:border-primary'}`}
                  placeholder="Rua, número, bairro, cidade"
                  autoComplete="street-address"
                />
                <p className="text-[11px] text-muted mt-1">Complemento: adicione nº, apt, bloco, referência.</p>
              </div>

              <div>
                <label htmlFor="cart-payment" className="block text-[13px] font-[600] text-text mb-2">
                  Forma de Pagamento
                </label>
                <select
                  id="cart-payment"
                  value={paymentMethod}
                  onChange={(e) => {
                    const method = e.target.value;
                    setPaymentMethod(method);
                    // Reset to delivery by default when changing method to avoid confusion
                    if (method === 'Dinheiro' || method === 'Ticket (Alimentação/Refeição)') {
                      setPaymentLocation('delivery');
                    }
                  }}
                  className="w-full rounded-[10px] border border-border px-4 py-3 text-[14px] outline-none focus:border-primary transition-colors"
                >
                  <option value="Dinheiro">💵 Dinheiro</option>
                  <option value="Pix">📱 Pix</option>
                  <option value="Cartão de Crédito">💳 Cartão de Crédito</option>
                  <option value="Cartão de Débito">💳 Cartão de Débito</option>
                  <option value="Ticket (Alimentação/Refeição)">🎫 Ticket (Alimentação/Refeição)</option>
                </select>
              </div>

              {/* Pergunta "Onde deseja pagar?" se for Pix ou Cartão */}
              {['Pix', 'Cartão de Crédito', 'Cartão de Débito'].includes(paymentMethod) && (
                <div>
                  <label className="block text-[13px] font-[600] text-text mb-2">
                    Onde deseja pagar?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentLocation('online')}
                      className={`py-2 px-3 rounded-[10px] border text-[13px] font-[600] transition-colors ${
                        paymentLocation === 'online'
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'border-border text-muted hover:border-primary/50'
                      }`}
                    >
                      Pagar Online
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentLocation('delivery')}
                      className={`py-2 px-3 rounded-[10px] border text-[13px] font-[600] transition-colors ${
                        paymentLocation === 'delivery'
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'border-border text-muted hover:border-primary/50'
                      }`}
                    >
                      Com o Entregador
                    </button>
                  </div>
                </div>
              )}

              {/* E-mail e CPF (Apenas para pagamento online) */}
              {paymentLocation === 'online' && (
                <>
                  <div>
                    <label htmlFor="cart-email" className="block text-[13px] font-[600] text-text mb-2">
                      E-mail <span className="text-muted font-normal">(para pagamento online)</span>
                    </label>
                    <input
                      id="cart-email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full rounded-[10px] border border-border px-4 py-3 text-[14px] outline-none focus:border-primary transition-colors"
                      placeholder="seu@email.com"
                      autoComplete="email"
                    />
                  </div>

                  <div>
                    <label htmlFor="cart-cpf" className="block text-[13px] font-[600] text-text mb-2">
                      CPF <span className="text-muted font-normal">(para pagamento online)</span>
                    </label>
                    <input
                      id="cart-cpf"
                      type="text"
                      value={customerCpf}
                      onChange={(e) => {
                        const formatted = formatCPF(e.target.value);
                        setCustomerCpf(formatted);
                        setCpfError(null);
                        // Validar quando completo
                        if (cleanCPF(formatted).length === 11 && !isValidCPF(formatted)) {
                          setCpfError('CPF inválido.');
                        }
                      }}
                      className={`w-full rounded-[10px] border px-4 py-3 text-[14px] outline-none transition-colors ${cpfError ? 'border-red-500 bg-red-50' : 'border-border focus:border-primary'}`}
                      placeholder="000.000.000-00"
                      inputMode="numeric"
                      maxLength={14}
                    />
                    {cpfError && (
                      <p className="text-red-600 text-[12px] mt-1">⚠️ {cpfError}</p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* LGPD: Consentimento de Política de Privacidade */}
            <div className="px-6 pb-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary shrink-0"
                />
                <span className="text-[12px] text-gray-600 leading-snug">
                  Li e aceito a{' '}
                  <Link
                    to="/privacidade"
                    target="_blank"
                    className="text-primary font-semibold hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Política de Privacidade
                  </Link>
                  . Autorizo o uso dos meus dados para processamento do pedido conforme a LGPD.
                </span>
              </label>
            </div>

            <div className="flex flex-col gap-2 border-t border-border p-6 shrink-0">
              {paymentLocation === 'delivery' && (
                <button
                  onClick={handleConfirmOrder}
                  disabled={!privacyAccepted}
                  className="w-full rounded-xl bg-accent text-on-accent py-3.5 font-extrabold shadow-sm transition-colors hover:bg-accent-dark active:bg-accent-dark flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MessageCircle size={18} className="text-on-accent shrink-0" strokeWidth={2.25} />
                  Enviar via WhatsApp
                </button>
              )}

              {paymentLocation === 'online' && (
                <button
                  onClick={() => {
                    if (!customerName.trim() || !deliveryAddress.trim() || cep.replace(/\D/g, '').length !== 8) {
                      setCheckoutError('Preencha nome, CEP e endereço para pagar online.');
                      return;
                    }
                    if (!customerEmail.trim() || !customerEmail.includes('@')) {
                      setCheckoutError('Informe um e-mail válido para pagamento online.');
                      return;
                    }
                    if (!isValidCPF(customerCpf)) {
                      setCpfError('CPF obrigatório para pagamento online.');
                      setCheckoutError('Informe um CPF válido para pagamento online.');
                      return;
                    }
                    setCheckoutError(null);
                    openCheckout();
                  }}
                  disabled={!privacyAccepted}
                  className="w-full rounded-xl bg-blue-600 text-white py-3.5 font-extrabold shadow-sm transition-colors hover:bg-blue-700 active:bg-blue-800 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CreditCard size={18} strokeWidth={2.25} />
                  Pagar Online (Pix/Cartão)
                </button>
              )}

              <button
                onClick={handleCloseModal}
                className="w-full rounded-[10px] border border-border text-text py-3 font-[600] hover:bg-[#F8F8F8] transition-colors"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pagamento Online (Mercado Pago) */}
      {isCheckoutOpen && (
        <CheckoutModal
          customerName={customerName}
          customerEmail={customerEmail}
          customerCpf={cleanCPF(customerCpf)}
          deliveryAddress={deliveryAddress}
          cep={cep}
          storeId={selectedStoreId}
          storeLabel={selectedStoreLabel}
          distanceKm={delivery?.distanceKm || 0}
          subtotal={cartTotal}
          deliveryFee={deliveryFee}
          total={totalGeral}
          items={items}
          onClose={() => {
            closeCheckout();
          }}
          onSuccess={() => {
            // Se o pagamento online foi concluído com sucesso, gerar o link do whatsapp e enviar
            const storePhone = STORE_WHATSAPP_NUMBERS[selectedStoreId];
            const link = generateWhatsAppLink(
              items,
              cartTotal,
              customerName,
              deliveryAddress,
              paymentMethod,
              selectedStoreLabel,
              storePhone,
              deliveryFee,
              'online' // Garantir que está sendo passado 'online'
            );

            if (link) {
              window.open(link, '_blank', 'noopener,noreferrer');
            }

            resetPayment();
            clearCart();
            setIsModalOpen(false);
            setCustomerName('');
            setDeliveryAddress('');
            setCustomerEmail('');
            setCustomerCpf('');
            setCep('');
            toggleCart();
          }}
        />
      )}
    </>
  );
};