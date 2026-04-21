import React from 'react';
import { Search } from 'lucide-react';
import { useCart } from '../hooks/useCart';
import type { StoreId } from '../types';

interface HeaderProps {
  selectedStore: StoreId;
  onStoreChange: (storeId: StoreId) => void;
  storeOptions: ReadonlyArray<{ id: StoreId; label: string }>;
  onCartOpen: () => void;
  onSearchChange?: (query: string) => void;
  searchQuery?: string;
}

export const Header: React.FC<HeaderProps> = ({
  selectedStore,
  onStoreChange,
  storeOptions,
  onCartOpen,
  onSearchChange,
  searchQuery = '',
}) => {
  const { cartItemCount } = useCart();

  return (
    <header className="bg-primary text-white sticky top-0 z-50 shadow-md">
      {/* ── Linha 1: Logo + Busca (desktop) + Carrinho ── */}
      <div className="flex items-center justify-between px-4 md:px-6 h-16 md:h-20 gap-4">
        {/* Logo */}
        <div className="flex items-center shrink-0">
          <img
            src="/logo.png"
            alt="Supermercado Sagrada Família"
            className="h-14 md:h-20 w-auto object-contain drop-shadow-md"
          />
        </div>

        {/* Seletor de Lojas — visível apenas no desktop (md+) */}
        <div className="hidden md:flex items-center gap-2 text-[13px] border-l border-white/20 pl-4 min-w-0">
          <span className="hidden lg:inline whitespace-nowrap opacity-80">📍 Loja:</span>
          <div className="flex gap-2">
            {storeOptions.map((store) => (
              <button
                key={store.id}
                onClick={() => onStoreChange(store.id)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition-all border ${
                  selectedStore === store.id
                    ? 'bg-white text-primary border-white'
                    : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                }`}
              >
                {store.label}
              </button>
            ))}
          </div>
        </div>

        {/* Busca — visível apenas no desktop (md+) */}
        <div className="flex-1 relative hidden md:flex items-center max-w-md mx-4">
          <input
            type="search"
            placeholder="O que você procura?"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="w-full h-10 bg-white rounded-xl pl-10 pr-4 text-sm text-gray-800 outline-none shadow-inner"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        </div>

        {/* Carrinho */}
        <button
          onClick={onCartOpen}
          className="relative p-2 hover:bg-white/10 rounded-lg transition-colors group shrink-0"
        >
          <span className="text-2xl group-hover:scale-110 transition-transform inline-block">🛒</span>
          {cartItemCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-white text-primary text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
              {cartItemCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Linha 2 (mobile only): Seletor de Lojas com scroll horizontal ── */}
      <div className="md:hidden border-t border-white/10">
        <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
          <span className="text-[11px] opacity-70 shrink-0">📍</span>
          {storeOptions.map((store) => (
            <button
              key={store.id}
              onClick={() => onStoreChange(store.id)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-all border shrink-0 ${
                selectedStore === store.id
                  ? 'bg-white text-primary border-white'
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
              }`}
            >
              {store.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};