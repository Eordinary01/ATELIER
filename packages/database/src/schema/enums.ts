import { pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', [
  'customer',
  'admin_super',
  'admin_catalog',
  'admin_orders',
]);

export const productStatusEnum = pgEnum('product_status', [
  'draft',
  'published',
  'archived',
]);

export const orderStatusEnum = pgEnum('order_status', [
  'pending_payment',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
]);

export const paymentMethodEnum = pgEnum('payment_method', [
  'online',
  'cod',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'captured',
  'failed',
  'refunded',
]);

export const shipmentStatusEnum = pgEnum('shipment_status', [
  'label_created',
  'picked_up',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'rto_initiated',
  'rto_delivered',
]);

export const stockReservationStatusEnum = pgEnum('stock_reservation_status', [
  'active',
  'consumed',
  'released',
]);

export const returnReasonEnum = pgEnum('return_reason', [
  'size_fit',
  'defective',
  'wrong_item',
  'changed_mind',
]);

export const returnStatusEnum = pgEnum('return_status', [
  'requested',
  'approved',
  'pickup_scheduled',
  'item_inspected',
  'refund_issued',
  'rejected',
]);

export const couponDiscountTypeEnum = pgEnum('coupon_discount_type', [
  'percentage',
  'flat_paise',
]);
