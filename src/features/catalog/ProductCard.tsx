import React, { useCallback } from 'react';
import { Product, StorePrice } from '../../shared/types';
import { useCartStore } from '../../shared/store/useCartStore';
import { DEFAULT_PLACEHOLDER_IMAGE } from '../../shared/utils/placeholderImage';

interface ProductCardProps {
  product: Product;
  storePrice?: StorePrice;
  storeId: string;
  /** Primeiros cards da grade: prioriza LCP */
  imageLoading?: 'lazy' | 'eager';
  imageFetchPriority?: 'high' | 'low' | 'auto';
}

export const ProductCard = React.memo(function ProductCard({
  product,
  storePrice,
  storeId,
  imageLoading = 'lazy',
  imageFetchPriority = 'auto',
}: ProductCardProps) {
  const quantity = useCartStore((s) => s.items.find((i) => i.id === product.id)?.quantity ?? 0);
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);

  const isAdded = quantity > 0;
  const disabled = !storePrice || storePrice.esgotado;
  const isOffer = storePrice?.emOferta ?? false;
  const hasPrice = product.price > 0;

  const handleAdd = useCallback(() => {
    if (disabled || !storePrice) return;
    addItem({
      ...product,
      price: storePrice?.valor ?? product.price,
      storeId,
    });
  }, [addItem, disabled, product, storeId, storePrice]);

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 lg:p-8 flex flex-col h-full border-0 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg">
      <div className="w-full h-[120px] bg-gray-50 rounded-xl mb-6 lg:mb-8 flex items-center justify-center overflow-hidden relative">
        <img
          src={product.imageUrl || DEFAULT_PLACEHOLDER_IMAGE}
          alt={product.name}
          className="w-full h-full object-contain p-2"
          width={400}
          height={120}
          loading={imageLoading}
          fetchPriority={imageFetchPriority}
          decoding="async"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = DEFAULT_PLACEHOLDER_IMAGE;
          }}
        />

        {isOffer && (
          <span className="absolute top-2 left-2 bg-accent text-on-accent text-[10px] font-extrabold px-2 py-1 rounded-md uppercase tracking-wider">
            Oferta
          </span>
        )}
        {product.freteGratis && !storePrice?.esgotado && (
          <span className="absolute bottom-2 left-2 bg-emerald-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-0.5">
            🚚 Frete Grátis
          </span>
        )}
        {storePrice?.esgotado && (
          <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
            Esgotado
          </span>
        )}
      </div>

      <div className="flex flex-col flex-grow space-y-3">
        <div className="flex items-baseline gap-1">
          {hasPrice ? (
            <>
              <span className="text-[18px] lg:text-[20px] font-[700] text-text">
                R$ {(product.price || 0).toFixed(2).replace('.', ',')}
              </span>
              <span className="text-[11px] text-muted font-[400]">/ {product.unit}</span>
            </>
          ) : (
            <span className="text-[14px] font-[600] text-muted italic">Sob consulta</span>
          )}
        </div>

        <h3 className="text-[14px] lg:text-[15px] font-[500] text-text leading-[1.3] min-h-[2.5rem] overflow-hidden line-clamp-2">
          {product.name}
        </h3>

        <div className="mt-auto">
          {!isAdded ? (
            <button
              type="button"
              onClick={handleAdd}
              disabled={disabled}
              className="w-full min-h-[44px] rounded-xl bg-accent text-on-accent font-extrabold text-[13px] tracking-wide flex items-center justify-center shadow-sm transition-colors hover:bg-accent-dark active:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-45"
            >
              Adicionar
            </button>
          ) : (
            <div className="w-full min-h-11 bg-primary rounded-xl text-on-primary flex items-center justify-between px-1 gap-0.5">
              <button
                type="button"
                onClick={() => updateQuantity(product.id, quantity - 1)}
                className="min-w-11 min-h-11 flex items-center justify-center text-lg rounded-lg hover:bg-white/20 transition-colors"
                aria-label="Diminuir quantidade"
              >
                −
              </button>
              <span className="font-semibold text-sm tabular-nums min-w-8 text-center">{quantity}</span>
              <button
                type="button"
                onClick={() => updateQuantity(product.id, quantity + 1)}
                className="min-w-11 min-h-11 flex items-center justify-center text-lg rounded-lg hover:bg-white/20 transition-colors"
                aria-label="Aumentar quantidade"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
