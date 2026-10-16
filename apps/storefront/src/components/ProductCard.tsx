'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { PriceDisplay } from '@atelier/ui';
import { ProductCard as ProductCardType } from '@atelier/contract';
import { useWishlist } from '../context/WishlistContext';

interface ProductCardProps {
  product: ProductCardType;
  onSelect?: (product: ProductCardType) => void;
}

export function ProductCard({ product, onSelect }: ProductCardProps) {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const isWishlisted = isInWishlist(product.id);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const imageUrl =
    product.primaryImage?.url ||
    'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80';

  useEffect(() => {
    if (imgRef.current?.complete) {
      setImageLoaded(true);
    }
  }, [imageUrl]);

  // Architectural differential parallax scroll on garment photography
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    let ctx: any;
    Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(
      ([gsapMod, stMod]) => {
        const gsap = gsapMod.default || gsapMod;
        const ScrollTrigger = stMod.ScrollTrigger || stMod.default || stMod;
        if (gsap && ScrollTrigger && typeof gsap.registerPlugin === 'function') {
          gsap.registerPlugin(ScrollTrigger);

          if (imgRef.current && cardRef.current) {
            ctx = gsap.context(() => {
              gsap.fromTo(
                imgRef.current,
                { yPercent: -4 },
                {
                  yPercent: 4,
                  ease: 'none',
                  scrollTrigger: {
                    trigger: cardRef.current,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: 1.2,
                  },
                }
              );
            }, cardRef);
          }
        }
      }
    );

    return () => {
      if (ctx) ctx.revert();
    };
  }, []);

  const handleCardClick = (e: React.MouseEvent) => {
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (isOffline && onSelect) {
      e.preventDefault();
      onSelect(product);
    }
  };

  return (
    <div
      ref={cardRef}
      data-product-card
      className="group flex flex-col bg-[#FAF9F6] border border-[#E5E3DC] rounded-[4px] overflow-hidden transition-all duration-300 hover:shadow-sm"
    >
      {/* 4:5 Aspect Ratio Image Container with Skeleton */}
      <Link
        href={`/products/${product.slug}`}
        prefetch={true}
        onClick={handleCardClick}
        className="relative block aspect-[4/5] bg-[#F4F3F0] overflow-hidden"
      >

        {/* Placeholder Shimmer while loading */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-[#EAE8E3] animate-pulse" />
        )}

        <img
          ref={imgRef}
          src={imageUrl}
          alt={product.title}
          loading="lazy"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageLoaded(true)}
          className={`w-full h-full object-cover scale-[1.08] will-change-transform transition-all duration-700 ease-out group-hover:scale-[1.12] ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Status Badges */}
        <div className="absolute top-2 sm:top-3 left-2 sm:left-3 flex flex-col gap-1 sm:gap-1.5 items-start z-10 max-w-[85%]">
          {product.isSoldOut && (
            <span className="px-1.5 sm:px-2 py-0.5 bg-[#FFDAD6] text-[#93000A] text-[9px] sm:text-[10px] font-mono uppercase tracking-wider rounded-[2px] font-medium">
              Sold Out
            </span>
          )}
          {product.collectionName && (
            <span className="px-1.5 sm:px-2 py-0.5 bg-[#FAF9F6]/90 backdrop-blur-sm text-[#1B1C1A] text-[9px] sm:text-[10px] font-mono uppercase tracking-wider rounded-[2px] border border-[#D6D3CA] truncate max-w-full">
              {product.collectionName}
            </span>
          )}
        </div>

        {/* Quick Wishlist Save */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(product);
          }}
          aria-label={isWishlisted ? 'Remove from Saved Archive' : 'Save to Archive'}
          className={`absolute top-2 sm:top-3 right-2 sm:right-3 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all backdrop-blur-sm border ${
            isWishlisted
              ? 'bg-white/95 border-[#8A2B2B] text-[#8A2B2B] shadow-sm'
              : 'bg-white/80 border-[#D6D3CA] text-[#464742] hover:text-[#1B1C1A] hover:bg-white'
          }`}
        >
          <svg
            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform ${isWishlisted ? 'fill-[#8A2B2B] stroke-[#8A2B2B] scale-110' : 'fill-none stroke-current'}`}
            viewBox="0 0 24 24"
            strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
            />
          </svg>
        </button>

        {/* Hover Size Indicator Overlay (Desktop Hover) */}
        <div className="hidden sm:flex absolute bottom-0 left-0 right-0 p-3 bg-[#1B1C1A]/85 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center gap-1.5 z-10">
          {product.availableSizes.map((sz) => (
            <span
              key={sz}
              className="px-2 py-1 bg-white text-[#1B1C1A] text-[10px] font-mono uppercase rounded-[2px] shadow-sm font-medium"
            >
              {sz}
            </span>
          ))}
        </div>
      </Link>

      {/* Garment Details */}
      <div className="p-3 sm:p-4 flex flex-col flex-1 justify-between space-y-2 sm:space-y-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono uppercase text-[#767872]">
            <span className="truncate">{product.category?.name || 'Garment'}</span>
            <span className="hidden sm:inline">Series 04</span>
          </div>

          <Link
            href={`/products/${product.slug}`}
            prefetch={true}
            onClick={handleCardClick}
          >
            <h3 className="font-serif-headline text-xs sm:text-sm font-semibold text-[#1B1C1A] group-hover:text-[#5A1827] transition-colors line-clamp-1">
              {product.title}
            </h3>
          </Link>


          <p className="text-[10px] sm:text-[11px] text-[#767872] line-clamp-1">
            {product.fabricSpecification}
          </p>
        </div>

        {/* Pricing & Colors Row */}
        <div className="pt-2 border-t border-[#E5E3DC] flex items-center justify-between gap-1">
          <PriceDisplay
            amountPaise={product.basePricePaise}
            compareAtPaise={product.compareAtPricePaise}
          />

          {/* Color Dots */}
          <div className="flex items-center space-x-1 sm:space-x-1.5 flex-shrink-0">
            {product.colorShades.slice(0, 3).map((c, i) => (
              <span
                key={i}
                title={c.name}
                className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full border border-gray-300 flex-shrink-0"
                style={{ backgroundColor: c.hex }}
              />
            ))}
            {product.colorShades.length > 3 && (
              <span className="text-[9px] font-mono text-[#767872]">
                +{product.colorShades.length - 3}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
