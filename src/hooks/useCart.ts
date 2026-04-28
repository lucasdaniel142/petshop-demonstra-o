// src/hooks/useCart.ts
// ============================================================
// Hook público do carrinho com dados derivados (total, contagem)
// e informações de entrega dinâmica por distância.
// ============================================================

import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCartStore } from '../store/useCartStore';

export const useCart = () => {
  // Seletor único com shallow comparison — evita re-renders desnecessários
  const {
    items,
    isCartOpen,
    delivery,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    toggleCart,
    getItemQuantity,
    setDeliveryInfo,
    clearDelivery,
  } = useCartStore(
    useShallow((state) => ({
      items: state.items,
      isCartOpen: state.isCartOpen,
      delivery: state.delivery,
      addItem: state.addItem,
      removeItem: state.removeItem,
      updateQuantity: state.updateQuantity,
      clearCart: state.clearCart,
      toggleCart: state.toggleCart,
      getItemQuantity: state.getItemQuantity,
      setDeliveryInfo: state.setDeliveryInfo,
      clearDelivery: state.clearDelivery,
    }))
  );

  // Valores derivados reativos: recalculam apenas quando `items` muda
  const cartTotal = useMemo(
    () => items.reduce((total, item) => total + item.price * item.quantity, 0),
    [items]
  );

  const cartItemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  // Total geral: subtotal + taxa de entrega dinâmica
  const deliveryFee = delivery?.fee ?? 0;
  const totalWithDelivery = cartTotal + deliveryFee;

  return {
    items,
    isCartOpen,
    delivery,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    toggleCart,
    getItemQuantity,
    setDeliveryInfo,
    clearDelivery,
    cartTotal,
    cartItemCount,
    deliveryFee,
    totalWithDelivery,
    // Retrocompatibilidade para código que chama getCartTotal()
    getCartTotal: () => cartTotal,
  };
};

