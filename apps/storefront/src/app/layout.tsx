import type { Metadata } from 'next';
import './globals.css';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { CartDrawer } from '../components/CartDrawer';
import { FloatingCouponBanner } from '../components/FloatingCouponBanner';
import { AuthWatcher } from '../components/AuthWatcher';
import { ServiceWorkerRegister } from '../components/ServiceWorkerRegister';
import { EditorialCurtain } from '../components/EditorialCurtain';
import { CartProvider } from '../context/CartContext';
import { WishlistProvider } from '../context/WishlistContext';

export const metadata: Metadata = {
  title: 'ATELIER | Permanent Haute Couture & Wardrobe Architecture',
  description:
    'Editorial apparel and bespoke wardrobe essentials constructed in New Delhi. Architectural silhouettes made from single-origin natural fibers.',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="bg-[#FAF9F6] text-[#1B1C1A] min-h-screen flex flex-col antialiased">
        <EditorialCurtain />
        <CartProvider>
          <WishlistProvider>
            <ServiceWorkerRegister />
            <AuthWatcher />
            <Header />
            <CartDrawer />
            <FloatingCouponBanner />
            <main className="flex-1 pt-28">
              {children}
            </main>
            <Footer />
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}


