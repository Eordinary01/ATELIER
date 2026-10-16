import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { getDbClient, coupons, eq, and, lte, gte } from '@atelier/database';
import { ApiResponseSchema, CurrencyPaiseSchema } from '@atelier/contract';

const ValidateCouponBodySchema = z
  .object({
    code: z.string().min(1),
    orderSubtotalPaise: z.number().int().nonnegative().optional(),
    orderValuePaise: z.number().int().nonnegative().optional(),
  })
  .transform((data) => ({
    code: data.code,
    orderSubtotalPaise: data.orderSubtotalPaise ?? data.orderValuePaise ?? 0,
  }));

const ValidateCouponResultSchema = ApiResponseSchema(
  z.object({
    valid: z.boolean(),
    isValid: z.boolean().optional(),
    code: z.string().optional(),
    discountType: z.string().optional(),
    discountValue: z.number().optional(),
    discountPaise: CurrencyPaiseSchema,
    message: z.string(),
    minOrderValuePaise: CurrencyPaiseSchema.optional(),
    amountNeededPaise: CurrencyPaiseSchema.optional(),
    currentSubtotalPaise: CurrencyPaiseSchema.optional(),
    coupon: z
      .object({
        id: z.string().uuid(),
        code: z.string(),
        discountType: z.enum(['percentage', 'flat_paise']),
        discountValue: z.number().int(),
        minOrderValuePaise: CurrencyPaiseSchema,
      })
      .optional(),
  })
);

const ActiveCouponsResponseSchema = ApiResponseSchema(
  z.array(
    z.object({
      id: z.string().uuid(),
      code: z.string(),
      discountType: z.enum(['percentage', 'flat_paise']),
      discountValue: z.number().int(),
      minOrderValuePaise: CurrencyPaiseSchema,
      description: z.string(),
    })
  )
);

export const couponRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const typedFastify = fastify.withTypeProvider<ZodTypeProvider>();

  // 1. POST /api/v1/coupons/validate
  typedFastify.post(
    '/validate',
    {
      schema: {
        body: ValidateCouponBodySchema,
        response: {
          200: ValidateCouponResultSchema,
        },
      },
    },
    async (request, reply) => {
      const { code, orderSubtotalPaise } = request.body;
      const cleanCode = code.trim().toUpperCase();
      const db = getDbClient();
      const now = new Date();

      const [coupon] = await db
        .select()
        .from(coupons)
        .where(eq(coupons.code, cleanCode))
        .limit(1);

      if (!coupon) {
        return reply.send({
          success: true,
          data: {
            valid: false,
            discountPaise: 0,
            message: `Coupon code "${cleanCode}" is not recognized.`,
          },
        });
      }

      if (!coupon.isActive) {
        return reply.send({
          success: true,
          data: {
            valid: false,
            discountPaise: 0,
            message: `Coupon code "${cleanCode}" is currently inactive.`,
          },
        });
      }

      if (now < coupon.validFrom) {
        return reply.send({
          success: true,
          data: {
            valid: false,
            discountPaise: 0,
            message: `Coupon "${cleanCode}" is not yet active.`,
          },
        });
      }

      if (now > coupon.validUntil) {
        return reply.send({
          success: true,
          data: {
            valid: false,
            discountPaise: 0,
            message: `Coupon "${cleanCode}" has expired.`,
          },
        });
      }

      if (orderSubtotalPaise < coupon.minOrderValuePaise) {
        const minRupees = Math.round(coupon.minOrderValuePaise / 100);
        const amountNeededPaise = coupon.minOrderValuePaise - orderSubtotalPaise;
        return reply.send({
          success: true,
          data: {
            valid: false,
            isValid: false,
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            discountPaise: 0,
            minOrderValuePaise: coupon.minOrderValuePaise,
            amountNeededPaise,
            currentSubtotalPaise: orderSubtotalPaise,
            message: `Minimum order value of ₹${minRupees.toLocaleString('en-IN')} required for "${cleanCode}".`,
            coupon: {
              id: coupon.id,
              code: coupon.code,
              discountType: coupon.discountType,
              discountValue: coupon.discountValue,
              minOrderValuePaise: coupon.minOrderValuePaise,
            },
          },
        });
      }

      if (coupon.usageLimitTotal && coupon.currentUses >= coupon.usageLimitTotal) {
        return reply.send({
          success: true,
          data: {
            valid: false,
            discountPaise: 0,
            message: `Coupon "${cleanCode}" has reached maximum allocation limit.`,
          },
        });
      }

      // Calculate discount
      let discountPaise = 0;
      if (coupon.discountType === 'percentage') {
        discountPaise = Math.round((orderSubtotalPaise * coupon.discountValue) / 100);
        if (coupon.maxDiscountPaise && discountPaise > coupon.maxDiscountPaise) {
          discountPaise = coupon.maxDiscountPaise;
        }
      } else {
        discountPaise = Math.min(orderSubtotalPaise, coupon.discountValue);
      }

      return reply.send({
        success: true,
        data: {
          valid: true,
          isValid: true,
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          discountPaise,
          message:
            coupon.discountType === 'percentage'
              ? `${coupon.discountValue}% archival courtesy applied.`
              : `₹${(discountPaise / 100).toLocaleString('en-IN')} flat archival courtesy applied.`,
          coupon: {
            id: coupon.id,
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            minOrderValuePaise: coupon.minOrderValuePaise,
          },
        },
      });
    }
  );

  // 2. GET /api/v1/coupons/active
  typedFastify.get(
    '/active',
    {
      schema: {
        response: {
          200: ActiveCouponsResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      const db = getDbClient();
      const now = new Date();

      const activeList = await db
        .select()
        .from(coupons)
        .where(
          and(
            eq(coupons.isActive, true),
            lte(coupons.validFrom, now),
            gte(coupons.validUntil, now)
          )
        )
        .limit(10);

      const data = activeList.map((c) => ({
        id: c.id,
        code: c.code,
        discountType: c.discountType,
        discountValue: c.discountValue,
        minOrderValuePaise: c.minOrderValuePaise,
        description:
          c.discountType === 'percentage'
            ? `${c.discountValue}% off orders over ₹${Math.round(c.minOrderValuePaise / 100).toLocaleString('en-IN')}`
            : `₹${Math.round(c.discountValue / 100).toLocaleString('en-IN')} off orders over ₹${Math.round(c.minOrderValuePaise / 100).toLocaleString('en-IN')}`,
      }));

      return reply.send({
        success: true,
        data,
      });
    }
  );
};
