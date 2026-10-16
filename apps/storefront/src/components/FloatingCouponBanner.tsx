'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '../context/CartContext';
import { PriceDisplay } from '@atelier/ui';

interface CouponInfo {
  id: string;
  code: string;
  discountType: 'percentage' | 'flat_paise';
  discountValue: number;
  minOrderValuePaise: number;
  description?: string;
}

export function FloatingCouponBanner() {
  const { subtotalPaise, totalCount, targetCouponCode } = useCart();
  const [coupons, setCoupons] = useState<CouponInfo[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const pathname = usePathname();

  // Fetch active courtesy coupons
  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const res = await fetch(`${apiUrl}/api/v1/coupons/active`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const sorted = [...json.data].sort(
            (a: CouponInfo, b: CouponInfo) => a.minOrderValuePaise - b.minOrderValuePaise
          );
          setCoupons(sorted);
        }
      } catch {
        setCoupons([
          {
            id: '1',
            code: 'ATELIER10',
            discountType: 'percentage',
            discountValue: 10,
            minOrderValuePaise: 199900,
          },
          {
            id: '2',
            code: 'SERIES04',
            discountType: 'percentage',
            discountValue: 15,
            minOrderValuePaise: 399900,
          },
        ]);
      }
    };

    fetchCoupons();
  }, []);

  // Determine which coupon to target
  const activeTargetCoupon = useMemo(() => {
    if (!coupons.length) return null;

    if (targetCouponCode) {
      const found = coupons.find((c) => c.code.toUpperCase() === targetCouponCode.toUpperCase());
      if (found) return found;
    }

    const nextLocked = coupons.find((c) => c.minOrderValuePaise > subtotalPaise);
    if (nextLocked) return nextLocked;

    return coupons[coupons.length - 1];
  }, [coupons, targetCouponCode, subtotalPaise]);

  // Only show the banner when the user has added something in their cart
  if (totalCount === 0 || subtotalPaise === 0 || !activeTargetCoupon) return null;

  const minRequired = activeTargetCoupon.minOrderValuePaise;
  const isUnlocked = subtotalPaise >= minRequired;
  const amountNeeded = Math.max(0, minRequired - subtotalPaise);
  const rawProgress = minRequired > 0 ? (subtotalPaise / minRequired) * 100 : 100;
  const progressPercent = Math.min(100, Math.max(0, Math.round(rawProgress)));

  const discountLabel =
    activeTargetCoupon.discountType === 'percentage'
      ? `${activeTargetCoupon.discountValue}% OFF`
      : `₹${Math.round(activeTargetCoupon.discountValue / 100).toLocaleString('en-IN')} OFF`;

  // Minimized Compact Floating Pill (Right Side)
  if (isMinimized) {
    return (
      <div
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 transition-transform duration-200 hover:scale-[1.02]"
        role="region"
        aria-label="Privilege Progress"
      >
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 bg-[#1B1C1A]/95 text-[#FAF9F6] border border-[#383935] shadow-xl rounded-full px-3 py-1.5 font-mono text-[11px] hover:border-[#FAF9F6] transition-colors backdrop-blur-md"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#FAF9F6] animate-pulse" />
          <span className="font-semibold tracking-wide">{activeTargetCoupon.code}</span>
          <span className="text-[#A8A7A1] text-[10px]">
            {isUnlocked ? 'Unlocked' : `${progressPercent}%`}
          </span>
          <span className="text-[10px] text-[#A8A7A1] ml-0.5">&uarr;</span>
        </button>
      </div>
    );
  }

  // Small, Minimalistic Right-Aligned Floating Card
  return (
    <aside
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 w-[285px] sm:w-[310px] pointer-events-auto transition-all duration-300"
      role="region"
      aria-label="Privilege Progress Tracker"
    >
      <div className="bg-[#1B1C1A]/95 text-[#FAF9F6] border border-[#383935] backdrop-blur-md rounded-[4px] shadow-xl p-3 space-y-2">
        {/* Header Row */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FAF9F6] shrink-0 animate-pulse" />
            <span className="font-mono text-[11px] font-semibold text-[#FAF9F6] tracking-wide truncate">
              {activeTargetCoupon.code}
            </span>
            <span className="font-mono text-[10px] text-[#A8A7A1] shrink-0">
              ({discountLabel})
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-[10px] text-[#E5E3DC] font-medium">
              {isUnlocked ? 'Unlocked' : `${progressPercent}%`}
            </span>
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="font-mono text-xs text-[#A8A7A1] hover:text-[#FAF9F6] px-1 transition-colors leading-none"
              title="Minimize"
              aria-label="Minimize privilege tracker"
            >
              &ndash;
            </button>
          </div>
        </div>

        {/* Minimal Progress Bar */}
        <div className="space-y-1">
          <div className="w-full h-1 bg-[#383935] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#FAF9F6] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.max(3, progressPercent)}%` }}
            />
          </div>

          <div className="flex items-center justify-between font-mono text-[9px] text-[#A8A7A1]">
            <span>
              Bag: <PriceDisplay amountPaise={subtotalPaise} />
            </span>
            <span>
              Goal: <PriceDisplay amountPaise={minRequired} />
            </span>
          </div>
        </div>

        {/* Status Line & Quick Link */}
        <div className="flex items-center justify-between pt-0.5 border-t border-[#2A2B27] text-[10px] leading-tight">
          <div className="text-[#E5E3DC] font-mono truncate pr-1">
            {isUnlocked ? (
              <span className="text-[#A8E6CF]">Ready to apply at checkout</span>
            ) : (
              <span>
                Add <PriceDisplay amountPaise={amountNeeded} /> more
              </span>
            )}
          </div>

          {pathname !== '/cart' && pathname !== '/checkout' && (
            <Link
              href="/cart"
              className="font-mono text-[10px] text-[#FAF9F6] underline underline-offset-2 hover:text-[#D6D3CA] shrink-0"
            >
              Bag ({totalCount}) &rarr;
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
