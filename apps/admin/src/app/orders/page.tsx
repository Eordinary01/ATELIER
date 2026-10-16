'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '../../components/Header';
import { fetchAdminApi } from '../../lib/api';

interface OrderItem {
  id: string;
  orderNumber: string;
  status: string;
  totalPaise: number;
  subtotalPaise: number;
  shippingFeePaise: number;
  discountPaise: number;
  taxPaise: number;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  itemsCount: number;
  shippingAddress: {
    name?: string;
    phone?: string;
    city: string;
    state: string;
    postalCode: string;
    addressLine1: string;
    addressLine2?: string | null;
  } | null;
  shipment: {
    id: string;
    carrier: string;
    trackingNumber: string;
    trackingUrl?: string | null;
    status: string;
    dispatchedAt?: string | null;
    deliveredAt?: string | null;
  } | null;
}

interface OrdersResponse {
  items: OrderItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface Carrier {
  id: string;
  name: string;
  code: string;
  trackingUrlTemplate: string | null;
  contactPhone: string | null;
  isActive: boolean;
}

function OrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get('status') || '';
  const currentSearch = searchParams.get('search') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(currentSearch);

  // Dynamic Logistics Carriers
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [isCarrierModalOpen, setIsCarrierModalOpen] = useState(false);
  const [isCreatingCarrier, setIsCreatingCarrier] = useState(false);
  const [carrierForm, setCarrierForm] = useState({
    name: '',
    code: '',
    trackingUrlTemplate: '',
    contactPhone: '',
  });

  // Fulfillment Modal State
  const [activeFulfillOrder, setActiveFulfillOrder] = useState<OrderItem | null>(null);
  const [carrier, setCarrier] = useState('Blue Dart Express');
  const [carrierId, setCarrierId] = useState<string>('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [shipmentStatus, setShipmentStatus] = useState<'label_created' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered'>('in_transit');
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [isSubmittingFulfillment, setIsSubmittingFulfillment] = useState(false);

  // Status Update Inline State
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const loadOrders = async () => {
    setIsLoading(true);
    const query = new URLSearchParams();
    if (currentPage > 1) query.set('page', String(currentPage));
    if (currentStatus) query.set('status', currentStatus);
    if (currentSearch) query.set('search', currentSearch);

    const queryString = query.toString();
    const res = await fetchAdminApi<OrdersResponse>(
      `/api/v1/admin/orders${queryString ? `?${queryString}` : ''}`
    );

    if (res.success && res.data) {
      setOrders(res.data.items);
      setPagination(res.data.pagination);
    }
    setIsLoading(false);
  };

  const loadCarriers = async () => {
    const res = await fetchAdminApi<Carrier[]>('/api/v1/admin/carriers');
    if (res.success && res.data) {
      setCarriers(res.data);
      if (res.data.length > 0 && !carrierId) {
        setCarrier(res.data[0]!.name);
        setCarrierId(res.data[0]!.id);
      }
    }
  };

  useEffect(() => {
    loadOrders();
    loadCarriers();
  }, [currentStatus, currentSearch, currentPage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchInput.trim()) {
      params.set('search', searchInput.trim());
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    router.push(`/orders?${params.toString()}`);
  };

  const handleStatusFilterChange = (status: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status) {
      params.set('status', status);
    } else {
      params.delete('status');
    }
    params.set('page', '1');
    router.push(`/orders?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(newPage));
    router.push(`/orders?${params.toString()}`);
  };

  // Quick Order Status Update
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetchAdminApi(`/api/v1/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
      } else {
        alert(res.error?.message || 'Failed to update order status');
      }
    } catch (err: any) {
      alert(`Error updating status: ${err.message}`);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Resolve tracking URL using carrier template
  const computeTrackingUrl = (carrierObj: Carrier | undefined, trackNum: string) => {
    if (!carrierObj || !carrierObj.trackingUrlTemplate) return '';
    return carrierObj.trackingUrlTemplate.replace('{trackingNumber}', trackNum.trim());
  };

  // Open Fulfillment Dialog
  const handleOpenFulfillment = (order: OrderItem) => {
    setActiveFulfillOrder(order);

    if (order.shipment) {
      const existingName = order.shipment.carrier || (carriers[0]?.name ?? 'Blue Dart Express');
      const matched = carriers.find((c) => c.name.toLowerCase() === existingName.toLowerCase());
      setCarrier(existingName);
      setCarrierId(matched ? matched.id : (carriers[0]?.id ?? ''));
      setTrackingNumber(order.shipment.trackingNumber || '');
      setTrackingUrl(order.shipment.trackingUrl || '');
      setShipmentStatus((order.shipment.status as any) || 'in_transit');
    } else {
      const defaultCarrier = carriers[0];
      const selectedName = defaultCarrier ? defaultCarrier.name : 'Blue Dart Express';
      const defaultId = defaultCarrier ? defaultCarrier.id : '';
      const generatedAwb = `AWB-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

      setCarrier(selectedName);
      setCarrierId(defaultId);
      setTrackingNumber(generatedAwb);
      setTrackingUrl(computeTrackingUrl(defaultCarrier, generatedAwb));
      setShipmentStatus('in_transit');
    }
    setNotifyCustomer(true);
  };

  const handleCarrierSelection = (newCarrierId: string) => {
    const selected = carriers.find((c) => c.id === newCarrierId);
    if (selected) {
      setCarrier(selected.name);
      setCarrierId(selected.id);
      if (trackingNumber) {
        setTrackingUrl(computeTrackingUrl(selected, trackingNumber));
      }
    }
  };

  const handleTrackingNumberChange = (newNumber: string) => {
    setTrackingNumber(newNumber);
    const selected = carriers.find((c) => c.id === carrierId || c.name === carrier);
    if (selected && selected.trackingUrlTemplate && newNumber) {
      setTrackingUrl(computeTrackingUrl(selected, newNumber));
    }
  };

  // Submit Fulfillment Form
  const handleSubmitFulfillment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFulfillOrder) return;

    setIsSubmittingFulfillment(true);
    try {
      const res = await fetchAdminApi<{
        orderId: string;
        orderNumber: string;
        orderStatus: string;
        shipment: any;
      }>(`/api/v1/admin/orders/${activeFulfillOrder.id}/fulfillment`, {
        method: 'POST',
        body: JSON.stringify({
          carrierId: carrierId || undefined,
          carrier,
          trackingNumber,
          trackingUrl: trackingUrl.trim() || undefined,
          status: shipmentStatus,
          notifyCustomer,
        }),
      });

      if (res.success && res.data) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === activeFulfillOrder.id
              ? {
                  ...o,
                  status: res.data!.orderStatus,
                  shipment: res.data!.shipment,
                }
              : o
          )
        );
        setActiveFulfillOrder(null);
      } else {
        alert(res.error?.message || 'Failed to dispatch shipment');
      }
    } catch (err: any) {
      alert(`Error updating fulfillment: ${err.message}`);
    } finally {
      setIsSubmittingFulfillment(false);
    }
  };

  // Carrier Management Handlers
  const handleCreateCarrier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!carrierForm.name || !carrierForm.code) {
      alert('Please specify carrier partner name and unique code.');
      return;
    }
    setIsCreatingCarrier(true);
    try {
      const res = await fetchAdminApi<Carrier>('/api/v1/admin/carriers', {
        method: 'POST',
        body: JSON.stringify(carrierForm),
      });

      if (res.success && res.data) {
        await loadCarriers();
        setCarrier(res.data.name);
        setCarrierId(res.data.id);
        if (trackingNumber && res.data.trackingUrlTemplate) {
          setTrackingUrl(computeTrackingUrl(res.data, trackingNumber));
        }
        setCarrierForm({ name: '', code: '', trackingUrlTemplate: '', contactPhone: '' });
        alert(`Carrier ${res.data.name} successfully registered.`);
      } else {
        alert(res.error?.message || 'Failed to create carrier partner');
      }
    } catch (err: any) {
      alert(`Error creating carrier: ${err.message}`);
    } finally {
      setIsCreatingCarrier(false);
    }
  };

  const handleDeleteCarrier = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate logistics partner "${name}"?`)) {
      return;
    }
    try {
      const res = await fetchAdminApi(`/api/v1/admin/carriers/${id}`, {
        method: 'DELETE',
      });
      if (res.success) {
        await loadCarriers();
      } else {
        alert(res.error?.message || 'Failed to remove carrier');
      }
    } catch (err: any) {
      alert(`Error deleting carrier: ${err.message}`);
    }
  };

  return (
    <>
      <Header title="Orders & Fulfillment Registry" />
      <div className="p-8 space-y-6 max-w-7xl">
        {/* Top Controls: Status Tabs & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E3DC] pb-4">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1">
            {[
              { label: 'All Orders', value: '' },
              { label: 'Confirmed', value: 'confirmed' },
              { label: 'Processing', value: 'processing' },
              { label: 'Shipped', value: 'shipped' },
              { label: 'Delivered', value: 'delivered' },
              { label: 'Pending Payment', value: 'pending_payment' },
              { label: 'Cancelled', value: 'cancelled' },
            ].map((tab) => {
              const isActive = currentStatus === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => handleStatusFilterChange(tab.value)}
                  className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-[2px] transition-colors ${
                    isActive
                      ? 'bg-[#1B1C1A] text-[#FAF9F6] font-semibold'
                      : 'bg-white border border-[#E5E3DC] text-[#767872] hover:text-[#1B1C1A] hover:border-[#1B1C1A]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search Bar & Carrier Directory */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCarrierModalOpen(true)}
              className="px-3.5 py-2 bg-white border border-[#1B1C1A] text-[#1B1C1A] text-xs font-mono uppercase tracking-wider rounded-[2px] hover:bg-[#FAF9F6] transition-colors"
            >
              Carrier Partners ({carriers.length})
            </button>

            <form onSubmit={handleSearchSubmit} className="flex gap-2 min-w-[280px]">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by Order # or Email"
                className="flex-1 p-2 bg-white border border-[#D6D3CA] rounded-[2px] text-xs font-mono text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-[#1B1C1A] text-[#FAF9F6] text-xs font-mono uppercase tracking-wider rounded-[2px] hover:bg-[#333] transition-colors"
              >
                Search
              </button>
              {currentSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    handleStatusFilterChange(currentStatus);
                  }}
                  className="px-2 py-2 border border-[#D6D3CA] text-xs text-[#767872] rounded-[2px] hover:text-[#1B1C1A]"
                  title="Clear Search"
                >
                  &times;
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white border border-[#E5E3DC] rounded-[4px] overflow-hidden">
          {isLoading ? (
            <div className="p-16 text-center font-mono text-xs text-[#767872]">
              Loading orders and logistics records...
            </div>
          ) : orders.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <p className="font-serif-headline text-lg text-[#1B1C1A]">
                No Commission Orders Found
              </p>
              <p className="text-xs text-[#767872]">
                {currentStatus || currentSearch
                  ? 'No orders match the current filter criteria.'
                  : 'Customer orders placed via storefront will appear here.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E5E3DC] bg-[#FAF9F6] text-[#767872] font-mono uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Order Details</th>
                    <th className="py-3 px-4">Patron & Destination</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Order Status</th>
                    <th className="py-3 px-4">Fulfillment & Carrier</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E3DC]">
                  {orders.map((order) => {
                    const isUpdating = updatingOrderId === order.id;
                    const dateFormatted = new Date(order.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    });

                    return (
                      <tr key={order.id} className="hover:bg-[#FAF9F6] transition-colors">
                        {/* Order Details */}
                        <td className="py-4 px-4 font-mono">
                          <p className="font-semibold text-xs text-[#1B1C1A]">{order.orderNumber}</p>
                          <p className="text-[10px] text-[#767872]">{dateFormatted}</p>
                          <p className="text-[10px] text-[#767872]">
                            {order.itemsCount} {order.itemsCount === 1 ? 'Garment' : 'Garments'}
                          </p>
                        </td>

                        {/* Patron & Destination */}
                        <td className="py-4 px-4">
                          <p className="font-medium text-xs text-[#1B1C1A]">{order.customerName}</p>
                          <p className="text-[10px] font-mono text-[#767872]">{order.customerEmail || 'Guest'}</p>
                          {order.shippingAddress && (
                            <p className="text-[10px] text-[#767872] line-clamp-1 mt-0.5">
                              {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.postalCode}
                            </p>
                          )}
                        </td>

                        {/* Total Amount */}
                        <td className="py-4 px-4 font-mono font-medium text-xs text-[#1B1C1A]">
                          ₹{(order.totalPaise / 100).toLocaleString('en-IN')}
                        </td>

                        {/* Payment */}
                        <td className="py-4 px-4">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded-[2px] ${
                              order.paymentStatus === 'captured'
                                ? 'bg-[#E3EBE4] text-[#1B3B2B]'
                                : order.paymentStatus === 'pending'
                                ? 'bg-[#FFF8E1] text-[#8D6E18]'
                                : 'bg-[#FFDAD6] text-[#93000A]'
                            }`}
                          >
                            {order.paymentStatus}
                          </span>
                          <span className="block text-[10px] font-mono text-[#767872] mt-0.5 uppercase">
                            {order.paymentMethod}
                          </span>
                        </td>

                        {/* Order Status with Quick Change */}
                        <td className="py-4 px-4">
                          <select
                            disabled={isUpdating}
                            value={order.status}
                            onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                            className="p-1 border border-[#D6D3CA] rounded-[2px] bg-white text-xs font-mono uppercase focus:outline-none focus:border-[#1B1C1A]"
                          >
                            <option value="pending_payment">Pending Payment</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="refunded">Refunded</option>
                          </select>
                        </td>

                        {/* Fulfillment & Carrier */}
                        <td className="py-4 px-4">
                          {order.shipment ? (
                            <div className="space-y-0.5">
                              <span className="font-semibold text-[11px] text-[#1B1C1A] block">
                                {order.shipment.carrier}
                              </span>
                              <span className="font-mono text-[10px] text-[#767872] block">
                                AWB: {order.shipment.trackingNumber}
                              </span>
                              <span className="inline-block px-1.5 py-0.5 text-[9px] font-mono uppercase bg-[#FAF9F6] border border-[#D6D3CA] rounded-[2px]">
                                {order.shipment.status.replace(/_/g, ' ')}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] font-mono text-[#767872]">
                              Pending Logistics
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenFulfillment(order)}
                            className="px-3 py-1.5 bg-[#1B1C1A] text-[#FAF9F6] text-[11px] font-mono uppercase tracking-wider rounded-[2px] hover:bg-[#333] transition-colors"
                          >
                            {order.shipment ? 'Update Shipment' : 'Fulfill & Dispatch'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="p-4 border-t border-[#E5E3DC] flex items-center justify-between text-xs font-mono">
              <span className="text-[#767872]">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total orders)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!pagination.hasPrevPage}
                  onClick={() => handlePageChange(pagination.page - 1)}
                  className="px-3 py-1.5 border border-[#D6D3CA] rounded-[2px] hover:bg-[#EAE8E3] disabled:opacity-40"
                >
                  &larr; Previous
                </button>
                <button
                  type="button"
                  disabled={!pagination.hasNextPage}
                  onClick={() => handlePageChange(pagination.page + 1)}
                  className="px-3 py-1.5 border border-[#D6D3CA] rounded-[2px] hover:bg-[#EAE8E3] disabled:opacity-40"
                >
                  Next &rarr;
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Fulfillment Modal Dialog */}
        {activeFulfillOrder && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-[#E5E3DC] rounded-[4px] p-8 max-w-lg w-full space-y-6 shadow-2xl">
              <div className="border-b border-[#E5E3DC] pb-4 flex items-center justify-between">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#767872]">
                    Dispatch & Logistics Service Assignment
                  </span>
                  <h3 className="font-serif-headline text-xl font-semibold text-[#1B1C1A] mt-1">
                    Fulfill Order #{activeFulfillOrder.orderNumber}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveFulfillOrder(null)}
                  className="text-xl text-[#767872] hover:text-[#1B1C1A]"
                >
                  &times;
                </button>
              </div>

              {/* Destination Summary */}
              {activeFulfillOrder.shippingAddress && (
                <div className="p-3 bg-[#FAF9F6] border border-[#E5E3DC] rounded-[2px] text-xs">
                  <p className="font-medium text-[#1B1C1A]">
                    Recipient: {activeFulfillOrder.customerName} ({activeFulfillOrder.customerPhone || 'No phone'})
                  </p>
                  <p className="text-[#767872] mt-0.5">
                    {activeFulfillOrder.shippingAddress.addressLine1}, {activeFulfillOrder.shippingAddress.city}, {activeFulfillOrder.shippingAddress.state} - {activeFulfillOrder.shippingAddress.postalCode}
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmitFulfillment} className="space-y-4">
                {/* Carrier Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-mono uppercase text-[#767872]">
                      Logistics Carrier Service *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCarrierModalOpen(true)}
                      className="text-[11px] font-mono uppercase text-[#1B1C1A] underline hover:opacity-80"
                    >
                      + Add New Partner
                    </button>
                  </div>
                  <select
                    value={carrierId || carrier}
                    onChange={(e) => {
                      const selected = carriers.find((c) => c.id === e.target.value || c.name === e.target.value);
                      if (selected) {
                        handleCarrierSelection(selected.id);
                      } else {
                        setCarrier(e.target.value);
                      }
                    }}
                    className="w-full p-2.5 bg-[#FAF9F6] border border-[#D6D3CA] rounded-[2px] text-xs text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
                  >
                    {carriers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Airway Bill / Tracking Number */}
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#767872] mb-1">
                    Airway Bill (AWB) / Tracking Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={trackingNumber}
                    onChange={(e) => handleTrackingNumberChange(e.target.value)}
                    placeholder="e.g. BLUEDART-9812401"
                    className="w-full p-2.5 bg-[#FAF9F6] border border-[#D6D3CA] rounded-[2px] text-xs font-mono uppercase text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
                  />
                </div>

                {/* Tracking URL */}
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#767872] mb-1">
                    Direct Tracking Webhook / Public URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={trackingUrl}
                    onChange={(e) => setTrackingUrl(e.target.value)}
                    placeholder="Auto-generated or custom carrier tracking link"
                    className="w-full p-2.5 bg-[#FAF9F6] border border-[#D6D3CA] rounded-[2px] text-xs font-mono text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
                  />
                  <span className="text-[10px] text-[#767872] mt-1 block">
                    Patron can click directly to this carrier page from their live tracking view. Auto-resolved from carrier template.
                  </span>
                </div>

                {/* Shipment Status */}
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#767872] mb-1">
                    Shipment Transit Status *
                  </label>
                  <select
                    value={shipmentStatus}
                    onChange={(e) => setShipmentStatus(e.target.value as any)}
                    className="w-full p-2.5 bg-[#FAF9F6] border border-[#D6D3CA] rounded-[2px] text-xs font-mono uppercase text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
                  >
                    <option value="label_created">Label Created / Packed</option>
                    <option value="picked_up">Picked Up by Logistics Partner</option>
                    <option value="in_transit">In Transit to Destination Hub</option>
                    <option value="out_for_delivery">Out for Delivery</option>
                    <option value="delivered">Delivered to Patron</option>
                  </select>
                </div>

                {/* Email Notification Checkbox */}
                <div className="pt-2">
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifyCustomer}
                      onChange={(e) => setNotifyCustomer(e.target.checked)}
                      className="w-4 h-4 accent-[#1B1C1A] rounded-[2px]"
                    />
                    <span className="text-xs text-[#1B1C1A]">
                      Send Brevo dispatch notification email to patron with tracking link
                    </span>
                  </label>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="submit"
                    disabled={isSubmittingFulfillment}
                    className="flex-1 py-3 bg-[#1B1C1A] text-[#FAF9F6] text-xs font-mono uppercase tracking-widest rounded-[2px] hover:bg-[#333] transition-colors disabled:opacity-50"
                  >
                    {isSubmittingFulfillment ? 'Recording Shipment...' : 'Save & Update Tracking'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFulfillOrder(null)}
                    className="px-4 py-3 border border-[#D6D3CA] text-[#767872] text-xs font-mono uppercase rounded-[2px] hover:text-[#1B1C1A]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Dynamic Carrier Management Modal */}
        {isCarrierModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white border border-[#D6D3CA] rounded-[4px] shadow-2xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#E5E3DC] pb-4">
                <div>
                  <h3 className="text-lg font-serif tracking-tight text-[#1B1C1A]">
                    Logistics Carrier Partners
                  </h3>
                  <p className="text-xs text-[#767872] mt-0.5">
                    Configure custom delivery services and automated tracking URL templates.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCarrierModalOpen(false)}
                  className="text-xl text-[#767872] hover:text-[#1B1C1A]"
                >
                  &times;
                </button>
              </div>

              {/* Add New Carrier Partner */}
              <form onSubmit={handleCreateCarrier} className="p-4 bg-[#FAF9F6] border border-[#E5E3DC] rounded-[2px] space-y-3">
                <h4 className="text-xs font-mono uppercase tracking-wider text-[#1B1C1A] font-medium">
                  Register New Logistics Carrier
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#767872] mb-1">
                      Carrier Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Shadowfax Express"
                      value={carrierForm.name}
                      onChange={(e) => setCarrierForm({ ...carrierForm, name: e.target.value })}
                      className="w-full p-2 bg-white border border-[#D6D3CA] rounded-[2px] text-xs text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#767872] mb-1">
                      Carrier Code (Unique Key) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. shadowfax"
                      value={carrierForm.code}
                      onChange={(e) => setCarrierForm({ ...carrierForm, code: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                      className="w-full p-2 bg-white border border-[#D6D3CA] rounded-[2px] text-xs font-mono uppercase text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#767872] mb-1">
                    Tracking URL Template (Use {'{trackingNumber}'} token)
                  </label>
                  <input
                    type="text"
                    placeholder="https://tracker.shadowfax.in/#/track/{trackingNumber}"
                    value={carrierForm.trackingUrlTemplate}
                    onChange={(e) => setCarrierForm({ ...carrierForm, trackingUrlTemplate: e.target.value })}
                    className="w-full p-2 bg-white border border-[#D6D3CA] rounded-[2px] text-xs font-mono text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
                  />
                  <span className="text-[10px] text-[#767872] mt-0.5 block">
                    The token {'{trackingNumber}'} will be automatically substituted when generating tracking links for patrons.
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#767872] mb-1">
                    Support / Helpline Phone (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1800 209 6161"
                    value={carrierForm.contactPhone}
                    onChange={(e) => setCarrierForm({ ...carrierForm, contactPhone: e.target.value })}
                    className="w-full p-2 bg-white border border-[#D6D3CA] rounded-[2px] text-xs font-mono text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
                  />
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isCreatingCarrier}
                    className="px-4 py-2 bg-[#1B1C1A] text-[#FAF9F6] text-xs font-mono uppercase tracking-wider rounded-[2px] hover:bg-[#333] transition-colors disabled:opacity-50"
                  >
                    {isCreatingCarrier ? 'Registering...' : '+ Add Carrier Partner'}
                  </button>
                </div>
              </form>

              {/* Carrier Registry List */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono uppercase tracking-wider text-[#1B1C1A] font-medium">
                  Active Carrier Partners ({carriers.length})
                </h4>
                {carriers.length === 0 ? (
                  <p className="text-xs text-[#767872] py-4 text-center">No carriers currently configured.</p>
                ) : (
                  <div className="border border-[#E5E3DC] rounded-[2px] divide-y divide-[#E5E3DC]">
                    {carriers.map((item) => (
                      <div key={item.id} className="p-3 flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[#1B1C1A]">{item.name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#FAF9F6] border border-[#E5E3DC] text-[#767872] rounded-[2px]">
                              {item.code.toUpperCase()}
                            </span>
                            {item.contactPhone && (
                              <span className="text-[11px] text-[#767872]">
                                Tel: {item.contactPhone}
                              </span>
                            )}
                          </div>
                          {item.trackingUrlTemplate ? (
                            <p className="text-[11px] font-mono text-[#767872] truncate max-w-md">
                              {item.trackingUrlTemplate}
                            </p>
                          ) : (
                            <p className="text-[11px] text-[#A0A29C] italic">No URL template (Concierge / In-person)</p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteCarrier(item.id, item.name)}
                          className="px-2 py-1 text-[11px] font-mono uppercase text-[#9B2C2C] border border-[#E5E3DC] rounded-[2px] hover:bg-[#FFF5F5] transition-colors"
                        >
                          Deactivate
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsCarrierModalOpen(false)}
                  className="px-5 py-2.5 bg-[#1B1C1A] text-[#FAF9F6] text-xs font-mono uppercase tracking-wider rounded-[2px] hover:bg-[#333] transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<div className="p-8 font-mono text-xs text-[#767872]">Loading orders...</div>}>
      <OrdersContent />
    </Suspense>
  );
}
