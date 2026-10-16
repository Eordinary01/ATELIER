'use client';

import React from 'react';
import Link from 'next/link';
import { PriceDisplay } from '@atelier/ui';

export interface CouponUnlockData {
  code: string;
  minOrderValuePaise: number;
  currentSubtotalPaise: number;
  amountNeededPaise?: number;
  discountType?: 'percentage' | 'flat_paise' | string;
  discountValue?: number;
  message?: string;
}

interface CouponUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: CouponUnlockData | null;
}

export function CouponUnlockModal({ isOpen, onClose, data }: CouponUnlockModalProps) {
  if (!isOpen || !data) return null;

  const currentSubtotal = Math.max(0, data.currentSubtotalPaise);
  const minRequired = Math.max(1, data.minOrderValuePaise);
  const amountNeeded =
    data.amountNeededPaise !== undefined && data.amountNeededPaise > 0
      ? data.amountNeededPaise
      : Math.max(0, minRequired - currentSubtotal);

  const rawPercent = Math.min(100, Math.round((currentSubtotal / minRequired) * 100));
  const progressPercent = Math.max(0, rawPercent);

  const discountBadge =
    data.discountType === 'percentage'
      ? `${data.discountValue}% OFF`
      : data.discountValue
      ? `₹${Math.round(data.discountValue / 100).toLocaleString('en-IN')} OFF`
      : 'Special Courtesy Reward';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="coupon-unlock-title"
    >
      <div
        className="bg-white border border-[#D6D3CA] rounded-[4px] shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-start justify-between border-b border-[#E5E3DC] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#767872] block">
                Privilege Locked &bull; Minimum Spend Required
              </span>
              <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 bg-[#FAF9F6] border border-[#D6D3CA] text-[#1B1C1A] rounded-[2px] font-semibold">
                {data.code}
              </span>
            </div>
            <h3
              id="coupon-unlock-title"
              className="font-serif-headline text-2xl font-semibold text-[#1B1C1A] tracking-tight"
            >
              Shop More to Unlock This Coupon
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-[#767872] hover:text-[#1B1C1A] transition-colors p-1"
            aria-label="Close unlock modal"
          >
            &times;
          </button>
        </div>

        {/* Motivational Banner / Callout */}
        <div className="p-4 bg-[#FAF9F6] border border-[#E5E3DC] rounded-[2px] space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#767872] font-mono uppercase tracking-wider text-[11px]">
              Voucher Benefit:
            </span>
            <span className="font-mono font-semibold text-[#1B1C1A] text-xs px-2 py-0.5 bg-white border border-[#D6D3CA] rounded-[2px]">
              {discountBadge}
            </span>
          </div>

          <div className="text-sm text-[#1B1C1A] font-medium leading-relaxed">
            Add{' '}
            <span className="font-mono font-bold text-base text-[#1B1C1A] underline decoration-1 underline-offset-4">
              <PriceDisplay amountPaise={amountNeeded} />
            </span>{' '}
            more to your commission bag to unlock courtesy voucher{' '}
            <span className="font-mono font-bold">{data.code}</span>.
          </div>
        </div>

        {/* Interactive Progress Bar */}
        <div className="space-y-2.5 pt-1">
          <div className="flex justify-between items-end font-mono text-xs">
            <div>
              <span className="text-[#767872] text-[10px] uppercase tracking-wider block">Current Bag</span>
              <span className="font-semibold text-[#1B1C1A]">
                <PriceDisplay amountPaise={currentSubtotal} />
              </span>
            </div>
            <div className="text-center">
              <span className="inline-block px-2 py-0.5 text-[10px] uppercase tracking-widest font-mono font-semibold text-[#1B1C1A] bg-[#FAF9F6] border border-[#D6D3CA] rounded-[2px]">
                {progressPercent}% Complete
              </span>
            </div>
            <div className="text-right">
              <span className="text-[#767872] text-[10px] uppercase tracking-wider block">Unlock Threshold</span>
              <span className="font-semibold text-[#1B1C1A]">
                <PriceDisplay amountPaise={minRequired} />
              </span>
            </div>
          </div>

          {/* Progress Bar Track */}
          <div className="w-full h-3 bg-[#E5E3DC] rounded-[2px] overflow-hidden p-0.5">
            <div
              className="h-full bg-[#1B1C1A] rounded-[1px] transition-all duration-700 ease-out"
              style={{ width: `${Math.max(4, progressPercent)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-[#767872] pt-1">
            <span>Spend ₹0</span>
            <span>Target: ₹{Math.round(minRequired / 100).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="space-y-2 pt-2 border-t border-[#E5E3DC]">
          <Link
            href="/catalog"
            onClick={onClose}
            className="w-full py-3.5 bg-[#1B1C1A] text-[#FAF9F6] text-xs font-mono uppercase tracking-widest rounded-[2px] hover:bg-[#333] transition-colors text-center block font-medium"
          >
            Explore Catalog &amp; Add Garments &rarr;
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-transparent text-[#767872] hover:text-[#1B1C1A] text-xs font-mono uppercase tracking-wider rounded-[2px] transition-colors text-center"
          >
            Continue with Current Bag
          </button>
        </div>
      </div>
    </div>
  );
}
