'use client';

import { useState } from 'react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setErrorMessage(json.error?.message || 'Authentication failed. Please verify credentials.');
        setLoading(false);
        return;
      }

      const { user, accessToken } = json.data;
      if (!user.role || !user.role.startsWith('admin_')) {
        setErrorMessage('Access Restricted: Administrative credentials required to access Operations Studio.');
        setLoading(false);
        return;
      }

      // Store admin session tokens
      localStorage.setItem('atelier_admin_token', accessToken);
      localStorage.setItem('atelier_admin_user', JSON.stringify(user));

      // Route to dashboard
      window.location.href = '/';
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to establish connection with authentication service.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col justify-between p-8 sm:p-12">
      {/* Top Header */}
      <header className="flex items-center justify-between border-b border-[#E5E3DC] pb-6">
        <div>
          <span className="font-serif-headline text-2xl tracking-[0.25em] font-semibold text-[#1B1C1A]">
            ATELIER
          </span>
          <p className="text-[10px] tracking-[0.2em] uppercase font-mono text-[#767872] mt-1">
            Operations Studio Gated Gateway
          </p>
        </div>
        <div className="font-mono text-[11px] text-[#767872]">
          PORT <span className="text-[#1B1C1A] font-bold">3001</span>
        </div>
      </header>

      {/* Center Auth Card */}
      <main className="flex-1 flex items-center justify-center my-12">
        <div className="w-full max-w-md bg-[#FAF9F6] border border-[#1B1C1A] p-8 sm:p-10 shadow-[4px_4px_0px_0px_#1B1C1A]">
          <div className="mb-8">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#767872] block mb-1">
              Secure Terminal 01
            </span>
            <h1 className="font-serif-headline text-2xl font-normal text-[#1B1C1A] tracking-wide">
              Administrator Clearance
            </h1>
            <p className="text-xs text-[#464742] mt-2 font-mono leading-relaxed">
              Authenticate with administrative credentials to access catalog curation, inventory, coupons, and fulfillment streams.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 p-3 bg-[#FAF0F0] border-l-2 border-[#8A2B2B] text-[#8A2B2B] font-mono text-[11px] leading-relaxed">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="admin-email"
                className="block font-mono text-[11px] tracking-wider uppercase text-[#1B1C1A] mb-1.5"
              >
                Official Email
              </label>
              <input
                id="admin-email"
                type="email"
                required
                autoComplete="email"
                placeholder="admin@atelier.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#D5D3CC] focus:border-[#1B1C1A] px-3.5 py-2.5 font-mono text-xs text-[#1B1C1A] outline-none rounded-[2px] transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block font-mono text-[11px] tracking-wider uppercase text-[#1B1C1A] mb-1.5"
              >
                Access Cipher / Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#D5D3CC] focus:border-[#1B1C1A] px-3.5 py-2.5 pr-10 font-mono text-xs text-[#1B1C1A] outline-none rounded-[2px] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password cipher' : 'Show password cipher'}
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
              disabled={loading}
              className="w-full bg-[#1B1C1A] text-[#FAF9F6] py-3 px-4 font-mono text-xs uppercase tracking-[0.2em] font-medium hover:bg-[#333530] transition-colors rounded-[2px] disabled:opacity-50 mt-2"
            >
              {loading ? 'Authenticating...' : 'Authorize Terminal \u2192'}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5E3DC] pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-[#767872]">
        <div>ATELIER COMMERCE ENCLAVE \ PORT 3001</div>
        <div className="mt-2 sm:mt-0">ENCRYPTED ARBITRAGE PROTOCOL 2026</div>
      </footer>
    </div>
  );
}
