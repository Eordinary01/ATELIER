'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PriceDisplay } from '@atelier/ui';

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  subtotalPaise: number;
  discountPaise: number;
  shippingFeePaise: number;
  taxPaise: number;
  totalPaise: number;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
  customerEmail: string;
  shippingAddress: {
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
  } | null;
  items: Array<{
    id: string;
    title: string;
    variantLabel: string;
    sku: string;
    unitPricePaise: number;
    quantity: number;
    totalPricePaise: number;
  }>;
}

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('orderNumber');

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderNumber) {
      setError('No order reference provided.');
      setLoading(false);
      return;
    }

    async function fetchOrder() {
      try {
        const res = await fetch(`http://localhost:4000/api/v1/checkout/orders/${orderNumber}`);
        const json = await res.json();
        if (json.success && json.data) {
          setOrder(json.data);
        } else {
          setError(json.error?.message || 'Order details could not be retrieved.');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-[#767872]">
          Confirming order with archival ledger...
        </p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="py-20 text-center space-y-4">
        <span className="material-symbols-outlined text-[48px] text-[#93000A]">
          error_outline
        </span>
        <h1 className="font-serif-headline text-2xl text-[#1B1C1A]">Commission Record Not Found</h1>
        <p className="text-xs text-[#767872]">{error || 'Please verify your order number.'}</p>
        <Link
          href="/catalog"
          className="inline-block px-6 py-2.5 bg-[#1B1C1A] text-[#FAF9F6] text-xs font-mono uppercase tracking-wider rounded-[2px]"
        >
          Return to Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Confirmation Banner */}
      <div className="bg-white border border-[#E5E3DC] rounded-[4px] p-8 text-center space-y-4">
        <div className="w-12 h-12 bg-[#E3EBE4] text-[#1B3B2B] rounded-full flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-[24px]">done</span>
        </div>
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-[#1B3B2B]">
            Commission Confirmed &bull; Payment Received
          </span>
          <h1 className="font-headline-lg text-3xl font-semibold text-[#1B1C1A] tracking-tight mt-1">
            Thank You For Your Commission
          </h1>
          <p className="text-xs text-[#767872] mt-2">
            A confirmation invoice has been dispatched to{' '}
            <span className="font-medium text-[#1B1C1A]">{order.customerEmail}</span>.
          </p>
        </div>

        <div className="pt-4 border-t border-[#E5E3DC] flex items-center justify-center space-x-6 text-xs font-mono">
          <div>
            <span className="text-[#767872] block text-[10px] uppercase">Order Reference</span>
            <span className="font-semibold text-[#1B1C1A]">#{order.orderNumber}</span>
          </div>
          <div className="h-6 w-px bg-[#E5E3DC]" />
          <div>
            <span className="text-[#767872] block text-[10px] uppercase">Payment Gateway</span>
            <span className="text-[#1B3B2B] uppercase">Razorpay (Paid)</span>
          </div>
          <div className="h-6 w-px bg-[#E5E3DC]" />
          <div>
            <span className="text-[#767872] block text-[10px] uppercase">Fulfillment Status</span>
            <span className="text-[#1B1C1A] uppercase">In Atelier Production</span>
          </div>
        </div>
      </div>

      {/* Ordered Garments */}
      <div className="bg-white border border-[#E5E3DC] rounded-[4px] p-6 space-y-4">
        <h2 className="font-serif-headline text-base font-semibold text-[#1B1C1A] border-b border-[#E5E3DC] pb-3">
          Commissioned Garments
        </h2>
        <div className="divide-y divide-[#E5E3DC]">
          {order.items.map((item) => (
            <div key={item.id} className="py-3 first:pt-0 flex items-center justify-between">
              <div>
                <p className="font-medium text-xs text-[#1B1C1A]">{item.title}</p>
                <p className="font-mono text-[10px] text-[#767872]">
                  {item.variantLabel} &bull; Qty: {item.quantity} &bull; SKU: {item.sku}
                </p>
              </div>
              <div className="font-mono text-xs">
                <PriceDisplay amountPaise={item.totalPricePaise} />
              </div>
            </div>
          ))}
        </div>

        {/* Pricing Summary */}
        <div className="border-t border-[#E5E3DC] pt-4 space-y-2 text-xs font-mono">
          <div className="flex justify-between text-[#767872]">
            <span>Subtotal:</span>
            <span>₹{(order.subtotalPaise / 100).toLocaleString('en-IN')}</span>
          </div>
          {order.discountPaise > 0 && (
            <div className="flex justify-between text-[#1B3B2B]">
              <span>Archival Courtesy:</span>
              <span>-₹{(order.discountPaise / 100).toLocaleString('en-IN')}</span>
            </div>
          )}
          <div className="flex justify-between text-[#767872]">
            <span>Nationwide Delivery:</span>
            <span>{order.shippingFeePaise === 0 ? 'COMPLIMENTARY' : '₹150'}</span>
          </div>
          <div className="flex justify-between text-[#767872]">
            <span>12% Embedded GST:</span>
            <span>₹{(order.taxPaise / 100).toLocaleString('en-IN')}</span>
          </div>
          <div className="border-t border-[#E5E3DC] pt-2 flex justify-between font-semibold text-sm text-[#1B1C1A]">
            <span>Total Paid (INR):</span>
            <PriceDisplay amountPaise={order.totalPaise} size="lg" />
          </div>
        </div>
      </div>

      {/* Shipping Destination */}
      {order.shippingAddress && (
        <div className="bg-white border border-[#E5E3DC] rounded-[4px] p-6 space-y-2 text-xs">
          <h2 className="font-serif-headline text-base font-semibold text-[#1B1C1A] border-b border-[#E5E3DC] pb-3 mb-3">
            Delivery Destination
          </h2>
          <p className="font-medium text-[#1B1C1A]">{order.shippingAddress.name}</p>
          <p className="text-[#767872]">
            {order.shippingAddress.addressLine1}
            {order.shippingAddress.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ''}
          </p>
          <p className="text-[#767872]">
            {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.postalCode}
          </p>
          <p className="font-mono text-[#767872] pt-1">Contact: {order.shippingAddress.phone}</p>
        </div>
      )}

      {/* Action Links */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
        <Link
          href={`/track-order?orderNumber=${order.orderNumber}`}
          className="w-full sm:w-auto px-6 py-3 border border-[#1B1C1A] text-[#1B1C1A] text-xs font-mono uppercase tracking-wider rounded-[2px] hover:bg-[#FAF9F6] text-center"
        >
          Track Dispatch Status
        </Link>
        <Link
          href="/catalog"
          className="w-full sm:w-auto px-6 py-3 bg-[#1B1C1A] text-[#FAF9F6] text-xs font-mono uppercase tracking-wider rounded-[2px] hover:bg-[#333] transition-colors text-center"
        >
          Continue Exploring
        </Link>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-12 py-12">
      <Suspense
        fallback={
          <div className="py-24 text-center font-mono text-xs uppercase text-[#767872]">
            Loading Order Confirmation...
          </div>
        }
      >
        <OrderSuccessContent />
      </Suspense>
    </div>
  );
}
