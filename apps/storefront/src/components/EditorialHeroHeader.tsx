'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { SortSelector } from './SortSelector';

interface EditorialHeroHeaderProps {
  params: {
    collection?: string;
    category?: string;
    search?: string;
    sort?: string;
    size?: string;
    color?: string;
  };
  totalCount: number;
  activeFiltersCount: number;
}

export function EditorialHeroHeader({
  params,
  totalCount,
  activeFiltersCount,
}: EditorialHeroHeaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let ctx: any;
    import('gsap').then((gsapMod) => {
      const gsap = gsapMod.default || gsapMod;
      ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        // 1. Meta / volume strip reveal
        tl.fromTo(
          '.editorial-meta-strip',
          { opacity: 0, y: -8 },
          { opacity: 1, y: 0, duration: 0.75 }
        );

        // 2. Eyebrow masked reveal
        tl.fromTo(
          '.editorial-eyebrow',
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.8 },
          '-=0.5'
        );

        // 3. Headline smooth ascension
        tl.fromTo(
          '.editorial-headline',
          { opacity: 0, y: 22 },
          { opacity: 1, y: 0, duration: 0.95 },
          '-=0.6'
        );

        // 4. SortSelector & filter controls
        tl.fromTo(
          '.editorial-controls',
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.7 },
          '-=0.6'
        );

        // 5. Active refinement chips stagger
        if (activeFiltersCount > 0) {
          tl.fromTo(
            '.editorial-chip',
            { opacity: 0, y: 6 },
            { opacity: 1, y: 0, duration: 0.5, stagger: 0.05 },
            '-=0.4'
          );
        }
      }, containerRef);
    });

    return () => {
      if (ctx) ctx.revert();
    };
  }, [params.collection, params.category, params.search, activeFiltersCount]);

  return (
    <div ref={containerRef} className="w-full flex flex-col">
      {/* Editorial Breadcrumb & Catalog Meta Strip */}
      <section className="editorial-meta-strip w-full bg-[#F4F3F0] border-b border-[#E5E3DC] px-4 sm:px-6 md:px-12 py-3">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[#767872] text-[10px] sm:text-[11px] font-mono uppercase tracking-wider">
          <div className="flex items-center space-x-2 flex-wrap">
            <Link href="/" className="hover:text-[#1B1C1A] transition-colors">
              Catalog
            </Link>
            <span>/</span>
            <Link href="/" className="hover:text-[#1B1C1A] transition-colors">
              {params.collection ? params.collection.toUpperCase() : 'Permanent Collection'}
            </Link>
            <span>/</span>
            <span className="text-[#1B1C1A] font-semibold">
              {params.category ? params.category.toUpperCase() : 'All Apparel & Essentials'}
            </span>
          </div>

          <div className="flex items-center space-x-4 sm:space-x-6 text-[#767872] text-[10px] sm:text-[11px]">
            <span className="hidden sm:inline">Milled in Belgium & India</span>
            <span className="hidden md:inline">Series 2025: Volume 04</span>
            <span className="text-[#5A1827] font-semibold">
              {totalCount} Distinct Silhouettes
            </span>
          </div>
        </div>
      </section>

      {/* Title & Controls Header */}
      <section className="w-full bg-[#FAF9F6] px-4 sm:px-6 md:px-12 pt-6 sm:pt-10 pb-5 sm:pb-6 border-b border-[#E5E3DC]">
        <div className="max-w-[1440px] mx-auto flex flex-col gap-4 sm:gap-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="overflow-hidden">
              <span className="editorial-eyebrow block font-mono text-[10px] sm:text-xs uppercase tracking-widest text-[#767872]">
                Permanent Wardrobe Architecture
              </span>
              <h1 className="editorial-headline font-headline-lg text-2xl sm:text-3xl md:text-4xl text-[#1B1C1A] tracking-tight mt-1">
                {params.search
                  ? `Search: "${params.search}"`
                  : params.collection
                  ? params.collection
                  : 'Permanent Collection'}
                <span className="font-headline-sm text-base sm:text-xl text-[#767872] font-normal ml-2 sm:ml-3">
                  ({totalCount} Items)
                </span>
              </h1>
            </div>

            {/* Sort Controls */}
            <div className="editorial-controls self-start sm:self-auto">
              <SortSelector currentSort={params.sort || 'featured'} />
            </div>
          </div>

          {/* Active Filter Chips Row */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1 sm:pt-2">
              <span className="font-mono text-[11px] sm:text-xs uppercase tracking-wider text-[#767872] mr-1 sm:mr-2">
                Active Refinements:
              </span>

              {params.collection && (
                <div className="editorial-chip inline-flex items-center gap-1.5 bg-[#E9E8E5] text-[#1B1C1A] px-2 sm:px-2.5 py-1 rounded-[2px] font-mono text-[11px] sm:text-xs uppercase tracking-wider">
                  <span>Collection: {params.collection}</span>
                  <Link
                    href={`/?${new URLSearchParams({ ...params, collection: '' }).toString()}`}
                    className="text-[#767872] hover:text-[#1B1C1A]"
                  >
                    &times;
                  </Link>
                </div>
              )}

              {params.category && (
                <div className="editorial-chip inline-flex items-center gap-1.5 bg-[#E9E8E5] text-[#1B1C1A] px-2 sm:px-2.5 py-1 rounded-[2px] font-mono text-[11px] sm:text-xs uppercase tracking-wider">
                  <span>Category: {params.category}</span>
                  <Link
                    href={`/?${new URLSearchParams({ ...params, category: '' }).toString()}`}
                    className="text-[#767872] hover:text-[#1B1C1A]"
                  >
                    &times;
                  </Link>
                </div>
              )}

              {params.size && (
                <div className="editorial-chip inline-flex items-center gap-1.5 bg-[#E9E8E5] text-[#1B1C1A] px-2 sm:px-2.5 py-1 rounded-[2px] font-mono text-[11px] sm:text-xs uppercase tracking-wider">
                  <span>Size: {params.size}</span>
                  <Link
                    href={`/?${new URLSearchParams({ ...params, size: '' }).toString()}`}
                    className="text-[#767872] hover:text-[#1B1C1A]"
                  >
                    &times;
                  </Link>
                </div>
              )}

              {params.color && (
                <div className="editorial-chip inline-flex items-center gap-1.5 bg-[#E9E8E5] text-[#1B1C1A] px-2 sm:px-2.5 py-1 rounded-[2px] font-mono text-[11px] sm:text-xs uppercase tracking-wider">
                  <span>Color: {params.color}</span>
                  <Link
                    href={`/?${new URLSearchParams({ ...params, color: '' }).toString()}`}
                    className="text-[#767872] hover:text-[#1B1C1A]"
                  >
                    &times;
                  </Link>
                </div>
              )}

              {params.search && (
                <div className="editorial-chip inline-flex items-center gap-1.5 bg-[#E9E8E5] text-[#1B1C1A] px-2 sm:px-2.5 py-1 rounded-[2px] font-mono text-[11px] sm:text-xs uppercase tracking-wider">
                  <span>Query: &ldquo;{params.search}&rdquo;</span>
                  <Link
                    href={`/?${new URLSearchParams({ ...params, search: '' }).toString()}`}
                    className="text-[#767872] hover:text-[#1B1C1A]"
                  >
                    &times;
                  </Link>
                </div>
              )}

              <Link
                href="/"
                className="text-[11px] font-mono uppercase tracking-wider text-[#5A1827] hover:underline ml-2"
              >
                Clear All
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default EditorialHeroHeader;
