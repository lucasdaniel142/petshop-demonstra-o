import React, { useEffect, useState, useCallback, useRef } from 'react';
import { X, Trash2, ShoppingBag, MessageCircle, MapPin, Loader2 } from 'lucide-react';
import { useCart } from '../../shared/hooks/useCart';
import { generateWhatsAppLink, STORE_WHATSAPP_NUMBERS } from '../../shared/utils/whatsapp';
import { DEFAULT_PLACEHOLDER_IMAGE } from '../../shared/utils/placeholderImage';
import { fetchAddressFromCEP, geocodeAddress, haversineDistance } from '../../shared/utils/geolocation';
import { STORE_COORDINATES, calculateDeliveryFee, DELIVERY_BASE_FEE, DELIVERY_MAX_RADIUS_KM } from '../../shared/config/delivery';
import { isStoreOpen, getStoreHoursLabel } from '../../shared/config/businessHours';
import type { StoreId } from '../../shared/types';
import { Link } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { db } from '../../shared/lib/firebase';
import { requestNotificationToken } from '../../shared/lib/notifications';

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
  } = useCart();

  const hasFreeShipping = items.some(item => item.freteGratis);
  const calculatedDelivery = delivery ? calculateDeliveryFee(delivery.distanceKm, hasFreeShipping) : null;
  const activeDelivery = calculatedDelivery || delivery;
  const deliveryFee = activeDelivery?.fee ?? (hasFreeShipping ? 0 : DELIVERY_BASE_FEE);
  const totalGeral = cartTotal + deliveryFee;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro');
  const [changeFor, setChangeFor] = useState('');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const [cep, setCep] = useState('');
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const isNameInvalid = checkoutError !== null && !customerName.trim();
  const isAddressInvalid = checkoutError !== null && !deliveryAddress.trim();
  const isCepInvalid = checkoutError !== null && cep.replace(/\D/g, '').length !== 8;

  const handleCepLookup = useCallback(async (rawCep: string) => {
    const cleanCep = rawCep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setIsLoadingCep(true);
    setCepError(null);

    try {
      const address = await fetchAddressFromCEP(cleanCep);
      if (!address) {
        setCepError('CEP não encontrado.');
        setIsLoadingCep(false);
        return;
      }

      setDeliveryAddress((address.formatted || '') + ', Nº ');

      const geocodeString = `${address.logradouro}, ${address.bairro}, ${address.localidade}, ${address.uf}, Brasil`;
      const coords = await geocodeAddress(geocodeString);
      if (!coords) {
        setCepError(null);
        setIsLoadingCep(false);
        return;
      }

      const distanceKm = haversineDistance(STORE_COORDINATES[selectedStoreId], coords);
      const result = calculateDeliveryFee(distanceKm, hasFreeShipping);
      setDeliveryInfo(result);

      if (!result.isInRange) {
        setCepError(`Endereço fora da área de entrega (${result.distanceKm} km). Máximo: ${DELIVERY_MAX_RADIUS_KM} km.`);
      }
    } catch {
      setCepError('Erro ao buscar o CEP. Tente novamente.');
    } finally {
      setIsLoadingCep(false);
    }
  }, [setDeliveryInfo, selectedStoreId, hasFreeShipping]);

  const lastCepLookupRef = useRef<number>(0);

  const handleCepChange = useCallback((value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    const formatted = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    setCep(formatted);
    setCepError(null);

    if (digits.length === 8) {
      const now = Date.now();
      if (now - lastCepLookupRef.current < 1000) return;
      lastCepLookupRef.current = now;
      handleCepLookup(digits);
    }
  }, [handleCepLookup]);

  useEffect(() => {
    document.body.style.overflow = isCartOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isCartOpen]);

  const handleCheckout = () => {
    if (items.length === 0) return;
    if (!isStoreOpen()) {
      setCheckoutError(`Estamos fechados no momento. Horário de funcionamento: ${getStoreHoursLabel()}.`);
      return;
    }
    setCheckoutError(null);
    setIsModalOpen(true);
  };

  const handleConfirmOrder = async () => {
    if (!navigator.onLine) {
      setCheckoutError('Sem conexão com a internet. Verifique sua rede e tente novamente.');
      return;
    }

    const cleanPhone = customerPhone.replace(/\D/g, '');
    const isPhoneValid = cleanPhone.length >= 10;

    if (!customerName.trim() || !isPhoneValid || !deliveryAddress.trim() || cep.replace(/\D/g, '').length !== 8) {
      if (!isPhoneValid && customerPhone.trim()) {
        setCheckoutError('Telefone inválido. Digite DDD + número (mínimo 10 dígitos).');
      } else {
        setCheckoutError('Por favor, informe Nome, Telefone (com DDD), CEP e endereço para concluir o pedido.');
      }
      return;
    }

    let finalFcmToken = fcmToken;
    if (notificationsEnabled && !fcmToken) {
      finalFcmToken = await requestNotificationToken();
      if (finalFcmToken) {
        await setDoc(doc(db, 'fcmTokens', finalFcmToken), {
          lastUsed: serverTimestamp(),
          customerName: customerName.trim()
        });
      }
    }

    if (paymentMethod === 'Dinheiro' && changeFor) {
      const cleanChange = changeFor.replace(',', '.');
      const changeValue = parseFloat(cleanChange);
      if (isNaN(changeValue) || changeValue < totalGeral) {
        setCheckoutError(`Valor do troco (R$ ${cleanChange}) inválido. Deve ser maior que o total do pedido (R$ ${totalGeral.toFixed(2).replace('.', ',')}).`);
        return;
      }
    }

    const sanitize = (str: string) => str.trim().replace(/[<>{}]/g, '');
    const sanitizedName = sanitize(customerName);
    const sanitizedAddress = sanitize(deliveryAddress);

    setIsSubmitting(true);
    setCheckoutError(null);

    try {
      let changeForNum: number | null = null;
      if (paymentMethod === 'Dinheiro' && changeFor) {
        changeForNum = parseFloat(changeFor.replace(',', '.'));
      }

      const orderData = {
        items,
        subtotal: cartTotal,
        deliveryFee,
        total: totalGeral,
        customerName: sanitizedName.slice(0, 100),
        customerPhone: cleanPhone,
        deliveryAddress: sanitizedAddress,
        cep: cep.replace(/\D/g, ''),
        storeId: selectedStoreId,
        storeLabel: selectedStoreLabel,
        paymentMethod: paymentMethod === 'Dinheiro' ? 'dinheiro' : paymentMethod === 'Pix' ? 'pix_presencial' : paymentMethod === 'Ticket Alimentação/Refeição' ? 'ticket' : 'maquininha',
        paymentStatus: 'pending',
        changeFor: changeForNum,
        fcmToken: finalFcmToken,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'pedidos'), orderData);

      const storePhone = STORE_WHATSAPP_NUMBERS[selectedStoreId];
      const link = generateWhatsAppLink(
        items,
        cartTotal,
        sanitizedName,
        deliveryAddress,
        paymentMethod,
        selectedStoreLabel,
        storePhone,
        deliveryFee,
        changeFor || undefined
      );

      if (!link) {
        setCheckoutError('Número do WhatsApp desta loja não configurado. Pedido foi salvo, contate a loja.');
        setIsSubmitting(false);
        return;
      }

      window.open(link, '_blank', 'noopener,noreferrer');

      clearCart();
      setIsModalOpen(false);
      setCustomerName('');
      setDeliveryAddress('');
      setCep('');
      setChangeFor('');
      toggleCart();
    } catch (err) {
      console.error('Erro ao salvar pedido:', err);
      setCheckoutError('Ocorreu um erro ao salvar seu pedido. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCheckoutError(null);
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 backdrop-blur-sm ${
          isCartOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={toggleCart}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Carrinho de compras"
        className={`fixed inset-y-0 right-0 w-full max-w-[360px] bg-white border-l border-gray-100/90 shadow-xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${
          isCartOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="px-6 py-5 border-b border-gray-100 font-[700] text-[16px] flex justify-between items-center text-text shrink-0">
          <span>Meu Carrinho</span>
          <button onClick={toggleCart} className="text-muted hover:text-text transition-colors p-1 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 custom-scrollbar">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted space-y-4">
              <ShoppingBag size={48} className="opacity-30" />
              <p className="font-medium text-[15px]">Seu carrinho está vazio</p>
              <p className="text-[13px] text-center">Adicione produtos da vitrine para começar seu pedido.</p>
            </div>
          ) : (
            <ul>
              {items.map((item) => (
                <li key={item.id} className="flex gap-[12px] mb-[16px] pb-[16px] border-b border-dashed border-border last:border-0">
                  <div className="w-[40px] h-[40px] bg-[#f0f0f0] rounded-[4px] flex items-center justify-center shrink-0 overflow-hidden">
                    <img
                      src={item.imageUrl || DEFAULT_PLACEHOLDER_IMAGE}
                      alt={item.name}
                      className="w-full h-full object-contain p-1"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_PLACEHOLDER_IMAGE; }}
                    />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <div className="flex justify-between items-start">
                      <h3 className="text-[13px] font-[500] text-text line-clamp-2 pr-2">{item.name}</h3>
                      <button onClick={() => removeItem(item.id)} className="text-muted hover:text-red-500 transition-colors p-1 -mt-1 -mr-1 rounded shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-[4px]">
                      <span className="text-[13px] text-primary font-[600]">R$ {((item.price || 0) * (item.quantity || 0)).toFixed(2).replace('.', ',')}</span>
                      <div className="flex items-center bg-primary rounded-[4px] text-white h-[24px] px-[2px]" role="group">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-[20px] h-[20px] flex items-center justify-center hover:bg-white/20 rounded-[2px] transition-colors text-[14px]">−</button>
                        <span className="w-[20px] text-center font-semibold text-[12px]">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-[20px] h-[20px] flex items-center justify-center hover:bg-white/20 rounded-[2px] transition-colors text-[14px]">+</button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="px-6 py-5 border-t border-gray-100 bg-gray-50/50 shrink-0 space-y-3">
            <div className="flex justify-between text-[14px] text-muted">
              <span>Subtotal</span>
              <span>R$ {(cartTotal || 0).toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="flex justify-between text-[14px] text-muted">
              <div className="flex items-center gap-1">
                <span>Taxa de Entrega</span>
                {delivery && <MapPin size={12} className="text-primary" />}
              </div>
              <div className="text-right">
                <span className={deliveryFee === 0 ? 'text-green-600 font-semibold' : ''}>
                  {deliveryFee === 0 ? 'Grátis' : `R$ ${deliveryFee.toFixed(2).replace('.', ',')}`}
                </span>
                {delivery && <div className="text-[11px] text-muted">{delivery.description}</div>}
              </div>
            </div>
            <div className="border-t border-dashed border-gray-200" />
            <div className="flex justify-between font-[700] text-[18px] text-text">
              <span>Total</span>
              <span>R$ {(totalGeral || 0).toFixed(2).replace('.', ',')}</span>
            </div>
            {checkoutError && !isModalOpen && (
              <div className="rounded-[10px] bg-red-50 border border-red-200 p-3 text-sm text-red-700 flex items-start gap-2">
                <span className="shrink-0 mt-0.5">⚠️</span>
                <span>{checkoutError}</span>
              </div>
            )}
            <button onClick={handleCheckout} className="w-full min-h-[52px] px-4 bg-accent text-on-accent rounded-xl font-extrabold text-[14px] tracking-wide flex items-center justify-center gap-2 shadow-sm transition-colors hover:bg-accent-dark active:bg-accent-dark">
              <MessageCircle size={20} className="text-on-accent shrink-0" strokeWidth={2.25} />
              FINALIZAR PEDIDO
            </button>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-[16px] bg-white shadow-xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="flex items-start justify-between border-b border-border p-6 shrink-0">
              <div>
                <h2 className="text-[18px] font-[800] text-text">Finalizar Pedido</h2>
                <p className="text-[13px] text-muted mt-1">Complete os dados para enviar ao WhatsApp.</p>
              </div>
              <button onClick={handleCloseModal} className="text-muted hover:text-text p-1 rounded">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              {checkoutError && (
                <div className="rounded-[10px] bg-red-50 border border-red-200 p-3 text-sm text-red-700 flex items-start gap-2">
                  <span className="shrink-0 mt-0.5">⚠️</span>
                  <span>{checkoutError}</span>
                </div>
              )}

              <div>
                <label htmlFor="cart-customer-name" className="flex justify-between items-center text-[13px] font-[600] text-text mb-2">
                  <span>Nome Completo</span>
                  <span className={isNameInvalid ? 'text-red-600 font-bold opacity-100 transition-all duration-300' : 'text-red-500 opacity-50'}>* Obrigatório preencher.</span>
                </label>
                <input id="cart-customer-name" type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={`w-full rounded-[10px] border px-4 py-3 text-[14px] outline-none transition-colors ${isNameInvalid ? 'border-red-500 bg-red-50' : 'border-border focus:border-primary'}`} placeholder="Seu nome completo" />
              </div>

              <div>
                <label htmlFor="cart-customer-phone" className="flex justify-between items-center text-[13px] font-[600] text-text mb-2">
                  <span>Telefone / WhatsApp</span>
                  <span className={checkoutError !== null && !customerPhone.trim() ? 'text-red-600 font-bold opacity-100 transition-all duration-300' : 'text-red-500 opacity-50'}>* Obrigatório.</span>
                </label>
                <input id="cart-customer-phone" type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))} className={`w-full rounded-[10px] border px-4 py-3 text-[14px] outline-none transition-colors ${checkoutError !== null && !customerPhone.trim() ? 'border-red-500 bg-red-50' : 'border-border focus:border-primary'}`} placeholder="DDD + Número (ex: 82999999999)" />
              </div>

              <div>
                <label htmlFor="cart-cep" className="flex justify-between items-center text-[13px] font-[600] text-text mb-2">
                  <span>CEP</span>
                  <span className={isCepInvalid ? 'text-red-600 font-bold opacity-100 transition-all duration-300' : 'text-red-500 opacity-50'}>* Obrigatório preencher.</span>
                </label>
                <div className="relative">
                  <input id="cart-cep" type="text" value={cep} onChange={(e) => handleCepChange(e.target.value)} className={`w-full rounded-[10px] border px-4 py-3 text-[14px] outline-none transition-colors pr-10 ${isCepInvalid ? 'border-red-500 bg-red-50' : cepError ? 'border-red-500 bg-red-50' : 'border-border focus:border-primary'}`} placeholder="00000-000" maxLength={9} />
                  {isLoadingCep && <div className="absolute right-3 top-1/2 -translate-y-1/2"><Loader2 size={16} className="animate-spin text-primary" /></div>}
                </div>
                {cepError && <p className="text-red-600 text-[12px] mt-1 flex items-center gap-1"><span>⚠️</span> {cepError}</p>}
                {delivery && delivery.isInRange && <p className="text-green-600 text-[12px] mt-1 flex items-center gap-1"><MapPin size={12} /> {delivery.description} — R$ {delivery.fee.toFixed(2).replace('.', ',')}</p>}
              </div>

              <div>
                <label htmlFor="cart-address" className="flex justify-between items-center text-[13px] font-[600] text-text mb-2">
                  <span>Endereço de Entrega</span>
                  <span className={isAddressInvalid ? 'text-red-600 font-bold opacity-100 transition-all duration-300' : 'text-red-500 opacity-50'}>* Obrigatório preencher.</span>
                </label>
                <textarea id="cart-address" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} className={`w-full rounded-[10px] border px-4 py-3 text-[14px] outline-none transition-colors resize-none h-[80px] ${isAddressInvalid ? 'border-red-500 bg-red-50' : 'border-border focus:border-primary'}`} placeholder="Rua, número, bairro, cidade, complemento..." />
              </div>

              <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-3">
                <label htmlFor="cart-payment" className="block text-[13px] font-[800] text-text uppercase tracking-wider">Como você vai pagar na entrega?</label>
                <select id="cart-payment" value={paymentMethod} onChange={(e) => { setPaymentMethod(e.target.value); setChangeFor(''); }} className="w-full rounded-[10px] border border-gray-300 bg-white px-4 py-3 text-[14px] font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm">
                  <option value="Dinheiro">💵 Dinheiro</option>
                  <option value="Maquininha (Crédito/Débito)">💳 Maquininha (Crédito/Débito)</option>
                  <option value="Ticket Alimentação/Refeição">🎫 Ticket Alimentação/Refeição</option>
                  <option value="Pix">📱 Pix (Entregador leva QR Code)</option>
                </select>
                {paymentMethod === 'Dinheiro' && (
                  <div className="pt-2">
                    <label htmlFor="cart-change" className="block text-[13px] font-[600] text-text mb-1.5">Precisa de troco para quanto?</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-medium">R$</span>
                      <input id="cart-change" type="text" value={changeFor} onChange={(e) => setChangeFor(e.target.value.replace(/[^0-9,]/g, ''))} className="w-full rounded-[10px] border border-border pl-10 pr-4 py-2.5 text-[14px] outline-none focus:border-primary transition-colors" placeholder="Ex: 100,00" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 pb-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={privacyAccepted} onChange={(e) => setPrivacyAccepted(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary shrink-0" />
                <span className="text-[12px] text-gray-600 leading-snug">Li e aceito a <Link to="/privacidade" target="_blank" className="text-primary font-semibold hover:underline">Política de Privacidade</Link>. Autorizo o uso dos meus dados.</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer mt-2 bg-primary/5 p-3 rounded-lg border border-primary/10">
                <input type="checkbox" checked={notificationsEnabled} onChange={(e) => setNotificationsEnabled(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[12px] font-bold text-primary">Receber avisos pelo celular? 🔔</span>
                  <span className="text-[10px] text-muted leading-tight">Avisaremos quando seu pedido sair para entrega.</span>
                </div>
              </label>
            </div>

            <div className="flex flex-col gap-2 border-t border-border p-6 shrink-0 bg-white">
              <button onClick={handleConfirmOrder} disabled={!privacyAccepted || isSubmitting} className="w-full rounded-xl bg-accent text-on-accent py-3.5 font-extrabold shadow-sm transition-colors hover:bg-accent-dark active:bg-accent-dark flex items-center justify-center gap-2 disabled:opacity-50">
                {isSubmitting ? <Loader2 size={18} className="animate-spin text-on-accent" /> : <MessageCircle size={18} className="text-on-accent shrink-0" strokeWidth={2.25} />}
                Confirmar Pedido via WhatsApp 🚀
              </button>
              <button onClick={handleCloseModal} disabled={isSubmitting} className="w-full rounded-[10px] border border-border text-text py-3 font-[600] hover:bg-[#F8F8F8] transition-colors">Voltar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
