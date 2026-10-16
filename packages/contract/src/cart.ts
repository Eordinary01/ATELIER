import { z } from 'zod';
import { CurrencyPaiseSchema } from './common.js';
import { ProductCardSchema, ProductVariantSchema } from './catalog.js';

export const CartItemSchema = z.object({
  id: z.string().uuid(),
  cartId: z.string().uuid(),
  variantId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitPricePaise: CurrencyPaiseSchema,
  totalPricePaise: CurrencyPaiseSchema,
  product: ProductCardSchema.pick({
    id: true,
    title: true,
    slug: true,
    primaryImage: true,
    fabricSpecification: true,
  }),
  variant: ProductVariantSchema.pick({
    id: true,
    sku: true,
    size: true,
    colorName: true,
    colorHex: true,
  }),
});

export const CartSummarySchema = z.object({
  id: z.string().uuid(),
  items: z.array(CartItemSchema),
  itemCount: z.number().int().nonnegative(),
  subtotalPaise: CurrencyPaiseSchema,
  discountPaise: CurrencyPaiseSchema.default(0),
  shippingFeePaise: CurrencyPaiseSchema.default(0),
  estimatedTaxPaise: CurrencyPaiseSchema.default(0),
  totalPaise: CurrencyPaiseSchema,
  freeShippingThresholdPaise: CurrencyPaiseSchema.default(199900), // ₹1,999 free shipping
  freeShippingRemainingPaise: CurrencyPaiseSchema.default(0),
  appliedCouponCode: z.string().nullable().optional(),
});

export const AddToCartRequestSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().positive().default(1),
});

export const UpdateCartItemRequestSchema = z.object({
  quantity: z.number().int().nonnegative(),
});

export type CartItem = z.infer<typeof CartItemSchema>;
export type CartSummary = z.infer<typeof CartSummarySchema>;
export type AddToCartRequest = z.infer<typeof AddToCartRequestSchema>;
export type UpdateCartItemRequest = z.infer<typeof UpdateCartItemRequestSchema>;
