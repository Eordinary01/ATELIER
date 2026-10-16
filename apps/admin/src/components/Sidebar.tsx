'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  { label: 'Overview', href: '/' },
  { label: 'Orders & Fulfillment', href: '/orders' },
  { label: 'Products', href: '/products' },
  { label: 'Categories', href: '/categories' },
  { label: 'Collections', href: '/collections' },
  { label: 'Coupons & Vouchers', href: '/coupons' },
  { label: 'New Product', href: '/products/new' },
  { label: 'CSV Ingestion', href: '/products/import' },
  { label: 'Inventory Matrix', href: '/inventory' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<{ email: string; role: string; firstName?: string } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('atelier_admin_user');
      if (stored) {
        setAdminUser(JSON.parse(stored));
      }
    } catch {
      // ignore JSON parse error
    }
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('atelier_admin_token');
    localStorage.removeItem('atelier_admin_user');
    router.replace('/login');
  };

  return (
    <aside className="w-64 border-r border-[#E5E3DC] bg-[#FAF9F6] min-h-screen flex flex-col justify-between p-6 shrink-0">
      <div>
        <div className="pb-8 border-b border-[#E5E3DC]">
          <span className="font-serif-headline text-xl tracking-[0.2em] font-semibold text-[#1B1C1A]">
            ATELIER
          </span>
          <p className="text-[10px] tracking-[0.15em] text-[#767872] uppercase mt-1 font-mono">
            Operations Studio
          </p>
        </div>

        <nav className="mt-8 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 text-xs tracking-wider uppercase transition-colors rounded-[2px] ${
                  isActive
                    ? 'bg-[#1B1C1A] text-[#FAF9F6] font-medium'
                    : 'text-[#464742] hover:bg-[#EAE8E3] hover:text-[#1B1C1A]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="pt-6 border-t border-[#E5E3DC] text-[11px] text-[#767872] space-y-3">
        {adminUser && (
          <div className="bg-[#EAE8E3] p-2.5 rounded-[2px] border border-[#D5D3CC]">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-wider text-[#1B1C1A] font-semibold">
                {adminUser.role.replace('admin_', '').toUpperCase()}
              </span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#1B3B2B]" />
            </div>
            <p className="font-mono text-[10px] text-[#464742] truncate mt-0.5">
              {adminUser.email}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span>Engine Status</span>
          <span className="font-mono text-[#1B3B2B] font-medium">LIVE</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Port</span>
          <span className="font-mono text-[#1B1C1A]">3001 : 4000</span>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="w-full mt-2 py-2 px-3 border border-[#1B1C1A] text-[#1B1C1A] hover:bg-[#1B1C1A] hover:text-[#FAF9F6] transition-colors font-mono text-[10px] tracking-wider uppercase text-center rounded-[2px]"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
