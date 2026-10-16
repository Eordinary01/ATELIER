import { z } from 'zod';
import { CurrencyPaiseSchema } from './common.js';

export const AdminOverviewMetricsSchema = z.object({
  todayNetRevenuePaise: CurrencyPaiseSchema,
  todayOrderCount: z.number().int().nonnegative(),
  unitsDispatchedToday: z.number().int().nonnegative(),
  pendingFulfillmentCount: z.number().int().nonnegative(),
  lowStockItemsCount: z.number().int().nonnegative(),
  activeReturnRequestsCount: z.number().int().nonnegative(),
});

export const CsvProductRowSchema = z.object({
  title: z.string().min(1),
  categorySlug: z.string().min(1),
  collectionName: z.string().optional(),
  sku: z.string().min(3),
  size: z.string().min(1),
  colorName: z.string().min(1),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  priceInr: z.coerce.number().positive(),
  stockQuantity: z.coerce.number().int().nonnegative(),
  fabricSpecification: z.string().min(1),
  hsnCode: z.string().min(4),
  gstRate: z.coerce.number().int().default(12),
  imageUrl: z.string().optional(),
});

export const CsvValidationResultSchema = z.object({
  totalRows: z.number().int(),
  validRows: z.number().int(),
  errorRows: z.number().int(),
  errors: z.array(
    z.object({
      row: z.number().int(),
      field: z.string(),
      message: z.string(),
    })
  ),
  previewData: z.array(CsvProductRowSchema).max(10),
});

export const AuditLogSchema = z.object({
  id: z.string().uuid(),
  adminUserId: z.string().uuid(),
  adminEmail: z.string().email(),
  entityType: z.string(),
  entityId: z.string(),
  action: z.string(),
  diffBefore: z.record(z.unknown()).nullable(),
  diffAfter: z.record(z.unknown()).nullable(),
  ipAddress: z.string(),
  createdAt: z.string().datetime(),
});

export type AdminOverviewMetrics = z.infer<typeof AdminOverviewMetricsSchema>;
export type CsvProductRow = z.infer<typeof CsvProductRowSchema>;
export type CsvValidationResult = z.infer<typeof CsvValidationResultSchema>;
export type AuditLog = z.infer<typeof AuditLogSchema>;
