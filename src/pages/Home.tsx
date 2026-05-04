import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';

import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Header } from '../components/Header';
import { CategoryNav } from '../components/CategoryNav';
import { CartDrawer } from '../components/CartDrawer';
import { ProductCard } from '../components/ProductCard';
import { NotificationBanner } from '../components/NotificationBanner';
import { useCart } from '../hooks/useCart';
import type { FirestoreProduct, StoreId } from '../types';
import { STORES, STORE_IDS, CATEGORY_OPTIONS, CATEGORY_KEYWORDS } from '../utils/constants';

const ProductSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl shadow-sm p-6 lg:p-8 flex flex-col h-full animate-pulse border-0">
    <div className="w-full h-[120px] bg-gray-200 rounded-xl mb-6 lg:mb-8" />
    <div className="h-5 w-3/4 bg-gray-200 rounded mb-2" />
    <div className="h-4 w-1/2 bg-gray-200 rounded mb-4" />
    <div className="mt-auto h-11 w-full bg-gray-200 rounded-xl" />
  </div>
);

export const Home: React.FC = () => {
  const [products, setProducts] = useState<FirestoreProduct[]>([]);
  const [selectedStore, setSelectedStore] = useState<StoreId>(STORE_IDS[0]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { toggleCart, clearCart } = useCart();

  // Ref para evitar incluir clearCart (estável) na dep array desnecessariamente
  const clearCartRef = useRef(clearCart);
  clearCartRef.current = clearCart;

  // ── Scroll detection for sticky header shadow ──
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, 'produtos'), orderBy('nome', 'asc'));
      const snapshot = await getDocs(q);

      const loadedProducts: FirestoreProduct[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          nome: data.nome || data.name || 'Produto sem nome',
          categoria: data.categoria || data.category || 'Geral',
          imageUrl: data.imageUrl || data.imagem || '',
          unit: data.unit || 'un',
          precos: data.precos || {},
        };
      });

      setProducts(loadedProducts);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Erro ao carregar produtos:', err);
      }
      setError('Não foi possível carregar os produtos. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Limpa carrinho e busca ao trocar de loja.
  // clearCart é omitida das deps intencionalmente — é estável (Zustand) e
  // colocá-la causaria comportamento inesperado se a referência mudasse.
  useEffect(() => {
    clearCartRef.current();
    setSearchQuery('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore]);

  const availableProducts = useMemo(() => {
    return products
      .filter((product) => {
        const price = product.precos[selectedStore];
        return Boolean(price && !price.esgotado);
      })
      .filter((product) => {
        if (selectedCategory === 'all') return true;
        if (selectedCategory === 'ofertas') {
          return product.precos[selectedStore]?.emOferta === true;
        }
        const category = product.categoria.toLowerCase();
        const searchTerms = CATEGORY_KEYWORDS[selectedCategory] ?? [selectedCategory];
        return searchTerms.some((term) => category.includes(term));
      })
      .filter((product) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          product.nome.toLowerCase().includes(q) ||
          product.categoria.toLowerCase().includes(q)
        );
      });
  }, [products, selectedStore, selectedCategory, searchQuery]);

  const storeLabel = STORES.find((s) => s.id === selectedStore)?.label ?? 'Loja';

  const renderContent = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[20px]">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductSkeleton key={i} />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-[12px] bg-red-50 border border-red-200 p-10 lg:p-12 text-center">
          <p className="text-red-700 font-medium mb-3">{error}</p>
          <button
            onClick={loadProducts}
            className="px-6 py-3 bg-red-600 text-white rounded-[8px] font-extrabold text-sm hover:bg-red-700 transition-colors shadow-sm"
          >
            Tentar Novamente
          </button>
        </div>
      );
    }

    if (availableProducts.length === 0) {
      return (
        <div className="rounded-2xl bg-white shadow-sm border-0 p-10 lg:p-12 text-center text-muted">
          {searchQuery
            ? `Nenhum resultado para "${searchQuery}".`
            : 'Nenhum produto disponível nesta categoria ou loja no momento.'}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[20px]">
        {availableProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={{
              id: product.id,
              name: product.nome,
              category: product.categoria,
              imageUrl: product.imageUrl,
              unit: product.unit,
              price: product.precos[selectedStore]?.valor ?? 0,
              storeId: selectedStore,
            }}
            storePrice={product.precos[selectedStore]}
            storeId={selectedStore}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen w-screen overflow-x-clip flex flex-col bg-bg text-text font-sans antialiased">
      <NotificationBanner />
      {/* ── Sticky Header: Logo + Busca + Carrinho + Categorias ── */}
      <div
        className={`sticky top-0 z-50 transition-shadow duration-300 ${
          isScrolled ? 'shadow-lg' : ''
        }`}
      >
        <Header
          selectedStore={selectedStore}
          onStoreChange={setSelectedStore}
          storeOptions={STORES}
          onCartOpen={toggleCart}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <CategoryNav
          selectedCategory={selectedCategory}
          categories={CATEGORY_OPTIONS}
          onCategoryChange={setSelectedCategory}
        />
      </div>

      <main className="flex flex-1 flex-col">
        <div className="bg-white/90 border-b border-gray-100 backdrop-blur-sm px-4 sm:px-8 lg:px-10 py-8 lg:py-12">
          <div className="max-w-7xl mx-auto flex flex-col gap-6 sm:gap-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[13px] text-muted uppercase tracking-[0.2em]">Vitrine</p>
              <h1 className="text-[28px] md:text-[32px] lg:text-[36px] font-[800] text-text mt-2 leading-tight">
                Produtos disponíveis no {storeLabel}
              </h1>
            </div>
            <div className="rounded-2xl bg-bg/90 px-6 py-5 lg:px-8 lg:py-6 text-[14px] lg:text-[15px] text-text max-w-xs leading-relaxed shadow-sm">
              Escolha a loja e a categoria para ver os preços exatos.
            </div>
          </div>
        </div>

        <section className="flex-1 bg-bg">
          <div className="px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
            <div className="max-w-7xl mx-auto">{renderContent()}</div>
          </div>
        </section>
      </main>

      <CartDrawer selectedStoreLabel={storeLabel} selectedStoreId={selectedStore} />
    </div>
  );
};
