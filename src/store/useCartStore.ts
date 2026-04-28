// src/store/useCartStore.ts
// ============================================================
// Store principal do carrinho com suporte a taxa de entrega
// dinâmica por distância (Haversine + Nominatim).
// ============================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CartItem, Product } from '../types';

const MAX_QUANTITY = 99;

interface DeliveryInfo {
  distanceKm: number;
  fee: number;
  isInRange: boolean;
  description: string;
}

interface CartState {
  items: CartItem[];
  isCartOpen: boolean;
  /** Informações de entrega calculadas por distância */
  delivery: DeliveryInfo | null;
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  getCartTotal: () => number;
  getItemQuantity: (productId: string) => number;
  /** Define as informações de entrega (chamado após geocoding) */
  setDeliveryInfo: (info: DeliveryInfo | null) => void;
  /** Limpa as informações de entrega */
  clearDelivery: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isCartOpen: false,
      delivery: null,

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

      clearCart: () => set({ items: [], delivery: null }),

      toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),

      getCartTotal: () =>
        get().items.reduce((total, item) => total + item.price * item.quantity, 0),

      getItemQuantity: (productId) =>
        get().items.find((i) => i.id === productId)?.quantity ?? 0,

      setDeliveryInfo: (info) => set({ delivery: info }),

      clearDelivery: () => set({ delivery: null }),
    }),
    {
      name: 'ecommerce-cart',
      // sessionStorage: limpa ao fechar a aba — evita preços obsoletos persistidos
      storage: createJSONStorage(() => sessionStorage),
      // Persistir apenas items, nunca isCartOpen ou delivery
      partialize: (state) => ({ items: state.items }),
    }
  )
);
