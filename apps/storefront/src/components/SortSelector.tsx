'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

interface SortSelectorProps {
  currentSort: string;
}

export function SortSelector({ currentSort }: SortSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSortChange = (newSort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', newSort);
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center bg-[#F4F3F0] px-3.5 h-10 rounded-[2px] border border-[#E5E3DC]">
      <span className="font-mono text-xs uppercase tracking-wider text-[#767872] mr-2">
        Sort:
      </span>
      <select
        value={currentSort}
        onChange={(e) => handleSortChange(e.target.value)}
        className="bg-transparent font-mono text-xs text-[#1B1C1A] uppercase tracking-wider focus:outline-none cursor-pointer pr-2"
      >
        <option value="featured">Featured Curations</option>
        <option value="price-asc">Price: Low to High</option>
        <option value="price-desc">Price: High to Low</option>
        <option value="newest">Newest Arrivals</option>
      </select>
    </div>
  );
}
