'use client';

import { useState, useEffect } from 'react';
import { Header } from '../../components/Header';
import { fetchAdminApi } from '../../lib/api';

interface InventoryItem {
  variantId: string;
  sku: string;
  productTitle: string;
  size: string;
  colorName: string;
  colorHex: string;
  quantityAvailable: number;
  lowStockThreshold: number;
}

export default function InventoryMatrixPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const res = await fetchAdminApi<any[]>('/api/v1/products?limit=48');
      if (res.success && Array.isArray(res.data)) {
        // Build variant inventory list from product details
        const list: InventoryItem[] = [];
        for (const p of res.data) {
          const detailRes = await fetchAdminApi<any>(`/api/v1/products/${p.slug}`);
          if (detailRes.success && detailRes.data?.variants) {
            for (const v of detailRes.data.variants) {
              list.push({
                variantId: v.id,
                sku: v.sku,
                productTitle: p.title,
                size: v.size,
                colorName: v.colorName,
                colorHex: v.colorHex,
                quantityAvailable: v.quantityAvailable,
                lowStockThreshold: 5,
              });
            }
          }
        }
        setItems(list);
      }
    } catch {
      // offline fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleUpdateStock = async (variantId: string, newStock: number) => {
    setUpdatingId(variantId);
    try {
      const json = await fetchAdminApi<{ variantId: string; quantityAvailable: number }>(
        `/api/v1/admin/inventory/${variantId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ quantityAvailable: newStock }),
        }
      );
      if (json.success) {
        setItems((prev) =>
          prev.map((it) =>
            it.variantId === variantId ? { ...it, quantityAvailable: newStock } : it
          )
        );
      } else {
        alert(`Update failed: ${json.error?.message || 'Unauthorized or server error'}`);
      }
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <>
      <Header title="Inventory Matrix & Stock Levels" />
      <div className="p-8 space-y-6 max-w-7xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[#767872]">
              Real-time available inventory counts and reorder thresholds across active SKUs.
            </p>
          </div>
          <button
            onClick={fetchInventory}
            disabled={isLoading}
            className="px-3 py-1.5 border border-[#D6D3CA] text-[#1B1C1A] text-xs font-mono uppercase rounded-[2px] hover:bg-[#EAE8E3]"
          >
            {isLoading ? 'Syncing...' : 'Sync Inventory'}
          </button>
        </div>

        <div className="bg-white border border-[#E5E3DC] rounded-[4px] overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E5E3DC] bg-[#FAF9F6] text-[10px] font-mono uppercase text-[#767872]">
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Garment</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Color Shade</th>
                <th className="py-3 px-4">Current Stock</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Quick Stock Adjustment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E3DC]">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#767872]">
                    {isLoading ? 'Loading variant inventory...' : 'No inventory variants found.'}
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isLow = item.quantityAvailable <= item.lowStockThreshold;
                  return (
                    <tr key={item.variantId} className="hover:bg-[#FAF9F6] transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-[11px] text-[#1B1C1A]">
                        {item.sku}
                      </td>
                      <td className="py-3 px-4 font-medium text-[#1B1C1A]">
                        {item.productTitle}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        {item.size}
                      </td>
                      <td className="py-3 px-4 flex items-center space-x-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-gray-300 flex-shrink-0"
                          style={{ backgroundColor: item.colorHex }}
                        />
                        <span className="text-[#464742]">{item.colorName}</span>
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-sm font-semibold">
                        {item.quantityAvailable}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] font-mono uppercase rounded-[2px] ${
                            isLow
                              ? 'bg-[#FFDAD6] text-[#93000A]'
                              : 'bg-[#E3EBE4] text-[#1B3B2B]'
                          }`}
                        >
                          {isLow ? 'Low Stock' : 'Optimal'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          disabled={updatingId === item.variantId || item.quantityAvailable <= 0}
                          onClick={() => handleUpdateStock(item.variantId, Math.max(0, item.quantityAvailable - 1))}
                          className="w-7 h-7 border border-[#D6D3CA] text-xs font-mono rounded-[2px] hover:bg-[#EAE8E3] disabled:opacity-30"
                        >
                          -1
                        </button>
                        <button
                          disabled={updatingId === item.variantId}
                          onClick={() => handleUpdateStock(item.variantId, item.quantityAvailable + 1)}
                          className="w-7 h-7 border border-[#D6D3CA] text-xs font-mono rounded-[2px] hover:bg-[#EAE8E3] disabled:opacity-30"
                        >
                          +1
                        </button>
                        <button
                          disabled={updatingId === item.variantId}
                          onClick={() => handleUpdateStock(item.variantId, item.quantityAvailable + 10)}
                          className="px-2 h-7 border border-[#D6D3CA] text-[10px] font-mono rounded-[2px] hover:bg-[#EAE8E3] disabled:opacity-30"
                        >
                          +10
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
