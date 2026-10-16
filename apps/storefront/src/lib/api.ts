import { ProductCard, ProductDetail, Category } from '@atelier/contract';
import { logoutAndRedirect } from './auth';
import { getOfflineItem, setOfflineItem } from './offlineStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface CatalogFacets {
  categories: Array<{ id: string; name: string; slug: string; count: number }>;
  collections: Array<{ id: string; name: string; slug: string; count: number }>;
  sizes: string[];
  colors: Array<{ name: string; hex: string }>;
  priceRange: { minPaise: number; maxPaise: number };
}

export interface CatalogResponse {
  products: ProductCard[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    nextCursor?: string | null;
  };
  facets: CatalogFacets;
  isOffline?: boolean;
}

export async function fetchStorefrontApi<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; meta?: any; isOffline?: boolean; error?: { message: string; code: string } }> {
  const url = `${API_URL}${path}`;
  const isGet = !options.method || options.method.toUpperCase() === 'GET';
  const cacheKey = `api:${path}`;
  const isClient = typeof window !== 'undefined';
  const isOffline = isClient && typeof navigator !== 'undefined' && !navigator.onLine;

  // Immediate offline fallback if browser is already offline
  if (isClient && isOffline && isGet) {
    const cached = await getOfflineItem<{ success: boolean; data?: T; meta?: any }>(cacheKey);
    if (cached) {
      return { ...cached, isOffline: true };
    }
  }

  try {
    const headers: Record<string, string> = {};
    if (options.body && !(isClient && options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
      cache: 'no-store',
    });

    const json = await res.json();

    if (res.status === 401 || json?.error?.code === 'UNAUTHORIZED' || json?.error?.code === 'TOKEN_EXPIRED') {
      if (isClient) {
        logoutAndRedirect();
      }
    }

    // Cache successful GET responses in IndexedDB + RAM
    if (isClient && isGet && json?.success && json?.data) {
      setOfflineItem(cacheKey, json).catch(() => {});
    }

    return json;
  } catch (err: any) {
    // If network fails (poor network or server dropout), attempt offline cache
    if (isClient && isGet) {
      const cached = await getOfflineItem<{ success: boolean; data?: T; meta?: any }>(cacheKey);
      if (cached) {
        return { ...cached, isOffline: true };
      }
    }

    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err.message || 'Failed to communicate with Atelier server',
      },
    };
  }
}

/**
 * Fetch all categories with product counts (with offline cache fallback)
 */
export async function getCategories(): Promise<Category[]> {
  const res = await fetchStorefrontApi<Category[]>('/api/v1/categories');
  if (res.success && Array.isArray(res.data)) {
    return res.data;
  }
  // Try direct cached category archive
  if (typeof window !== 'undefined') {
    const cached = await getOfflineItem<Category[]>('api:/api/v1/categories');
    if (cached && Array.isArray(cached)) return cached;
  }
  return [];
}

/**
 * Fetch catalog products with filters and facets in parallel
 */
export async function getProducts(params: {
  category?: string;
  collection?: string;
  size?: string;
  color?: string;
  sort?: string;
  search?: string;
  page?: number;
  limit?: number;
} = {}): Promise<CatalogResponse> {
  const query = new URLSearchParams();
  if (params.category) query.set('category', params.category);
  if (params.collection) query.set('collection', params.collection);
  if (params.size) query.set('sizes', params.size);
  if (params.color) query.set('colors', params.color);
  if (params.sort) query.set('sort', params.sort);
  if (params.search) query.set('search', params.search);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));

  const queryString = query.toString();
  const productsPath = `/api/v1/products${queryString ? `?${queryString}` : ''}`;
  const facetsPath = '/api/v1/products/facets';

  const [productsRes, facetsRes] = await Promise.all([
    fetchStorefrontApi<ProductCard[]>(productsPath),
    fetchStorefrontApi<CatalogFacets>(facetsPath),
  ]);

  const defaultFacets: CatalogFacets = {
    categories: [],
    collections: [],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [],
    priceRange: { minPaise: 0, maxPaise: 1000000 },
  };

  const productsList = productsRes.success && Array.isArray(productsRes.data)
    ? productsRes.data
    : [];

  const paginationMeta = productsRes.meta || {
    total: productsList.length,
    page: params.page || 1,
    limit: params.limit || 24,
    totalPages: 1,
    nextCursor: null,
  };

  // If this was an initial page fetch (page 1) and succeeded, also cache individual product silhouettes
  if (typeof window !== 'undefined' && productsList.length > 0 && (!params.page || params.page === 1)) {
    // Store in general catalog backup
    setOfflineItem('catalog_latest_archive', productsList, 7 * 24 * 60 * 60 * 1000).catch(() => {});
  }

  return {
    products: productsList,
    pagination: paginationMeta,
    facets: facetsRes.success && facetsRes.data ? facetsRes.data : defaultFacets,
    isOffline: productsRes.isOffline || facetsRes.isOffline,
  };
}

/**
 * Fetch a single product by its unique slug (with offline cache fallback)
 */
export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const res = await fetchStorefrontApi<ProductDetail>(`/api/v1/products/${slug}`);
  if (res.success && res.data) {
    if (typeof window !== 'undefined') {
      setOfflineItem(`pdp:${slug}`, res.data).catch(() => {});
    }
    return res.data;
  }

  // Check explicit PDP cache key
  if (typeof window !== 'undefined') {
    const cachedPdp = await getOfflineItem<ProductDetail>(`pdp:${slug}`);
    if (cachedPdp) return cachedPdp;
  }

  return null;
}

