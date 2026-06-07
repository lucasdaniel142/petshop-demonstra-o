import React, { useCallback, useState } from 'react';
import { X, ZoomIn } from 'lucide-react';
import { Product, StorePrice } from '../../shared/types';
import { useCartStore } from '../../shared/store/useCartStore';
import { DEFAULT_PLACEHOLDER_IMAGE } from '../../shared/utils/placeholderImage';
import { formatCurrency } from '../../shared/utils/currency';

interface ProductCardProps {
  product: Product;
  storePrice?: StorePrice;
  storeId: string;
  imageLoading?: 'lazy' | 'eager';
  imageFetchPriority?: 'high' | 'low' | 'auto';
}

interface LightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

const Lightbox: React.FC<LightboxProps> = ({ src, alt, onClose }) => {
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={`Imagem ampliada: ${alt}`}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors"
        aria-label="Fechar imagem"
      >
        <X size={22} />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl select-none"
        draggable={false}
      />
    </div>
  );
};

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

  const [lightboxOpen, setLightboxOpen] = useState(false);

  const isAdded = quantity > 0;
  const disabled = !storePrice || storePrice.esgotado;
  const isOffer = storePrice?.emOferta ?? false;
  const hasPrice = product.price > 0;

  const imgSrc = product.imageUrl || DEFAULT_PLACEHOLDER_IMAGE;

  const handleAdd = useCallback(() => {
    if (disabled || !storePrice) return;
    addItem({ ...product, price: storePrice?.valor ?? product.price, storeId });
  }, [addItem, disabled, product, storeId, storePrice]);

  const handleImageClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setLightboxOpen(true);
  }, []);

  return (
    <>
      {lightboxOpen && (
        <Lightbox src={imgSrc} alt={product.name} onClose={() => setLightboxOpen(false)} />
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-5 md:p-6 lg:p-8 flex flex-col h-full transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-xl hover:border-slate-200 group">
        <div className="w-full h-[100px] sm:h-[120px] bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl mb-4 sm:mb-6 lg:mb-8 flex items-center justify-center overflow-hidden relative">
          <img
            src={imgSrc}
            alt={product.name}
            className="w-full h-full object-contain p-2 cursor-zoom-in transition-transform duration-300 group-hover:scale-110"
            width={400}
            height={120}
            loading={imageLoading}
            fetchPriority={imageFetchPriority}
            decoding="async"
            onClick={handleImageClick}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = DEFAULT_PLACEHOLDER_IMAGE;
            }}
          />

          <button
            onClick={handleImageClick}
            aria-label="Ampliar imagem"
            className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-white/90 hover:bg-white rounded-lg p-2 shadow-md hover:shadow-lg hover:scale-110"
          >
            <ZoomIn size={16} className="text-slate-600" />
          </button>

          {isOffer && (
            <span className="absolute top-2 left-2 bg-accent text-on-accent text-[9px] sm:text-[10px] font-extrabold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md uppercase tracking-wider pointer-events-none">
              Oferta
            </span>
          )}
          {product.freteGratis && !storePrice?.esgotado && (
            <span className="absolute bottom-2 left-2 bg-emerald-500 text-white text-[8px] sm:text-[9px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-0.5 pointer-events-none">
              🚚 Frete Grátis
            </span>
          )}
          {storePrice?.esgotado && (
            <span className="absolute top-2 right-2 bg-red-500 text-white text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md uppercase tracking-wider pointer-events-none">
              Esgotado
            </span>
          )}
        </div>

        <div className="flex flex-col flex-grow space-y-2 sm:space-y-3">
          <div className="flex items-baseline gap-1">
            {hasPrice ? (
              <>
                <span className="text-[16px] sm:text-[18px] lg:text-[20px] font-[700] text-accent bg-gradient-to-r from-accent to-accent-dark bg-clip-text text-transparent">
                  {formatCurrency(product.price || 0)}
                </span>
                <span className="text-[10px] sm:text-[11px] text-muted font-[400]">/ {product.unit}</span>
              </>
            ) : (
              <span className="text-[13px] sm:text-[14px] font-[600] text-muted italic">Sob consulta</span>
            )}
          </div>

          <h3 className="text-[13px] sm:text-[14px] lg:text-[15px] font-[500] text-text leading-[1.3] min-h-[2.2rem] sm:min-h-[2.5rem] overflow-hidden line-clamp-2">
            {product.name}
          </h3>

          {product.description && (
            <p className="text-[12px] sm:text-[13px] lg:text-[14px] text-slate-700 dark:text-slate-300 leading-[1.5] line-clamp-3 -mt-0.5 font-medium">
              {product.description}
            </p>
          )}

          <div className="mt-auto">
            {!isAdded ? (
              <button
                type="button"
                onClick={handleAdd}
                disabled={disabled}
                className="w-full min-h-[42px] sm:min-h-[44px] rounded-xl bg-gradient-to-r from-accent to-accent-dark text-on-accent font-extrabold text-[12px] sm:text-[13px] tracking-wide flex items-center justify-center shadow-md transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Adicionar
              </button>
            ) : (
              <div className="w-full min-h-10 sm:min-h-11 bg-primary rounded-xl text-on-primary flex items-center justify-between px-1 gap-0.5">
                <button
                  type="button"
                  onClick={() => updateQuantity(product.id, quantity - 1)}
                  className="min-w-10 sm:min-w-11 min-h-10 sm:min-h-11 flex items-center justify-center text-base sm:text-lg rounded-lg hover:bg-white/20 transition-colors"
                  aria-label="Diminuir quantidade"
                >
                  −
                </button>
                <span className="font-semibold text-sm tabular-nums min-w-8 text-center">{quantity}</span>
                <button
                  type="button"
                  onClick={() => updateQuantity(product.id, quantity + 1)}
                  className="min-w-10 sm:min-w-11 min-h-10 sm:min-h-11 flex items-center justify-center text-base sm:text-lg rounded-lg hover:bg-white/20 transition-colors"
                  aria-label="Aumentar quantidade"
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}, (prevProps, nextProps) => (
  prevProps.product.id === nextProps.product.id &&
  prevProps.product.price === nextProps.product.price &&
  prevProps.product.name === nextProps.product.name &&
  prevProps.product.imageUrl === nextProps.product.imageUrl &&
  prevProps.product.description === nextProps.product.description &&
  prevProps.storePrice?.valor === nextProps.storePrice?.valor &&
  prevProps.storePrice?.emOferta === nextProps.storePrice?.emOferta &&
  prevProps.storePrice?.esgotado === nextProps.storePrice?.esgotado &&
  prevProps.storeId === nextProps.storeId &&
  prevProps.imageLoading === nextProps.imageLoading &&
  prevProps.imageFetchPriority === nextProps.imageFetchPriority
));
