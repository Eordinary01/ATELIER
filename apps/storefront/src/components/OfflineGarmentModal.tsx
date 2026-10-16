'use client';

import { useState, useEffect } from 'react';
import { ProductCard as ProductCardType, ProductDetail } from '@atelier/contract';
import { PriceDisplay } from '@atelier/ui';
import { useCart } from '../context/CartContext';
import { getOfflineItem } from '../lib/offlineStore';

interface OfflineGarmentModalProps {
  productCard: ProductCardType | null;
  onClose: () => void;
}

export function OfflineGarmentModal({ productCard, onClose }: OfflineGarmentModalProps) {
  const { addToCart } = useCart();
  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!productCard) return;

    setSelectedSize(productCard.availableSizes[0] || 'M');
    setSelectedColor(productCard.colorShades[0]?.name || 'Standard');

    // Retrieve full detail from offlineStore if available
    getOfflineItem<ProductDetail>(`pdp:${productCard.slug}`).then((cached) => {
      if (cached) {
        setDetail(cached);
        if (cached.variants && cached.variants.length > 0 && cached.variants[0]) {
          setSelectedSize(cached.variants[0].size);
          setSelectedColor(cached.variants[0].colorName);
        }

      }
    });
  }, [productCard]);

  if (!productCard) return null;

  const imageUrl =
    detail?.primaryImage?.url ||
    productCard.primaryImage?.url ||
    'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80';

  const sizes = detail?.variants
    ? Array.from(new Set(detail.variants.map((v) => v.size)))
    : productCard.availableSizes.length > 0
    ? productCard.availableSizes
    : ['XS', 'S', 'M', 'L', 'XL'];

  const colors = detail?.variants
    ? Array.from(
        new Map(detail.variants.map((v) => [v.colorName, { name: v.colorName, hex: v.colorHex }])).values()
      )
    : productCard.colorShades;

  const handleAdd = () => {
    const variantId =
      detail?.variants?.find((v) => v.size === selectedSize && v.colorName === selectedColor)?.id ||
      `variant_${productCard.id}_${selectedSize}`;

    addToCart({
      productId: productCard.id,
      variantId,
      title: productCard.title,
      slug: productCard.slug,
      sku: `ATL-${productCard.slug.slice(0, 4).toUpperCase()}-${selectedSize}`,
      size: selectedSize,
      colorName: selectedColor,
      colorHex: colors.find((c) => c.name === selectedColor)?.hex || '#1B1C1A',
      pricePaise: productCard.basePricePaise,
      imageUrl,
      quantity: 1,
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-[#FAF9F6] border border-[#E5E3DC] rounded-[4px] max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 border-b border-[#E5E3DC] sticky top-0 bg-[#FAF9F6] z-10">
          <div className="flex items-center space-x-2 font-mono text-[11px] uppercase tracking-wider text-[#767872]">
            <span>Archival Silhouette</span>
            <span>&bull;</span>
            <span className="text-[#1B1C1A] font-medium">{productCard.category?.name || 'Garment'}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 flex items-center justify-center text-[#767872] hover:text-[#1B1C1A] text-lg font-mono rounded-[2px]"
          >
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 sm:p-6 items-start">
          {/* Garment Image */}
          <div className="aspect-[4/5] bg-[#F4F3F0] rounded-[2px] overflow-hidden border border-[#E5E3DC]">
            <img
              src={imageUrl}
              alt={productCard.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Details & Actions */}
          <div className="space-y-5">
            <div>
              {productCard.collectionName && (
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#767872] block mb-1">
                  {productCard.collectionName}
                </span>
              )}
              <h2 className="font-serif-headline text-xl sm:text-2xl font-semibold text-[#1B1C1A]">
                {productCard.title}
              </h2>
              <div className="mt-2">
                <PriceDisplay
                  amountPaise={productCard.basePricePaise}
                  compareAtPaise={productCard.compareAtPricePaise}
                  size="lg"
                />
              </div>
            </div>

            {/* Fabric Specification */}
            <div className="p-3 bg-white border border-[#E5E3DC] rounded-[2px] space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#767872]">
                Fabric & Construction
              </span>
              <p className="text-xs text-[#1B1C1A]">
                {productCard.fabricSpecification || 'Single-origin certified fiber, hand-tailored in New Delhi.'}
              </p>
            </div>

            {/* Color Swatches */}
            {colors.length > 0 && (
              <div className="space-y-2">
                <label className="font-mono text-[11px] uppercase tracking-wider text-[#767872] block">
                  Color: <span className="text-[#1B1C1A] font-semibold">{selectedColor}</span>
                </label>
                <div className="flex items-center space-x-2">
                  {colors.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setSelectedColor(c.name)}
                      className={`w-6 h-6 rounded-full border transition-all ${
                        selectedColor === c.name
                          ? 'border-[#1B1C1A] ring-2 ring-[#1B1C1A] ring-offset-2'
                          : 'border-[#D6D3CA]'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Size Selector */}
            <div className="space-y-2">
              <label className="font-mono text-[11px] uppercase tracking-wider text-[#767872] block">
                Select Size
              </label>
              <div className="flex flex-wrap gap-2">
                {sizes.map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setSelectedSize(sz)}
                    className={`px-3 py-1.5 font-mono text-xs uppercase tracking-wider rounded-[2px] transition-colors ${
                      selectedSize === sz
                        ? 'bg-[#1B1C1A] text-[#FAF9F6]'
                        : 'bg-white border border-[#D6D3CA] text-[#1B1C1A] hover:border-[#1B1C1A]'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Add to Bag Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleAdd}
                className="w-full py-3.5 bg-[#1B1C1A] text-[#FAF9F6] text-xs font-mono uppercase tracking-widest rounded-[2px] hover:bg-[#333] transition-colors"
              >
                {added ? 'Added to Bag &bull; Preserved Locally' : 'Add to Bag'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
