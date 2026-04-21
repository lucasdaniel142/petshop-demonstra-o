import React, { useEffect, useState } from 'react';
import { X, Trash2, ShoppingBag, MessageCircle } from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { generateWhatsAppLink, STORE_WHATSAPP_NUMBERS } from '../utils/whatsapp';
import { getDeliveryFee } from '../utils/deliveryFee';
import { DEFAULT_PLACEHOLDER_IMAGE } from '../utils/placeholderImage';
import type { StoreId } from '../types';

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
  } = useCart();

  // Taxa de entrega reativa: muda instantaneamente ao trocar de loja
  const deliveryFee = getDeliveryFee(selectedStoreId);
  const totalGeral = cartTotal + deliveryFee;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const isNameInvalid = checkoutError !== null && !customerName.trim();
  const isAddressInvalid = checkoutError !== null && !deliveryAddress.trim();

  // Trava scroll do body quando o drawer está aberto
  useEffect(() => {
    document.body.style.overflow = isCartOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isCartOpen]);

  const handleCheckout = () => {
    if (items.length === 0) return;
    setCheckoutError(null);
    setIsModalOpen(true);
  };

  const handleConfirmOrder = () => {
    if (!customerName.trim() || !deliveryAddress.trim()) {
      setCheckoutError('Por favor, informe nome e endereço para concluir o pedido.');
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
      deliveryFee
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
              <span>Taxa de Entrega</span>
              <span className={deliveryFee === 0 ? 'text-green-600 font-semibold' : ''}>
                {deliveryFee === 0 ? 'Grátis' : `R$ ${deliveryFee.toFixed(2).replace('.', ',')}`}
              </span>
            </div>
            {/* Linha divisória */}
            <div className="border-t border-dashed border-gray-200" />
            {/* Total Geral */}
            <div className="flex justify-between font-[700] text-[18px] text-text">
              <span>Total</span>
              <span>R$ {(totalGeral || 0).toFixed(2).replace('.', ',')}</span>
            </div>
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
          <div className="w-full max-w-md rounded-[16px] bg-white shadow-xl overflow-hidden">
            <div className="flex items-start justify-between border-b border-border p-6">
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

            <div className="p-6 space-y-4">
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
              </div>

              <div>
                <label htmlFor="cart-payment" className="block text-[13px] font-[600] text-text mb-2">
                  Forma de Pagamento
                </label>
                <select
                  id="cart-payment"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-[10px] border border-border px-4 py-3 text-[14px] outline-none focus:border-primary transition-colors"
                >
                  <option value="Dinheiro">💵 Dinheiro</option>
                  <option value="Pix">📱 Pix</option>
                  <option value="Cartão de Crédito">💳 Cartão de Crédito</option>
                  <option value="Cartão de Débito">💳 Cartão de Débito</option>
                  <option value="Ticket (Alimentação/Refeição)">🎫 Ticket (Alimentação/Refeição)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 border-t border-border p-6">
              <button
                onClick={handleConfirmOrder}
                className="flex-1 rounded-xl bg-accent text-on-accent py-3.5 font-extrabold shadow-sm transition-colors hover:bg-accent-dark active:bg-accent-dark flex items-center justify-center gap-2"
              >
                <MessageCircle size={18} className="text-on-accent shrink-0" strokeWidth={2.25} />
                Enviar Pedido
              </button>
              <button
                onClick={handleCloseModal}
                className="flex-1 rounded-[10px] border border-border text-text py-3 font-[600] hover:bg-[#F8F8F8] transition-colors"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};