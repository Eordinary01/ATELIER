'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { CatalogResponse } from '../lib/api';

interface FilterSidebarProps {
  facets: CatalogResponse['facets'];
  totalCount: number;
}

export function FilterSidebar({ facets, totalCount }: FilterSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const currentCategory = searchParams.get('category') || '';
  const currentCollection = searchParams.get('collection') || '';
  const currentSize = searchParams.get('size') || '';
  const currentColor = searchParams.get('color') || '';

  const activeFilters = [currentCategory, currentCollection, currentSize, currentColor].filter(Boolean);
  const hasActiveFilters = activeFilters.length > 0;

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileDrawerOpen]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (params.get(key) === value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  };

  const clearAllFilters = () => {
    router.push(pathname);
  };

  const renderFacetContent = () => (
    <>
      {/* Collection Facet */}
      {facets.collections && facets.collections.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-[#1B1C1A] font-semibold">
            Collection
          </h3>
          <div className="space-y-2">
            {facets.collections.map((col) => {
              const isSelected = currentCollection.toLowerCase() === col.name.toLowerCase();
              return (
                <button
                  key={col.id}
                  onClick={() => updateFilter('collection', col.name)}
                  className={`w-full flex items-center justify-between text-xs px-2 py-1.5 rounded-[2px] transition-all text-left ${
                    isSelected
                      ? 'font-semibold text-[#1B1C1A] bg-[#F4F3F0] ring-1 ring-[#D6D3CA]'
                      : 'text-[#767872] hover:text-[#1B1C1A] hover:bg-[#FAF9F6]'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span
                      className={`w-3.5 h-3.5 rounded-[2px] border flex items-center justify-center text-[10px] ${
                        isSelected ? 'bg-[#1B1C1A] border-[#1B1C1A] text-white' : 'border-[#D6D3CA]'
                      }`}
                    >
                      {isSelected && '✓'}
                    </span>
                    <span className="truncate">{col.name}</span>
                  </div>
                  <span className="font-mono text-[11px] text-[#767872]">{col.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Category Facet */}
      <div className={`space-y-3 ${facets.collections && facets.collections.length > 0 ? 'pt-4 border-t border-[#E5E3DC]' : ''}`}>
        <h3 className="text-xs font-mono uppercase tracking-wider text-[#1B1C1A] font-semibold">
          Category
        </h3>
        <div className="space-y-1">
          {facets.categories.map((cat) => {
            const isSelected = currentCategory === cat.slug;
            return (
              <button
                key={cat.id}
                onClick={() => updateFilter('category', cat.slug)}
                className={`w-full flex items-center justify-between text-xs px-2 py-1.5 rounded-[2px] transition-all text-left ${
                  isSelected
                    ? 'font-semibold text-[#1B1C1A] bg-[#F4F3F0] ring-1 ring-[#D6D3CA]'
                    : 'text-[#767872] hover:text-[#1B1C1A] hover:bg-[#FAF9F6]'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span
                    className={`w-3.5 h-3.5 rounded-[2px] border flex items-center justify-center text-[10px] ${
                      isSelected ? 'bg-[#1B1C1A] border-[#1B1C1A] text-white' : 'border-[#D6D3CA]'
                    }`}
                  >
                    {isSelected && '✓'}
                  </span>
                  <span>{cat.name}</span>
                </div>
                <span className="font-mono text-[11px] text-[#767872]">{cat.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Size Facet */}
      <div className="space-y-3 pt-4 border-t border-[#E5E3DC]">
        <h3 className="text-xs font-mono uppercase tracking-wider text-[#1B1C1A] font-semibold">
          Garment Size
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {facets.sizes.map((sz) => {
            const sizeStr = typeof sz === 'string' ? sz : (sz as any).size;
            const isSelected = currentSize === sizeStr;
            return (
              <button
                key={sizeStr}
                onClick={() => updateFilter('size', sizeStr)}
                className={`py-2 text-xs font-mono rounded-[2px] border transition-colors text-center ${
                  isSelected
                    ? 'bg-[#1B1C1A] text-white border-[#1B1C1A]'
                    : 'bg-white text-[#1B1C1A] border-[#D6D3CA] hover:bg-[#EAE8E3]'
                }`}
              >
                {sizeStr}
              </button>
            );
          })}
        </div>
      </div>

      {/* Color Swatches Facet */}
      <div className="space-y-3 pt-4 border-t border-[#E5E3DC]">
        <h3 className="text-xs font-mono uppercase tracking-wider text-[#1B1C1A] font-semibold">
          Color Shade
        </h3>
        <div className="space-y-2">
          {facets.colors.map((c) => {
            const isSelected = currentColor === c.name;
            return (
              <button
                key={c.name}
                onClick={() => updateFilter('color', c.name)}
                className={`w-full flex items-center justify-between text-xs py-1 transition-colors ${
                  isSelected ? 'font-semibold text-[#1B1C1A]' : 'text-[#767872] hover:text-[#1B1C1A]'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <span
                    className={`w-4 h-4 rounded-full border ${
                      isSelected ? 'ring-2 ring-offset-1 ring-[#1B1C1A]' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                  <span>{c.name}</span>
                </div>
                {(c as any).count !== undefined && (
                  <span className="font-mono text-[11px] text-[#767872]">{(c as any).count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile & Tablet Filter Trigger Strip (visible on screens < lg) */}
      <div className="lg:hidden w-full flex items-center justify-between pb-4">
        <button
          type="button"
          onClick={() => setIsMobileDrawerOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#FAF9F6] border border-[#1B1C1A] text-[#1B1C1A] text-xs font-mono uppercase tracking-wider rounded-[2px] hover:bg-[#1B1C1A] hover:text-[#FAF9F6] transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">tune</span>
          <span>Refine & Filter</span>
          {activeFilters.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-[#5A1827] text-white text-[10px] flex items-center justify-center font-bold">
              {activeFilters.length}
            </span>
          )}
        </button>

        <span className="font-mono text-xs text-[#767872] uppercase tracking-wider">
          {totalCount} Silhouettes
        </span>
      </div>

      {/* Desktop Sidebar (hidden on screens < lg) */}
      <aside className="hidden lg:block w-full bg-[#FAF9F6] border border-[#E5E3DC] rounded-[4px] p-6 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E3DC]">
          <h2 className="font-serif-headline text-base font-semibold text-[#1B1C1A]">
            Refine Garments
          </h2>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-[11px] font-mono text-[#5A1827] uppercase tracking-wider hover:underline"
            >
              Clear All
            </button>
          )}
        </div>

        {renderFacetContent()}
      </aside>

      {/* Mobile Slide-Over Filter Drawer */}
      {isMobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end sm:justify-center">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative z-10 w-full sm:max-w-md sm:mx-auto max-h-[85vh] bg-[#FAF9F6] rounded-t-[8px] sm:rounded-[4px] flex flex-col overflow-hidden shadow-2xl border-t sm:border border-[#E5E3DC] animate-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E3DC] bg-[#FAF9F6]">
              <div className="flex items-center space-x-2">
                <h2 className="font-serif-headline text-base font-semibold text-[#1B1C1A]">
                  Refine Garments
                </h2>
                {activeFilters.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-[#1B1C1A] text-white text-[10px] font-mono rounded-[2px]">
                    {activeFilters.length} Active
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-4">
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="text-[11px] font-mono text-[#5A1827] uppercase tracking-wider hover:underline"
                  >
                    Clear All
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-1 text-[#767872] hover:text-[#1B1C1A]"
                  aria-label="Close filters"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            {/* Scrollable Facets Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {renderFacetContent()}
            </div>

            {/* Footer Apply Bar */}
            <div className="p-4 bg-[#FAF9F6] border-t border-[#E5E3DC]">
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="w-full py-3 bg-[#1B1C1A] text-[#FAF9F6] text-xs font-mono uppercase tracking-wider rounded-[2px] hover:bg-[#333] transition-colors"
              >
                View {totalCount} Silhouettes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
