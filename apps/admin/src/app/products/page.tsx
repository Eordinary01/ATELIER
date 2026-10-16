'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Header } from '../../components/Header';
import { fetchAdminApi } from '../../lib/api';

interface AdminProductRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  basePricePaise: number;
  categoryName: string;
  variantCount: number;
  totalStock: number;
  primaryImageUrl: string | null;
  createdAt: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProductRow[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadProducts = useCallback(async (pageToLoad: number, searchQuery: string) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: pageToLoad.toString(),
        limit: '10',
      });
      if (searchQuery.trim()) {
        queryParams.set('search', searchQuery.trim());
      }

      const res = await fetchAdminApi<{
        items: AdminProductRow[];
        pagination: PaginationMeta;
      }>(`/api/v1/admin/products?${queryParams.toString()}`);

      if (res.success && res.data) {
        if (Array.isArray(res.data)) {
          setProducts(res.data);
          setPagination({
            page: 1,
            limit: 10,
            total: res.data.length,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          });
        } else {
          setProducts(res.data.items || []);
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts(1, search);
  }, [loadProducts, search]);

  const handleDeleteProduct = async (id: string, title: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${title}"? This will archive the garment from the active catalog.`
    );
    if (!confirmed) return;

    setDeletingId(id);
    try {
      const res = await fetchAdminApi(`/api/v1/admin/products/${id}`, {
        method: 'DELETE',
      });

      if (res.success) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        setPagination((prev) => ({
          ...prev,
          total: Math.max(0, prev.total - 1),
        }));
      } else {
        alert(`Deletion failed: ${res.error?.message || 'Server error'}`);
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Header title="Product Catalog Management" />
      <div className="p-8 space-y-6 max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs text-[#767872]">
              Managing <span className="font-mono text-[#1B1C1A]">{pagination.total}</span> catalog items across all categories.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href="/products/new"
              className="px-4 py-2 bg-[#1B1C1A] text-[#FAF9F6] text-xs uppercase tracking-wider rounded-[2px] hover:bg-[#333] transition-colors"
            >
              Add Product
            </Link>
            <Link
              href="/products/import"
              className="px-4 py-2 border border-[#D6D3CA] text-[#1B1C1A] text-xs uppercase tracking-wider rounded-[2px] hover:bg-[#EAE8E3] transition-colors"
            >
              CSV Import
            </Link>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex items-center gap-4 bg-white p-4 border border-[#E5E3DC] rounded-[4px]">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search garments by title or collection..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 bg-[#FAF9F6] border border-[#D6D3CA] rounded-[2px] text-xs font-mono text-[#1B1C1A] placeholder-[#767872] focus:outline-none focus:border-[#1B1C1A]"
            />
          </div>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="px-3 py-2 text-xs font-mono uppercase text-[#767872] hover:text-[#1B1C1A]"
            >
              Clear
            </button>
          )}
        </div>

        {/* Products Table */}
        <div className="bg-white border border-[#E5E3DC] rounded-[4px] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E3DC] bg-[#FAF9F6] text-[10px] font-mono uppercase tracking-wider text-[#767872]">
                <th className="py-3 px-4">Item</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Price (Paise / INR)</th>
                <th className="py-3 px-4">Variants</th>
                <th className="py-3 px-4">Available Stock</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E3DC] text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#767872] font-mono text-xs">
                    Loading catalog registry...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#767872]">
                    No products found matching query.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const priceInr = (p.basePricePaise / 100).toLocaleString('en-IN');
                  return (
                    <tr key={p.id} className="hover:bg-[#FAF9F6] transition-colors">
                      <td className="py-3 px-4 flex items-center space-x-3">
                        {p.primaryImageUrl ? (
                          <div className="w-10 h-12 bg-[#EAE8E3] relative rounded-[2px] overflow-hidden flex-shrink-0">
                            <Image
                              src={p.primaryImageUrl}
                              alt={p.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-12 bg-[#EAE8E3] rounded-[2px] flex items-center justify-center text-[10px] text-[#767872] flex-shrink-0">
                            N/A
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-[#1B1C1A]">{p.title}</p>
                          <p className="font-mono text-[10px] text-[#767872]">{p.slug}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#464742] font-mono text-[11px]">
                        {p.categoryName}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-[#1B1C1A]">
                        ₹{priceInr}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#464742]">
                        {p.variantCount} SKUs
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums">
                        <span
                          className={`px-2 py-0.5 rounded-[2px] text-[11px] ${
                            p.totalStock <= 5
                              ? 'bg-[#FFDAD6] text-[#93000A]'
                              : 'bg-[#EAE8E3] text-[#1B1C1A]'
                          }`}
                        >
                          {p.totalStock} units
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] font-mono uppercase rounded-[2px] ${
                            p.status === 'published'
                              ? 'bg-[#E3EBE4] text-[#1B3B2B]'
                              : 'bg-[#FAF3D1] text-[#694D3B]'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <a
                          href={`http://localhost:3000/products/${p.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1 border border-[#D6D3CA] text-[#464742] hover:text-[#1B1C1A] rounded-[2px] text-[11px] font-mono uppercase"
                          title="View on storefront"
                        >
                          View
                        </a>
                        <button
                          onClick={() => handleDeleteProduct(p.id, p.title)}
                          disabled={deletingId === p.id}
                          className="px-2 py-1 border border-[#FFDAD6] bg-[#FFF0EE] text-[#93000A] hover:bg-[#FFDAD6] rounded-[2px] text-[11px] font-mono uppercase disabled:opacity-50"
                        >
                          {deletingId === p.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Backend Pagination Footer */}
          <div className="p-4 border-t border-[#E5E3DC] bg-[#FAF9F6] flex items-center justify-between text-xs font-mono text-[#767872]">
            <div>
              Showing page <span className="font-semibold text-[#1B1C1A]">{pagination.page}</span> of{' '}
              <span className="font-semibold text-[#1B1C1A]">{pagination.totalPages}</span> ({pagination.total} total items)
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => loadProducts(pagination.page - 1, search)}
                disabled={!pagination.hasPrevPage || loading}
                className="px-3 py-1.5 border border-[#D6D3CA] rounded-[2px] text-xs uppercase text-[#1B1C1A] hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => loadProducts(pagination.page + 1, search)}
                disabled={!pagination.hasNextPage || loading}
                className="px-3 py-1.5 border border-[#D6D3CA] rounded-[2px] text-xs uppercase text-[#1B1C1A] hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
