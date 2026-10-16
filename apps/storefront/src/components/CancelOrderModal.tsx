'use client';

import React, { useState } from 'react';
import { PriceDisplay } from '@atelier/ui';

interface CancelOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string;
  totalPaise: number;
  paymentStatus: string;
  onSuccess: (result: {
    orderNumber: string;
    status: string;
    paymentStatus: string;
    refundAmountPaise: number;
    message: string;
  }) => void;
}

const CANCELLATION_REASONS = [
  { value: 'changed_mind', label: 'Selected Alternate Silhouette / Changed Preference' },
  { value: 'size_fit', label: 'Need to Re-measure Bespoke Fit / Size' },
  { value: 'wrong_address', label: 'Shipping Address or Contact Details Revision' },
  { value: 'delivery_time', label: 'Crafting Timeline Exceeds Personal Schedule' },
  { value: 'other', label: 'Other Curatorial Considerations' },
];

export function CancelOrderModal({
  isOpen,
  onClose,
  orderNumber,
  totalPaise,
  paymentStatus,
  onSuccess,
}: CancelOrderModalProps) {
  const [reason, setReason] = useState('changed_mind');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isPaid = paymentStatus === 'captured';

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`http://localhost:4000/api/v1/checkout/orders/${encodeURIComponent(orderNumber)}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason,
          notes: notes.trim() || undefined,
        }),
      });

      const json = await res.json();

      if (json.success && json.data) {
        onSuccess(json.data);
        onClose();
      } else {
        setErrorMessage(json.error?.message || 'Cancellation request could not be processed.');
      }
    } catch (err: any) {
      setErrorMessage(`Network error submitting cancellation: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-[#D6D3CA] rounded-[4px] shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#E5E3DC] pb-4">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#767872] block">
              Patron Services &bull; Order Cancellation
            </span>
            <h3 className="font-serif-headline text-xl font-semibold text-[#1B1C1A] mt-1">
              Cancel Commission {orderNumber}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-2xl leading-none text-[#767872] hover:text-[#1B1C1A] transition-colors p-1"
            aria-label="Close cancellation dialog"
          >
            &times;
          </button>
        </div>

        {/* Financial & Policy Notice */}
        <div className="p-4 bg-[#FAF9F6] border border-[#E5E3DC] rounded-[2px] space-y-2 text-xs">
          <div className="flex items-center justify-between text-[#1B1C1A] font-medium">
            <span>Commission Valuation:</span>
            <span className="font-mono text-sm font-semibold">
              <PriceDisplay amountPaise={totalPaise} />
            </span>
          </div>

          {isPaid ? (
            <p className="text-[#3F4841] pt-1 border-t border-[#E5E3DC] text-[11px] leading-relaxed">
              Upon confirmation, this commission will be marked as cancelled. A full refund of <PriceDisplay amountPaise={totalPaise} /> will be automatically credited to your original payment card via Razorpay, and reserved archive items will be restored to inventory.
            </p>
          ) : (
            <p className="text-[#767872] pt-1 border-t border-[#E5E3DC] text-[11px] leading-relaxed">
              This order will be immediately cancelled and all inventory items released back to the archive.
            </p>
          )}
        </div>

        {errorMessage && (
          <div className="p-3 bg-[#FFF0EE] border border-[#FFDAD6] text-[#93000A] text-xs rounded-[2px]">
            {errorMessage}
          </div>
        )}

        {/* Cancellation Form */}
        <form onSubmit={handleCancelSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono uppercase text-[#767872] mb-1.5">
              Reason for Cancellation *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting}
              className="w-full p-2.5 bg-white border border-[#D6D3CA] rounded-[2px] text-xs text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
            >
              {CANCELLATION_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-[#767872] mb-1.5">
              Curatorial Feedback or Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              placeholder="Tell our concierge team if there is anything we can tailor differently for you in future releases..."
              className="w-full p-2.5 bg-white border border-[#D6D3CA] rounded-[2px] text-xs text-[#1B1C1A] placeholder:text-[#A8A7A1] focus:outline-none focus:border-[#1B1C1A] resize-none"
            />
          </div>

          <div className="pt-2 flex flex-col-reverse sm:flex-row gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 border border-[#D6D3CA] text-[#767872] text-xs font-mono uppercase tracking-wider rounded-[2px] hover:text-[#1B1C1A] hover:border-[#1B1C1A] transition-colors"
            >
              Retain Commission
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-[#93000A] text-white text-xs font-mono uppercase tracking-widest rounded-[2px] hover:bg-[#680007] transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Processing Cancellation...' : 'Confirm Cancellation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
