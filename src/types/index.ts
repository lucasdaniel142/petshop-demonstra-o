// src/types/index.ts
// Fonte única de verdade para todos os tipos do domínio.
// Nenhum componente deve redefinir localmente tipos que já existem aqui.

// --- IDs das lojas como tipo literal (evita strings mágicas) ---
export type StoreId = 'benedito_bentes' | 'salvador_lyra' | 'vergel_do_lago';

// --- Preço por loja ---
export interface StorePrice {
  valor: number;
  emOferta: boolean;
  esgotado: boolean;
}

// --- Produto como salvo no Firestore ---
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

// --- Produto normalizado para uso nos componentes da vitrine ---
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

// --- Item no carrinho ---
export interface CartItem extends Product {
  quantity: number;
}

// --- Produto no painel administrativo (garante todos os preços presentes) ---
export interface AdminProduct {
  id: string;
  nome: string;
  categoria: string;
  imageUrl: string;
  unit: 'un' | 'kg';
  precos: Record<StoreId, StorePrice>;
  freteGratis?: boolean;
}

// --- Produto gerenciado no ProductManager (campos opcionais) ---
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

// --- Usuário administrador ---
export interface AdminUser {
  id: string;
  nome: string;
  email: string;
  unidade: string;
  role: 'admin';
  createdAt?: unknown; // Firestore Timestamp
}

// --- Opção de loja para UI ---
export interface StoreOption {
  id: StoreId;
  label: string;
}

// --- Estado de feedback para operações assíncronas ---
export type FeedbackState = { type: 'success' | 'error'; message: string } | null;

// --- Estado de salvamento por item (PriceManager) ---
export type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

// --- Valor padrão para StorePrice (útil para formulários e fallbacks) ---
export const DEFAULT_STORE_PRICE: StorePrice = {
  valor: 0,
  emOferta: false,
  esgotado: false,
};

// --- Pagamento (Mercado Pago Checkout Transparente) ---
export type PaymentMethodType = 'pix' | 'credit_card' | 'debit_card';

export type PaymentStatus =
  | 'idle'
  | 'processing'
  | 'pending'       // Pix gerado, aguardando pagamento
  | 'approved'
  | 'rejected'
  | 'error';

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
  paymentStatus: PaymentStatus;
  mpPaymentId?: number;
  createdAt: unknown; // Firestore Timestamp
  updatedAt?: unknown;
}
