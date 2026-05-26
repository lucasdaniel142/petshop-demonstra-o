import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCartStore } from '../store/useCartStore';

export const useCart = () => {
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

  // [MP-06 FIX] Dependência mais granular para evitar recálculo desnecessário
  // Cria uma string única baseada nos itens (id-quantity-price)
  const itemsSignature = useMemo(
    () => items.map(i => `${i.id}-${i.quantity}-${i.price}`).join(','),
    [items]
  );

  const cartTotal = useMemo(
    () => items.reduce((total, item) => total + item.price * item.quantity, 0),
    [itemsSignature] // Usa signature ao invés de items diretamente
  );

  const cartItemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [itemsSignature] // Usa signature ao invés de items diretamente
  );

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
    getCartTotal: () => cartTotal,
  };
};
