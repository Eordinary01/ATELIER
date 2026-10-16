'use client';

import { useState, useEffect } from 'react';
import { Header } from '../../components/Header';
import { fetchAdminApi } from '../../lib/api';

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  displayOrder: number;
  itemCount?: number;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // New category form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [displayOrder, setDisplayOrder] = useState(0);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await fetchAdminApi<CategoryRow[]>('/api/v1/categories');
      if (res.success && res.data) {
        setCategories(res.data);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
    );
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetchAdminApi('/api/v1/admin/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || undefined,
          displayOrder,
        }),
      });

      if (res.success) {
        setShowAddModal(false);
        setName('');
        setSlug('');
        setDescription('');
        setDisplayOrder(0);
        await loadCategories();
      } else {
        alert(`Failed to create category: ${res.error?.message || 'Server error'}`);
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string, catName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete category "${catName}"?`
    );
    if (!confirmed) return;

    setDeletingId(id);
    try {
      const res = await fetchAdminApi(`/api/v1/admin/categories/${id}`, {
        method: 'DELETE',
      });

      if (res.success) {
        setCategories((prev) => prev.filter((c) => c.id !== id));
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
      <Header title="Category Hierarchy & Classification" />
      <div className="p-8 space-y-6 max-w-7xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[#767872]">
              Configuring <span className="font-mono text-[#1B1C1A]">{categories.length}</span> active garment categories.
            </p>
          </div>
          <div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-[#1B1C1A] text-[#FAF9F6] text-xs uppercase tracking-wider rounded-[2px] hover:bg-[#333] transition-colors"
            >
              + Add Category
            </button>
          </div>
        </div>

        {/* Categories Table */}
        <div className="bg-white border border-[#E5E3DC] rounded-[4px] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E3DC] bg-[#FAF9F6] text-[10px] font-mono uppercase tracking-wider text-[#767872]">
                <th className="py-3 px-4">Category Name</th>
                <th className="py-3 px-4">Slug Identifier</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Display Order</th>
                <th className="py-3 px-4">Active Garments</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E3DC] text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#767872] font-mono">
                    Loading category registry...
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#767872]">
                    No categories found. Click "+ Add Category" to create one.
                  </td>
                </tr>
              ) : (
                categories.map((c) => (
                  <tr key={c.id} className="hover:bg-[#FAF9F6] transition-colors">
                    <td className="py-3 px-4 font-medium text-[#1B1C1A]">{c.name}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#767872]">{c.slug}</td>
                    <td className="py-3 px-4 text-[#767872] max-w-xs truncate">
                      {c.description || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono">{c.displayOrder}</td>
                    <td className="py-3 px-4 font-mono">
                      <span className="px-2 py-0.5 rounded-[2px] bg-[#EAE8E3] text-[#1B1C1A] text-[11px]">
                        {c.itemCount ?? 0} pieces
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDeleteCategory(c.id, c.name)}
                        disabled={deletingId === c.id}
                        className="px-2 py-1 border border-[#FFDAD6] bg-[#FFF0EE] text-[#93000A] hover:bg-[#FFDAD6] rounded-[2px] text-[11px] font-mono uppercase disabled:opacity-50"
                      >
                        {deletingId === c.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Add Category Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-[#E5E3DC] rounded-[4px] p-6 max-w-md w-full space-y-4 shadow-xl">
              <div className="border-b border-[#E5E3DC] pb-3 flex items-center justify-between">
                <h3 className="font-serif-headline text-lg font-semibold text-[#1B1C1A]">
                  Add Garment Category
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-[#767872] hover:text-[#1B1C1A] text-sm font-mono"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateCategory} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#767872] mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Knitwear, Blazers, Denim"
                    className="w-full p-2 border border-[#D6D3CA] rounded-[2px] text-xs bg-[#FAF9F6] text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#767872] mb-1">
                    Slug
                  </label>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full p-2 border border-[#D6D3CA] rounded-[2px] text-xs font-mono bg-[#FAF9F6] text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#767872] mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Editorial summary of garments included in this category..."
                    className="w-full p-2 border border-[#D6D3CA] rounded-[2px] text-xs bg-[#FAF9F6] text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#767872] mb-1">
                    Display Order (Lower appears first)
                  </label>
                  <input
                    type="number"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(Number(e.target.value))}
                    className="w-full p-2 border border-[#D6D3CA] rounded-[2px] text-xs font-mono bg-[#FAF9F6] text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
                  />
                </div>

                <div className="pt-3 border-t border-[#E5E3DC] flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-[#D6D3CA] rounded-[2px] text-xs uppercase font-mono text-[#767872] hover:bg-[#FAF9F6]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-[#1B1C1A] text-[#FAF9F6] rounded-[2px] text-xs uppercase font-mono tracking-wider hover:bg-[#333] transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Category'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
