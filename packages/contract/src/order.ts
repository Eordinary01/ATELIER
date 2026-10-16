import { z } from 'zod';
import { CurrencyPaiseSchema, IndianPincodeSchema } from './common.js';

export const AddressSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Full name is required'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid 10-digit Indian phone number'),
  addressLine1: z.string().min(3, 'Address line 1 is required'),
  addressLine2: z.string().optional(),
  landmark: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postalCode: IndianPincodeSchema,
  country: z.literal('India').default('India'),
  isDefault: z.boolean().default(false),
});

export const OrderStatusSchema = z.enum([
  'pending_payment',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
]);

export const PaymentMethodSchema = z.enum(['online', 'cod']);
export const PaymentStatusSchema = z.enum(['pending', 'captured', 'failed', 'refunded']);

export const OrderItemSchema = z.object({
  id: z.string().uuid(),
  variantId: z.string().uuid(),
  productTitle: z.string(),
  variantLabel: z.string(),
  sku: z.string(),
  unitPricePaise: CurrencyPaiseSchema,
  quantity: z.number().int().positive(),
  totalPricePaise: CurrencyPaiseSchema,
  taxRatePercent: z.number().int(),
  taxAmountPaise: CurrencyPaiseSchema,
});

export const OrderSchema = z.object({
  id: z.string().uuid(),
  orderNumber: z.string(),
  userId: z.string().uuid().nullable().optional(),
  guestEmail: z.string().email().nullable().optional(),
  guestPhone: z.string().nullable().optional(),
  shippingAddress: AddressSchema,
  billingAddress: AddressSchema,
  subtotalPaise: CurrencyPaiseSchema,
  discountPaise: CurrencyPaiseSchema,
  shippingFeePaise: CurrencyPaiseSchema,
  taxPaise: CurrencyPaiseSchema,
  totalPaise: CurrencyPaiseSchema,
  status: OrderStatusSchema,
  paymentMethod: PaymentMethodSchema,
  paymentStatus: PaymentStatusSchema,
  items: z.array(OrderItemSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateOrderRequestSchema = z.object({
  shippingAddress: AddressSchema.omit({ id: true }),
  billingAddress: AddressSchema.omit({ id: true }).optional(),
  useShippingAsBilling: z.boolean().default(true),
  paymentMethod: PaymentMethodSchema,
  couponCode: z.string().optional(),
  guestEmail: z.string().email().optional(),
  guestPhone: z.string().regex(/^[6-9]\d{9}$/).optional(),
  idempotencyKey: z.string().min(8),
});

export type Address = z.infer<typeof AddressSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type OrderItem = z.infer<typeof OrderItemSchema>;
export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;
