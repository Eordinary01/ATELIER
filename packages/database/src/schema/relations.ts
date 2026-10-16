import { relations } from 'drizzle-orm';
import { users, addresses } from './users';
import {
  categories,
  products,
  productImages,
  productVariants,
  inventory,
  stockReservations,
} from './catalog';
import { carts, cartItems } from './cart';
import {
  orders,
  orderItems,
  payments,
  shipments,
  coupons,
  returnsAndRefunds,
} from './orders';

export const usersRelations = relations(users, ({ many }) => ({
  addresses: many(addresses),
  orders: many(orders),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, {
    fields: [addresses.userId],
    references: [users.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'sub_categories',
  }),
  subCategories: many(categories, { relationName: 'sub_categories' }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  images: many(productImages),
  variants: many(productVariants),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
  inventory: one(inventory, {
    fields: [productVariants.id],
    references: [inventory.variantId],
  }),
  reservations: many(stockReservations),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  variant: one(productVariants, {
    fields: [inventory.variantId],
    references: [productVariants.id],
  }),
}));

export const stockReservationsRelations = relations(stockReservations, ({ one }) => ({
  variant: one(productVariants, {
    fields: [stockReservations.variantId],
    references: [productVariants.id],
  }),
}));

export const cartsRelations = relations(carts, ({ one, many }) => ({
  user: one(users, {
    fields: [carts.userId],
    references: [users.id],
  }),
  items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, {
    fields: [cartItems.cartId],
    references: [carts.id],
  }),
  variant: one(productVariants, {
    fields: [cartItems.variantId],
    references: [productVariants.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  shippingAddress: one(addresses, {
    fields: [orders.shippingAddressId],
    references: [addresses.id],
    relationName: 'shipping_address',
  }),
  billingAddress: one(addresses, {
    fields: [orders.billingAddressId],
    references: [addresses.id],
    relationName: 'billing_address',
  }),
  coupon: one(coupons, {
    fields: [orders.appliedCouponId],
    references: [coupons.id],
  }),
  items: many(orderItems),
  payments: many(payments),
  shipments: many(shipments),
  returns: many(returnsAndRefunds),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
}));

export const shipmentsRelations = relations(shipments, ({ one }) => ({
  order: one(orders, {
    fields: [shipments.orderId],
    references: [orders.id],
  }),
}));

export const returnsAndRefundsRelations = relations(returnsAndRefunds, ({ one }) => ({
  order: one(orders, {
    fields: [returnsAndRefunds.orderId],
    references: [orders.id],
  }),
  orderItem: one(orderItems, {
    fields: [returnsAndRefunds.orderItemId],
    references: [orderItems.id],
  }),
}));

export const couponsRelations = relations(coupons, ({ many }) => ({
  orders: many(orders),
}));
