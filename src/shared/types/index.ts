// src/shared/types/index.ts
export type StoreId = 'benedito_bentes' | 'salvador_lyra' | 'vergel_do_lago';

export interface StorePrice {
  valor: number;
  emOferta: boolean;
  esgotado: boolean;
}

export interface FirestoreProduct {
  id: string;
  nome: string;
  categoria: string;
  imageUrl: string;
  unit: 'un' | 'kg';
  descricao?: string;
  precos: Partial<Record<StoreId, StorePrice>>;
  freteGratis?: boolean;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  unit: 'un' | 'kg';
  imageUrl: string;
  category: string;
  storeId?: string;
  description?: string;
  freteGratis?: boolean;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface AdminProduct {
  id: string;
  nome: string;
  categoria: string;
  imageUrl: string;
  unit: 'un' | 'kg';
  precos: Record<StoreId, StorePrice>;
  freteGratis?: boolean;
}

export interface ManagedProduct {
  id: string;
  nome: string;
  descricao?: string;
  imageUrl?: string;
  categoria: string;
  unit: 'un' | 'kg';
  precos: Record<StoreId, StorePrice>;
  freteGratis?: boolean;
}

export type AdminStoreAccess = 'universal' | 'benedito-bentes' | 'salvador-lyra' | 'vergel';

export interface AdminUser {
  id: string;
  nome: string;
  email: string;
  unidade: string;
  storeAccess?: AdminStoreAccess;
  role: 'admin';
  createdAt?: unknown; 
}

export interface StoreOption {
  id: StoreId;
  label: string;
}

export type FeedbackState = { type: 'success' | 'error'; message: string } | null;

export type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

export const DEFAULT_STORE_PRICE: StorePrice = {
  valor: 0,
  emOferta: false,
  esgotado: false,
};

export type PaymentMethodType = 'dinheiro' | 'maquininha' | 'ticket' | 'pix_presencial';

export type OrderStatus =
  | 'pending'
  | 'preparing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface Order {
  id: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  customerName: string;
  deliveryAddress: string;
  cep: string;
  storeId: StoreId;
  storeLabel: string;
  paymentMethod: PaymentMethodType;
  paymentStatus: OrderStatus;
  changeFor?: number | null;
  createdAt: unknown;
  updatedAt?: unknown;
}
