'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isExpired = searchParams.get('expired') === 'true';
  const returnUrl = searchParams.get('returnUrl');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getCleanReturnUrl = (url: string | null): string => {
    if (!url || !url.startsWith('/')) return '/account';
    try {
      const parsed = new URL(url, 'http://localhost');
      parsed.searchParams.delete('page');
      return parsed.pathname + (parsed.search ? parsed.search : '');
    } catch {
      return url;
    }
  };

  useEffect(() => {
    // If the user already has a valid token, redirect directly
    const token = localStorage.getItem('atelier_access_token');
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(decodeURIComponent(escape(atob(parts[1]!.replace(/-/g, '+').replace(/_/g, '/')))));
          if (payload.exp && payload.exp * 1000 > Date.now()) {
            router.push(getCleanReturnUrl(returnUrl));
          }
        }
      } catch {
        // Continue to login
      }
    }
  }, [router, returnUrl]);

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
        localStorage.setItem('atelier_user', JSON.stringify(json.data.user));
        localStorage.setItem('atelier_access_token', json.data.accessToken);

        // Fetch saved addresses to prepopulate checkout
        try {
          const addrRes = await fetch('http://localhost:4000/api/v1/auth/addresses', {
            headers: { Authorization: `Bearer ${json.data.accessToken}` },
          });
          const addrJson = await addrRes.json();
          if (addrJson.success && Array.isArray(addrJson.data)) {
            localStorage.setItem('atelier_saved_addresses', JSON.stringify(addrJson.data));
          }
        } catch {
          // Non-blocking
        }

        // Navigate back to clean destination or account dashboard
        window.location.href = getCleanReturnUrl(returnUrl);
      } else {
        setErrorMessage(json.error?.message || 'Invalid client credentials. Please verify your email and password.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to communicate with the authentication server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-12 py-12 md:py-20 flex flex-col items-center justify-center">
      <div className="w-full max-w-md bg-white border border-[#E5E3DC] rounded-[4px] p-6 sm:p-10 shadow-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 border-b border-[#E5E3DC] pb-6">
          <span className="font-mono text-[10px] sm:text-xs uppercase tracking-widest text-[#767872]">
            Client Portal Access
          </span>
          <h1 className="font-headline-lg text-2xl sm:text-3xl font-semibold text-[#1B1C1A] tracking-tight">
            Sign In to Atelier
          </h1>
          <p className="text-xs text-[#767872] max-w-xs mx-auto">
            Access your private wardrobe commissions, order tracking, and bespoke client book.
          </p>
        </div>

        {/* Expiration Notice Banner */}
        {isExpired && (
          <div className="p-3.5 bg-[#FAF9F6] border border-[#5A1827] rounded-[2px] flex items-start space-x-2.5">
            <span className="material-symbols-outlined text-[#5A1827] text-[18px] mt-0.5 flex-shrink-0">
              lock_clock
            </span>
            <div className="text-xs text-[#1B1C1A]">
              <span className="font-semibold block text-[#5A1827]">Session Expired</span>
              <span>Your security session has expired. Please sign in to resume your session.</span>
            </div>
          </div>
        )}

        {/* Error Notice */}
        {errorMessage && (
          <div className="p-3 bg-[#FFDAD6] border border-[#BA1A1A] text-[#93000A] text-xs rounded-[2px]">
            {errorMessage}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#1B1C1A] mb-1.5 font-medium">
              Client Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@atelier.in"
              className="w-full p-2.5 bg-[#FAF9F6] border border-[#D6D3CA] rounded-[2px] text-xs text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-[#1B1C1A] font-medium">
                Password
              </label>
              <Link
                href="/help"
                className="text-[11px] font-mono text-[#767872] hover:text-[#1B1C1A] hover:underline"
              >
                Need Assistance?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
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
            className="w-full py-3 bg-[#1B1C1A] text-[#FAF9F6] text-xs font-mono uppercase tracking-wider rounded-[2px] hover:bg-[#333] transition-colors disabled:opacity-50 mt-2"
          >
            {isSubmitting ? 'Authenticating Client...' : 'Sign In to Profile'}
          </button>
        </form>

        {/* Alternate Actions */}
        <div className="pt-4 border-t border-[#E5E3DC] flex flex-col space-y-3 text-center text-xs">
          <p className="text-[#767872]">
            New to Atelier?{' '}
            <Link
              href="/account?tab=register"
              className="font-medium text-[#1B1C1A] hover:text-[#5A1827] underline ml-1"
            >
              Create a Client Account
            </Link>
          </p>

          <Link
            href="/"
            className="text-[11px] font-mono text-[#767872] hover:text-[#1B1C1A] uppercase tracking-wider"
          >
            &larr; Return to Permanent Collection
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto py-24 text-center font-mono text-xs text-[#767872]">Loading client portal...</div>}>
      <LoginFormContent />
    </Suspense>
  );
}
