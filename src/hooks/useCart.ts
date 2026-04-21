// src/hooks/useCart.ts
// ============================================================
// ESTE É O ARQUIVO CORRETO. O src/hooks/useCart.tsx DEVE SER DELETADO.
//
// Diferença crítica:
//   useCart.tsx (ERRADO): import { shallow } from 'zustand/shallow'
//                         — API removida no Zustand v5, causa crash em runtime
//
//   useCart.ts  (CERTO):  import { useShallow } from 'zustand/react/shallow'
//                         — API correta do Zustand v5
//
// AÇÃO NECESSÁRIA: deletar src/hooks/useCart.tsx
// ============================================================

import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCartStore } from '../store/useCartStore';

export const useCart = () => {
  // Seletor único com shallow comparison — evita re-renders desnecessários
  const {
    items,
    isCartOpen,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    toggleCart,
    getItemQuantity,
  } = useCartStore(
    useShallow((state) => ({
      items: state.items,
      isCartOpen: state.isCartOpen,
      addItem: state.addItem,
      removeItem: state.removeItem,
      updateQuantity: state.updateQuantity,
      clearCart: state.clearCart,
      toggleCart: state.toggleCart,
      getItemQuantity: state.getItemQuantity,
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

  return {
    items,
    isCartOpen,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    toggleCart,
    getItemQuantity,
    cartTotal,
    cartItemCount,
    // Retrocompatibilidade para código que chama getCartTotal()
    getCartTotal: () => cartTotal,
  };
};
