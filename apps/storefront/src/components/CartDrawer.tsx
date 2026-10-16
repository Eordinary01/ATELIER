'use client';

import Link from 'next/link';
import { useCart } from '../context/CartContext';
import { PriceDisplay } from '@atelier/ui';

export function CartDrawer() {
  const {
    items,
    isCartDrawerOpen,
    setIsCartDrawerOpen,
    updateQuantity,
    removeFromCart,
    subtotalPaise,
    totalCount,
  } = useCart();

  if (!isCartDrawerOpen) return null;

  const freeShippingThresholdPaise = 199900; // ₹1,999
  const amountToFreeShipping = Math.max(0, freeShippingThresholdPaise - subtotalPaise);
  const progressPercent = Math.min(100, Math.round((subtotalPaise / freeShippingThresholdPaise) * 100));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartDrawerOpen(false)}
      />

      {/* Drawer */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#FAF9F6] border-l border-[#E5E3DC] shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-[#E5E3DC] flex items-center justify-between">
            <div>
              <h2 className="font-serif-headline text-lg font-semibold text-[#1B1C1A]">
                Commission Bag
              </h2>
              <p className="text-[11px] font-mono uppercase tracking-wider text-[#767872]">
                {totalCount} {totalCount === 1 ? 'Garment' : 'Garments'} Selected
              </p>
            </div>
            <button
              onClick={() => setIsCartDrawerOpen(false)}
              className="p-2 text-[#767872] hover:text-[#1B1C1A] transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Free Shipping Progress Meter */}
          <div className="px-6 py-3 bg-[#F4F3F0] border-b border-[#E5E3DC] space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-[#1B1C1A]">
                {amountToFreeShipping > 0
                  ? `Add ₹${(amountToFreeShipping / 100).toLocaleString('en-IN')} for Free Delivery`
                  : 'Free Nationwide Delivery Unlocked'}
              </span>
              <span className="text-[#767872]">{progressPercent}%</span>
            </div>
            <div className="w-full bg-[#E5E3DC] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#1B1C1A] h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
                <span className="material-symbols-outlined text-[48px] text-[#A8A7A1]">
                  shopping_bag
                </span>
                <p className="font-serif-headline text-base text-[#1B1C1A]">
                  Your Commission Bag is Empty
                </p>
                <p className="text-xs text-[#767872] max-w-xs">
                  Browse our permanent collections to select bespoke cuts and natural fiber garments.
                </p>
                <Link
                  href="/products"
                  onClick={() => setIsCartDrawerOpen(false)}
                  className="px-4 py-2 bg-[#1B1C1A] text-[#FAF9F6] text-xs font-mono uppercase tracking-wider rounded-[2px] hover:bg-[#333] transition-colors"
                >
                  Explore Catalog
                </Link>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 p-3 bg-white border border-[#E5E3DC] rounded-[2px]"
                >
                  {/* Thumbnail */}
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-16 h-20 object-cover bg-[#F4F3F0] rounded-[2px] flex-shrink-0"
                  />

                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <Link
                          href={`/products/${item.slug}`}
                          onClick={() => setIsCartDrawerOpen(false)}
                          className="font-serif-headline text-xs font-semibold text-[#1B1C1A] hover:text-[#5A1827] line-clamp-1"
                        >
                          {item.title}
                        </Link>
                        <button
                          onClick={() => removeFromCart(item.variantId)}
                          className="text-[#767872] hover:text-[#93000A] p-0.5"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>

                      <div className="text-[11px] font-mono text-[#767872] space-x-2 mt-0.5">
                        <span>Size: {item.size}</span>
                        <span>&bull;</span>
                        <span>Color: {item.colorName}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      {/* Quantity Stepper */}
                      <div className="flex items-center border border-[#D6D3CA] rounded-[2px] h-7 px-1.5">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                          className="w-5 text-center font-mono text-xs text-[#1B1C1A]"
                        >
                          -
                        </button>
                        <span className="w-5 text-center font-mono text-xs tabular-nums font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                          className="w-5 text-center font-mono text-xs text-[#1B1C1A]"
                        >
                          +
                        </button>
                      </div>

                      <PriceDisplay amountPaise={item.pricePaise * item.quantity} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Actions */}
          {items.length > 0 && (
            <div className="p-6 border-t border-[#E5E3DC] bg-white space-y-4">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#767872] uppercase tracking-wider">Subtotal:</span>
                <PriceDisplay amountPaise={subtotalPaise} size="lg" />
              </div>

              <div className="space-y-2">
                <Link
                  href="/cart"
                  onClick={() => setIsCartDrawerOpen(false)}
                  className="w-full py-3 bg-[#1B1C1A] text-[#FAF9F6] text-xs font-mono uppercase tracking-widest rounded-[2px] text-center block hover:bg-[#333] transition-colors"
                >
                  Review Bag & Checkout
                </Link>
                <button
                  onClick={() => setIsCartDrawerOpen(false)}
                  className="w-full py-2.5 border border-[#D6D3CA] text-[#1B1C1A] text-xs font-mono uppercase tracking-wider rounded-[2px] text-center hover:bg-[#EAE8E3] transition-colors"
                >
                  Continue Browsing
                </button>
              </div>

              <p className="text-[10px] font-mono text-[#767872] text-center">
                Taxes calculated at checkout &bull; Hand-packaged in New Delhi
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
