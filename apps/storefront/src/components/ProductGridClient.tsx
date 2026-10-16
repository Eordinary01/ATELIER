'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ProductCard as ProductCardType } from '@atelier/contract';
import { ProductCard } from './ProductCard';
import { fetchStorefrontApi } from '../lib/api';
import { getOfflineItem, setOfflineItem } from '../lib/offlineStore';
import { OfflineGarmentModal } from './OfflineGarmentModal';

interface ProductGridClientProps {
  initialProducts: ProductCardType[];
  totalCount: number;
  initialPage?: number;
  limit?: number;
  filterParams: {
    category?: string;
    collection?: string;
    size?: string;
    color?: string;
    sort?: string;
    search?: string;
  };
}

export function ProductGridClient({
  initialProducts,
  totalCount,
  initialPage = 1,
  limit = 12,
  filterParams,
}: ProductGridClientProps) {
  const [products, setProducts] = useState<ProductCardType[]>(initialProducts);
  const [page, setPage] = useState<number>(initialPage);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(initialProducts.length < totalCount);
  const [selectedOfflineProduct, setSelectedOfflineProduct] = useState<ProductCardType | null>(null);

  const observerTarget = useRef<HTMLDivElement | null>(null);
  const gridContainerRef = useRef<HTMLDivElement | null>(null);

  // GSAP ScrollTrigger batch stagger for product cards
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const cards = gridContainerRef.current?.querySelectorAll('[data-product-card]');
      if (cards) {
        cards.forEach((c) => {
          (c as HTMLElement).style.opacity = '1';
          (c as HTMLElement).style.transform = 'none';
        });
      }
      return;
    }

    let ctx: any;
    Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(
      ([gsapMod, stMod]) => {
        const gsap = gsapMod.default || gsapMod;
        const ScrollTrigger = stMod.ScrollTrigger || stMod.default || stMod;
        if (gsap && ScrollTrigger && typeof gsap.registerPlugin === 'function') {
          gsap.registerPlugin(ScrollTrigger);

          ctx = gsap.context(() => {
            ScrollTrigger.batch('[data-product-card]', {
              interval: 0.08,
              batchMax: 6,
              onEnter: (batch: any) => {
                gsap.fromTo(
                  batch,
                  { opacity: 0, y: 32 },
                  {
                    opacity: 1,
                    y: 0,
                    duration: 0.85,
                    stagger: 0.08,
                    ease: 'power3.out',
                    overwrite: 'auto',
                  }
                );
              },
              once: true,
            });

            ScrollTrigger.refresh();
          }, gridContainerRef);
        }
      }
    );

    return () => {
      if (ctx) ctx.revert();
    };
  }, [products]);

  const filterKey = JSON.stringify(filterParams);
  const prevFilterKeyRef = useRef(filterKey);

  // Clean any legacy/stale page query param from the browser URL so user is never stranded on page 2
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('page=')) {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete('page');
      const cleanUrl = currentUrl.pathname + (currentUrl.search ? currentUrl.search : '');
      window.history.replaceState(null, '', cleanUrl);
    }
  }, []);

  // Sync state ONLY when filter criteria actually change (category, collection, sort, size, color, search)
  useEffect(() => {
    if (prevFilterKeyRef.current !== filterKey) {
      prevFilterKeyRef.current = filterKey;
      setProducts(initialProducts);
      setPage(initialPage);
      setHasMore(initialProducts.length < totalCount);
    }
  }, [filterKey, initialProducts, totalCount, initialPage]);

  // Pre-warm cache for products so they are available offline
  useEffect(() => {
    if (typeof window === 'undefined' || products.length === 0) return;

    const timer = setTimeout(() => {
      products.forEach((p) => {
        fetchStorefrontApi(`/api/v1/products/${p.slug}`).catch(() => {});
        getOfflineItem(`pdp:${p.slug}`).then((cached) => {
          if (!cached) {
            setOfflineItem(`pdp:${p.slug}`, {
              ...p,
              description: p.fabricSpecification || 'Permanent collection archival garment.',
              variants: p.availableSizes.map((sz, idx) => ({
                id: `variant_${p.id}_${idx}`,
                sku: `ATL-${p.slug.slice(0, 4).toUpperCase()}-${sz}`,
                size: sz,
                colorName: p.colorShades[0]?.name || 'Standard',
                colorHex: p.colorShades[0]?.hex || '#1B1C1A',
                quantityAvailable: p.isSoldOut ? 0 : 10,
                pricePaise: p.basePricePaise,
              })),
            }).catch(() => {});
          }
        });
      });
    }, 150);

    return () => clearTimeout(timer);
  }, [products]);


  // Load next page of products
  const loadNextPage = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    const nextPage = page + 1;

    try {
      const query = new URLSearchParams();
      if (filterParams.category) query.set('category', filterParams.category);
      if (filterParams.collection) query.set('collection', filterParams.collection);
      if (filterParams.size) query.set('sizes', filterParams.size);
      if (filterParams.color) query.set('colors', filterParams.color);
      if (filterParams.sort) query.set('sort', filterParams.sort);
      if (filterParams.search) query.set('search', filterParams.search);
      query.set('page', String(nextPage));
      query.set('limit', String(limit));

      const res = await fetchStorefrontApi<ProductCardType[]>(
        `/api/v1/products?${query.toString()}`
      );

      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setProducts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newItems = res.data!.filter((p) => !existingIds.has(p.id));
          return [...prev, ...newItems];
        });
        setPage(nextPage);

        const totalPages = res.meta?.totalPages || Math.ceil(totalCount / limit);
        if (nextPage >= totalPages || res.data.length < limit) {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch {
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [page, isLoading, hasMore, filterParams, limit, totalCount]);

  // IntersectionObserver for automatic infinite lazy loading
  useEffect(() => {
    const target = observerTarget.current;
    if (!target || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isLoading) {
          loadNextPage();
        }
      },
      {
        rootMargin: '250px',
        threshold: 0.1,
      }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [loadNextPage, hasMore, isLoading]);

  if (products.length === 0) {
    return (
      <div className="p-16 bg-white border border-[#E5E3DC] rounded-[4px] text-center space-y-4">
        <p className="font-serif-headline text-lg text-[#1B1C1A]">
          No Garments Match Selected Refinements
        </p>
        <p className="text-xs text-[#767872] max-w-md mx-auto">
          Adjust your size, color, or category filters to view available silhouettes from the permanent archive.
        </p>
        <Link
          href="/"
          className="inline-block px-5 py-2.5 bg-[#1B1C1A] text-[#FAF9F6] text-xs font-mono uppercase tracking-wider rounded-[2px] hover:bg-[#333] transition-colors"
        >
          Reset Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Responsive Product Grid: 2 cols on mobile, 3 cols on tablet/desktop */}
      <div
        ref={gridContainerRef}
        className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-3 sm:gap-4 md:gap-6"
      >
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            onSelect={(selected) => setSelectedOfflineProduct(selected)}
          />
        ))}

        {/* Shimmer Placeholder Cards while lazy fetching next page */}
        {isLoading &&
          Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={`skeleton-${idx}`}
              className="bg-[#FAF9F6] border border-[#E5E3DC] rounded-[4px] overflow-hidden p-2.5 sm:p-4 space-y-2.5 sm:space-y-4 animate-pulse"
            >
              <div className="aspect-[4/5] bg-[#EAE8E3] rounded-[2px]" />
              <div className="space-y-1.5 sm:space-y-2">
                <div className="h-2.5 sm:h-3 bg-[#EAE8E3] rounded-[2px] w-3/4" />
                <div className="h-2 sm:h-2.5 bg-[#EAE8E3] rounded-[2px] w-1/2" />
              </div>
            </div>
          ))}
      </div>

      {/* Sentinel / Infinite Lazy Loading Trigger & Manual Fallback */}
      <div ref={observerTarget} className="py-6 flex flex-col items-center justify-center space-y-3">
        {isLoading && (
          <div className="flex items-center space-x-2 font-mono text-[11px] sm:text-xs uppercase tracking-wider text-[#767872]">
            <div className="w-2 h-2 rounded-full bg-[#1B1C1A] animate-ping" />
            <span>Retrieving Archival Silhouettes...</span>
          </div>
        )}

        {hasMore && !isLoading && (
          <button
            type="button"
            onClick={loadNextPage}
            className="w-full sm:w-auto px-6 py-3 border border-[#1B1C1A] bg-transparent text-[#1B1C1A] text-xs font-mono uppercase tracking-wider rounded-[2px] hover:bg-[#1B1C1A] hover:text-[#FAF9F6] transition-colors text-center"
          >
            Load More Silhouettes ({products.length} of {totalCount})
          </button>
        )}

        {!hasMore && products.length > 0 && (
          <div className="text-center font-mono text-[11px] uppercase tracking-wider text-[#767872] pt-4 border-t border-[#E5E3DC] w-full max-w-sm mx-auto">
            All {products.length} Silhouettes Displayed &bull; Permanent Collection Complete
          </div>
        )}
      </div>

      {/* Offline Garment Modal Sheet */}
      {selectedOfflineProduct && (
        <OfflineGarmentModal
          productCard={selectedOfflineProduct}
          onClose={() => setSelectedOfflineProduct(null)}
        />
      )}
    </div>
  );
}

