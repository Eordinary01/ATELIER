'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { PriceDisplay } from '@atelier/ui';
import { ProductDetail } from '@atelier/contract';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { getOfflineItem, setOfflineItem } from '../lib/offlineStore';

interface ProductDetailClientProps {
  product: ProductDetail | null;
  slug?: string;
}

export function ProductDetailClient({ product: initialProduct, slug }: ProductDetailClientProps) {
  const [product, setProduct] = useState<ProductDetail | null>(initialProduct);
  const [isLoading, setIsLoading] = useState<boolean>(!initialProduct);

  useEffect(() => {
    if (!initialProduct && slug) {
      getOfflineItem<ProductDetail>(`pdp:${slug}`).then((cached) => {
        if (cached) {
          setProduct(cached);
        }
        setIsLoading(false);
      });
    } else if (initialProduct) {
      setProduct(initialProduct);
      setIsLoading(false);
      setOfflineItem(`pdp:${initialProduct.slug}`, initialProduct).catch(() => {});
    }
  }, [initialProduct, slug]);

  // Extract all distinct colors from variants
  const colorMap = new Map<string, { name: string; hex: string }>();
  (product?.variants || []).forEach((v) => {
    if (!colorMap.has(v.colorName)) {
      colorMap.set(v.colorName, { name: v.colorName, hex: v.colorHex });
    }
  });
  const colors = Array.from(colorMap.values());

  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const isWishlisted = product ? isInWishlist(product.id) : false;
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [addedToBag, setAddedToBag] = useState(false);

  const handleToggleWishlist = () => {
    if (!product) return;
    const cardData = {
      id: product.id,
      title: product.title,
      slug: product.slug,
      basePricePaise: product.basePricePaise,
      compareAtPricePaise: product.compareAtPricePaise,
      isSoldOut: isOutOfStock,
      category: product.category,
      collectionName: product.collectionName,
      fabricSpecification: product.fabricSpecification,
      primaryImage: product.images?.[0] || null,
      availableSizes: product.variants?.map((v) => v.size) || [],
      colorShades: colors,
    };
    toggleWishlist(cardData as any);
  };

  const mainImageRef = useRef<HTMLImageElement | null>(null);
  const addToBagBtnRef = useRef<HTMLButtonElement | null>(null);

  // Cinematic PDP Gallery image transition
  useEffect(() => {
    if (!mainImageRef.current) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    import('gsap').then((gsapMod) => {
      const gsap = gsapMod.default || gsapMod;
      if (gsap && mainImageRef.current) {
        gsap.fromTo(
          mainImageRef.current,
          { opacity: 0.3, scale: 1.025, x: 6 },
          { opacity: 1, scale: 1, x: 0, duration: 0.65, ease: 'power2.out', overwrite: 'auto' }
        );
      }
    });
  }, [activeImageIndex]);

  useEffect(() => {
    if (product) {
      if (!selectedColor && colors[0]) setSelectedColor(colors[0].name);
      if (!selectedSize && product.variants?.[0]) setSelectedSize(product.variants[0].size);
    }
  }, [product, colors, selectedColor, selectedSize]);

  if (!product) {
    if (isLoading) {
      return (
        <div className="max-w-[1440px] mx-auto px-4 md:px-12 py-10 animate-pulse space-y-6">
          <div className="h-4 bg-[#EAE8E3] w-1/4 rounded-[2px]" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-7 aspect-[4/5] bg-[#EAE8E3] rounded-[2px]" />
            <div className="lg:col-span-5 space-y-4">
              <div className="h-8 bg-[#EAE8E3] rounded-[2px] w-3/4" />
              <div className="h-6 bg-[#EAE8E3] rounded-[2px] w-1/3" />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-16 max-w-xl mx-auto my-12 bg-white border border-[#E5E3DC] rounded-[4px] text-center space-y-4">
        <p className="font-serif-headline text-lg text-[#1B1C1A]">
          Silhouette Not in Local Archive
        </p>
        <p className="text-xs text-[#767872]">
          This garment has not been cached for offline viewing. Reconnect to network to view this silhouette.
        </p>
        <Link
          href="/"
          className="inline-block px-5 py-2.5 bg-[#1B1C1A] text-[#FAF9F6] text-xs font-mono uppercase tracking-wider rounded-[2px] hover:bg-[#333] transition-colors"
        >
          Return to Catalog
        </Link>
      </div>
    );
  }



  // Active variant matching color and size
  const activeVariant = (product.variants || []).find(
    (v) => v.colorName === selectedColor && v.size === selectedSize
  ) || product.variants?.[0];

  const stockAvailable = activeVariant ? activeVariant.quantityAvailable : 0;
  const isOutOfStock = stockAvailable <= 0;
  const isLowStock = stockAvailable > 0 && stockAvailable <= 5;

  const images = (product.images && product.images.length > 0)
    ? product.images
    : [
        {
          id: 'placeholder',
          productId: product.id,
          url: product.primaryImage?.url || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80',
          altText: product.title,
          isPrimary: true,
          sortOrder: 0,
        },
      ];

  const handleAddToBag = () => {
    if (isOutOfStock || !activeVariant) return;

    if (addToBagBtnRef.current) {
      if (
        typeof window !== 'undefined' &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        import('gsap').then((gsapMod) => {
          const gsap = gsapMod.default || gsapMod;
          if (gsap && addToBagBtnRef.current) {
            gsap
              .timeline()
              .to(addToBagBtnRef.current, { scale: 0.96, duration: 0.08, ease: 'power2.out' })
              .to(addToBagBtnRef.current, { scale: 1, duration: 0.3, ease: 'back.out(2)' });
          }
        });
      }
    }

    addToCart({
      productId: product.id,
      variantId: activeVariant.id,
      title: product.title,
      slug: product.slug,
      sku: activeVariant.sku,
      size: activeVariant.size,
      colorName: activeVariant.colorName,
      colorHex: activeVariant.colorHex,
      pricePaise: activeVariant.priceOverridePaise || product.basePricePaise,
      quantity,
      imageUrl: images[0]?.url || '',
    });
    setAddedToBag(true);
    setTimeout(() => setAddedToBag(false), 2500);
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-12 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-[11px] font-mono uppercase tracking-wider text-[#767872] mb-8">
        <Link href="/" className="hover:text-[#1B1C1A]">Catalog</Link>
        <span>/</span>
        <Link href={`/products?category=${product.category?.slug || ''}`} className="hover:text-[#1B1C1A]">
          {product.category?.name || 'Apparel'}
        </Link>
        <span>/</span>
        <span className="text-[#1B1C1A] font-semibold">{product.title}</span>
      </nav>

      {/* Main Dual-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left Gallery Column (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Main 4:5 Active Image */}
          <div className="relative aspect-[4/5] bg-[#F4F3F0] border border-[#E5E3DC] rounded-[4px] overflow-hidden">
            <img
              ref={mainImageRef}
              src={images[activeImageIndex]?.url}
              alt={images[activeImageIndex]?.altText || product.title}
              className="w-full h-full object-cover will-change-transform"
            />
            {product.collectionName && (
              <span className="absolute top-4 left-4 px-2.5 py-1 bg-white/90 backdrop-blur-sm text-[#1B1C1A] text-[10px] font-mono uppercase tracking-wider rounded-[2px] border border-[#D6D3CA]">
                {product.collectionName}
              </span>
            )}
          </div>

          {/* Thumbnails Strip */}
          {images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {images.map((img, idx) => (
                <button
                  key={img.id || idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-20 aspect-[4/5] rounded-[2px] overflow-hidden border-2 transition-all flex-shrink-0 ${
                    activeImageIndex === idx ? 'border-[#1B1C1A]' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img.url} alt={img.altText} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Details & Configuration Column (5 cols) */}
        <div className="lg:col-span-5 space-y-8">
          {/* Title & Pricing */}
          <div className="space-y-2 border-b border-[#E5E3DC] pb-6">
            <div className="flex items-center justify-between text-[11px] font-mono uppercase text-[#767872]">
              <span>{product.category?.name || 'Apparel'}</span>
              <span>SKU: {activeVariant?.sku || 'ATELIER-CORE'}</span>
            </div>

            <h1 className="font-headline-lg text-2xl md:text-3xl text-[#1B1C1A] font-semibold tracking-tight">
              {product.title}
            </h1>

            <div className="pt-2">
              <PriceDisplay
                amountPaise={activeVariant?.priceOverridePaise || product.basePricePaise}
                compareAtPaise={product.compareAtPricePaise}
                size="lg"
              />
            </div>
            <p className="text-[11px] font-mono text-[#767872]">
              Inclusive of all taxes &bull; GST {product.gstRatePercent}% &bull; Free standard shipping
            </p>
          </div>

          {/* Color Selection */}
          {colors.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono uppercase">
                <span className="text-[#767872]">Color Shade:</span>
                <span className="text-[#1B1C1A] font-semibold">{selectedColor}</span>
              </div>
              <div className="flex items-center gap-3">
                {colors.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setSelectedColor(c.name)}
                    title={c.name}
                    className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all ${
                      selectedColor === c.name
                        ? 'ring-2 ring-offset-2 ring-[#1B1C1A] scale-110'
                        : 'hover:scale-105 border-gray-300'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Size Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono uppercase">
              <span className="text-[#767872]">Garment Size:</span>
              <span className="text-[#1B1C1A] font-semibold">
                {selectedSize ? `Size ${selectedSize}` : 'Select Size'}
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((sz) => {
                const variantForSize = product.variants.find(
                  (v) => v.colorName === selectedColor && v.size === sz
                );
                const hasStock = variantForSize && variantForSize.quantityAvailable > 0;
                const isSelected = selectedSize === sz;

                return (
                  <button
                    key={sz}
                    disabled={!hasStock}
                    onClick={() => setSelectedSize(sz)}
                    className={`py-3 text-xs font-mono uppercase rounded-[2px] border transition-all text-center ${
                      isSelected
                        ? 'bg-[#1B1C1A] text-white border-[#1B1C1A]'
                        : hasStock
                        ? 'bg-white text-[#1B1C1A] border-[#D6D3CA] hover:border-[#1B1C1A]'
                        : 'bg-[#F4F3F0] text-[#A8A7A1] border-[#E5E3DC] cursor-not-allowed line-through'
                    }`}
                  >
                    {sz}
                  </button>
                );
              })}
            </div>

            {/* Live Stock Notification */}
            <div className="pt-1 text-[11px] font-mono">
              {isOutOfStock ? (
                <span className="text-[#93000A]">Currently out of stock in this cut</span>
              ) : isLowStock ? (
                <span className="text-[#93000A]">Limited availability: {stockAvailable} garments remaining</span>
              ) : (
                <span className="text-[#1B3B2B]">&bull; In stock for immediate dispatch</span>
              )}
            </div>
          </div>

          {/* Action Row */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-[#D6D3CA] rounded-[2px] bg-white h-12 px-2">
                <button
                  type="button"
                  disabled={quantity <= 1 || isOutOfStock}
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-full flex items-center justify-center font-mono text-sm text-[#1B1C1A] disabled:opacity-30 hover:bg-[#F4F3F0]"
                >
                  -
                </button>
                <span className="w-8 text-center font-mono text-xs font-semibold tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  disabled={quantity >= stockAvailable || isOutOfStock}
                  onClick={() => setQuantity(Math.min(stockAvailable, quantity + 1))}
                  className="w-8 h-full flex items-center justify-center font-mono text-sm text-[#1B1C1A] disabled:opacity-30 hover:bg-[#F4F3F0]"
                >
                  +
                </button>
              </div>

              <button
                ref={addToBagBtnRef}
                onClick={handleAddToBag}
                disabled={isOutOfStock}
                className={`flex-1 h-12 text-xs font-mono uppercase tracking-widest rounded-[2px] transition-all flex items-center justify-center space-x-2 ${
                  addedToBag
                    ? 'bg-[#1B3B2B] text-white'
                    : isOutOfStock
                    ? 'bg-[#E5E3DC] text-[#767872] cursor-not-allowed'
                    : 'bg-[#1B1C1A] text-[#FAF9F6] hover:bg-[#333]'
                }`}
              >
                {addedToBag ? (
                  <span>&bull; Added ({quantity}) to Bag</span>
                ) : isOutOfStock ? (
                  <span>Sold Out</span>
                ) : (
                  <span>Add to Commission Bag</span>
                )}
              </button>

              {/* Wishlist Toggle Button */}
              <button
                type="button"
                onClick={handleToggleWishlist}
                aria-label={isWishlisted ? 'Remove from Saved Archive' : 'Save to Archive'}
                className={`h-12 px-4 rounded-[2px] border transition-all flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-wider ${
                  isWishlisted
                    ? 'border-[#8A2B2B] bg-[#FAF0F0] text-[#8A2B2B]'
                    : 'border-[#D6D3CA] bg-white text-[#1B1C1A] hover:border-[#1B1C1A]'
                }`}
              >
                <svg
                  className={`w-4 h-4 transition-transform ${isWishlisted ? 'fill-[#8A2B2B] stroke-[#8A2B2B] scale-110' : 'fill-none stroke-current'}`}
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                  />
                </svg>
                <span className="hidden sm:inline">
                  {isWishlisted ? 'Archived' : 'Save'}
                </span>
              </button>
            </div>

            <div className="p-3 bg-[#F4F3F0] border border-[#E5E3DC] rounded-[2px] text-[11px] font-mono text-[#767872] flex items-center justify-between">
              <span>Complimentary Studio Alterations</span>
              <span className="text-[#1B1C1A] font-medium">New Delhi Atelier</span>
            </div>
          </div>

          {/* GSAP Architectural Technical Specifications Accordions */}
          <div className="border-t border-[#E5E3DC] text-xs">
            <EditorialAccordionItem title="Fabric Architecture" defaultOpen={true}>
              <div className="space-y-2 leading-relaxed">
                <p>{product.fabricSpecification}</p>
                <p className="text-[11px] font-mono text-[#767872]">
                  Constructed with reinforced double-needle chain stitching. Natural enzyme washed for dimensional stability and hand feel.
                </p>
              </div>
            </EditorialAccordionItem>

            <EditorialAccordionItem title="Garment Cut & Silhouette">
              <div className="leading-relaxed">
                <p>{product.description}</p>
              </div>
            </EditorialAccordionItem>

            <EditorialAccordionItem title="Compliance & Taxation">
              <div className="space-y-1 font-mono text-[11px]">
                <p>HSN Code: {product.hsnCode}</p>
                <p>Applicable GST: {product.gstRatePercent}% Integrated GST</p>
                <p>Country of Origin: India (Hand-finished in New Delhi)</p>
              </div>
            </EditorialAccordionItem>
          </div>
        </div>
      </div>
    </div>
  );
}

interface EditorialAccordionItemProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function EditorialAccordionItem({
  title,
  defaultOpen = false,
  children,
}: EditorialAccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="py-4 border-b border-[#E5E3DC]">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full font-mono uppercase tracking-wider text-[#1B1C1A] text-xs font-semibold cursor-pointer flex items-center justify-between text-left focus:outline-none"
      >
        <span>{title}</span>
        <span
          className={`text-[#767872] inline-block transition-transform duration-300 ${
            isOpen ? 'rotate-180' : 'rotate-0'
          }`}
        >
          &darr;
        </span>
      </button>
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="pt-3 text-[#464742]">{children}</div>
        </div>
      </div>
    </div>
  );
}


