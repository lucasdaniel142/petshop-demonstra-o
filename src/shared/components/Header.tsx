import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { BRAND } from '../config/brand';
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
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isMobileSearchOpen && mobileSearchRef.current) {
      mobileSearchRef.current.focus();
    }
  }, [isMobileSearchOpen]);

  const handleCloseMobileSearch = () => {
    setIsMobileSearchOpen(false);
    onSearchChange?.('');
  };

  return (
    <header className="bg-primary text-white sticky top-0 z-50 shadow-md">
      <div className="flex items-center justify-between px-4 md:px-6 h-16 md:h-20 gap-4">
        <div className="flex items-center shrink-0">
          <img
            src="/logo.png"
            alt={BRAND.name}
            width={200}
            height={80}
            className="h-14 md:h-20 w-auto object-contain drop-shadow-md"
          />
        </div>

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

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setIsMobileSearchOpen(true)}
            className="md:hidden p-2 hover:bg-white/10 rounded-lg transition-all duration-200 hover:scale-110"
            aria-label="Buscar produtos"
          >
            <Search size={22} />
          </button>

          <button
            onClick={onCartOpen}
            className="relative p-2 hover:bg-white/10 rounded-lg transition-all duration-200 group"
          >
            <span className="text-2xl group-hover:scale-125 transition-transform duration-200 inline-block">🛒</span>
            {cartItemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-white text-primary text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-sm animate-pulse-glow">
                {cartItemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {isMobileSearchOpen && (
        <div className="md:hidden absolute inset-x-0 top-0 h-16 bg-primary z-10 flex items-center px-3 gap-2 animate-in fade-in duration-200">
          <div className="flex-1 relative">
            <input
              ref={mobileSearchRef}
              type="search"
              placeholder="O que você procura?"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="w-full h-10 bg-white rounded-xl pl-10 pr-4 text-sm text-gray-800 outline-none shadow-inner"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          </div>
          <button
            onClick={handleCloseMobileSearch}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors shrink-0"
            aria-label="Fechar busca"
          >
            <X size={22} />
          </button>
        </div>
      )}

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
