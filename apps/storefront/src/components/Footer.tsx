'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchStorefrontApi } from '../lib/api';

interface DynamicCollection {
  id: string;
  name: string;
  slug: string;
  itemCount?: number;
}

export function Footer() {
  const [collections, setCollections] = useState<DynamicCollection[]>([]);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [newsletterFeedback, setNewsletterFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleNewsletterSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newsletterEmail.trim();
    if (!cleanEmail) return;

    setIsSubscribing(true);
    setNewsletterFeedback(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/api/v1/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const json = await res.json();
      if (json.success) {
        setNewsletterFeedback({
          type: 'success',
          message: json.data?.message || 'Registry membership confirmed. Welcome dispatch transmitted.',
        });
        setNewsletterEmail('');
        try {
          localStorage.setItem('atelier_newsletter_subscribed', 'true');
          localStorage.setItem('atelier_newsletter_email', cleanEmail);
        } catch {
          // ignore
        }
        setIsRegistered(true);
        setRegisteredEmail(cleanEmail);
      } else {
        setNewsletterFeedback({
          type: 'error',
          message: json.error?.message || 'Failed to enroll in registry.',
        });
      }
    } catch {
      setNewsletterFeedback({
        type: 'error',
        message: 'Network issue. Please retry enrollment.',
      });
    } finally {
      setIsSubscribing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function loadCollections() {
      try {
        const res = await fetchStorefrontApi<DynamicCollection[]>('/api/v1/collections');
        if (isMounted && res.success && Array.isArray(res.data) && res.data.length > 0) {
          setCollections(res.data);
        }
      } catch {
        // Fallback retained
      }
    }
    loadCollections();

    // Check if user is already enrolled in the registry
    try {
      const isSub = localStorage.getItem('atelier_newsletter_subscribed');
      const savedEmail = localStorage.getItem('atelier_newsletter_email');
      if (isSub === 'true' && savedEmail) {
        setIsRegistered(true);
        setRegisteredEmail(savedEmail);
      }
    } catch {
      // ignore
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const displayCollections =
    collections.length > 0
      ? collections
      : [
          { id: 'c1', name: 'Permanent Core', slug: 'permanent-core' },
          { id: 'c2', name: 'Summer Archive', slug: 'summer-archive' },
          { id: 'c3', name: 'Winter Solstice', slug: 'winter-solstice' },
          { id: 'c4', name: 'Architectural Linen', slug: 'architectural-linen' },
        ];

  return (
    <footer className="w-full bg-[#1B1C1A] text-[#FAF9F6] border-t border-[#333]">
      {/* Brand Manifesto & Newsletter Section */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-12 py-10 sm:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12">
        <div className="lg:col-span-5 space-y-3 sm:space-y-4">
          <div className="font-headline-sm text-xl sm:text-2xl tracking-widest font-semibold uppercase">
            ATELIER
          </div>
          <p className="text-xs text-[#C7C7C0] leading-relaxed max-w-md">
            Architectural tailoring and permanent garments designed in New Delhi. Every piece is constructed with single-origin natural fibers, engineered proportions, and strict GST-compliant traceability.
          </p>
          <div className="pt-2 text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-[#767872]">
            Series 2025 &bull; Volume 04 &bull; Made in India
          </div>
        </div>

        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-6 sm:gap-8">
          <div>
            <h4 className="font-mono text-xs uppercase tracking-wider text-[#FAF9F6] font-semibold mb-3 sm:mb-4">
              Collections
            </h4>
            <ul className="space-y-2 sm:space-y-2.5 text-xs text-[#C7C7C0]">
              {displayCollections.map((col) => (
                <li key={col.id}>
                  <Link
                    href={`/?collection=${encodeURIComponent(col.name)}`}
                    className="hover:text-white transition-colors"
                  >
                    {col.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-mono text-xs uppercase tracking-wider text-[#FAF9F6] font-semibold mb-3 sm:mb-4">
              Concierge
            </h4>
            <ul className="space-y-2 sm:space-y-2.5 text-xs text-[#C7C7C0]">
              <li>
                <Link href="/help" className="hover:text-white transition-colors">
                  Tailoring & Sizing Guide
                </Link>
              </li>
              <li>
                <Link href="/track-order" className="hover:text-white transition-colors">
                  Airway Bill (AWB) Tracking
                </Link>
              </li>
              <li>
                <Link href="/track-order" className="hover:text-white transition-colors">
                  Exchanges & Alterations
                </Link>
              </li>
            </ul>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <h4 className="font-mono text-xs uppercase tracking-wider text-[#FAF9F6] font-semibold mb-3 sm:mb-4">
              Registry Newsletter
            </h4>
            <p className="text-xs text-[#C7C7C0] mb-3">
              Receive notification of limited batch milling and seasonal cuts.
            </p>
            {isRegistered ? (
              <div className="bg-[#242524] border border-[#3E403C] p-4 rounded-[2px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#85E0A3] font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#85E0A3]" />
                    Already Registered
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-[#767872]">
                    Registry Active
                  </span>
                </div>
                <p className="font-mono text-xs text-white truncate font-medium">
                  {registeredEmail}
                </p>
                <p className="text-[10px] text-[#A8A7A1] font-mono leading-relaxed">
                  You are enrolled in the Atelier Registry. Welcome dispatch confirmed. Priority notifications for seasonal cuts and milling runs are active.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistered(false);
                    try {
                      localStorage.removeItem('atelier_newsletter_subscribed');
                    } catch {
                      // ignore
                    }
                  }}
                  className="text-[10px] font-mono text-[#767872] hover:text-white underline pt-1 block"
                >
                  Inscribe different address &rarr;
                </button>
              </div>
            ) : (
              <>
                <form onSubmit={handleNewsletterSubscribe} className="space-y-2">
                  <input
                    type="email"
                    required
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="client@address.in"
                    className="w-full p-2.5 sm:p-2 bg-[#2A2B2A] border border-[#444] rounded-[2px] text-xs text-white placeholder:text-[#767872] focus:outline-none focus:border-white"
                  />
                  <button
                    type="submit"
                    disabled={isSubscribing || !newsletterEmail.trim()}
                    className="w-full py-2.5 sm:py-2 bg-[#FAF9F6] text-[#1B1C1A] text-[11px] font-mono uppercase tracking-wider rounded-[2px] hover:bg-white transition-colors disabled:opacity-50"
                  >
                    {isSubscribing ? 'Inscribing...' : 'Join Registry'}
                  </button>
                </form>
                {newsletterFeedback && (
                  <p
                    className={`font-mono text-[10px] mt-2 ${
                      newsletterFeedback.type === 'success' ? 'text-[#85E0A3]' : 'text-[#FF8A8A]'
                    }`}
                  >
                    {newsletterFeedback.message}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Legal Strip */}
      <div className="border-t border-[#333] py-6 px-4 sm:px-6 md:px-12 text-[10px] sm:text-[11px] font-mono text-[#767872] flex flex-col sm:flex-row items-center justify-between gap-4 max-w-[1440px] mx-auto text-center sm:text-left">
        <div>
          &copy; {new Date().getFullYear()} ATELIER COMMERCE IN. All rights reserved. GSTIN Compliant.
        </div>
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-4 sm:gap-6">
          <Link href="/privacy" className="hover:text-white transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-white transition-colors">
            Terms of Purchase
          </Link>
          <Link href="/shipping" className="hover:text-white transition-colors">
            Nationwide Logistics Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
