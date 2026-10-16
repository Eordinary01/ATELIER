import type { Metadata } from 'next';
import './globals.css';
import { AdminShell } from '../components/AdminShell';

export const metadata: Metadata = {
  title: 'Operations Studio | Atelier Editorial Commerce',
  description: 'Enterprise catalog and fulfillment management system',
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
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#FAF9F6]">
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
