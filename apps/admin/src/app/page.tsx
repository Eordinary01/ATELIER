import Link from 'next/link';
import { Header } from '../components/Header';
import { fetchAdminApi } from '../lib/api';
import { AdminOverviewMetrics } from '@atelier/contract';

export default async function AdminDashboardPage() {
  const [metricsRes, integrationsRes] = await Promise.all([
    fetchAdminApi<AdminOverviewMetrics>('/api/v1/admin/metrics'),
    fetchAdminApi<{ cloudinary: { configured: boolean }; brevo: { configured: boolean } }>(
      '/api/v1/admin/integrations/status'
    ),
  ]);

  const metrics = metricsRes.data || {
    todayNetRevenuePaise: 0,
    todayOrderCount: 0,
    unitsDispatchedToday: 0,
    pendingFulfillmentCount: 0,
    lowStockItemsCount: 0,
    activeReturnRequestsCount: 0,
  };

  const integrations = integrationsRes.data || {
    cloudinary: { configured: false },
    brevo: { configured: false },
  };

  const revenueFormatted = `₹${(metrics.todayNetRevenuePaise / 100).toLocaleString('en-IN')}`;

  return (
    <>
      <Header title="Operations Overview" />
      <div className="p-8 space-y-8 max-w-7xl">
        {/* Metric Grid - All Clickable */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/orders"
            className="p-6 bg-white border border-[#E5E3DC] rounded-[4px] hover:border-[#1B1C1A] transition-all hover:shadow-sm group block"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-mono uppercase tracking-wider text-[#767872] group-hover:text-[#1B1C1A]">
                Today Net Revenue
              </p>
              <span className="text-[10px] font-mono text-[#767872] opacity-0 group-hover:opacity-100 transition-opacity">
                View &rarr;
              </span>
            </div>
            <p className="text-3xl font-serif-headline mt-2 text-[#1B1C1A] tabular-nums">
              {revenueFormatted}
            </p>
            <p className="text-[11px] text-[#767872] mt-2">
              Across settled order transactions
            </p>
          </Link>

          <Link
            href="/orders"
            className="p-6 bg-white border border-[#E5E3DC] rounded-[4px] hover:border-[#1B1C1A] transition-all hover:shadow-sm group block"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-mono uppercase tracking-wider text-[#767872] group-hover:text-[#1B1C1A]">
                Orders Today
              </p>
              <span className="text-[10px] font-mono text-[#767872] opacity-0 group-hover:opacity-100 transition-opacity">
                View &rarr;
              </span>
            </div>
            <p className="text-3xl font-serif-headline mt-2 text-[#1B1C1A] tabular-nums">
              {metrics.todayOrderCount}
            </p>
            <p className="text-[11px] text-[#767872] mt-2">
              Orders created in current cycle
            </p>
          </Link>

          <Link
            href="/orders?status=shipped"
            className="p-6 bg-white border border-[#E5E3DC] rounded-[4px] hover:border-[#1B1C1A] transition-all hover:shadow-sm group block"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-mono uppercase tracking-wider text-[#767872] group-hover:text-[#1B1C1A]">
                Units Dispatched
              </p>
              <span className="text-[10px] font-mono text-[#767872] opacity-0 group-hover:opacity-100 transition-opacity">
                View &rarr;
              </span>
            </div>
            <p className="text-3xl font-serif-headline mt-2 text-[#1B1C1A] tabular-nums">
              {metrics.unitsDispatchedToday}
            </p>
            <p className="text-[11px] text-[#767872] mt-2">
              Handed over to carrier partners
            </p>
          </Link>

          <Link
            href="/orders?status=confirmed"
            className="p-6 bg-white border border-[#E5E3DC] rounded-[4px] hover:border-[#1B1C1A] transition-all hover:shadow-sm group block"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-mono uppercase tracking-wider text-[#767872] group-hover:text-[#1B1C1A]">
                Pending Fulfillment
              </p>
              <span className="text-[10px] font-mono text-[#767872] opacity-0 group-hover:opacity-100 transition-opacity">
                View &rarr;
              </span>
            </div>
            <p className="text-3xl font-serif-headline mt-2 text-[#1B1C1A] tabular-nums">
              {metrics.pendingFulfillmentCount}
            </p>
            <p className="text-[11px] text-[#767872] mt-2">
              Awaiting packing and label dispatch
            </p>
          </Link>

          <Link
            href="/inventory"
            className="p-6 bg-white border border-[#E5E3DC] rounded-[4px] hover:border-[#1B1C1A] transition-all hover:shadow-sm group block"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-mono uppercase tracking-wider text-[#767872] group-hover:text-[#1B1C1A]">
                Low Stock Alerts
              </p>
              <span className="text-[10px] font-mono text-[#767872] opacity-0 group-hover:opacity-100 transition-opacity">
                Inventory &rarr;
              </span>
            </div>
            <p className={`text-3xl font-serif-headline mt-2 tabular-nums ${metrics.lowStockItemsCount > 0 ? 'text-[#7C1A22]' : 'text-[#1B1C1A]'}`}>
              {metrics.lowStockItemsCount}
            </p>
            <p className="text-[11px] text-[#767872] mt-2">
              Variants below reorder threshold
            </p>
          </Link>

          <Link
            href="/orders?status=refunded"
            className="p-6 bg-white border border-[#E5E3DC] rounded-[4px] hover:border-[#1B1C1A] transition-all hover:shadow-sm group block"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-mono uppercase tracking-wider text-[#767872] group-hover:text-[#1B1C1A]">
                Active Return Requests
              </p>
              <span className="text-[10px] font-mono text-[#767872] opacity-0 group-hover:opacity-100 transition-opacity">
                View &rarr;
              </span>
            </div>
            <p className="text-3xl font-serif-headline mt-2 text-[#1B1C1A] tabular-nums">
              {metrics.activeReturnRequestsCount}
            </p>
            <p className="text-[11px] text-[#767872] mt-2">
              Customer exchange or return tickets
            </p>
          </Link>
        </div>

        {/* Quick Operations Bar */}
        <div className="p-6 bg-white border border-[#E5E3DC] rounded-[4px] flex items-center justify-between">
          <div>
            <h2 className="font-serif-headline text-base text-[#1B1C1A]">
              Catalog Operations
            </h2>
            <p className="text-xs text-[#767872] mt-1">
              Add individual garments or execute batch ingestion via CSV schema.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href="/products/new"
              className="px-4 py-2 bg-[#1B1C1A] text-[#FAF9F6] text-xs uppercase tracking-wider rounded-[2px] hover:bg-[#333] transition-colors"
            >
              Add New Product
            </Link>
            <Link
              href="/products/import"
              className="px-4 py-2 border border-[#D6D3CA] text-[#1B1C1A] text-xs uppercase tracking-wider rounded-[2px] hover:bg-[#EAE8E3] transition-colors"
            >
              Batch CSV Ingestion
            </Link>
          </div>
        </div>

        {/* Third-Party Infrastructure Services Status */}
        <div className="p-4 bg-[#FAF9F6] border border-[#E5E3DC] rounded-[4px] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  integrations.cloudinary.configured ? 'bg-[#1B3B2B]' : 'bg-[#D97706]'
                }`}
              />
              <span className="text-[11px] font-mono uppercase text-[#1B1C1A]">
                Cloudinary CDN:
              </span>
              <span className="text-[11px] font-mono text-[#767872]">
                {integrations.cloudinary.configured ? 'Configured & Active' : 'Ready (Mock / Dev Mode)'}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  integrations.brevo.configured ? 'bg-[#1B3B2B]' : 'bg-[#D97706]'
                }`}
              />
              <span className="text-[11px] font-mono uppercase text-[#1B1C1A]">
                Brevo Email:
              </span>
              <span className="text-[11px] font-mono text-[#767872]">
                {integrations.brevo.configured ? 'Live API Configured' : 'Ready (Simulation Mode)'}
              </span>
            </div>
          </div>

          <div className="text-[10px] font-mono text-[#767872]">
            Configure API keys in root .env to enable production delivery.
          </div>
        </div>
      </div>
    </>
  );
}
