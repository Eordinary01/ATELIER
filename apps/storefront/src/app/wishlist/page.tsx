'use client';

import Link from 'next/link';
import { useWishlist } from '../../context/WishlistContext';
import { ProductCard } from '../../components/ProductCard';

export default function WishlistPage() {
  const { wishlist, wishlistCount } = useWishlist();

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-12 py-10">
      {/* Header */}
      <div className="border-b border-[#E5E3DC] pb-6 mb-8">
        <span className="font-mono text-xs uppercase tracking-widest text-[#767872]">
          Curated Archive
        </span>
        <h1 className="font-headline-lg text-3xl font-semibold text-[#1B1C1A] tracking-tight mt-1">
          Saved Garments ({wishlistCount} {wishlistCount === 1 ? 'Piece' : 'Pieces'})
        </h1>
      </div>

      {wishlist.length === 0 ? (
        <div className="p-16 bg-white border border-[#E5E3DC] rounded-[4px] text-center space-y-4 my-8">
          <div className="flex justify-center">
            <svg
              className="w-12 h-12 text-[#A8A7A1] stroke-current fill-none"
              viewBox="0 0 24 24"
              strokeWidth="1.2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
              />
            </svg>
          </div>
          <p className="font-serif-headline text-xl text-[#1B1C1A]">
            No Garments in Your Wishlist
          </p>
          <p className="text-xs text-[#767872] max-w-md mx-auto">
            Save bespoke pieces from our permanent collections to keep track of tailoring releases and seasonal milling.
          </p>
          <Link
            href="/catalog"
            className="inline-block px-6 py-3 bg-[#1B1C1A] text-[#FAF9F6] text-xs font-mono uppercase tracking-wider rounded-[2px] hover:bg-[#333] transition-colors"
          >
            Explore Catalog
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {wishlist.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
