'use client';

import React, { useState } from 'react';
import { PriceDisplay } from '@atelier/ui';

export interface OrderItemDetail {
  id: string;
  title: string;
  variantLabel: string;
  sku: string;
  unitPricePaise: number;
  quantity: number;
  totalPricePaise: number;
}

interface ExchangeReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string;
  items: OrderItemDetail[];
  onSuccess: (result: {
    ticketId: string;
    type: 'exchange' | 'return';
    status: string;
    message: string;
  }) => void;
}

const REASONS = [
  { value: 'size_fit', label: 'Bespoke Fit / Size Measurement Adjustment' },
  { value: 'defective', label: 'Fabric or Construction Quality Concern' },
  { value: 'wrong_item', label: 'Discrepancy in Delivered Garment or Shade' },
  { value: 'changed_mind', label: 'Alternate Silhouette Preference' },
];

export function ExchangeReturnModal({
  isOpen,
  onClose,
  orderNumber,
  items,
  onSuccess,
}: ExchangeReturnModalProps) {
  const [requestType, setRequestType] = useState<'exchange' | 'return'>('exchange');
  const [selectedItemId, setSelectedItemId] = useState<string>(items[0]?.id || '');
  const [reason, setReason] = useState('size_fit');
  const [exchangeSize, setExchangeSize] = useState('');
  const [detailedNotes, setDetailedNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentItem = items.find((i) => i.id === selectedItemId) || items[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) {
      setErrorMessage('Please select a garment from your commission order.');
      return;
    }
    if (requestType === 'exchange' && !exchangeSize.trim()) {
      setErrorMessage('Please specify your desired replacement size or tailoring measurement.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(
        `http://localhost:4000/api/v1/checkout/orders/${encodeURIComponent(orderNumber)}/return-exchange`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: requestType,
            orderItemId: selectedItemId,
            reason,
            detailedNotes: detailedNotes.trim() || undefined,
            exchangeSize: requestType === 'exchange' ? exchangeSize.trim() : undefined,
          }),
        }
      );

      const json = await res.json();

      if (json.success && json.data) {
        onSuccess(json.data);
        onClose();
      } else {
        setErrorMessage(json.error?.message || 'Could not register concierge ticket.');
      }
    } catch (err: any) {
      setErrorMessage(`Network error submitting concierge request: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-[#D6D3CA] rounded-[4px] shadow-2xl max-w-xl w-full p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#E5E3DC] pb-4">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#767872] block">
              Atelier Concierge Protocol &bull; Order {orderNumber}
            </span>
            <h3 className="font-serif-headline text-xl font-semibold text-[#1B1C1A] mt-1">
              Garment Exchange & Returns
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-2xl leading-none text-[#767872] hover:text-[#1B1C1A] transition-colors p-1"
            aria-label="Close dialog"
          >
            &times;
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border border-[#E5E3DC] rounded-[2px] p-1 bg-[#FAF9F6]">
          <button
            type="button"
            onClick={() => setRequestType('exchange')}
            className={`flex-1 py-2 text-xs font-mono uppercase tracking-wider rounded-[2px] transition-colors ${
              requestType === 'exchange'
                ? 'bg-[#1B1C1A] text-[#FAF9F6] font-semibold shadow-sm'
                : 'text-[#767872] hover:text-[#1B1C1A]'
            }`}
          >
            Request Size / Fit Exchange
          </button>
          <button
            type="button"
            onClick={() => setRequestType('return')}
            className={`flex-1 py-2 text-xs font-mono uppercase tracking-wider rounded-[2px] transition-colors ${
              requestType === 'return'
                ? 'bg-[#1B1C1A] text-[#FAF9F6] font-semibold shadow-sm'
                : 'text-[#767872] hover:text-[#1B1C1A]'
            }`}
          >
            Archival Return & Refund
          </button>
        </div>

        {/* Policy Explainer */}
        <div className="p-3.5 bg-[#FAF9F6] border border-[#E5E3DC] rounded-[2px] text-xs space-y-1.5">
          <p className="font-medium text-[#1B1C1A]">
            {requestType === 'exchange'
              ? 'Complimentary Reverse Pickup & Size Replacement'
              : 'Secure Reverse Logistics & Full Valuation Refund'}
          </p>
          <p className="text-[#767872] text-[11px] leading-relaxed">
            {requestType === 'exchange'
              ? 'Our logistics partners will collect your garment directly from your delivery address. Ensure archival tags are intact and garment is unworn. The replacement size will be tailored and dispatched with high priority.'
              : 'Upon reverse collection and quality inspection at our New Delhi atelier, your payment will be refunded to your original payment method.'}
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 bg-[#FFF0EE] border border-[#FFDAD6] text-[#93000A] text-xs rounded-[2px]">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Garment Item Selection */}
          <div>
            <label className="block text-[11px] font-mono uppercase text-[#767872] mb-1.5">
              Select Garment Silhouette *
            </label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              disabled={isSubmitting}
              className="w-full p-2.5 bg-white border border-[#D6D3CA] rounded-[2px] text-xs text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
            >
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.title} ({it.variantLabel}) - ₹{(it.totalPricePaise / 100).toLocaleString('en-IN')}
                </option>
              ))}
            </select>
            {currentItem && (
              <div className="mt-1 text-[11px] text-[#767872] font-mono">
                Current Valuation: <PriceDisplay amountPaise={currentItem.totalPricePaise} /> &bull; SKU: {currentItem.sku}
              </div>
            )}
          </div>

          {/* Desired Replacement Size (only for exchange) */}
          {requestType === 'exchange' && (
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#767872] mb-1.5">
                Desired Replacement Size / Fit *
              </label>
              <input
                type="text"
                required
                value={exchangeSize}
                onChange={(e) => setExchangeSize(e.target.value)}
                placeholder="e.g. Size M, Size 34, or Custom Chest 40 inch"
                disabled={isSubmitting}
                className="w-full p-2.5 bg-white border border-[#D6D3CA] rounded-[2px] text-xs font-mono uppercase text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
              />
              <span className="text-[10px] text-[#767872] mt-1 block">
                Specify your requested standard size or custom tailored measurement.
              </span>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-[11px] font-mono uppercase text-[#767872] mb-1.5">
              Primary Consideration *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting}
              className="w-full p-2.5 bg-white border border-[#D6D3CA] rounded-[2px] text-xs text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
            >
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Detailed Concierge Notes */}
          <div>
            <label className="block text-[11px] font-mono uppercase text-[#767872] mb-1.5">
              Additional Notes for Atelier Concierge (Optional)
            </label>
            <textarea
              rows={3}
              value={detailedNotes}
              onChange={(e) => setDetailedNotes(e.target.value)}
              disabled={isSubmitting}
              placeholder="Provide any specific fit adjustments, pickup timing preferences, or observations..."
              className="w-full p-2.5 bg-white border border-[#D6D3CA] rounded-[2px] text-xs text-[#1B1C1A] placeholder:text-[#A8A7A1] focus:outline-none focus:border-[#1B1C1A] resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 border border-[#D6D3CA] text-[#767872] text-xs font-mono uppercase tracking-wider rounded-[2px] hover:text-[#1B1C1A] hover:border-[#1B1C1A] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-[#1B1C1A] text-[#FAF9F6] text-xs font-mono uppercase tracking-widest rounded-[2px] hover:bg-[#333] transition-colors disabled:opacity-50"
            >
              {isSubmitting
                ? 'Registering Ticket...'
                : requestType === 'exchange'
                ? 'Request Garment Exchange'
                : 'Confirm Return Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
