'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { ScrollProgressBar } from './ScrollProgressBar';
import { LiveAtelierTime } from './LiveAtelierTime';

export function Header() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { totalCount, setIsCartDrawerOpen } = useCart();
  const { wishlistCount } = useWishlist();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/catalog?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#FAF9F6]/95 backdrop-blur-md border-b border-[#E5E3DC]">
      {/* Top Announcement Bar */}
      <div className="w-full bg-[#E9E8E5] py-1 px-4 md:px-12">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between text-[#767872] text-[11px] font-mono uppercase tracking-wider">
          <div className="flex items-center space-x-3 flex-wrap">
            <span className="hidden lg:inline">Free nationwide delivery over ₹1,999</span>
            <span className="hidden lg:inline text-[#C7C7C0]">|</span>
            <div className="flex items-center">
              <LiveAtelierTime />
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <Link href="/track-order" className="hover:text-[#1B1C1A] transition-colors">
              Track Order
            </Link>
            <Link href="/help" className="hover:text-[#1B1C1A] transition-colors">
              Concierge
            </Link>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="h-20 w-full max-w-[1440px] mx-auto px-4 md:px-12 flex items-center justify-between gap-6">
        <div className="flex items-center gap-8 lg:gap-12">
          {/* Mobile hamburger */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-1 text-[#1B1C1A]"
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined text-[24px]">
              {isMobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>

          {/* Brand Logo */}
          <Link
            href="/"
            className="font-headline-sm text-2xl font-semibold tracking-tight text-[#1B1C1A] uppercase hover:opacity-80 transition-opacity"
          >
            ATELIER
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center space-x-6 text-xs font-mono uppercase tracking-wider">
            <Link
              href="/catalog"
              className="text-[#1B1C1A] hover:text-[#5A1827] transition-colors font-medium"
            >
              All Apparel
            </Link>
            <Link
              href="/catalog?category=shirts"
              className="text-[#464742] hover:text-[#1B1C1A] transition-colors"
            >
              Shirts
            </Link>
            <Link
              href="/catalog?category=trousers"
              className="text-[#464742] hover:text-[#1B1C1A] transition-colors"
            >
              Trousers
            </Link>
            <Link
              href="/catalog?category=overshirts"
              className="text-[#464742] hover:text-[#1B1C1A] transition-colors"
            >
              Overshirts
            </Link>
            <Link
              href="/catalog?category=knitwear"
              className="text-[#464742] hover:text-[#1B1C1A] transition-colors"
            >
              Knitwear
            </Link>
            <Link
              href="/catalog?category=bags"
              className="text-[#464742] hover:text-[#1B1C1A] transition-colors"
            >
              Bags
            </Link>
            <Link
              href="/catalog?category=belts"
              className="text-[#464742] hover:text-[#1B1C1A] transition-colors"
            >
              Accessories
            </Link>
          </nav>
        </div>

        {/* Right Action Icons & Search */}
        <div className="flex items-center space-x-4">
          <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center bg-[#F4F3F0] px-3 h-10 w-60 rounded-[2px] border border-[#E5E3DC]">
            <span className="material-symbols-outlined text-[#767872] text-[18px] mr-2">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search garments..."
              className="w-full bg-transparent text-[#1B1C1A] text-xs focus:outline-none placeholder:text-[#767872]"
            />
          </form>

          <Link
            href="/wishlist"
            aria-label="Wishlist"
            className="text-[#464742] hover:text-[#1B1C1A] p-1.5 relative transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">favorite</span>
            {wishlistCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#5A1827] text-white text-[10px] font-mono w-4 h-4 rounded-full flex items-center justify-center">
                {wishlistCount}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setIsCartDrawerOpen(true)}
            aria-label="Cart"
            className="text-[#464742] hover:text-[#1B1C1A] p-1.5 relative transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">shopping_bag</span>
            {totalCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#1B1C1A] text-[#FAF9F6] text-[10px] font-mono w-4 h-4 rounded-full flex items-center justify-center">
                {totalCount}
              </span>
            )}
          </button>

          <Link
            href="/account"
            aria-label="Account"
            className="text-[#464742] hover:text-[#1B1C1A] p-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">person</span>
          </Link>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-[#FAF9F6] border-b border-[#E5E3DC] px-6 py-6 space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex items-center bg-[#F4F3F0] px-3 h-10 rounded-[2px] border border-[#E5E3DC]">
            <span className="material-symbols-outlined text-[#767872] text-[18px] mr-2">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search apparel & accessories..."
              className="w-full bg-transparent text-[#1B1C1A] text-xs focus:outline-none placeholder:text-[#767872]"
            />
          </form>

          <div className="flex flex-col space-y-3 pt-2 text-xs font-mono uppercase tracking-wider">
            <Link
              href="/products"
              onClick={() => setIsMobileMenuOpen(false)}
              className="py-1 text-[#1B1C1A] font-semibold"
            >
              All Apparel
            </Link>
            <Link
              href="/products?category=tops"
              onClick={() => setIsMobileMenuOpen(false)}
              className="py-1 text-[#464742]"
            >
              Tops
            </Link>
            <Link
              href="/products?category=shirts"
              onClick={() => setIsMobileMenuOpen(false)}
              className="py-1 text-[#464742]"
            >
              Shirts
            </Link>
            <Link
              href="/products?category=trousers"
              onClick={() => setIsMobileMenuOpen(false)}
              className="py-1 text-[#464742]"
            >
              Trousers
            </Link>
            <Link
              href="/products?category=outerwear"
              onClick={() => setIsMobileMenuOpen(false)}
              className="py-1 text-[#464742]"
            >
              Outerwear
            </Link>
            <Link
              href="/products?category=accessories"
              onClick={() => setIsMobileMenuOpen(false)}
              className="py-1 text-[#464742]"
            >
              Accessories
            </Link>
          </div>
        </div>
      )}

      {/* Ultra-Slim Hairline Scroll Progress Bar */}
      <ScrollProgressBar />
    </header>
  );
}
