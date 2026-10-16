'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PriceDisplay } from '@atelier/ui';
import { CancelOrderModal } from '../../components/CancelOrderModal';
import { ExchangeReturnModal } from '../../components/ExchangeReturnModal';

interface ShipmentDetail {
  id: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string | null;
  status: string;
  dispatchedAt?: string | null;
  deliveredAt?: string | null;
  updatedAt: string;
}

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
  customerEmail?: string | null;
  shippingAddress: {
    name?: string;
    phone?: string;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state: string;
    postalCode: string;
  } | null;
  shipment: ShipmentDetail | null;
  items: Array<{
    id: string;
    title: string;
    variantLabel: string;
    sku: string;
    unitPricePaise: number;
    quantity: number;
    totalPricePaise: number;
  }>;
  returns?: Array<{
    id: string;
    orderItemId: string;
    reason: string;
    detailedNotes?: string | null;
    status: string;
    refundAmountPaise: number;
    createdAt: string;
  }>;
}

function TrackOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQuery = searchParams.get('orderNumber') || searchParams.get('awb') || '';
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedAwb, setCopiedAwb] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelSuccessMessage, setCancelSuccessMessage] = useState<string | null>(null);
  const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);
  const [conciergeSuccessMessage, setConciergeSuccessMessage] = useState<string | null>(null);

  const fetchTracking = async (query: string) => {
    if (!query.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`http://localhost:4000/api/v1/checkout/orders/${encodeURIComponent(query.trim())}`);
      const json = await res.json();

      if (json.success && json.data) {
        setOrder(json.data);
      } else {
        setOrder(null);
        setErrorMessage(json.error?.message || 'No commission order or AWB matching this identifier was found.');
      }
    } catch (err: any) {
      setOrder(null);
      setErrorMessage(`Network error querying logistics registry: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      setSearchInput(initialQuery);
      fetchTracking(initialQuery);
    }
  }, [initialQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      router.push(`/track-order?orderNumber=${encodeURIComponent(searchInput.trim())}`);
      fetchTracking(searchInput.trim());
    }
  };

  const handleCopyAwb = (awb: string) => {
    navigator.clipboard.writeText(awb);
    setCopiedAwb(true);
    setTimeout(() => setCopiedAwb(false), 2500);
  };

  const handleCancelSuccess = (result: {
    orderNumber: string;
    status: string;
    paymentStatus: string;
    refundAmountPaise: number;
    message: string;
  }) => {
    setOrder((prev) => (prev ? { ...prev, status: 'cancelled', paymentStatus: result.paymentStatus } : null));
    setCancelSuccessMessage(result.message);
  };

  // Determine Stepper Stage (0 to 5)
  const getTrackingStep = (ord: OrderDetail): number => {
    if (ord.status === 'delivered' || ord.shipment?.status === 'delivered') return 5;
    if (ord.shipment?.status === 'out_for_delivery') return 4;
    if (ord.status === 'shipped' || ord.shipment?.status === 'in_transit' || ord.shipment?.status === 'picked_up') return 3;
    if (ord.status === 'processing' || ord.shipment?.status === 'label_created') return 2;
    if (ord.status === 'confirmed') return 1;
    return 1;
  };

  const currentStep = order ? getTrackingStep(order) : 0;

  const STEPS = [
    {
      step: 1,
      title: 'Order Confirmed',
      description: 'Transaction settled & invoice generated',
    },
    {
      step: 2,
      title: 'Precision Crafting & Inspection',
      description: 'Handcrafted tailoring & archival verification',
    },
    {
      step: 3,
      title: 'Dispatched with Carrier',
      description: order?.shipment ? `Handed over to ${order.shipment.carrier}` : 'Assigned to premium logistics partner',
    },
    {
      step: 4,
      title: 'In Transit / Hub Transfer',
      description: order?.shipment?.status === 'out_for_delivery' ? 'Out for delivery today' : 'Moving via domestic logistics corridor',
    },
    {
      step: 5,
      title: 'Delivered',
      description: order?.shippingAddress ? `Safely received in ${order.shippingAddress.city}` : 'Delivered to patron destination',
    },
  ];

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-12 py-10 space-y-10">
      {/* Header */}
      <div className="border-b border-[#E5E3DC] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-[#767872]">
            Logistics & Archival Registry
          </span>
          <h1 className="font-headline-lg text-3xl font-semibold text-[#1B1C1A] tracking-tight mt-1">
            Live Order Tracking
          </h1>
        </div>

        {/* Quick Query Form */}
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-md w-full">
          <input
            type="text"
            required
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Order # (ATL-...) or AWB #"
            className="flex-1 p-2.5 bg-[#FAF9F6] border border-[#D6D3CA] rounded-[2px] text-xs font-mono uppercase text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2.5 bg-[#1B1C1A] text-[#FAF9F6] text-xs font-mono uppercase tracking-wider rounded-[2px] hover:bg-[#333] transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Querying...' : 'Track'}
          </button>
        </form>
      </div>

      {errorMessage && (
        <div className="p-4 bg-[#FFF0EE] border border-[#FFDAD6] text-[#93000A] text-xs rounded-[2px] max-w-2xl mx-auto text-center">
          {errorMessage}
        </div>
      )}

      {/* When Order is Located */}
      {order && (
        <div className="space-y-8">
          {/* Order Overview Banner */}
          <div className="p-6 bg-white border border-[#E5E3DC] rounded-[4px] flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <span className="font-mono text-xs uppercase text-[#767872]">
                  Commission Reference
                </span>
                <span className="px-2 py-0.5 bg-[#FAF9F6] border border-[#E5E3DC] text-[10px] font-mono uppercase rounded-[2px]">
                  {order.paymentStatus === 'captured' ? 'Payment Verified' : order.paymentStatus}
                </span>
              </div>
              <h2 className="font-serif-headline text-2xl font-semibold text-[#1B1C1A]">
                {order.orderNumber}
              </h2>
              <p className="text-xs text-[#767872]">
                Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })} &bull; {order.items.reduce((acc, i) => acc + i.quantity, 0)} Silhouettes
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 justify-end">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#767872] block">
                  Total Valuation
                </span>
                <span className="font-serif-headline text-xl text-[#1B1C1A] font-semibold">
                  <PriceDisplay amountPaise={order.totalPaise} />
                </span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-[#767872] block">
                  Fulfillment Status
                </span>
                <span
                  className={`inline-block mt-0.5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider rounded-[2px] ${
                    order.status === 'cancelled'
                      ? 'bg-[#93000A] text-white'
                      : 'bg-[#1B1C1A] text-[#FAF9F6]'
                  }`}
                >
                  {order.status.replace(/_/g, ' ')}
                </span>
              </div>
              {['pending_payment', 'confirmed', 'processing'].includes(order.status) && (
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#767872] block mb-0.5">
                    Order Action
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCancelModalOpen(true)}
                    className="px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-[#93000A] border border-[#FFDAD6] bg-[#FFF0EE] rounded-[2px] hover:bg-[#FFE8E6] transition-colors"
                  >
                    Cancel Commission
                  </button>
                </div>
              )}
              {order.status !== 'cancelled' && (
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#767872] block mb-0.5">
                    Concierge
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsExchangeModalOpen(true)}
                    className="px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-[#1B1C1A] border border-[#1B1C1A] bg-white rounded-[2px] hover:bg-[#FAF9F6] transition-colors"
                  >
                    Exchange / Return
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Active Exchange / Return Requests Ticket Card */}
          {order.returns && order.returns.length > 0 && (
            <div className="p-6 bg-white border border-[#E5E3DC] rounded-[4px] space-y-4">
              <div className="flex items-center justify-between border-b border-[#E5E3DC] pb-3">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1B1C1A]" />
                  <h3 className="font-serif-headline text-base font-semibold text-[#1B1C1A]">
                    Active Concierge Exchange & Return Tickets ({order.returns.length})
                  </h3>
                </div>
                <span className="text-[10px] font-mono uppercase text-[#767872]">
                  Reverse Protocol Active
                </span>
              </div>
              <div className="divide-y divide-[#E5E3DC]">
                {order.returns.map((ret) => {
                  const matchingItem = order.items.find((i) => i.id === ret.orderItemId);
                  return (
                    <div key={ret.id} className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-[#1B1C1A]">
                            {matchingItem ? matchingItem.title : 'Bespoke Garment'} ({matchingItem?.variantLabel || 'Archive Item'})
                          </span>
                          <span className="px-2 py-0.5 bg-[#FAF9F6] border border-[#E5E3DC] text-[10px] font-mono uppercase text-[#1B1C1A] rounded-[2px]">
                            {ret.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        {ret.detailedNotes && (
                          <p className="text-[11px] text-[#767872] mt-0.5 font-mono">
                            {ret.detailedNotes}
                          </p>
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-[#767872]">
                        Filed on {new Date(ret.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {conciergeSuccessMessage && (
            <div className="p-4 bg-[#EBF3ED] border border-[#CDE5D2] text-[#1B3B2B] text-xs rounded-[2px]">
              {conciergeSuccessMessage}
            </div>
          )}

          {/* Cancellation Notice Card */}
          {order.status === 'cancelled' && (
            <div className="p-6 bg-[#FAF9F6] border border-[#D6D3CA] rounded-[4px] space-y-2">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#93000A]" />
                <h3 className="font-serif-headline text-base font-semibold text-[#93000A]">
                  Commission Status: Cancelled
                </h3>
              </div>
              <p className="text-xs text-[#767872] leading-relaxed">
                {cancelSuccessMessage ||
                  'This bespoke commission has been cancelled. All items have been replenished in our archive inventory, and your refund notification has been recorded.'}
              </p>
            </div>
          )}

          {/* Live Visual Timeline Stepper */}
          <div className="p-8 bg-white border border-[#E5E3DC] rounded-[4px] space-y-8">
            <div className="flex items-center justify-between border-b border-[#E5E3DC] pb-4">
              <h3 className="font-serif-headline text-base font-semibold text-[#1B1C1A]">
                Live Logistics Progress
              </h3>
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#767872]">
                Stage {currentStep} of 5 Active
              </span>
            </div>

            {/* Stepper Graphic */}
            <div className="relative">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                {STEPS.map((s, idx) => {
                  const isDone = s.step < currentStep || currentStep === 5;
                  const isCurrent = s.step === currentStep && currentStep < 5;

                  return (
                    <div key={s.step} className="relative flex flex-col space-y-2">
                      {/* Step Indicator Top */}
                      <div className="flex items-center space-x-2">
                        <div
                          className={`w-7 h-7 rounded-[2px] flex items-center justify-center font-mono text-xs transition-colors ${
                            isDone
                              ? 'bg-[#1B1C1A] text-white'
                              : isCurrent
                              ? 'bg-[#1B1C1A] text-white ring-4 ring-[#EAE8E3]'
                              : 'bg-[#FAF9F6] border border-[#D6D3CA] text-[#767872]'
                          }`}
                        >
                          {isDone ? '✓' : s.step}
                        </div>

                        {idx < STEPS.length - 1 && (
                          <div
                            className={`hidden md:block flex-1 h-[2px] ${
                              s.step < currentStep ? 'bg-[#1B1C1A]' : 'bg-[#E5E3DC]'
                            }`}
                          />
                        )}
                      </div>

                      {/* Step Text */}
                      <div className="pt-1">
                        <p
                          className={`font-medium text-xs ${
                            isCurrent
                              ? 'text-[#1B1C1A] font-semibold'
                              : isDone
                              ? 'text-[#1B1C1A]'
                              : 'text-[#767872]'
                          }`}
                        >
                          {s.title}
                        </p>
                        <p className="text-[11px] text-[#767872] mt-0.5 leading-snug">
                          {s.description}
                        </p>
                      </div>

                      {isCurrent && (
                        <div className="flex items-center space-x-1.5 pt-1">
                          <span className="w-2 h-2 rounded-full bg-[#1B3B2B] animate-ping" />
                          <span className="text-[10px] font-mono uppercase text-[#1B3B2B] font-semibold">
                            Current Stage
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Split Detail Grid: Logistics Partner Details & Garments in Commission */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Carrier & Delivery Destination */}
            <div className="lg:col-span-5 space-y-6">
              {/* Carrier Logistics Card */}
              <div className="p-6 bg-[#FAF9F6] border border-[#E5E3DC] rounded-[4px] space-y-4">
                <div className="flex items-center justify-between border-b border-[#E5E3DC] pb-3">
                  <span className="font-mono text-xs uppercase tracking-wider text-[#767872]">
                    Carrier Partner Service
                  </span>
                  {order.shipment && (
                    <span className="px-2 py-0.5 bg-[#E3EBE4] text-[#1B3B2B] text-[10px] font-mono uppercase rounded-[2px]">
                      {order.shipment.status.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>

                {order.shipment ? (
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-[#767872] block">
                        Assigned Logistics Partner
                      </span>
                      <p className="font-serif-headline text-lg font-semibold text-[#1B1C1A]">
                        {order.shipment.carrier}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono uppercase text-[#767872] block mb-1">
                        Airway Bill (AWB) Consignment Number
                      </span>
                      <div className="flex items-center justify-between p-2.5 bg-white border border-[#D6D3CA] rounded-[2px]">
                        <span className="font-mono text-xs font-semibold text-[#1B1C1A] tracking-wider">
                          {order.shipment.trackingNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyAwb(order.shipment!.trackingNumber)}
                          className="text-[10px] font-mono uppercase text-[#767872] hover:text-[#1B1C1A] underline"
                        >
                          {copiedAwb ? 'Copied' : 'Copy AWB'}
                        </button>
                      </div>
                    </div>

                    {order.shipment.dispatchedAt && (
                      <div className="text-xs text-[#767872] font-mono">
                        Handed to Carrier: {new Date(order.shipment.dispatchedAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    )}

                    {order.shipment.trackingUrl && (
                      <a
                        href={order.shipment.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-full py-2.5 bg-[#1B1C1A] text-[#FAF9F6] text-xs font-mono uppercase tracking-wider rounded-[2px] hover:bg-[#333] transition-colors"
                      >
                        Track on {order.shipment.carrier} Portal &rarr;
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 py-2">
                    <p className="font-medium text-xs text-[#1B1C1A]">
                      Logistics Manifest in Preparation
                    </p>
                    <p className="text-xs text-[#767872]">
                      Your order has been recorded in the Atelier system. An Airway Bill (AWB) from our logistics partners (Blue Dart, Delhivery, or DHL) will be automatically assigned upon completion of tailoring inspection.
                    </p>
                  </div>
                )}
              </div>

              {/* Delivery Destination Card */}
              {order.shippingAddress && (
                <div className="p-6 bg-white border border-[#E5E3DC] rounded-[4px] space-y-2 text-xs">
                  <h4 className="font-serif-headline text-sm font-semibold text-[#1B1C1A] border-b border-[#E5E3DC] pb-3 mb-2">
                    Shipping Destination
                  </h4>
                  <p className="font-medium text-[#1B1C1A]">{order.shippingAddress.name}</p>
                  <p className="text-[#767872]">
                    {order.shippingAddress.addressLine1}
                    {order.shippingAddress.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ''}
                  </p>
                  <p className="text-[#767872]">
                    {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.postalCode}
                  </p>
                  {order.shippingAddress.phone && (
                    <p className="font-mono text-[#767872] pt-1">
                      Courier Phone: {order.shippingAddress.phone}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Garments in Commission */}
            <div className="lg:col-span-7 bg-white border border-[#E5E3DC] rounded-[4px] p-6 space-y-6">
              <h3 className="font-serif-headline text-base font-semibold text-[#1B1C1A] border-b border-[#E5E3DC] pb-3">
                Garments in Dispatch Manifest ({order.items.length})
              </h3>

              <div className="divide-y divide-[#E5E3DC] space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="pt-4 first:pt-0 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-xs text-[#1B1C1A]">{item.title}</p>
                      <p className="font-mono text-[10px] text-[#767872] mt-0.5">
                        {item.variantLabel} &bull; SKU: {item.sku}
                      </p>
                      <p className="text-[11px] font-mono text-[#767872]">
                        Qty: {item.quantity} &times; ₹{(item.unitPricePaise / 100).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="font-mono text-xs font-semibold text-[#1B1C1A]">
                      ₹{(item.totalPricePaise / 100).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>

              {/* Financial Totals Breakdown */}
              <div className="border-t border-[#E5E3DC] pt-4 space-y-2 text-xs">
                <div className="flex justify-between text-[#767872]">
                  <span>Subtotal:</span>
                  <span>₹{(order.subtotalPaise / 100).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-[#767872]">
                  <span>Shipping Fee:</span>
                  <span>{order.shippingFeePaise === 0 ? 'COMPLIMENTARY' : `₹${(order.shippingFeePaise / 100).toLocaleString('en-IN')}`}</span>
                </div>
                {order.discountPaise > 0 && (
                  <div className="flex justify-between text-[#1B3B2B]">
                    <span>Courtesy Discount:</span>
                    <span>-₹{(order.discountPaise / 100).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="border-t border-[#E5E3DC] pt-3 flex justify-between font-semibold text-sm text-[#1B1C1A]">
                  <span>Total Settled (INR):</span>
                  <span>₹{(order.totalPaise / 100).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State when no query entered */}
      {!order && !isLoading && !errorMessage && (
        <div className="p-16 bg-white border border-[#E5E3DC] rounded-[4px] text-center space-y-4 max-w-xl mx-auto">
          <span className="font-mono text-xs uppercase tracking-widest text-[#767872] block">
            Archival Dispatch Portal
          </span>
          <h2 className="font-serif-headline text-xl text-[#1B1C1A]">
            Enter Your Atelier Tracking Identifier
          </h2>
          <p className="text-xs text-[#767872] leading-relaxed">
            Please input your Atelier Commission Order ID (e.g. <span className="font-mono font-medium text-[#1B1C1A]">ATL-MV7...</span>) or Courier Airway Bill Number (AWB) from your dispatch notice email.
          </p>
        </div>
      )}

      {/* Cancellation Modal */}
      {order && (
        <CancelOrderModal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          orderNumber={order.orderNumber}
          totalPaise={order.totalPaise}
          paymentStatus={order.paymentStatus}
          onSuccess={handleCancelSuccess}
        />
      )}

      {/* Exchange & Return Modal */}
      {order && (
        <ExchangeReturnModal
          isOpen={isExchangeModalOpen}
          onClose={() => setIsExchangeModalOpen(false)}
          orderNumber={order.orderNumber}
          items={order.items}
          onSuccess={(res) => {
            setConciergeSuccessMessage(res.message);
            fetchTracking(order.orderNumber);
          }}
        />
      )}
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center font-mono text-xs uppercase tracking-widest text-[#767872]">
          Loading Logistics Registry...
        </div>
      }
    >
      <TrackOrderContent />
    </Suspense>
  );
}
