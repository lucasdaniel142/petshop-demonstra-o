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
  delivery: DeliveryInfo | null;
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  getCartTotal: () => number;
  getItemQuantity: (productId: string) => number;
  setDeliveryInfo: (info: DeliveryInfo | null) => void;
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
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    }
  )
);
