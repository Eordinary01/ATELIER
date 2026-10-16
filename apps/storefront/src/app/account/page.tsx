'use client';

// Atelier Client Account & Authentication Portal
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PriceDisplay } from '@atelier/ui';
import { CancelOrderModal } from '../../components/CancelOrderModal';
import { ExchangeReturnModal } from '../../components/ExchangeReturnModal';
import { getValidToken, clearAuth } from '../../lib/auth';

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
}

interface UserOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalPaise: number;
  paymentStatus: string;
  createdAt: string;
  items: Array<{
    id: string;
    productTitle: string;
    variantLabel: string;
    sku: string;
    quantity: number;
    unitPricePaise: number;
    totalPricePaise: number;
  }>;
  shipment: {
    carrier: string;
    trackingNumber: string;
    status: string;
  } | null;
}

interface SavedAddress {
  id: string;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export default function AccountPage() {
  const [activeTab, setActiveTab] = useState<'signin' | 'register'>('signin');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sign In / Register Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Address Book states
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const [newAddrName, setNewAddrName] = useState('');
  const [newAddrPhone, setNewAddrPhone] = useState('');
  const [newAddrLine1, setNewAddrLine1] = useState('');
  const [newAddrLine2, setNewAddrLine2] = useState('');
  const [newAddrCity, setNewAddrCity] = useState('New Delhi');
  const [newAddrState, setNewAddrState] = useState('Delhi');
  const [newAddrPostalCode, setNewAddrPostalCode] = useState('110001');
  const [newAddrIsDefault, setNewAddrIsDefault] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressSuccessMessage, setAddressSuccessMessage] = useState<string | null>(null);

  // Orders & Commissions state
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [cancellingOrder, setCancellingOrder] = useState<UserOrder | null>(null);
  const [exchangeOrder, setExchangeOrder] = useState<UserOrder | null>(null);

  const handleAccountCancelSuccess = (result: {
    orderNumber: string;
    status: string;
    paymentStatus: string;
    refundAmountPaise: number;
    message: string;
  }) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.orderNumber === result.orderNumber
          ? { ...o, status: 'cancelled', paymentStatus: result.paymentStatus }
          : o
      )
    );
    setCancellingOrder(null);
  };

  // Load user session and addresses
  const loadAddresses = async (authToken: string) => {
    try {
      const res = await fetch('http://localhost:4000/api/v1/auth/addresses', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAddresses(json.data);
        localStorage.setItem('atelier_saved_addresses', JSON.stringify(json.data));
      }
    } catch {
      // ignore
    }
  };

  const loadOrders = async (authToken: string) => {
    try {
      const res = await fetch('http://localhost:4000/api/v1/auth/orders', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setOrders(json.data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('atelier_user');
    const validToken = getValidToken();

    if (savedUser && validToken) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setToken(validToken);
        setNewAddrName(`${parsed.firstName || ''} ${parsed.lastName || ''}`.trim());
        if (parsed.phone) setNewAddrPhone(parsed.phone);
        loadAddresses(validToken);
        loadOrders(validToken);
      } catch {
        // ignore
      }
    } else {
      // If token is missing or expired, ensure storage is sanitized
      const hadPreviousSession = Boolean(savedUser);
      clearAuth();
      setUser(null);
      setToken(null);

      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('expired') === 'true' || hadPreviousSession) {
          setActiveTab('signin');
          setErrorMessage('Your session has expired. Please sign in to resume your private client profile.');
        } else if (urlParams.get('tab') === 'register') {
          setActiveTab('register');
        } else if (urlParams.get('tab') === 'signin') {
          setActiveTab('signin');
        }
      }
    }
    setIsLoading(false);
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('http://localhost:4000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setUser(json.data.user);
        setToken(json.data.accessToken);
        localStorage.setItem('atelier_user', JSON.stringify(json.data.user));
        localStorage.setItem('atelier_access_token', json.data.accessToken);
        setNewAddrName(`${json.data.user.firstName || ''} ${json.data.user.lastName || ''}`.trim());
        if (json.data.user.phone) setNewAddrPhone(json.data.user.phone);
        loadAddresses(json.data.accessToken);
        loadOrders(json.data.accessToken);
      } else {
        setErrorMessage(json.error?.message || 'Authentication rejected. Check credentials.');
      }
    } catch (err: any) {
      setErrorMessage(`Network connection failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('http://localhost:4000/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName, lastName, phone: phone || undefined }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setUser(json.data.user);
        setToken(json.data.accessToken);
        localStorage.setItem('atelier_user', JSON.stringify(json.data.user));
        localStorage.setItem('atelier_access_token', json.data.accessToken);
        setNewAddrName(`${json.data.user.firstName || ''} ${json.data.user.lastName || ''}`.trim());
        if (json.data.user.phone) setNewAddrPhone(json.data.user.phone);
        loadAddresses(json.data.accessToken);
        loadOrders(json.data.accessToken);
      } else {
        setErrorMessage(json.error?.message || 'Profile establishment failed.');
      }
    } catch (err: any) {
      setErrorMessage(`Network error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setAddresses([]);
    setOrders([]);
    clearAuth();
  };

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsSavingAddress(true);

    try {
      const res = await fetch('http://localhost:4000/api/v1/auth/addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newAddrName,
          phone: newAddrPhone,
          addressLine1: newAddrLine1,
          addressLine2: newAddrLine2 || undefined,
          city: newAddrCity,
          state: newAddrState,
          postalCode: newAddrPostalCode,
          country: 'India',
          type: 'shipping',
          isDefault: newAddrIsDefault || addresses.length === 0,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setAddresses((prev) => [json.data, ...prev]);
        setShowAddAddressForm(false);
        setNewAddrLine1('');
        setNewAddrLine2('');
        setAddressSuccessMessage('Address successfully added to your client book.');
        setTimeout(() => setAddressSuccessMessage(null), 3500);
      } else {
        alert(json.error?.message || 'Failed to save address.');
      }
    } catch (err: any) {
      alert(`Error saving address: ${err.message}`);
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm('Are you sure you want to remove this saved address?')) return;
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:4000/api/v1/auth/addresses/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setAddresses((prev) => prev.filter((a) => a.id !== id));
      } else {
        alert(json.error?.message || 'Could not delete address');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto py-24 text-center font-mono text-xs text-[#767872]">
        Verifying client authentication session...
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-12 py-10">
      {/* Header */}
      <div className="border-b border-[#E5E3DC] pb-6 mb-8 flex items-center justify-between">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-[#767872]">
            Private Client Profile
          </span>
          <h1 className="font-headline-lg text-3xl font-semibold text-[#1B1C1A] tracking-tight mt-1">
            {user ? `Welcome, ${user.firstName} ${user.lastName}` : 'Client Authentication & Registry'}
          </h1>
        </div>
        {user && (
          <button
            onClick={handleLogout}
            className="px-4 py-2 border border-[#D6D3CA] text-xs font-mono uppercase tracking-wider rounded-[2px] hover:bg-[#EAE8E3] transition-colors"
          >
            Sign Out
          </button>
        )}
      </div>

      {user ? (
        /* Logged In View */
        <div className="max-w-4xl space-y-8">
          {/* Profile Details */}
          <div className="p-8 bg-white border border-[#E5E3DC] rounded-[4px] space-y-6">
            <div className="border-b border-[#E5E3DC] pb-4">
              <h2 className="font-serif-headline text-lg font-semibold text-[#1B1C1A]">
                Profile Details
              </h2>
              <p className="text-xs text-[#767872] mt-0.5">
                Verified Atelier Account &bull; Role: {user.role.toUpperCase()}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              <div>
                <span className="font-mono text-[10px] uppercase text-[#767872] block">Client Name</span>
                <span className="font-medium text-sm text-[#1B1C1A]">{user.firstName} {user.lastName}</span>
              </div>

              <div>
                <span className="font-mono text-[10px] uppercase text-[#767872] block">Email Address</span>
                <span className="font-medium text-sm text-[#1B1C1A]">{user.email}</span>
              </div>

              <div>
                <span className="font-mono text-[10px] uppercase text-[#767872] block">Contact Number</span>
                <span className="font-medium text-sm text-[#1B1C1A]">{user.phone || 'None provided'}</span>
              </div>

              <div>
                <span className="font-mono text-[10px] uppercase text-[#767872] block">Client ID</span>
                <span className="font-mono text-xs text-[#767872] truncate block">{user.id}</span>
              </div>
            </div>
          </div>

          {/* Saved Addresses Section */}
          <div className="p-8 bg-white border border-[#E5E3DC] rounded-[4px] space-y-6">
            <div className="flex items-center justify-between border-b border-[#E5E3DC] pb-4">
              <div>
                <h2 className="font-serif-headline text-lg font-semibold text-[#1B1C1A]">
                  Saved Shipping Addresses
                </h2>
                <p className="text-xs text-[#767872] mt-0.5">
                  Addresses saved here will automatically appear during checkout for one-click commission dispatch.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddAddressForm(!showAddAddressForm)}
                className="px-3.5 py-2 bg-[#1B1C1A] text-[#FAF9F6] text-xs font-mono uppercase tracking-wider rounded-[2px] hover:bg-[#333] transition-colors"
              >
                {showAddAddressForm ? 'Cancel' : '+ Add Address'}
              </button>
            </div>

            {addressSuccessMessage && (
              <div className="p-3 bg-[#E3EBE4] border border-[#C5D6C7] text-[#1B3B2B] text-xs rounded-[2px]">
                {addressSuccessMessage}
              </div>
            )}

            {/* Add Address Form Modal / Inline Box */}
            {showAddAddressForm && (
              <form onSubmit={handleCreateAddress} className="p-6 bg-[#FAF9F6] border border-[#E5E3DC] rounded-[4px] space-y-4">
                <h3 className="font-serif-headline text-sm font-semibold text-[#1B1C1A]">
                  Add New Shipping Destination
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#767872] mb-1">
                      Recipient Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newAddrName}
                      onChange={(e) => setNewAddrName(e.target.value)}
                      className="w-full p-2 bg-white border border-[#D6D3CA] rounded-[2px] text-xs text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#767872] mb-1">
                      Contact Phone *
                    </label>
                    <input
                      type="tel"
                      required
                      value={newAddrPhone}
                      onChange={(e) => setNewAddrPhone(e.target.value)}
                      className="w-full p-2 bg-white border border-[#D6D3CA] rounded-[2px] text-xs font-mono text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#767872] mb-1">
                    Street Address & House / Flat No. *
                  </label>
                  <input
                    type="text"
                    required
                    value={newAddrLine1}
                    onChange={(e) => setNewAddrLine1(e.target.value)}
                    placeholder="44 Lodhi Estate, Suite 3B"
                    className="w-full p-2 bg-white border border-[#D6D3CA] rounded-[2px] text-xs text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#767872] mb-1">
                    Apartment, Building, Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    value={newAddrLine2}
                    onChange={(e) => setNewAddrLine2(e.target.value)}
                    placeholder="Near Lodhi Gardens Gate 2"
                    className="w-full p-2 bg-white border border-[#D6D3CA] rounded-[2px] text-xs text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#767872] mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      value={newAddrCity}
                      onChange={(e) => setNewAddrCity(e.target.value)}
                      className="w-full p-2 bg-white border border-[#D6D3CA] rounded-[2px] text-xs text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#767872] mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      required
                      value={newAddrState}
                      onChange={(e) => setNewAddrState(e.target.value)}
                      className="w-full p-2 bg-white border border-[#D6D3CA] rounded-[2px] text-xs text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#767872] mb-1">
                      PIN Code *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={newAddrPostalCode}
                      onChange={(e) => setNewAddrPostalCode(e.target.value)}
                      className="w-full p-2 bg-white border border-[#D6D3CA] rounded-[2px] text-xs font-mono text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newAddrIsDefault}
                      onChange={(e) => setNewAddrIsDefault(e.target.checked)}
                      className="w-4 h-4 accent-[#1B1C1A] rounded-[2px]"
                    />
                    <span className="text-xs text-[#1B1C1A]">Set as default shipping address</span>
                  </label>

                  <button
                    type="submit"
                    disabled={isSavingAddress}
                    className="px-5 py-2.5 bg-[#1B1C1A] text-[#FAF9F6] text-xs font-mono uppercase tracking-wider rounded-[2px] hover:bg-[#333] transition-colors disabled:opacity-50"
                  >
                    {isSavingAddress ? 'Saving Address...' : 'Save Address'}
                  </button>
                </div>
              </form>
            )}

            {/* Addresses Grid */}
            {addresses.length === 0 ? (
              <div className="p-8 bg-[#FAF9F6] border border-[#E5E3DC] rounded-[2px] text-center space-y-2">
                <span className="material-symbols-outlined text-[32px] text-[#A8A7A1]">
                  location_on
                </span>
                <p className="font-serif-headline text-sm text-[#1B1C1A]">
                  No Addresses Saved Yet
                </p>
                <p className="text-[11px] text-[#767872]">
                  Add an address or save one during checkout to expedite future tailoring deliveries.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="p-5 border border-[#E5E3DC] rounded-[4px] bg-[#FAF9F6] flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-xs text-[#1B1C1A]">{addr.name}</span>
                        {addr.isDefault && (
                          <span className="text-[9px] font-mono uppercase bg-[#1B1C1A] text-white px-2 py-0.5 rounded-[2px]">
                            Default Address
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#767872]">{addr.addressLine1}</p>
                      {addr.addressLine2 && <p className="text-xs text-[#767872]">{addr.addressLine2}</p>}
                      <p className="text-xs font-mono text-[#767872] mt-1">
                        {addr.city}, {addr.state} - {addr.postalCode}
                      </p>
                      <p className="text-xs font-mono text-[#767872] mt-0.5">Phone: {addr.phone}</p>
                    </div>

                    <div className="pt-2 border-t border-[#E5E3DC] flex justify-between items-center text-[11px] font-mono">
                      <Link
                        href="/checkout"
                        className="text-[#1B1C1A] hover:underline uppercase"
                      >
                        Use in Checkout &rarr;
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="text-[#93000A] hover:underline uppercase"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Commissions / Orders Overview */}
          <div className="p-8 bg-white border border-[#E5E3DC] rounded-[4px] space-y-6">
            <div className="flex items-center justify-between border-b border-[#E5E3DC] pb-4">
              <div>
                <h2 className="font-serif-headline text-lg font-semibold text-[#1B1C1A]">
                  Commission History & Orders
                </h2>
                <p className="text-xs text-[#767872] mt-0.5">
                  Track bespoke commissions, tailoring milestones, and live carrier dispatches.
                </p>
              </div>
              <span className="text-[11px] font-mono text-[#767872]">
                {orders.length} {orders.length === 1 ? 'Commission' : 'Commissions'}
              </span>
            </div>

            {orders.length === 0 ? (
              <div className="p-8 bg-[#FAF9F6] border border-[#E5E3DC] rounded-[2px] text-center space-y-2">
                <span className="material-symbols-outlined text-[32px] text-[#A8A7A1]">
                  inventory_2
                </span>
                <p className="font-serif-headline text-sm text-[#1B1C1A]">
                  No Commission History On Record
                </p>
                <p className="text-[11px] text-[#767872]">
                  Your confirmed orders will appear here with live Airway Bill (AWB) tracking numbers.
                </p>
                <Link
                  href="/catalog"
                  className="inline-block mt-3 px-4 py-2 bg-[#1B1C1A] text-[#FAF9F6] text-xs font-mono uppercase tracking-wider rounded-[2px] hover:bg-[#333] transition-colors"
                >
                  Browse Archive
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-5 border border-[#E5E3DC] rounded-[4px] bg-[#FAF9F6] space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E3DC] pb-3">
                      <div>
                        <span className="font-mono text-[10px] uppercase text-[#767872] block">
                          Commission Order
                        </span>
                        <span className="font-semibold text-xs font-mono text-[#1B1C1A]">
                          {ord.orderNumber}
                        </span>
                        <span className="text-[10px] text-[#767872] block font-mono">
                          Placed {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center space-x-3 sm:text-right">
                        <div>
                          <span className="font-mono text-xs font-medium text-[#1B1C1A] block">
                            <PriceDisplay amountPaise={ord.totalPaise} />
                          </span>
                          <span className="text-[10px] font-mono uppercase bg-[#EAE8E3] text-[#1B1C1A] px-2 py-0.5 rounded-[2px] inline-block mt-0.5">
                            {ord.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Logistics Status & Carrier */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div>
                        {ord.shipment ? (
                          <div className="space-y-0.5">
                            <span className="text-[#1B1C1A] font-medium block">
                              Logistics Partner: {ord.shipment.carrier}
                            </span>
                            <span className="font-mono text-[11px] text-[#767872] block">
                              AWB: {ord.shipment.trackingNumber} &bull; {ord.shipment.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#767872] text-[11px] font-mono">
                            Status: Tailoring & Verification in Progress
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                        {['pending_payment', 'confirmed', 'processing'].includes(ord.status) && (
                          <button
                            type="button"
                            onClick={() => setCancellingOrder(ord)}
                            className="px-3 py-1.5 border border-[#FFDAD6] bg-[#FFF0EE] text-[#93000A] text-xs font-mono uppercase tracking-wider rounded-[2px] hover:bg-[#FFE8E6] transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                        {ord.status !== 'cancelled' && (
                          <button
                            type="button"
                            onClick={() => setExchangeOrder(ord)}
                            className="px-3 py-1.5 border border-[#1B1C1A] bg-white text-[#1B1C1A] text-xs font-mono uppercase tracking-wider rounded-[2px] hover:bg-[#FAF9F6] transition-colors"
                          >
                            Exchange / Return
                          </button>
                        )}
                        <Link
                          href={`/track-order?orderNumber=${ord.orderNumber}`}
                          className="inline-flex items-center space-x-1 px-3.5 py-1.5 bg-[#1B1C1A] text-[#FAF9F6] text-xs font-mono uppercase tracking-wider rounded-[2px] hover:bg-[#333] transition-colors"
                        >
                          <span>Live Visual Tracking</span>
                          <span>&rarr;</span>
                        </Link>
                      </div>
                    </div>

                    {/* Items preview */}
                    <div className="pt-2 border-t border-[#E5E3DC] text-[11px] text-[#767872] space-y-1">
                      {ord.items.map((it) => (
                        <div key={it.id} className="flex justify-between items-center">
                          <span>
                            {it.productTitle} ({it.variantLabel}) &times; {it.quantity}
                          </span>
                          <span className="font-mono text-[#1B1C1A]">
                            ₹{(it.totalPricePaise / 100).toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cancellation Modal */}
          {cancellingOrder && (
            <CancelOrderModal
              isOpen={Boolean(cancellingOrder)}
              onClose={() => setCancellingOrder(null)}
              orderNumber={cancellingOrder.orderNumber}
              totalPaise={cancellingOrder.totalPaise}
              paymentStatus={cancellingOrder.paymentStatus}
              onSuccess={handleAccountCancelSuccess}
            />
          )}

          {/* Exchange & Return Concierge Modal */}
          {exchangeOrder && (
            <ExchangeReturnModal
              isOpen={Boolean(exchangeOrder)}
              onClose={() => setExchangeOrder(null)}
              orderNumber={exchangeOrder.orderNumber}
              items={exchangeOrder.items.map((it) => ({
                id: it.id,
                title: it.productTitle,
                variantLabel: it.variantLabel,
                sku: it.sku,
                unitPricePaise: it.unitPricePaise,
                quantity: it.quantity,
                totalPricePaise: it.totalPricePaise,
              }))}
              onSuccess={(res) => {
                setExchangeOrder(null);
                alert(res.message);
              }}
            />
          )}
        </div>
      ) : (
        /* Sign In / Register Tabs */
        <div className="max-w-md mx-auto bg-white border border-[#E5E3DC] rounded-[4px] p-8 space-y-6">
          <div className="flex border-b border-[#E5E3DC]">
            <button
              onClick={() => { setActiveTab('signin'); setErrorMessage(null); }}
              className={`flex-1 py-3 text-xs font-mono uppercase tracking-wider border-b-2 text-center transition-colors ${
                activeTab === 'signin'
                  ? 'border-[#1B1C1A] font-semibold text-[#1B1C1A]'
                  : 'border-transparent text-[#767872] hover:text-[#1B1C1A]'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setActiveTab('register'); setErrorMessage(null); }}
              className={`flex-1 py-3 text-xs font-mono uppercase tracking-wider border-b-2 text-center transition-colors ${
                activeTab === 'register'
                  ? 'border-[#1B1C1A] font-semibold text-[#1B1C1A]'
                  : 'border-transparent text-[#767872] hover:text-[#1B1C1A]'
              }`}
            >
              Create Account
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 bg-[#FFDAD6] text-[#93000A] text-xs font-mono rounded-[2px]">
              {errorMessage}
            </div>
          )}

          {activeTab === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#767872] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@address.in"
                  className="w-full p-2.5 bg-[#FAF9F6] border border-[#D6D3CA] rounded-[2px] text-xs text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#767872] mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-2.5 pr-10 bg-[#FAF9F6] border border-[#D6D3CA] rounded-[2px] text-xs text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#767872] hover:text-[#1B1C1A] transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#1B1C1A] text-[#FAF9F6] text-xs font-mono uppercase tracking-widest rounded-[2px] hover:bg-[#333] transition-colors disabled:opacity-50 mt-2"
              >
                {isSubmitting ? 'Authenticating...' : 'Sign In to Profile'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#767872] mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full p-2 bg-[#FAF9F6] border border-[#D6D3CA] rounded-[2px] text-xs text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#767872] mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full p-2 bg-[#FAF9F6] border border-[#D6D3CA] rounded-[2px] text-xs text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#767872] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@address.in"
                  className="w-full p-2 bg-[#FAF9F6] border border-[#D6D3CA] rounded-[2px] text-xs text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#767872] mb-1">
                  Password (Min 8 characters)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-2 pr-10 bg-[#FAF9F6] border border-[#D6D3CA] rounded-[2px] text-xs text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#767872] hover:text-[#1B1C1A] transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#767872] mb-1">
                  Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full p-2 bg-[#FAF9F6] border border-[#D6D3CA] rounded-[2px] text-xs text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#1B1C1A] text-[#FAF9F6] text-xs font-mono uppercase tracking-widest rounded-[2px] hover:bg-[#333] transition-colors disabled:opacity-50 mt-3"
              >
                {isSubmitting ? 'Establishing Profile...' : 'Establish Client Profile'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
