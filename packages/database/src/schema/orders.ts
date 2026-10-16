import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  text,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import {
  orderStatusEnum,
  paymentMethodEnum,
  paymentStatusEnum,
  shipmentStatusEnum,
  returnReasonEnum,
  returnStatusEnum,
  couponDiscountTypeEnum,
} from './enums';
import { users, addresses } from './users';
import { productVariants } from './catalog';

export const coupons = pgTable(
  'coupons',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: varchar('code', { length: 50 }).notNull().unique(),
    discountType: couponDiscountTypeEnum('discount_type').notNull(),
    discountValue: integer('discount_value').notNull(), // percentage (e.g. 15 for 15%) or flat paise
    minOrderValuePaise: integer('min_order_value_paise').default(0).notNull(),
    maxDiscountPaise: integer('max_discount_paise'),
    usageLimitTotal: integer('usage_limit_total'),
    usageLimitPerUser: integer('usage_limit_per_user').default(1).notNull(),
    currentUses: integer('current_uses').default(0).notNull(),
    validFrom: timestamp('valid_from', { withTimezone: true }).notNull(),
    validUntil: timestamp('valid_until', { withTimezone: true }).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_coupons_code').on(table.code),
  ]
);

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    guestEmail: varchar('guest_email', { length: 255 }),
    guestPhone: varchar('guest_phone', { length: 20 }),
    shippingAddressId: uuid('shipping_address_id')
      .references(() => addresses.id)
      .notNull(),
    billingAddressId: uuid('billing_address_id')
      .references(() => addresses.id)
      .notNull(),
    subtotalPaise: integer('subtotal_paise').notNull(),
    discountPaise: integer('discount_paise').default(0).notNull(),
    shippingFeePaise: integer('shipping_fee_paise').default(0).notNull(),
    taxPaise: integer('tax_paise').notNull(),
    totalPaise: integer('total_paise').notNull(),
    status: orderStatusEnum('status').default('pending_payment').notNull(),
    paymentMethod: paymentMethodEnum('payment_method').notNull(),
    paymentStatus: paymentStatusEnum('payment_status').default('pending').notNull(),
    appliedCouponId: uuid('applied_coupon_id').references(() => coupons.id),
    idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull().unique(),
    taxBreakdown: jsonb('tax_breakdown'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_orders_user_created').on(table.userId, table.createdAt),
    index('idx_orders_status').on(table.status),
    uniqueIndex('idx_orders_order_number').on(table.orderNumber),
    uniqueIndex('idx_orders_idempotency').on(table.idempotencyKey),
  ]
);

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .references(() => orders.id, { onDelete: 'cascade' })
      .notNull(),
    variantId: uuid('variant_id')
      .references(() => productVariants.id)
      .notNull(),
    productTitle: varchar('product_title', { length: 255 }).notNull(),
    variantLabel: varchar('variant_label', { length: 100 }).notNull(),
    sku: varchar('sku', { length: 100 }).notNull(),
    unitPricePaise: integer('unit_price_paise').notNull(),
    quantity: integer('quantity').notNull(),
    totalPricePaise: integer('total_price_paise').notNull(),
    taxRatePercent: integer('tax_rate_percent').notNull(),
    taxAmountPaise: integer('tax_amount_paise').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_order_items_order').on(table.orderId),
  ]
);

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .references(() => orders.id, { onDelete: 'cascade' })
      .notNull(),
    gatewayProvider: varchar('gateway_provider', { length: 50 }).notNull(), // 'razorpay', 'cashfree', 'cod'
    gatewayPaymentId: varchar('gateway_payment_id', { length: 255 }),
    gatewayOrderId: varchar('gateway_order_id', { length: 255 }),
    gatewaySignature: varchar('gateway_signature', { length: 512 }),
    amountPaise: integer('amount_paise').notNull(),
    currency: varchar('currency', { length: 3 }).default('INR').notNull(),
    status: paymentStatusEnum('status').default('pending').notNull(),
    rawResponse: jsonb('raw_response'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_payments_order').on(table.orderId),
    index('idx_payments_gateway_id').on(table.gatewayPaymentId),
  ]
);

export const carriers = pgTable(
  'carriers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    code: varchar('code', { length: 50 }).notNull().unique(),
    trackingUrlTemplate: varchar('tracking_url_template', { length: 1024 }).notNull(),
    contactPhone: varchar('contact_phone', { length: 50 }),
    isActive: boolean('is_active').default(true).notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_carriers_code').on(table.code),
    index('idx_carriers_active').on(table.isActive),
  ]
);

export const shipments = pgTable(
  'shipments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .references(() => orders.id, { onDelete: 'cascade' })
      .notNull(),
    carrierId: uuid('carrier_id').references(() => carriers.id, { onDelete: 'set null' }),
    carrier: varchar('carrier', { length: 100 }),
    trackingNumber: varchar('tracking_number', { length: 150 }),
    trackingUrl: varchar('tracking_url', { length: 1024 }),
    shippingLabelUrl: varchar('shipping_label_url', { length: 1024 }),
    status: shipmentStatusEnum('status').default('label_created').notNull(),
    dispatchedAt: timestamp('dispatched_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_shipments_order').on(table.orderId),
    index('idx_shipments_tracking').on(table.trackingNumber),
  ]
);

export const returnsAndRefunds = pgTable(
  'returns_and_refunds',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .references(() => orders.id, { onDelete: 'cascade' })
      .notNull(),
    orderItemId: uuid('order_item_id')
      .references(() => orderItems.id)
      .notNull(),
    reason: returnReasonEnum('reason').notNull(),
    detailedNotes: text('detailed_notes'),
    status: returnStatusEnum('status').default('requested').notNull(),
    refundAmountPaise: integer('refund_amount_paise').notNull(),
    refundTransactionId: varchar('refund_transaction_id', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_returns_order').on(table.orderId),
  ]
);
