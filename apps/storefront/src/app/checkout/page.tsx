'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import Link from 'next/link';
import { useCart } from '../../context/CartContext';
import { PriceDisplay } from '@atelier/ui';
import { getValidToken } from '../../lib/auth';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

declare global {
  interface Window {
    Razorpay?: any;
  }
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

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotalPaise, totalCount, clearCart, setTargetCouponCode } = useCart();
  const { isOnline } = useNetworkStatus();

  // Authentication State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);


  // Saved Addresses State
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('new');
  const [saveAddressForFuture, setSaveAddressForFuture] = useState(true);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [saveAddressFeedback, setSaveAddressFeedback] = useState<string | null>(null);

  // Customer & Shipping Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('New Delhi');
  const [state, setState] = useState('Delhi');
  const [postalCode, setPostalCode] = useState('110001');

  // Courtesy Coupon
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discountPaise, setDiscountPaise] = useState<number>(0);
  const [couponFeedback, setCouponFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [availableVouchers, setAvailableVouchers] = useState<any[]>([]);

  // Flow State
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Simulation Modal state
  const [simulationData, setSimulationData] = useState<{
    orderId: string;
    orderNumber: string;
    razorpayOrderId: string;
    amountPaise: number;
  } | null>(null);

  const freeShippingThresholdPaise = 199900;
  const isFreeShipping = subtotalPaise >= freeShippingThresholdPaise || subtotalPaise === 0;
  const shippingPaise = isFreeShipping ? 0 : 15000;
  const totalPaise = Math.max(0, subtotalPaise + shippingPaise - discountPaise);

  // 1. Auto-fill user details on mount and fetch saved addresses
  useEffect(() => {
    try {
      const savedUserStr = localStorage.getItem('atelier_user');
      const validToken = getValidToken();

      if (validToken) {
        setAuthToken(validToken);
      } else {
        setAuthToken(null);
      }

      if (savedUserStr) {
        const parsedUser: UserProfile = JSON.parse(savedUserStr);
        setCurrentUser(parsedUser);

        // Auto-fill patron contact details from logged-in profile
        const fullName = `${parsedUser.firstName || ''} ${parsedUser.lastName || ''}`.trim();
        if (fullName) {
          setName(fullName);
        }
        if (parsedUser.email) {
          setEmail(parsedUser.email);
        }
        if (parsedUser.phone) {
          setPhone(parsedUser.phone);
        }

        // Fetch saved addresses from API
        if (validToken) {
          fetch('http://localhost:4000/api/v1/auth/addresses', {
            headers: {
              Authorization: `Bearer ${validToken}`,
            },
          })
            .then((res) => res.json())
            .then((json) => {
              if (json.success && Array.isArray(json.data) && json.data.length > 0) {
                const addrs: SavedAddress[] = json.data;
                setSavedAddresses(addrs);
                // Also cache in localStorage for fast offline retrieval
                localStorage.setItem('atelier_saved_addresses', JSON.stringify(addrs));

                // Auto-select default or first saved address
                const defaultAddr = addrs.find((a) => a.isDefault) || addrs[0];
                if (defaultAddr) {
                  applySavedAddress(defaultAddr);
                }
              }
            })
            .catch(() => {
              // Fallback to localStorage cached addresses if backend request fails
              const localAddrs = localStorage.getItem('atelier_saved_addresses');
              if (localAddrs) {
                try {
                  const parsed = JSON.parse(localAddrs);
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    setSavedAddresses(parsed);
                    const def = parsed.find((a: SavedAddress) => a.isDefault) || parsed[0];
                    if (def) applySavedAddress(def);
                  }
                } catch {
                  // ignore
                }
              }
            });
        }
      }
    } catch (e) {
      // ignore parsing error
    }

    // Restore applied coupon or fetch active vouchers
    try {
      const savedCoupon = sessionStorage.getItem('atelier_applied_coupon');
      if (savedCoupon) {
        const parsedCoupon = JSON.parse(savedCoupon);
        if (parsedCoupon.code) {
          applyCouponCode(parsedCoupon.code, false);
        }
      }
    } catch {
      // ignore
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    fetch(`${apiUrl}/api/v1/coupons/active`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success && Array.isArray(j.data)) setAvailableVouchers(j.data);
      })
      .catch(() => {});
  }, []);

  // Helper to populate form from a saved address
  const applySavedAddress = (addr: SavedAddress) => {
    setSelectedAddressId(addr.id);
    setName(addr.name);
    setPhone(addr.phone);
    setAddressLine1(addr.addressLine1);
    setAddressLine2(addr.addressLine2 || '');
    setCity(addr.city);
    setState(addr.state);
    setPostalCode(addr.postalCode);
  };

  const handleSelectAddressOption = (id: string) => {
    setSelectedAddressId(id);
    if (id === 'new') {
      // Clear shipping address fields but preserve customer's own name & phone from login
      if (currentUser) {
        const fullName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
        setName(fullName || '');
        setPhone(currentUser.phone || '');
      } else {
        setName('');
        setPhone('');
      }
      setAddressLine1('');
      setAddressLine2('');
      setCity('New Delhi');
      setState('Delhi');
      setPostalCode('110001');
    } else {
      const found = savedAddresses.find((a) => a.id === id);
      if (found) {
        applySavedAddress(found);
      }
    }
  };

  // Explicit Save Address function so user can save address without waiting for order
  const handleSaveAddressExplicit = async () => {
    if (!addressLine1 || !city || !state || !postalCode || !name || !phone) {
      alert('Please fill in complete address details before saving.');
      return;
    }

    if (!authToken) {
      alert('Please sign in to save addresses to your Atelier account.');
      return;
    }

    setIsSavingAddress(true);
    setSaveAddressFeedback(null);

    try {
      const res = await fetch('http://localhost:4000/api/v1/auth/addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name,
          phone,
          addressLine1,
          addressLine2: addressLine2 || undefined,
          city,
          state,
          postalCode,
          country: 'India',
          type: 'shipping',
          isDefault: savedAddresses.length === 0,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const newAddr: SavedAddress = json.data;
        const updated = [newAddr, ...savedAddresses];
        setSavedAddresses(updated);
        setSelectedAddressId(newAddr.id);
        localStorage.setItem('atelier_saved_addresses', JSON.stringify(updated));
        setSaveAddressFeedback('Address saved to your client address book.');
        setTimeout(() => setSaveAddressFeedback(null), 4000);
      } else {
        alert(json.error?.message || 'Failed to record address.');
      }
    } catch (err: any) {
      alert(`Error saving address: ${err.message}`);
    } finally {
      setIsSavingAddress(false);
    }
  };

  const applyCouponCode = async (codeToTest: string, userInitiated = true) => {
    const cleanCode = codeToTest.trim().toUpperCase();
    if (!cleanCode) return;

    setIsValidatingCoupon(true);
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
            message: `Courtesy code ${json.data.code} applied: \u20B9${(json.data.discountPaise / 100).toFixed(2)} discount.`,
          });
        }
      } else {
        if (userInitiated) {
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
      }
    } catch {
      if (userInitiated) {
        setCouponFeedback({
          type: 'error',
          message: 'Unable to validate courtesy code.',
        });
      }
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    applyCouponCode(couponCode, true);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountPaise(0);
    setCouponFeedback(null);
    sessionStorage.removeItem('atelier_applied_coupon');
  };

  const verifyPaymentAndRedirect = async (paymentDetails: {
    orderId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) => {
    try {
      const res = await fetch('http://localhost:4000/api/v1/checkout/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentDetails),
      });

      const json = await res.json();
      if (json.success) {
        clearCart();
        router.push(`/order-success?orderNumber=${json.data.orderNumber}`);
      } else {
        setErrorMessage(json.error?.message || 'Payment verification failed');
      }
    } catch (err: any) {
      setErrorMessage(`Verification error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('Your bag is empty.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // 1. Create order on backend
      const res = await fetch('http://localhost:4000/api/v1/checkout/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
          })),
          customer: { name, email, phone },
          shippingAddress: {
            name,
            phone,
            addressLine1,
            addressLine2: addressLine2 || undefined,
            city,
            state,
            postalCode,
            country: 'India',
          },
          couponCode: appliedCoupon || undefined,
          userId: currentUser?.id || undefined,
          saveAddress: saveAddressForFuture,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Failed to initialize order on server');
      }

      const orderData = json.data;

      // 2. Razorpay Flow
      const hasLiveRazorpay =
        typeof window !== 'undefined' &&
        window.Razorpay &&
        orderData.razorpayKeyId &&
        orderData.razorpayKeyId.startsWith('rzp_') &&
        orderData.razorpayKeyId !== 'rzp_test_placeholder' &&
        !orderData.isSimulated;

      if (hasLiveRazorpay) {
        const options = {
          key: orderData.razorpayKeyId,
          amount: orderData.amountPaise,
          currency: 'INR',
          name: 'ATELIER Haute Couture',
          description: `Order #${orderData.orderNumber}`,
          order_id: orderData.razorpayOrderId,
          prefill: {
            name,
            email,
            contact: phone,
          },
          theme: {
            color: '#1B1C1A',
          },
          handler: async function (response: any) {
            await verifyPaymentAndRedirect({
              orderId: orderData.orderId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
          },
          modal: {
            ondismiss: function () {
              setIsProcessing(false);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // Test simulation mode modal
        setSimulationData({
          orderId: orderData.orderId,
          orderNumber: orderData.orderNumber,
          razorpayOrderId: orderData.razorpayOrderId,
          amountPaise: orderData.amountPaise,
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message);
      setIsProcessing(false);
    }
  };

  const handleCompleteSimulation = async () => {
    if (!simulationData) return;
    setIsProcessing(true);
    const mockPaymentId = `pay_${Date.now()}`;
    const mockSig = `simulated_sig_${Date.now()}`;

    await verifyPaymentAndRedirect({
      orderId: simulationData.orderId,
      razorpayOrderId: simulationData.razorpayOrderId,
      razorpayPaymentId: mockPaymentId,
      razorpaySignature: mockSig,
    });
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="max-w-[1440px] mx-auto px-4 md:px-12 py-10">
        <div className="border-b border-[#E5E3DC] pb-6 mb-8 flex items-center justify-between">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-[#767872]">
              Secure Checkout &bull; Razorpay Gateway
            </span>
            <h1 className="font-headline-lg text-3xl font-semibold text-[#1B1C1A] tracking-tight mt-1">
              Finalize Commission Order
            </h1>
          </div>
          <Link
            href="/cart"
            className="text-xs font-mono uppercase text-[#767872] hover:text-[#1B1C1A] flex items-center space-x-1"
          >
            <span>&larr; Return to Bag</span>
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="p-16 bg-white border border-[#E5E3DC] rounded-[4px] text-center space-y-4 my-8">
            <p className="font-serif-headline text-xl text-[#1B1C1A]">
              Your Bag is Currently Empty
            </p>
            <p className="text-xs text-[#767872]">
              Please add garments to your commission bag before proceeding to checkout.
            </p>
            <Link
              href="/catalog"
              className="inline-block px-6 py-3 bg-[#1B1C1A] text-[#FAF9F6] text-xs font-mono uppercase tracking-wider rounded-[2px]"
            >
              Explore Catalog
            </Link>
          </div>
        ) : (
          <form onSubmit={handleStartCheckout} className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Left Column: Shipping & Contact Details */}
            <div className="lg:col-span-7 space-y-6">
              {errorMessage && (
                <div className="p-4 bg-[#FFF0EE] border border-[#FFDAD6] text-[#93000A] text-xs rounded-[2px]">
                  {errorMessage}
                </div>
              )}

              {/* Logged-in Patron Banner */}
              {currentUser ? (
                <div className="p-4 bg-[#FAF9F6] border border-[#E5E3DC] rounded-[4px] flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-[2px] bg-[#1B1C1A] text-[#FAF9F6] flex items-center justify-center font-mono text-xs uppercase">
                      {currentUser.firstName.charAt(0)}{currentUser.lastName?.charAt(0) || ''}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#1B1C1A]">
                        Logged in as <span className="font-semibold">{currentUser.firstName} {currentUser.lastName}</span>
                      </p>
                      <p className="text-[11px] font-mono text-[#767872]">{currentUser.email}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider bg-[#E8E6E0] text-[#1B1C1A] px-2 py-1 rounded-[2px]">
                    Auto-Filled Session
                  </span>
                </div>
              ) : (
                <div className="p-4 bg-[#FAF9F6] border border-[#E5E3DC] rounded-[4px] flex items-center justify-between text-xs">
                  <span className="text-[#767872]">
                    Have an Atelier private profile? Sign in to access your saved addresses.
                  </span>
                  <Link
                    href="/account"
                    className="font-mono text-xs uppercase text-[#1B1C1A] hover:underline font-semibold"
                  >
                    Sign In &rarr;
                  </Link>
                </div>
              )}

              {/* Customer Contact */}
              <div className="bg-white border border-[#E5E3DC] rounded-[4px] p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[#E5E3DC] pb-3">
                  <h2 className="font-serif-headline text-base font-semibold text-[#1B1C1A]">
                    1. Patron Contact Information
                  </h2>
                  {currentUser && (
                    <span className="text-[11px] font-mono text-[#1B3B2B] bg-[#E3EBE4] px-2 py-0.5 rounded-[2px]">
                      Verified Details
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#767872] mb-1">
                      Full Legal Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Raghav Sharma"
                      className="w-full p-2.5 border border-[#D6D3CA] rounded-[2px] text-xs bg-[#FAF9F6] text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#767872] mb-1">
                      Email Address (Invoice & Tracking) *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="raghav@atelier.in"
                      className="w-full p-2.5 border border-[#D6D3CA] rounded-[2px] text-xs bg-[#FAF9F6] text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#767872] mb-1">
                    Phone (Courier SMS & OTP) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full p-2.5 border border-[#D6D3CA] rounded-[2px] text-xs font-mono bg-[#FAF9F6] text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
                  />
                </div>
              </div>

              {/* Shipping Address */}
              <div className="bg-white border border-[#E5E3DC] rounded-[4px] p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[#E5E3DC] pb-3">
                  <h2 className="font-serif-headline text-base font-semibold text-[#1B1C1A]">
                    2. Shipping Destination
                  </h2>
                  {savedAddresses.length > 0 && (
                    <span className="text-[11px] font-mono text-[#767872]">
                      {savedAddresses.length} Saved {savedAddresses.length === 1 ? 'Address' : 'Addresses'}
                    </span>
                  )}
                </div>

                {/* Saved Address Selector (if client has saved addresses) */}
                {savedAddresses.length > 0 && (
                  <div className="space-y-3 pb-2">
                    <label className="block text-[11px] font-mono uppercase text-[#767872]">
                      Select Saved Shipping Address
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {savedAddresses.map((addr) => {
                        const isSelected = selectedAddressId === addr.id;
                        return (
                          <div
                            key={addr.id}
                            onClick={() => handleSelectAddressOption(addr.id)}
                            className={`p-3.5 border rounded-[4px] cursor-pointer transition-all ${
                              isSelected
                                ? 'border-[#1B1C1A] bg-[#FAF9F6] shadow-sm'
                                : 'border-[#E5E3DC] bg-white hover:border-[#B3B0A6]'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-xs text-[#1B1C1A] truncate">
                                {addr.name}
                              </span>
                              {addr.isDefault && (
                                <span className="text-[9px] font-mono uppercase bg-[#1B1C1A] text-white px-1.5 py-0.5 rounded-[2px]">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#767872] line-clamp-1">{addr.addressLine1}</p>
                            {addr.addressLine2 && (
                              <p className="text-[11px] text-[#767872] line-clamp-1">{addr.addressLine2}</p>
                            )}
                            <p className="text-[11px] font-mono text-[#767872] mt-1">
                              {addr.city}, {addr.state} - {addr.postalCode}
                            </p>
                            <div className="mt-2 flex items-center text-[10px] font-mono text-[#1B1C1A]">
                              <input
                                type="radio"
                                name="addressSelection"
                                checked={isSelected}
                                onChange={() => handleSelectAddressOption(addr.id)}
                                className="mr-1.5 accent-[#1B1C1A]"
                              />
                              <span>{isSelected ? 'Selected for Dispatch' : 'Use this Address'}</span>
                            </div>
                          </div>
                        );
                      })}

                      {/* Option to enter a fresh address */}
                      <div
                        onClick={() => handleSelectAddressOption('new')}
                        className={`p-3.5 border border-dashed rounded-[4px] cursor-pointer flex flex-col justify-center items-center text-center transition-all ${
                          selectedAddressId === 'new'
                            ? 'border-[#1B1C1A] bg-[#FAF9F6]'
                            : 'border-[#D6D3CA] hover:border-[#1B1C1A] bg-white'
                        }`}
                      >
                        <span className="font-mono text-sm text-[#1B1C1A] mb-1">+</span>
                        <span className="font-medium text-xs text-[#1B1C1A]">
                          Ship to Different Address
                        </span>
                        <span className="text-[10px] text-[#767872] mt-0.5">
                          Enter custom destination
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Address Form Inputs */}
                <div className="space-y-4 pt-2 border-t border-[#F0EFEB]">
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#767872] mb-1">
                      Street Address & House / Flat No. *
                    </label>
                    <input
                      type="text"
                      required
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      placeholder="44 Lodhi Estate, Suite 3B"
                      className="w-full p-2.5 border border-[#D6D3CA] rounded-[2px] text-xs bg-[#FAF9F6] text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#767872] mb-1">
                      Apartment, Building, Landmark (Optional)
                    </label>
                    <input
                      type="text"
                      value={addressLine2}
                      onChange={(e) => setAddressLine2(e.target.value)}
                      placeholder="Near Lodhi Gardens Gate 2"
                      className="w-full p-2.5 border border-[#D6D3CA] rounded-[2px] text-xs bg-[#FAF9F6] text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-[#767872] mb-1">
                        City *
                      </label>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full p-2.5 border border-[#D6D3CA] rounded-[2px] text-xs bg-[#FAF9F6] text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-[#767872] mb-1">
                        State *
                      </label>
                      <input
                        type="text"
                        required
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full p-2.5 border border-[#D6D3CA] rounded-[2px] text-xs bg-[#FAF9F6] text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-[#767872] mb-1">
                        PIN Code *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        className="w-full p-2.5 border border-[#D6D3CA] rounded-[2px] text-xs font-mono bg-[#FAF9F6] text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
                      />
                    </div>
                  </div>
                </div>

                {/* Save Address Options */}
                {currentUser && (
                  <div className="pt-3 border-t border-[#F0EFEB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={saveAddressForFuture}
                        onChange={(e) => setSaveAddressForFuture(e.target.checked)}
                        className="w-4 h-4 accent-[#1B1C1A] rounded-[2px]"
                      />
                      <span className="text-xs text-[#1B1C1A]">
                        Save this address to my profile for future commissions
                      </span>
                    </label>

                    {/* Explicit Save Address Button */}
                    <button
                      type="button"
                      onClick={handleSaveAddressExplicit}
                      disabled={isSavingAddress}
                      className="px-3 py-1.5 border border-[#1B1C1A] text-[#1B1C1A] text-[11px] font-mono uppercase tracking-wider rounded-[2px] hover:bg-[#1B1C1A] hover:text-white transition-colors disabled:opacity-50 self-start sm:self-auto"
                    >
                      {isSavingAddress ? 'Saving...' : 'Save to Address Book'}
                    </button>
                  </div>
                )}

                {saveAddressFeedback && (
                  <div className="p-2.5 bg-[#E3EBE4] border border-[#C5D6C7] text-[#1B3B2B] text-xs rounded-[2px]">
                    {saveAddressFeedback}
                  </div>
                )}
              </div>

              {/* Payment Gateway Info */}
              <div className="bg-[#FAF9F6] border border-[#E5E3DC] rounded-[4px] p-6 space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-semibold uppercase text-[#1B1C1A]">
                    Payment Partner: Razorpay India
                  </span>
                  <span className="px-1.5 py-0.5 rounded-[2px] bg-[#E3EBE4] text-[#1B3B2B] text-[10px] font-mono">
                    256-bit SSL Encrypted
                  </span>
                </div>
                <p className="text-xs text-[#767872]">
                  Supports UPI (Google Pay, PhonePe, Paytm), NetBanking across 50+ Indian banks, Visa/Mastercard/RuPay credit & debit cards, and EMI.
                </p>
              </div>
            </div>

            {/* Right Column: Order Review */}
            <div className="lg:col-span-5 bg-white border border-[#E5E3DC] rounded-[4px] p-6 space-y-6 sticky top-24">
              <h2 className="font-serif-headline text-base font-semibold text-[#1B1C1A] border-b border-[#E5E3DC] pb-3">
                Order Review ({totalCount} {totalCount === 1 ? 'Garment' : 'Garments'})
              </h2>

              {/* Items List */}
              <div className="divide-y divide-[#E5E3DC] max-h-64 overflow-y-auto pr-2 space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="pt-3 first:pt-0 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-12 h-14 object-cover rounded-[2px] bg-[#FAF9F6] border border-[#E5E3DC] flex-shrink-0"
                      />
                      <div>
                        <p className="font-medium text-xs text-[#1B1C1A] line-clamp-1">{item.title}</p>
                        <p className="font-mono text-[10px] text-[#767872]">
                          {item.size} / {item.colorName} &bull; Qty: {item.quantity}
                        </p>
                      </div>
                    </div>
                    <div className="font-mono text-xs text-[#1B1C1A]">
                      <PriceDisplay amountPaise={item.pricePaise * item.quantity} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Financial Breakdown */}
              <div className="border-t border-[#E5E3DC] pt-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#767872]">Subtotal:</span>
                  <PriceDisplay amountPaise={subtotalPaise} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#767872]">Nationwide Delivery:</span>
                  <span className="font-mono text-xs">
                    {isFreeShipping ? 'COMPLIMENTARY' : '₹150'}
                  </span>
                </div>
                {appliedCoupon && (
                  <div className="flex items-center justify-between text-[#1B3B2B] bg-[#F2F6F3] p-2 rounded-[2px] border border-[#C5E3CE]">
                    <span className="font-mono text-xs">Courtesy ({appliedCoupon}):</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold font-mono text-xs">-\u20B9{(discountPaise / 100).toFixed(2)}</span>
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="text-[10px] uppercase font-mono text-[#93000A] underline hover:no-underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
                <div className="border-t border-[#E5E3DC] pt-3 flex items-center justify-between font-semibold text-sm">
                  <span>Total Payable (INR):</span>
                  <PriceDisplay amountPaise={totalPaise} size="lg" />
                </div>
                <p className="text-[10px] font-mono text-[#767872]">
                  Includes 12% Goods & Services Tax (GST) &bull; Official Tax Invoice Issued
                </p>
              </div>

              {/* Courtesy Code Form */}
              <div className="border-t border-[#E5E3DC] pt-4 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Enter courtesy code..."
                    className="flex-1 p-2 bg-[#FAF9F6] border border-[#D6D3CA] rounded-[2px] text-xs font-mono uppercase focus:outline-none focus:border-[#1B1C1A]"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={isValidatingCoupon || !couponCode.trim()}
                    className="px-3 py-2 border border-[#1B1C1A] text-[#1B1C1A] text-xs font-mono uppercase tracking-wider rounded-[2px] hover:bg-[#1B1C1A] hover:text-white transition-colors disabled:opacity-40"
                  >
                    {isValidatingCoupon ? '...' : 'Apply'}
                  </button>
                </div>

                {couponFeedback && (
                  <p
                    className={`font-mono text-[11px] leading-tight ${
                      couponFeedback.type === 'success' ? 'text-[#1B3B2B]' : 'text-[#8A2B2B]'
                    }`}
                  >
                    {couponFeedback.message}
                  </p>
                )}

                {availableVouchers.length > 0 && (
                  <div className="pt-1">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-[#767872] block mb-1">
                      Available Privileges:
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
                              applyCouponCode(v.code, true);
                            }
                          }}
                          className={`font-mono text-[10px] px-2 py-0.5 border rounded-[2px] uppercase transition-colors ${
                            appliedCoupon === v.code
                              ? 'bg-[#1B1C1A] text-[#FAF9F6] border-[#1B1C1A]'
                              : 'bg-[#FAF9F6] text-[#464742] border-[#D6D3CA] hover:border-[#1B1C1A]'
                          }`}
                        >
                          {v.code}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Pay Button & Offline Guard */}
              {!isOnline && (
                <div className="p-3 bg-[#FAF9F6] border border-[#E5E3DC] rounded-[2px] text-[11px] font-mono text-[#767872] text-center">
                  Network unavailable &bull; Bag and shipping address preserved locally. Connect to finalize payment.
                </div>
              )}

              <button
                type="submit"
                disabled={isProcessing || !isOnline}
                className="w-full py-4 bg-[#1B1C1A] text-[#FAF9F6] text-xs font-mono uppercase tracking-widest rounded-[2px] hover:bg-[#333] transition-colors disabled:opacity-50"
              >
                {!isOnline
                  ? 'Offline: Reconnect to Finalize Commission'
                  : isProcessing
                  ? 'Connecting with Razorpay...'
                  : `Pay ₹${(totalPaise / 100).toLocaleString('en-IN')} via Razorpay`}
              </button>


              <div className="text-[10px] font-mono text-[#767872] space-y-1 text-center">
                <p>&bull; 15-day complimentary exchanges</p>
                <p>&bull; Insured dispatch via premium logistics partner</p>
              </div>
            </div>
          </form>
        )}

        {/* Razorpay Test Simulation Dialog (When test mode / placeholder keys active) */}
        {simulationData && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-[#E5E3DC] rounded-[4px] p-8 max-w-md w-full space-y-6 shadow-2xl">
              <div className="border-b border-[#E5E3DC] pb-4">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#767872]">
                  Razorpay Sandbox Simulator
                </span>
                <h3 className="font-serif-headline text-xl font-semibold text-[#1B1C1A] mt-1">
                  Complete Test Payment
                </h3>
                <p className="text-xs text-[#767872] mt-1">
                  Development simulation active for Order <span className="font-mono text-[#1B1C1A]">#{simulationData.orderNumber}</span>.
                </p>
              </div>

              <div className="p-4 bg-[#FAF9F6] border border-[#E5E3DC] rounded-[2px] space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-[#767872]">Order Total:</span>
                  <span className="font-semibold text-[#1B1C1A]">₹{(simulationData.amountPaise / 100).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#767872]">Razorpay Order ID:</span>
                  <span className="text-[#1B1C1A]">{simulationData.razorpayOrderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#767872]">Gateway Method:</span>
                  <span className="text-[#1B1C1A]">UPI / NetBanking</span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleCompleteSimulation}
                  disabled={isProcessing}
                  className="w-full py-3 bg-[#1B1C1A] text-[#FAF9F6] text-xs font-mono uppercase tracking-widest rounded-[2px] hover:bg-[#333] transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Verifying HMAC Signature...' : 'Authorize & Pay ₹' + (simulationData.amountPaise / 100).toLocaleString('en-IN')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSimulationData(null);
                    setIsProcessing(false);
                  }}
                  className="w-full py-2 border border-[#D6D3CA] text-[#767872] text-xs font-mono uppercase rounded-[2px] hover:text-[#1B1C1A]"
                >
                  Cancel Transaction
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
