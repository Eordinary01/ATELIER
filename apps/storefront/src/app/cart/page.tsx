'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useCart } from '../../context/CartContext';
import { PriceDisplay } from '@atelier/ui';

interface ActiveVoucher {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderValuePaise: number;
  expiresAt: string | null;
}

export default function CartPage() {
  const { items, updateQuantity, removeFromCart, subtotalPaise, totalCount, setTargetCouponCode } = useCart();
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discountPaise, setDiscountPaise] = useState<number>(0);
  const [couponFeedback, setCouponFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [availableVouchers, setAvailableVouchers] = useState<ActiveVoucher[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  const freeShippingThresholdPaise = 199900; // ₹1,999
  const isFreeShipping = subtotalPaise >= freeShippingThresholdPaise || subtotalPaise === 0;
  const shippingPaise = isFreeShipping ? 0 : 15000; // ₹150 standard shipping if below threshold

  const totalPaise = Math.max(0, subtotalPaise + shippingPaise - discountPaise);

  // Fetch active vouchers and restore any previously applied coupon
  useEffect(() => {
    const fetchActiveCoupons = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const res = await fetch(`${apiUrl}/api/v1/coupons/active`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setAvailableVouchers(json.data);
        }
      } catch {
        // non-blocking fallback
      }
    };
    fetchActiveCoupons();

    try {
      const saved = sessionStorage.getItem('atelier_applied_coupon');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.code) {
          applyCode(parsed.code, false);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Re-validate coupon if subtotal changes
  useEffect(() => {
    if (appliedCoupon) {
      applyCode(appliedCoupon, false);
    }
  }, [subtotalPaise]);

  const applyCode = async (codeToTest: string, userInitiated = true) => {
    const cleanCode = codeToTest.trim().toUpperCase();
    if (!cleanCode) return;

    setIsValidating(true);
    if (userInitiated) setCouponFeedback(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/api/v1/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: cleanCode,
          orderValuePaise: subtotalPaise,
        }),
      });

      const json = await res.json();

      if (json.success && json.data?.isValid) {
        setAppliedCoupon(json.data.code);
        setDiscountPaise(json.data.discountPaise);
        setCouponCode('');
        sessionStorage.setItem(
          'atelier_applied_coupon',
          JSON.stringify({ code: json.data.code, discountPaise: json.data.discountPaise })
        );
        if (userInitiated) {
          setCouponFeedback({
            type: 'success',
            message: `Courtesy code ${json.data.code} applied: ${(json.data.discountPaise / 100).toFixed(2)} discount.`,
          });
        }
      } else {
        if (userInitiated) {
          // Check if coupon failed due to minimum order value requirement
          const needed = json.data?.amountNeededPaise;
          const minVal = json.data?.minOrderValuePaise;
          if (json.data && (needed > 0 || (minVal && minVal > subtotalPaise))) {
            const targetCode = json.data.code || cleanCode;
            setTargetCouponCode(targetCode);
            const minFormatted = Math.round((minVal || 0) / 100).toLocaleString('en-IN');
            setCouponFeedback({
              type: 'error',
              message: `Privilege ${targetCode} requires spend of ₹${minFormatted}. See floating banner below for unlock progress!`,
            });
          } else {
            setCouponFeedback({
              type: 'error',
              message: json.data?.message || json.error?.message || 'Invalid or inapplicable coupon code.',
            });
          }
        }
        if (!userInitiated && appliedCoupon) {
          // If subtotal dropped below min spend
          handleRemoveCoupon();
        }
      }
    } catch {
      if (userInitiated) {
        setCouponFeedback({
          type: 'error',
          message: 'Unable to validate courtesy code. Please check connection.',
        });
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    applyCode(couponCode, true);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountPaise(0);
    setCouponFeedback(null);
    sessionStorage.removeItem('atelier_applied_coupon');
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-12 py-10">
      {/* Header */}
      <div className="border-b border-[#E5E3DC] pb-6 mb-8">
        <span className="font-mono text-xs uppercase tracking-widest text-[#767872]">
          Commission Review
        </span>
        <h1 className="font-headline-lg text-3xl font-semibold text-[#1B1C1A] tracking-tight mt-1">
          Your Commission Bag ({totalCount} {totalCount === 1 ? 'Piece' : 'Pieces'})
        </h1>
      </div>

      {items.length === 0 ? (
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
                d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
              />
            </svg>
          </div>
          <p className="font-serif-headline text-xl text-[#1B1C1A]">
            Your Commission Bag is Currently Empty
          </p>
          <p className="text-xs text-[#767872] max-w-md mx-auto">
            Discover permanent archival pieces constructed with pure natural fibers and hand-finished tailoring in New Delhi.
          </p>
          <Link
            href="/catalog"
            className="inline-block px-6 py-3 bg-[#1B1C1A] text-[#FAF9F6] text-xs font-mono uppercase tracking-wider rounded-[2px] hover:bg-[#333] transition-colors"
          >
            Explore Catalog
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Items Table */}
          <div className="lg:col-span-8 bg-white border border-[#E5E3DC] rounded-[4px] overflow-hidden">
            <div className="p-4 bg-[#F4F3F0] border-b border-[#E5E3DC] grid grid-cols-12 text-[10px] font-mono uppercase text-[#767872] tracking-wider">
              <div className="col-span-6">Garment & Specifications</div>
              <div className="col-span-3 text-center">Quantity</div>
              <div className="col-span-3 text-right">Total Price</div>
            </div>

            <div className="divide-y divide-[#E5E3DC]">
              {items.map((item) => (
                <div key={item.id} className="p-6 grid grid-cols-12 gap-4 items-center">
                  {/* Garment Info */}
                  <div className="col-span-6 flex items-center space-x-4">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-16 h-20 object-cover bg-[#F4F3F0] rounded-[2px] border border-[#E5E3DC] flex-shrink-0"
                    />
                    <div className="space-y-1">
                      <Link
                        href={`/products/${item.slug}`}
                        className="font-serif-headline text-sm font-semibold text-[#1B1C1A] hover:text-[#5A1827] transition-colors block"
                      >
                        {item.title}
                      </Link>
                      <div className="text-[11px] font-mono text-[#767872] space-x-2">
                        <span>Size: {item.size}</span>
                        <span>&bull;</span>
                        <span>Color: {item.colorName}</span>
                      </div>
                      <div className="text-[10px] font-mono text-[#767872]">
                        SKU: {item.sku}
                      </div>
                      <button
                        onClick={() => removeFromCart(item.variantId)}
                        className="text-[11px] font-mono text-[#93000A] hover:underline pt-1 block"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Quantity Control */}
                  <div className="col-span-3 flex justify-center">
                    <div className="flex items-center border border-[#D6D3CA] rounded-[2px] bg-white h-9 px-1">
                      <button
                        onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                        className="w-7 h-full flex items-center justify-center font-mono text-xs text-[#1B1C1A] hover:bg-[#F4F3F0]"
                      >
                        -
                      </button>
                      <span className="w-7 text-center font-mono text-xs font-semibold tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                        className="w-7 h-full flex items-center justify-center font-mono text-xs text-[#1B1C1A] hover:bg-[#F4F3F0]"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Total Price */}
                  <div className="col-span-3 text-right">
                    <PriceDisplay amountPaise={item.pricePaise * item.quantity} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-4 space-y-6">
            <div className="p-6 bg-white border border-[#E5E3DC] rounded-[4px] space-y-4">
              <h2 className="font-serif-headline text-base font-semibold text-[#1B1C1A] border-b border-[#E5E3DC] pb-3">
                Commission Summary
              </h2>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#767872]">Garments Subtotal:</span>
                  <PriceDisplay amountPaise={subtotalPaise} />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#767872]">Nationwide Delivery:</span>
                  <span className="font-mono text-xs font-medium">
                    {isFreeShipping ? 'COMPLIMENTARY' : '150'}
                  </span>
                </div>

                {appliedCoupon && (
                  <div className="flex items-center justify-between text-[#1B3B2B] bg-[#F2F6F3] p-2 rounded-[2px] border border-[#C5E3CE]">
                    <div className="flex items-center gap-1.5 font-mono text-xs">
                      <span>Courtesy ({appliedCoupon}):</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">-{(discountPaise / 100).toFixed(2)}</span>
                      <button
                        onClick={handleRemoveCoupon}
                        className="text-[10px] uppercase font-mono text-[#93000A] underline hover:no-underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-[#E5E3DC] flex items-center justify-between font-semibold text-sm">
                  <span>Total Payable:</span>
                  <PriceDisplay amountPaise={totalPaise} size="lg" />
                </div>

                <p className="text-[10px] font-mono text-[#767872] pt-1">
                  Inclusive of all taxes &bull; GST compliant tax invoice issued
                </p>
              </div>

              {/* Coupon Form */}
              <div className="pt-3 border-t border-[#E5E3DC] space-y-2">
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Enter courtesy voucher..."
                    className="flex-1 p-2 bg-[#FAF9F6] border border-[#D6D3CA] rounded-[2px] text-xs font-mono uppercase focus:outline-none focus:border-[#1B1C1A]"
                  />
                  <button
                    type="submit"
                    disabled={isValidating || !couponCode.trim()}
                    className="px-3 py-2 border border-[#1B1C1A] text-[#1B1C1A] text-xs font-mono uppercase tracking-wider rounded-[2px] hover:bg-[#1B1C1A] hover:text-white transition-colors disabled:opacity-40"
                  >
                    {isValidating ? '...' : 'Apply'}
                  </button>
                </form>

                {couponFeedback && (
                  <p
                    className={`font-mono text-[11px] leading-tight ${couponFeedback.type === 'success' ? 'text-[#1B3B2B]' : 'text-[#8A2B2B]'
                      }`}
                  >
                    {couponFeedback.message}
                  </p>
                )}

                {/* Available Active Courtesy Vouchers Strip */}
                {availableVouchers.length > 0 && (
                  <div className="pt-2">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-[#767872] block mb-1">
                      Available Archival Privileges:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {availableVouchers.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            if (subtotalPaise < v.minOrderValuePaise) {
                              setTargetCouponCode(v.code);
                              const minFormatted = Math.round(v.minOrderValuePaise / 100).toLocaleString('en-IN');
                              setCouponFeedback({
                                type: 'error',
                                message: `Privilege ${v.code} requires spend of ₹${minFormatted}. See floating banner below for unlock progress!`,
                              });
                            } else {
                              applyCode(v.code, true);
                            }
                          }}
                          className={`font-mono text-[10px] px-2 py-0.5 border rounded-[2px] uppercase transition-colors ${appliedCoupon === v.code
                            ? 'bg-[#1B1C1A] text-[#FAF9F6] border-[#1B1C1A]'
                            : 'bg-[#FAF9F6] text-[#464742] border-[#D6D3CA] hover:border-[#1B1C1A]'
                            }`}
                        >
                          {v.code} ({v.discountType === 'percentage' ? `${v.discountValue}%` : `${v.discountValue / 100}`})
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Checkout CTA */}
              <Link
                href="/checkout"
                className="w-full py-4 bg-[#1B1C1A] text-[#FAF9F6] text-xs font-mono uppercase tracking-widest rounded-[2px] hover:bg-[#333] transition-colors text-center block mt-4"
              >
                Proceed to Checkout &bull; {(totalPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Link>

              <div className="text-[10px] font-mono text-[#767872] space-y-1 text-center pt-2">
                <p>&bull; 15-day complimentary exchanges</p>
                <p>&bull; Insured dispatch via premium logistics partner</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
