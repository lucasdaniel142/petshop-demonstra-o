// src/store/useCartStore.ts
// ============================================================
// ESTE É O ARQUIVO CORRETO. O src/store/useCartStore.tsx DEVE SER DELETADO.
//
// Diferença em updateQuantity entre os dois arquivos:
//
//   useCartStore.tsx (alternativo):
//     usa Math.max(1, ...) — nunca permite quantidade 0
//     usa .filter((item) => item.quantity > 0) — redundante
//
//   useCartStore.ts (este, correto):
//     permite quantity <= 0 → remove o item do carrinho
//     comportamento correto: decrementar até 0 = remover
//
// AÇÃO NECESSÁRIA: deletar src/store/useCartStore.tsx
// ============================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CartItem, Product } from '../types';

const MAX_QUANTITY = 99;

interface CartState {
  items: CartItem[];
  isCartOpen: boolean;
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  getCartTotal: () => number;
  getItemQuantity: (productId: string) => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isCartOpen: false,

      addItem: (product) => {
        set((state) => {
          const existing = state.items.find((item) => item.id === product.id);
          if (existing) {
            return {
              items: state.items.map((item) =>
                item.id === product.id
                  ? { ...item, quantity: Math.min(item.quantity + 1, MAX_QUANTITY) }
                  : item
              ),
            };
          }
          return { items: [...state.items, { ...product, quantity: 1 }] };
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== productId),
        }));
      },

      // quantity <= 0 → remove o item (comportamento correto para o botão −)
      updateQuantity: (productId, quantity) => {
        set((state) => {
          if (quantity <= 0) {
            return { items: state.items.filter((item) => item.id !== productId) };
          }
          return {
            items: state.items.map((item) =>
              item.id === productId
                ? { ...item, quantity: Math.min(quantity, MAX_QUANTITY) }
                : item
            ),
          };
        });
      },

      clearCart: () => set({ items: [] }),

      toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),

      getCartTotal: () =>
        get().items.reduce((total, item) => total + item.price * item.quantity, 0),

      getItemQuantity: (productId) =>
        get().items.find((i) => i.id === productId)?.quantity ?? 0,
    }),
    {
      name: 'sagrada-familia-cart',
      // sessionStorage: limpa ao fechar a aba — evita preços obsoletos persistidos
      storage: createJSONStorage(() => sessionStorage),
      // Persistir apenas items, nunca isCartOpen (drawer começa fechado)
      partialize: (state) => ({ items: state.items }),
    }
  )
);
