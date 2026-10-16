import { z } from 'zod';
import { CurrencyPaiseSchema, SizeEnum } from './common.js';

export const CategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  itemCount: z.number().int().optional(),
});

export const ProductImageSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  url: z.string().url(),
  altText: z.string(),
  sortOrder: z.number().int().default(0),
  isPrimary: z.boolean().default(false),
});

export const ProductVariantSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  sku: z.string().min(3),
  size: SizeEnum,
  colorName: z.string(),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid HEX color code'),
  priceOverridePaise: CurrencyPaiseSchema.nullable().optional(),
  quantityAvailable: z.number().int().min(0),
  quantityReserved: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const ProductStatusSchema = z.enum(['draft', 'published', 'archived']);

export const ProductCardSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  shortDescription: z.string().nullable().optional(),
  fabricSpecification: z.string(),
  collectionName: z.string(),
  status: ProductStatusSchema,
  basePricePaise: CurrencyPaiseSchema,
  compareAtPricePaise: CurrencyPaiseSchema.nullable().optional(),
  category: CategorySchema.pick({ id: true, name: true, slug: true }),
  primaryImage: ProductImageSchema,
  availableSizes: z.array(SizeEnum),
  colorShades: z.array(
    z.object({
      name: z.string(),
      hex: z.string(),
    })
  ),
  isSoldOut: z.boolean().default(false),
});

export const ProductDetailSchema = ProductCardSchema.extend({
  description: z.string(),
  hsnCode: z.string(),
  gstRatePercent: z.number().int(),
  images: z.array(ProductImageSchema),
  variants: z.array(ProductVariantSchema),
});

export const CatalogSortOptionSchema = z.enum([
  'featured',
  'price-asc',
  'price-desc',
  'newest',
]);

export const CatalogFilterQuerySchema = z.object({
  category: z.string().optional(),
  collection: z.string().optional(),
  sizes: z.preprocess((val) => (typeof val === 'string' ? val.split(',') : val), z.array(SizeEnum).optional()),
  colors: z.preprocess((val) => (typeof val === 'string' ? val.split(',') : val), z.array(z.string()).optional()),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  sort: CatalogSortOptionSchema.default('featured'),
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(48).default(12),
  page: z.coerce.number().int().min(1).default(1),
});

export type Category = z.infer<typeof CategorySchema>;
export type ProductImage = z.infer<typeof ProductImageSchema>;
export type ProductVariant = z.infer<typeof ProductVariantSchema>;
export type ProductCard = z.infer<typeof ProductCardSchema>;
export type ProductDetail = z.infer<typeof ProductDetailSchema>;
export type CatalogFilterQuery = z.infer<typeof CatalogFilterQuerySchema>;
export type CatalogSortOption = z.infer<typeof CatalogSortOptionSchema>;
