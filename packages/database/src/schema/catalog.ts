import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { productStatusEnum, stockReservationStatusEnum } from './enums';

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    description: text('description'),
    parentId: uuid('parent_id'),
    displayOrder: integer('display_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_categories_slug').on(table.slug),
    index('idx_categories_active').on(table.isActive),
  ]
);

export const collections = pgTable(
  'collections',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    description: text('description'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_collections_slug').on(table.slug),
    index('idx_collections_active').on(table.isActive),
  ]
);

export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    categoryId: uuid('category_id')
      .references(() => categories.id)
      .notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    shortDescription: varchar('short_description', { length: 500 }),
    description: text('description').notNull(),
    fabricSpecification: varchar('fabric_specification', { length: 255 }).notNull(),
    collectionName: varchar('collection_name', { length: 100 }).notNull(), // e.g. "Permanent Core", "Seasonal Drop"
    status: productStatusEnum('status').default('draft').notNull(),
    basePricePaise: integer('base_price_paise').notNull(), // e.g. ₹1,490 = 149000
    compareAtPricePaise: integer('compare_at_price_paise'),
    hsnCode: varchar('hsn_code', { length: 20 }).notNull(),
    gstRatePercent: integer('gst_rate_percent').default(12).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_products_category_status_price').on(
      table.categoryId,
      table.status,
      table.basePricePaise
    ),
    index('idx_products_slug').on(table.slug),
    index('idx_products_status').on(table.status),
    index('idx_products_title').on(table.title),
    index('idx_products_collection').on(table.collectionName),
  ]
);


export const productImages = pgTable(
  'product_images',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
      .references(() => products.id, { onDelete: 'cascade' })
      .notNull(),
    url: varchar('url', { length: 1024 }).notNull(),
    altText: varchar('alt_text', { length: 255 }).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    isPrimary: boolean('is_primary').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_product_images_product').on(table.productId, table.sortOrder),
  ]
);

export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
      .references(() => products.id, { onDelete: 'cascade' })
      .notNull(),
    sku: varchar('sku', { length: 100 }).notNull().unique(),
    size: varchar('size', { length: 20 }).notNull(), // 'XS', 'S', 'M', 'L', 'XL', 'XXL'
    colorName: varchar('color_name', { length: 50 }).notNull(), // 'Deep Navy', 'Off-White'
    colorHex: varchar('color_hex', { length: 10 }).notNull(), // '#17253B'
    priceOverridePaise: integer('price_override_paise'),
    weightGrams: integer('weight_grams').default(300).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_variants_product_size').on(table.productId, table.size),
    uniqueIndex('idx_variants_sku').on(table.sku),
  ]
);

export const inventory = pgTable(
  'inventory',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    variantId: uuid('variant_id')
      .references(() => productVariants.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),
    quantityAvailable: integer('quantity_available').default(0).notNull(),
    quantityReserved: integer('quantity_reserved').default(0).notNull(),
    lowStockThreshold: integer('low_stock_threshold').default(5).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_inventory_variant').on(table.variantId),
  ]
);

export const stockReservations = pgTable(
  'stock_reservations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    variantId: uuid('variant_id')
      .references(() => productVariants.id, { onDelete: 'cascade' })
      .notNull(),
    cartSessionId: varchar('cart_session_id', { length: 100 }).notNull(),
    quantity: integer('quantity').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    status: stockReservationStatusEnum('status').default('active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_stock_reservations_expiry').on(table.expiresAt, table.status),
    index('idx_stock_reservations_session').on(table.cartSessionId),
  ]
);
