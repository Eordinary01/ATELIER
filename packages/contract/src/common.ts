import { z } from 'zod';

export const IndianPincodeSchema = z
  .string()
  .regex(/^[1-9][0-9]{5}$/, 'Invalid Indian 6-digit postal PIN code');

export const CurrencyPaiseSchema = z
  .number()
  .int('Currency must be an integer in paise')
  .nonnegative('Amount cannot be negative');

export const StandardSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;
export const SizeEnum = z.enum(['XS', 'S', 'M', 'L', 'XL', 'XXL', 'ONE_SIZE', '28', '30', '32', '34', '36', '38']);

export const PaginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  page: z.coerce.number().int().min(1).default(1),
});

export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    meta: z
      .object({
        cursor: z.string().optional(),
        nextCursor: z.string().nullable().optional(),
        total: z.number().int().optional(),
        page: z.number().int().optional(),
        totalPages: z.number().int().optional(),
      })
      .optional(),
  });

export const ApiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.object({ field: z.string().optional(), issue: z.string() })).optional(),
    requestId: z.string().optional(),
  }),
});

export type ApiErrorResponse = z.infer<typeof ApiErrorSchema>;
