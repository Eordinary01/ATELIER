'use client';

import { useState, useEffect } from 'react';
import { Header } from '../../components/Header';
import { fetchAdminApi } from '../../lib/api';

interface CouponRow {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderValuePaise: number;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [subscriberCount, setSubscriberCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New coupon form state
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [minOrderRupees, setMinOrderRupees] = useState<number>(1999);
  const [usageLimit, setUsageLimit] = useState<string>('500');
  const [expiresAt, setExpiresAt] = useState<string>('');

  // Broadcast form state
  const [broadcastSubject, setBroadcastSubject] = useState('Privileged Access: Series 04 Garments');
  const [broadcastHeadline, setBroadcastHeadline] = useState('New Commission Series Now Available');
  const [broadcastBody, setBroadcastBody] = useState('We are pleased to introduce the latest architectural silhouettes crafted in our Antwerp workshop. Courtesy vouchers may be applied upon checkout.');
  const [broadcastCtaText, setBroadcastCtaText] = useState('Explore Permanent Archive \u2192');
  const [broadcastCtaUrl, setBroadcastCtaUrl] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [resCoupons, resSubs] = await Promise.all([
        fetchAdminApi<CouponRow[]>('/api/v1/admin/coupons'),
        fetchAdminApi<{ totalCount: number }>('/api/v1/admin/newsletter/subscribers'),
      ]);

      if (resCoupons.success && resCoupons.data) {
        setCoupons(resCoupons.data);
      }
      if (resSubs.success && resSubs.data) {
        setSubscriberCount(resSubs.data.totalCount);
      }
    } catch (err) {
      console.error('Failed to load coupons or subscribers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setIsSubmitting(true);
    setFeedbackMsg(null);

    try {
      const val = discountType === 'percentage' 
        ? discountValue 
        : Math.round(discountValue * 100); // convert rupees to paise for fixed

      const res = await fetchAdminApi('/api/v1/admin/coupons', {
        method: 'POST',
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          discountType,
          discountValue: val,
          minOrderValuePaise: Math.round((minOrderRupees || 0) * 100),
          usageLimit: usageLimit.trim() ? parseInt(usageLimit, 10) : null,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          isActive: true,
        }),
      });

      if (res.success) {
        setShowAddModal(false);
        setCode('');
        setDiscountType('percentage');
        setDiscountValue(10);
        setMinOrderRupees(1999);
        setUsageLimit('500');
        setExpiresAt('');
        setFeedbackMsg({ type: 'success', text: 'Courtesy voucher registered successfully.' });
        await loadData();
      } else {
        setFeedbackMsg({ type: 'error', text: res.error?.message || 'Failed to create coupon.' });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Error occurred while saving.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetchAdminApi(`/api/v1/admin/coupons/${id}/toggle`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (res.success) {
        setCoupons((prev) =>
          prev.map((c) => (c.id === id ? { ...c, isActive: !currentStatus } : c))
        );
      }
    } catch (err) {
      console.error('Failed to toggle coupon status:', err);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!window.confirm('Revoke this courtesy voucher permanently?')) return;
    try {
      const res = await fetchAdminApi(`/api/v1/admin/coupons/${id}`, {
        method: 'DELETE',
      });
      if (res.success) {
        setCoupons((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete coupon:', err);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastSubject || !broadcastHeadline || !broadcastBody) return;

    setIsSubmitting(true);
    setFeedbackMsg(null);

    try {
      const res = await fetchAdminApi<{ sentCount: number; message: string }>('/api/v1/admin/newsletter/broadcast', {
        method: 'POST',
        body: JSON.stringify({
          subject: broadcastSubject,
          headline: broadcastHeadline,
          bodyText: broadcastBody,
          ctaText: broadcastCtaText,
          ctaUrl: broadcastCtaUrl || undefined,
        }),
      });

      if (res.success) {
        setShowBroadcastModal(false);
        setFeedbackMsg({
          type: 'success',
          text: res.data?.message || 'Registry announcement broadcast dispatched.',
        });
      } else {
        setFeedbackMsg({
          type: 'error',
          text: res.error?.message || 'Broadcast transmission failed.',
        });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Network error on broadcast.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDiscount = (type: string, val: number) => {
    if (type === 'percentage') return `${val}% OFF`;
    return `\u20B9${(val / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })} OFF`;
  };

  const totalRedemptions = coupons.reduce((sum, c) => sum + (c.usedCount || 0), 0);
  const activeCount = coupons.filter((c) => c.isActive).length;

  return (
    <div className="flex-1 bg-[#FAF9F6] pb-24">
      <Header title="Promotions & Courtesy Vouchers" />

      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {feedbackMsg && (
          <div
            className={`p-4 font-mono text-xs border-l-2 ${
              feedbackMsg.type === 'success'
                ? 'bg-[#F2F6F3] border-[#1B3B2B] text-[#1B3B2B]'
                : 'bg-[#FAF0F0] border-[#8A2B2B] text-[#8A2B2B]'
            }`}
          >
            {feedbackMsg.text}
          </div>
        )}

        {/* Overview Metric Strips */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#FFFFFF] p-5 border border-[#E5E3DC] rounded-[2px]">
            <p className="font-mono text-[10px] text-[#767872] uppercase tracking-wider">
              Total Vouchers
            </p>
            <p className="font-serif-headline text-2xl text-[#1B1C1A] mt-1">
              {coupons.length}
            </p>
          </div>
          <div className="bg-[#FFFFFF] p-5 border border-[#E5E3DC] rounded-[2px]">
            <p className="font-mono text-[10px] text-[#767872] uppercase tracking-wider">
              Active Vouchers
            </p>
            <p className="font-serif-headline text-2xl text-[#1B3B2B] mt-1">
              {activeCount}
            </p>
          </div>
          <div className="bg-[#FFFFFF] p-5 border border-[#E5E3DC] rounded-[2px]">
            <p className="font-mono text-[10px] text-[#767872] uppercase tracking-wider">
              Total Redemptions
            </p>
            <p className="font-serif-headline text-2xl text-[#1B1C1A] mt-1">
              {totalRedemptions}
            </p>
          </div>
          <div className="bg-[#FFFFFF] p-5 border border-[#E5E3DC] rounded-[2px]">
            <p className="font-mono text-[10px] text-[#767872] uppercase tracking-wider">
              Newsletter Registry
            </p>
            <p className="font-serif-headline text-2xl text-[#1B1C1A] mt-1">
              {subscriberCount} <span className="text-xs font-mono font-normal text-[#767872]">Patrons</span>
            </p>
          </div>
        </div>

        {/* Action Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E5E3DC] pb-4">
          <div>
            <h2 className="font-serif-headline text-xl text-[#1B1C1A]">Voucher Master List</h2>
            <p className="font-mono text-xs text-[#767872] mt-0.5">
              Manage client privilege codes and reward rules applied at commission bag and checkout.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowBroadcastModal(true)}
              className="px-4 py-2 bg-[#EAE8E3] text-[#1B1C1A] hover:bg-[#DEDCD5] border border-[#D5D3CC] font-mono text-xs uppercase tracking-wider rounded-[2px] transition-colors"
            >
              Broadcast Announcement
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-[#1B1C1A] text-[#FAF9F6] hover:bg-[#333530] font-mono text-xs uppercase tracking-wider rounded-[2px] transition-colors"
            >
              + Issue New Voucher
            </button>
          </div>
        </div>

        {/* Coupons Table */}
        <div className="bg-[#FFFFFF] border border-[#E5E3DC] rounded-[2px] overflow-hidden">
          {loading ? (
            <div className="p-12 text-center font-mono text-xs text-[#767872]">
              Loading promotion index...
            </div>
          ) : coupons.length === 0 ? (
            <div className="p-12 text-center">
              <p className="font-serif-headline text-lg text-[#1B1C1A]">No Courtesy Vouchers Defined</p>
              <p className="font-mono text-xs text-[#767872] mt-1">
                Create your first coupon code to offer discounts to atelier patrons.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E3DC] bg-[#FAF9F6] font-mono text-[10px] text-[#767872] uppercase tracking-wider">
                    <th className="py-3 px-4">Voucher Code</th>
                    <th className="py-3 px-4">Discount Value</th>
                    <th className="py-3 px-4">Minimum Spend</th>
                    <th className="py-3 px-4">Redemptions</th>
                    <th className="py-3 px-4">Expiry</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E3DC] font-mono text-xs text-[#1B1C1A]">
                  {coupons.map((coupon) => (
                    <tr key={coupon.id} className="hover:bg-[#FAF9F6] transition-colors">
                      <td className="py-3.5 px-4 font-bold tracking-widest">
                        {coupon.code}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-[#1B3B2B]">
                        {formatDiscount(coupon.discountType, coupon.discountValue)}
                      </td>
                      <td className="py-3.5 px-4 text-[#464742]">
                        {coupon.minOrderValuePaise > 0
                          ? `\u20B9${(coupon.minOrderValuePaise / 100).toLocaleString('en-IN')}`
                          : 'No Minimum'}
                      </td>
                      <td className="py-3.5 px-4 text-[#464742]">
                        {coupon.usedCount} / {coupon.usageLimit ?? '\u221E'}
                      </td>
                      <td className="py-3.5 px-4 text-[#767872] text-[11px]">
                        {coupon.expiresAt
                          ? new Date(coupon.expiresAt).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Perpetual'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 text-[9px] uppercase tracking-wider font-semibold rounded-[2px] ${
                            coupon.isActive
                              ? 'bg-[#EBF5EE] text-[#1B3B2B] border border-[#C5E3CE]'
                              : 'bg-[#FAF0F0] text-[#8A2B2B] border border-[#F0D0D0]'
                          }`}
                        >
                          {coupon.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleToggleActive(coupon.id, coupon.isActive)}
                          className="px-2 py-1 text-[10px] uppercase font-mono tracking-wider border border-[#D5D3CC] hover:bg-[#EAE8E3] rounded-[2px] transition-colors"
                        >
                          {coupon.isActive ? 'Suspend' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDeleteCoupon(coupon.id)}
                          className="px-2 py-1 text-[10px] uppercase font-mono tracking-wider text-[#8A2B2B] border border-[#F0D0D0] hover:bg-[#FAF0F0] rounded-[2px] transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* CREATE COUPON MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-[#FAF9F6] border border-[#1B1C1A] w-full max-w-lg p-6 sm:p-8 rounded-[2px] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E5E3DC] pb-4 mb-6">
              <h3 className="font-serif-headline text-xl text-[#1B1C1A]">
                Issue Courtesy Voucher
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#767872] hover:text-[#1B1C1A] font-mono text-sm"
              >
                [X]
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4">
              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-[#1B1C1A] mb-1">
                  Voucher Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FESTIVE20"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full bg-[#FFFFFF] border border-[#D5D3CC] px-3 py-2 font-mono text-xs uppercase tracking-widest text-[#1B1C1A] outline-none rounded-[2px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-[#1B1C1A] mb-1">
                    Discount Model
                  </label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="w-full bg-[#FFFFFF] border border-[#D5D3CC] px-3 py-2 font-mono text-xs text-[#1B1C1A] outline-none rounded-[2px]"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (\u20B9)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-[#1B1C1A] mb-1">
                    Value {discountType === 'percentage' ? '(%)' : '(\u20B9)'} *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={discountType === 'percentage' ? 100 : 100000}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#FFFFFF] border border-[#D5D3CC] px-3 py-2 font-mono text-xs text-[#1B1C1A] outline-none rounded-[2px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-[#1B1C1A] mb-1">
                    Min Order Spend (\u20B9)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={minOrderRupees}
                    onChange={(e) => setMinOrderRupees(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#FFFFFF] border border-[#D5D3CC] px-3 py-2 font-mono text-xs text-[#1B1C1A] outline-none rounded-[2px]"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-[#1B1C1A] mb-1">
                    Usage Limit (Redemptions)
                  </label>
                  <input
                    type="number"
                    min={1}
                    placeholder="Unlimited"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#D5D3CC] px-3 py-2 font-mono text-xs text-[#1B1C1A] outline-none rounded-[2px]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-[#1B1C1A] mb-1">
                  Expiration Date (Optional)
                </label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#D5D3CC] px-3 py-2 font-mono text-xs text-[#1B1C1A] outline-none rounded-[2px]"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-[#E5E3DC]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-[#D5D3CC] font-mono text-xs uppercase tracking-wider text-[#464742] rounded-[2px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#1B1C1A] text-[#FAF9F6] font-mono text-xs uppercase tracking-wider rounded-[2px] disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Confirm Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BROADCAST NEWSLETTER MODAL */}
      {showBroadcastModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-[#FAF9F6] border border-[#1B1C1A] w-full max-w-lg p-6 sm:p-8 rounded-[2px] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E5E3DC] pb-4 mb-6">
              <div>
                <h3 className="font-serif-headline text-xl text-[#1B1C1A]">
                  Registry Broadcast Terminal
                </h3>
                <p className="font-mono text-[10px] text-[#767872] uppercase tracking-wider mt-0.5">
                  Direct Dispatch to {subscriberCount} Active Patrons via Brevo
                </p>
              </div>
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="text-[#767872] hover:text-[#1B1C1A] font-mono text-sm"
              >
                [X]
              </button>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span className="font-mono text-[10px] uppercase text-[#767872]">Presets:</span>
              <button
                type="button"
                onClick={() => {
                  setBroadcastSubject('Welcome to the Atelier Registry | Series 04');
                  setBroadcastHeadline('Confirmed: Atelier Registry Subscription');
                  setBroadcastBody('Salutations, You are enrolled in the private Atelier Registry. You will receive private dispatches regarding limited milling runs, archival releases, and bespoke tailoring appointments.');
                  setBroadcastCtaText('Explore Permanent Archive \u2192');
                  setBroadcastCtaUrl('http://localhost:3000/catalog');
                }}
                className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider bg-[#EAE8E3] hover:bg-[#DEDCD5] border border-[#D5D3CC] rounded-[2px]"
              >
                Welcome Dispatch
              </button>
              <button
                type="button"
                onClick={() => {
                  setBroadcastSubject('Privileged Access: Series 04 Garments');
                  setBroadcastHeadline('New Commission Series Now Available');
                  setBroadcastBody('We are pleased to introduce the latest architectural silhouettes crafted in our Antwerp workshop. Courtesy vouchers may be applied upon checkout.');
                  setBroadcastCtaText('Explore Permanent Archive \u2192');
                  setBroadcastCtaUrl('http://localhost:3000/catalog');
                }}
                className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider bg-[#EAE8E3] hover:bg-[#DEDCD5] border border-[#D5D3CC] rounded-[2px]"
              >
                New Collection
              </button>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-4">
              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-[#1B1C1A] mb-1">
                  Email Subject Line *
                </label>
                <input
                  type="text"
                  required
                  value={broadcastSubject}
                  onChange={(e) => setBroadcastSubject(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#D5D3CC] px-3 py-2 font-mono text-xs text-[#1B1C1A] outline-none rounded-[2px]"
                />
              </div>

              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-[#1B1C1A] mb-1">
                  Editorial Headline *
                </label>
                <input
                  type="text"
                  required
                  value={broadcastHeadline}
                  onChange={(e) => setBroadcastHeadline(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#D5D3CC] px-3 py-2 font-serif-headline text-sm text-[#1B1C1A] outline-none rounded-[2px]"
                />
              </div>

              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-[#1B1C1A] mb-1">
                  Announcement Narrative *
                </label>
                <textarea
                  rows={4}
                  required
                  value={broadcastBody}
                  onChange={(e) => setBroadcastBody(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#D5D3CC] p-3 font-mono text-xs text-[#1B1C1A] outline-none rounded-[2px] leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-[#1B1C1A] mb-1">
                    CTA Button Label
                  </label>
                  <input
                    type="text"
                    value={broadcastCtaText}
                    onChange={(e) => setBroadcastCtaText(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#D5D3CC] px-3 py-2 font-mono text-xs text-[#1B1C1A] outline-none rounded-[2px]"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-[#1B1C1A] mb-1">
                    Target URL (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="http://localhost:3000/catalog"
                    value={broadcastCtaUrl}
                    onChange={(e) => setBroadcastCtaUrl(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#D5D3CC] px-3 py-2 font-mono text-xs text-[#1B1C1A] outline-none rounded-[2px]"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-[#E5E3DC]">
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  className="px-4 py-2 border border-[#D5D3CC] font-mono text-xs uppercase tracking-wider text-[#464742] rounded-[2px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#1B1C1A] text-[#FAF9F6] font-mono text-xs uppercase tracking-wider rounded-[2px] disabled:opacity-50"
                >
                  {isSubmitting ? 'Transmitting...' : 'Dispatch Broadcast \u2192'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
