'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    // If on the login page, bypass authentication check
    if (pathname === '/login') {
      // If already logged in with admin token, redirect to dashboard
      const token = localStorage.getItem('atelier_admin_token');
      const userStr = localStorage.getItem('atelier_admin_user');
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.role && user.role.startsWith('admin_')) {
            router.replace('/');
            return;
          }
        } catch {
          // ignore
        }
      }
      setIsAuthorized(true);
      return;
    }

    // Guard all other routes
    const token = localStorage.getItem('atelier_admin_token');
    const userStr = localStorage.getItem('atelier_admin_user');

    if (!token || !userStr) {
      setIsAuthorized(false);
      router.replace('/login');
      return;
    }

    try {
      const user = JSON.parse(userStr);
      if (!user.role || !user.role.startsWith('admin_')) {
        localStorage.removeItem('atelier_admin_token');
        localStorage.removeItem('atelier_admin_user');
        setIsAuthorized(false);
        router.replace('/login');
        return;
      }
      setIsAuthorized(true);
    } catch {
      localStorage.removeItem('atelier_admin_token');
      localStorage.removeItem('atelier_admin_user');
      setIsAuthorized(false);
      router.replace('/login');
    }
  }, [pathname, router]);

  // Login page layout without sidebar
  if (pathname === '/login') {
    return <main className="min-h-screen bg-[#FAF9F6]">{children}</main>;
  }

  // Splash while checking credentials
  if (isAuthorized === null || !isAuthorized) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#FAF9F6] text-[#1B1C1A]">
        <span className="font-serif-headline text-2xl tracking-[0.25em] font-semibold">
          ATELIER
        </span>
        <p className="mt-2 text-[10px] tracking-[0.2em] uppercase font-mono text-[#767872]">
          Verifying Operations Clearance...
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#FAF9F6] w-full">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
