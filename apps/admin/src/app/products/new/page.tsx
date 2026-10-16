'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../../components/Header';
import { fetchAdminApi, uploadMediaToCloudinary } from '../../../lib/api';

const AVAILABLE_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export default function NewProductPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [collections, setCollections] = useState<{ id: string; name: string }[]>([]);
  const [collectionName, setCollectionName] = useState('Permanent Core');
  const [loadingCollections, setLoadingCollections] = useState(true);

  // Quick Add Modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);

  const [description, setDescription] = useState('');
  const [fabricSpecification, setFabricSpecification] = useState('100% Combed Cotton, 260 GSM');
  const [priceInr, setPriceInr] = useState(1990);
  const [hsnCode, setHsnCode] = useState('61091000');
  const [imageUrl, setImageUrl] = useState(
    'https://images.unsplash.com/photo-1521572267360-ee0c2909d518'
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadMessage, setImageUploadMessage] = useState<string | null>(null);

  // Variant generator state
  const [colorName, setColorName] = useState('Charcoal');
  const [colorHex, setColorHex] = useState('#2A2B2A');
  const [selectedSizes, setSelectedSizes] = useState<string[]>(['S', 'M', 'L']);
  const [stockPerSize, setStockPerSize] = useState(20);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCategories = async () => {
    try {
      const res = await fetchAdminApi<{ id: string; name: string }[]>('/api/v1/categories');
      if (res.success && res.data && res.data.length > 0 && res.data[0]) {
        setCategories(res.data);
        if (!categoryId) setCategoryId(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load categories', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadCollections = async () => {
    try {
      const res = await fetchAdminApi<{ id: string; name: string }[]>('/api/v1/admin/collections');
      if (res.success && res.data && res.data.length > 0) {
        setCollections(res.data);
      }
    } catch (err) {
      console.error('Failed to load collections', err);
    } finally {
      setLoadingCollections(false);
    }
  };

  useEffect(() => {
    loadCategories();
    loadCollections();
  }, []);

  const handleCreateCategoryInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setIsCreatingCategory(true);
    try {
      const res = await fetchAdminApi<{ id: string; name: string }>('/api/v1/admin/categories', {
        method: 'POST',
        body: JSON.stringify({ name: newCatName.trim() }),
      });
      if (res.success && res.data) {
        const newCat: { id: string; name: string } = res.data;
        setCategories((prev) => [...prev, newCat]);
        setCategoryId(newCat.id);
        setShowCategoryModal(false);
        setNewCatName('');
      } else {
        alert(`Failed: ${res.error?.message || 'Server error'}`);
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleCreateCollectionInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;

    setIsCreatingCollection(true);
    try {
      const res = await fetchAdminApi<{ id: string; name: string }>('/api/v1/admin/collections', {
        method: 'POST',
        body: JSON.stringify({ name: newColName.trim() }),
      });
      if (res.success && res.data) {
        const newCol: { id: string; name: string } = res.data;
        setCollections((prev) => [...prev, newCol]);
        setCollectionName(newCol.name);
        setShowCollectionModal(false);
        setNewColName('');
      } else {
        alert(`Failed: ${res.error?.message || 'Server error'}`);
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    } finally {
      setIsCreatingCollection(false);
    }
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    setSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
    );
  };

  const toggleSize = (size: string) => {
    if (selectedSizes.includes(size)) {
      setSelectedSizes(selectedSizes.filter((s) => s !== size));
    } else {
      setSelectedSizes([...selectedSizes, size]);
    }
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    setImageUploadMessage('Uploading to Cloudinary...');

    try {
      const res = await uploadMediaToCloudinary(file);
      if (res.success && res.data) {
        setImageUrl(res.data.secureUrl || res.data.url);
        setImageUploadMessage('Asset synced to Cloudinary');
      } else {
        setImageUploadMessage(`Upload failed: ${res.error?.message || 'Server error'}`);
      }
    } catch (err: any) {
      setImageUploadMessage(`Upload error: ${err.message}`);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSizes.length === 0) {
      alert('Please select at least one size.');
      return;
    }

    setIsSubmitting(true);

    const variants = selectedSizes.map((size) => ({
      sku: `${slug.toUpperCase().slice(0, 8)}-${size}-${colorName.toUpperCase().replace(/\s+/g, '')}`,
      size,
      colorName,
      colorHex,
      initialStock: stockPerSize,
    }));

    try {
      const json = await fetchAdminApi('/api/v1/admin/products', {
        method: 'POST',
        body: JSON.stringify({
          title,
          slug,
          categoryId,
          description,
          fabricSpecification,
          collectionName,
          basePricePaise: Math.round(priceInr * 100),
          hsnCode,
          images: [
            {
              url: imageUrl,
              altText: title,
              isPrimary: true,
              sortOrder: 0,
            },
          ],
          variants,
        }),
      });

      if (json.success) {
        router.push('/products');
      } else {
        alert(`Failed: ${json.error?.message || 'Check inputs'}`);
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Header title="Add Catalog Garment & Variant Matrix" />
      <div className="p-8 max-w-4xl space-y-8">
        <form onSubmit={handleSubmit} className="bg-white border border-[#E5E3DC] rounded-[4px] p-8 space-y-6">
          <div className="border-b border-[#E5E3DC] pb-4">
            <h2 className="font-serif-headline text-base text-[#1B1C1A]">
              Garment Specification
            </h2>
            <p className="text-xs text-[#767872] mt-1">
              Enter core editorial specs adhering to the Atelier master catalog format.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-[11px] font-mono uppercase text-[#767872] mb-1">
                Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="ATELIER 07 - Boxy Raw Twill Jacket"
                className="w-full p-2.5 border border-[#D6D3CA] rounded-[2px] text-xs bg-[#FAF9F6] text-[#1B1C1A]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-mono uppercase text-[#767872]">
                  Category
                </label>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(true)}
                  className="text-[10px] font-mono uppercase text-[#1B1C1A] hover:underline"
                >
                  + New
                </button>
              </div>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={loadingCategories}
                className="w-full p-2.5 border border-[#D6D3CA] rounded-[2px] text-xs bg-[#FAF9F6] text-[#1B1C1A]"
              >
                {loadingCategories ? (
                  <option value="">Loading categories...</option>
                ) : categories.length === 0 ? (
                  <option value="">No categories found</option>
                ) : (
                  categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))
                )}
              </select>
            </div>
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
              className="w-full p-2.5 border border-[#D6D3CA] rounded-[2px] text-xs bg-[#FAF9F6] font-mono text-[#1B1C1A]"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#767872] mb-1">
                Price (INR ₹)
              </label>
              <input
                type="number"
                required
                value={priceInr}
                onChange={(e) => setPriceInr(Number(e.target.value))}
                className="w-full p-2.5 border border-[#D6D3CA] rounded-[2px] text-xs bg-[#FAF9F6] font-mono text-[#1B1C1A]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-[#767872] mb-1">
                HSN Code
              </label>
              <input
                type="text"
                required
                value={hsnCode}
                onChange={(e) => setHsnCode(e.target.value)}
                className="w-full p-2.5 border border-[#D6D3CA] rounded-[2px] text-xs bg-[#FAF9F6] font-mono text-[#1B1C1A]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-mono uppercase text-[#767872]">
                  Collection
                </label>
                <button
                  type="button"
                  onClick={() => setShowCollectionModal(true)}
                  className="text-[10px] font-mono uppercase text-[#1B1C1A] hover:underline"
                >
                  + New
                </button>
              </div>
              <select
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
                disabled={loadingCollections}
                className="w-full p-2.5 border border-[#D6D3CA] rounded-[2px] text-xs bg-[#FAF9F6] text-[#1B1C1A]"
              >
                {loadingCollections ? (
                  <option value="">Loading collections...</option>
                ) : collections.length === 0 ? (
                  <option value="Permanent Core">Permanent Core</option>
                ) : (
                  collections.map((col) => (
                    <option key={col.id} value={col.name}>
                      {col.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-[#767872] mb-1">
              Fabric Specification
            </label>
            <input
              type="text"
              required
              value={fabricSpecification}
              onChange={(e) => setFabricSpecification(e.target.value)}
              className="w-full p-2.5 border border-[#D6D3CA] rounded-[2px] text-xs bg-[#FAF9F6] text-[#1B1C1A]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-[#767872] mb-1">
              Description
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Full cut notes, weave density, and silhouette construction..."
              className="w-full p-2.5 border border-[#D6D3CA] rounded-[2px] text-xs bg-[#FAF9F6] text-[#1B1C1A]"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-mono uppercase text-[#767872]">
                Garment Imagery (Cloudinary CDN)
              </label>
              {imageUploadMessage && (
                <span className="text-[10px] font-mono text-[#767872]">
                  {imageUploadMessage}
                </span>
              )}
            </div>

            <div className="flex items-start gap-4">
              {imageUrl && (
                <div className="w-16 h-20 bg-[#FAF9F6] border border-[#D6D3CA] rounded-[2px] overflow-hidden flex-shrink-0">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 space-y-2">
                <input
                  type="url"
                  required
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://res.cloudinary.com/... or image URL"
                  className="w-full p-2.5 border border-[#D6D3CA] rounded-[2px] text-xs bg-[#FAF9F6] font-mono text-[#1B1C1A]"
                />
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer px-3 py-1.5 border border-[#D6D3CA] rounded-[2px] text-[11px] font-mono uppercase text-[#1B1C1A] hover:bg-[#EAE8E3] inline-block transition-colors">
                    {isUploadingImage ? 'Uploading to Cloudinary...' : 'Upload Image File'}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUploadingImage}
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[10px] font-mono text-[#767872]">
                    JPEG, PNG, WEBP (Max 10MB) &bull; CDN auto-compressed
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Variant Matrix Generator */}
          <div className="border-t border-[#E5E3DC] pt-6 space-y-4">
            <h3 className="font-serif-headline text-sm text-[#1B1C1A]">
              Variant Matrix Generation
            </h3>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#767872] mb-1">
                  Color Shade Name
                </label>
                <input
                  type="text"
                  required
                  value={colorName}
                  onChange={(e) => setColorName(e.target.value)}
                  className="w-full p-2 border border-[#D6D3CA] rounded-[2px] text-xs bg-[#FAF9F6]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#767872] mb-1">
                  Color HEX Code
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={colorHex}
                    onChange={(e) => setColorHex(e.target.value)}
                    className="w-8 h-8 p-0 border border-[#D6D3CA] rounded-[2px] cursor-pointer"
                  />
                  <input
                    type="text"
                    required
                    value={colorHex}
                    onChange={(e) => setColorHex(e.target.value)}
                    className="flex-1 p-2 border border-[#D6D3CA] rounded-[2px] text-xs font-mono bg-[#FAF9F6]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#767872] mb-1">
                  Initial Stock Per Size
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={stockPerSize}
                  onChange={(e) => setStockPerSize(Number(e.target.value))}
                  className="w-full p-2 border border-[#D6D3CA] rounded-[2px] text-xs font-mono bg-[#FAF9F6]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-[#767872] mb-2">
                Available Sizes
              </label>
              <div className="flex items-center space-x-2">
                {AVAILABLE_SIZES.map((size) => {
                  const isSelected = selectedSizes.includes(size);
                  return (
                    <button
                      type="button"
                      key={size}
                      onClick={() => toggleSize(size)}
                      className={`w-10 h-9 border text-xs font-mono transition-colors rounded-[2px] ${
                        isSelected
                          ? 'bg-[#1B1C1A] text-[#FAF9F6] border-[#1B1C1A]'
                          : 'bg-[#FAF9F6] text-[#464742] border-[#D6D3CA] hover:border-[#1B1C1A]'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.push('/products')}
              className="px-4 py-2 text-xs uppercase tracking-wider text-[#767872] hover:text-[#1B1C1A]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-[#1B1C1A] text-[#FAF9F6] text-xs uppercase tracking-wider rounded-[2px] hover:bg-[#333] transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Creating Product...' : 'Commit Product & Variants'}
            </button>
          </div>
        </form>

        {/* Quick Add Category Modal */}
        {showCategoryModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-[#E5E3DC] rounded-[4px] p-6 max-w-sm w-full space-y-4 shadow-xl">
              <h3 className="font-serif-headline text-base font-semibold text-[#1B1C1A]">
                Quick Add Category
              </h3>
              <form onSubmit={handleCreateCategoryInline} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#767872] mb-1">
                    Category Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Outerwear, Silk Shirts"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full p-2 border border-[#D6D3CA] rounded-[2px] text-xs bg-[#FAF9F6] text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
                  />
                </div>
                <div className="pt-2 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(false)}
                    className="px-3 py-1.5 border border-[#D6D3CA] rounded-[2px] text-xs font-mono uppercase text-[#767872]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingCategory}
                    className="px-3 py-1.5 bg-[#1B1C1A] text-[#FAF9F6] rounded-[2px] text-xs font-mono uppercase tracking-wider disabled:opacity-50"
                  >
                    {isCreatingCategory ? 'Adding...' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Quick Add Collection Modal */}
        {showCollectionModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-[#E5E3DC] rounded-[4px] p-6 max-w-sm w-full space-y-4 shadow-xl">
              <h3 className="font-serif-headline text-base font-semibold text-[#1B1C1A]">
                Quick Add Collection
              </h3>
              <form onSubmit={handleCreateCollectionInline} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#767872] mb-1">
                    Collection Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Winter 2026, Core Foundations"
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    className="w-full p-2 border border-[#D6D3CA] rounded-[2px] text-xs bg-[#FAF9F6] text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
                  />
                </div>
                <div className="pt-2 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowCollectionModal(false)}
                    className="px-3 py-1.5 border border-[#D6D3CA] rounded-[2px] text-xs font-mono uppercase text-[#767872]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingCollection}
                    className="px-3 py-1.5 bg-[#1B1C1A] text-[#FAF9F6] rounded-[2px] text-xs font-mono uppercase tracking-wider disabled:opacity-50"
                  >
                    {isCreatingCollection ? 'Adding...' : 'Add'}
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
