import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  getDbClient,
  products,
  categories,
  collections,
  productImages,
  productVariants,
  inventory,
  orders,
  orderItems,
  payments,
  addresses,
  carriers,
  shipments,
  returnsAndRefunds,
  auditLogs,
  coupons,
  newsletterSubscribers,
  eq,
  and,
  or,
  inArray,
  isNull,
  sql,
  desc,
  asc,
  lte,
  ilike,
} from '@atelier/database';
import {
  AdminOverviewMetricsSchema,
  CsvProductRowSchema,
  CsvValidationResultSchema,
  ApiResponseSchema,
  CurrencyPaiseSchema,
} from '@atelier/contract';
import { BadRequestError, NotFoundError } from '../lib/errors.js';
import {
  uploadBufferToCloudinary,
  uploadBase64ToCloudinary,
  generateSignedUploadParams,
  isCloudinaryConfigured,
} from '../services/cloudinary.js';
import { env } from '../config/env.js';
import {
  isBrevoConfigured,
  sendShipmentNotificationEmail,
  sendProductReleaseAnnouncementEmail,
} from '../services/email.js';

const MetricsResponseSchema = ApiResponseSchema(AdminOverviewMetricsSchema);
const CsvValidationResponseSchema = ApiResponseSchema(CsvValidationResultSchema);
const AdminProductItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  status: z.string(),
  basePricePaise: CurrencyPaiseSchema,
  categoryName: z.string(),
  variantCount: z.number().int(),
  totalStock: z.number().int(),
  primaryImageUrl: z.string().nullable(),
  createdAt: z.string().datetime(),
});

const AdminProductsResponseSchema = ApiResponseSchema(
  z.object({
    items: z.array(AdminProductItemSchema),
    pagination: z.object({
      page: z.number().int(),
      limit: z.number().int(),
      total: z.number().int(),
      totalPages: z.number().int(),
      hasNextPage: z.boolean(),
      hasPrevPage: z.boolean(),
    }),
  })
);

const CreateProductRequestSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  categoryId: z.string().uuid(),
  description: z.string().min(1),
  shortDescription: z.string().optional(),
  fabricSpecification: z.string().min(1),
  collectionName: z.string().min(1),
  basePricePaise: CurrencyPaiseSchema,
  compareAtPricePaise: CurrencyPaiseSchema.optional(),
  hsnCode: z.string().min(4),
  gstRatePercent: z.number().int().default(12),
  status: z.enum(['draft', 'published', 'archived']).default('published'),
  images: z
    .array(
      z.object({
        url: z.string().url(),
        altText: z.string(),
        isPrimary: z.boolean().default(false),
        sortOrder: z.number().int().default(0),
      })
    )
    .default([]),
  variants: z
    .array(
      z.object({
        sku: z.string().min(3),
        size: z.string().min(1),
        colorName: z.string().min(1),
        colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        priceOverridePaise: CurrencyPaiseSchema.optional(),
        initialStock: z.number().int().min(0).default(0),
      })
    )
    .min(1, 'At least one variant is required'),
});

const UpdateInventoryRequestSchema = z.object({
  quantityAvailable: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0).optional(),
});

export const adminRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Ensure all admin routes require authentication and admin role
  fastify.addHook('preHandler', fastify.requireRole('admin_super', 'admin_catalog', 'admin_orders'));

  const typedFastify = fastify.withTypeProvider<ZodTypeProvider>();

  // 1. GET ADMIN OVERVIEW METRICS
  typedFastify.get(
    '/metrics',
    {
      schema: {
        response: {
          200: MetricsResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      const db = getDbClient();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Revenue and Orders today
      const todayOrders = await db
        .select({
          totalPaise: orders.totalPaise,
        })
        .from(orders)
        .where(
          and(
            sql`${orders.createdAt} >= ${todayStart.toISOString()}`,
            sql`${orders.status} NOT IN ('cancelled', 'refunded')`
          )
        );

      const todayNetRevenuePaise = todayOrders.reduce((sum, o) => sum + o.totalPaise, 0);
      const todayOrderCount = todayOrders.length;

      // Units Dispatched today
      const dispatchedToday = await db
        .select({ id: shipments.id })
        .from(shipments)
        .where(
          and(
            sql`${shipments.dispatchedAt} >= ${todayStart.toISOString()}`,
            eq(shipments.status, 'in_transit')
          )
        );

      // Pending fulfillment count
      const pendingFulfillment = await db
        .select({ id: orders.id })
        .from(orders)
        .where(sql`${orders.status} IN ('pending_payment', 'confirmed', 'processing')`);

      // Low stock items count (quantityAvailable <= lowStockThreshold)
      const lowStockItems = await db
        .select({ id: inventory.id })
        .from(inventory)
        .where(lte(inventory.quantityAvailable, inventory.lowStockThreshold));

      // Active return requests count
      const activeReturns = await db
        .select({ id: returnsAndRefunds.id })
        .from(returnsAndRefunds)
        .where(sql`${returnsAndRefunds.status} IN ('requested', 'approved')`);

      return reply.send({
        success: true,
        data: {
          todayNetRevenuePaise,
          todayOrderCount,
          unitsDispatchedToday: dispatchedToday.length,
          pendingFulfillmentCount: pendingFulfillment.length,
          lowStockItemsCount: lowStockItems.length,
          activeReturnRequestsCount: activeReturns.length,
        },
      });
    }
  );

  // 2. GET ADMIN PRODUCTS LIST WITH BACKEND PAGINATION
  typedFastify.get(
    '/products',
    {
      schema: {
        querystring: z.object({
          page: z.coerce.number().int().min(1).default(1),
          limit: z.coerce.number().int().min(1).max(100).default(10),
          search: z.string().optional(),
        }),
        response: {
          200: AdminProductsResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { page, limit, search } = request.query;
      const offset = (page - 1) * limit;
      const db = getDbClient();

      const conditions = [isNull(products.deletedAt)];
      if (search && search.trim()) {
        conditions.push(ilike(products.title, `%${search.trim()}%`));
      }

      // Count total matching non-deleted products
      const [countResult] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(products)
        .where(and(...conditions));

      const total = countResult?.total ?? 0;
      const totalPages = Math.max(1, Math.ceil(total / limit));

      const pagedProducts = await db.query.products.findMany({
        where: and(...conditions),
        orderBy: [desc(products.createdAt)],
        limit,
        offset,
        with: {
          category: true,
          images: true,
          variants: {
            with: {
              inventory: true,
            },
          },
        },
      });

      const formatted = pagedProducts.map((p) => {
        const primaryImage =
          p.images.find((img) => img.isPrimary) || p.images[0] || null;
        const totalStock = p.variants.reduce(
          (sum, v) => sum + (v.inventory?.quantityAvailable ?? 0),
          0
        );

        return {
          id: p.id,
          title: p.title,
          slug: p.slug,
          status: p.status,
          basePricePaise: p.basePricePaise,
          categoryName: p.category.name,
          variantCount: p.variants.length,
          totalStock,
          primaryImageUrl: primaryImage ? primaryImage.url : null,
          createdAt: p.createdAt.toISOString(),
        };
      });

      return reply.send({
        success: true,
        data: {
          items: formatted,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        },
      });
    }
  );

  // 3. CREATE PRODUCT WITH VARIANTS & INVENTORY
  typedFastify.post(
    '/products',
    {
      schema: {
        body: CreateProductRequestSchema,
        response: {
          201: ApiResponseSchema(z.object({ productId: z.string().uuid(), slug: z.string() })),
        },
      },
    },
    async (request, reply) => {
      const payload = request.body;
      const db = getDbClient();

      // Validate category exists
      const [existingCategory] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.id, payload.categoryId))
        .limit(1);

      if (!existingCategory) {
        throw new BadRequestError(`Category with ID '${payload.categoryId}' does not exist.`);
      }

      // Insert product
      const [newProduct] = await db
        .insert(products)
        .values({
          categoryId: payload.categoryId,
          title: payload.title,
          slug: payload.slug.toLowerCase(),
          shortDescription: payload.shortDescription || null,
          description: payload.description,
          fabricSpecification: payload.fabricSpecification,
          collectionName: payload.collectionName,
          basePricePaise: payload.basePricePaise,
          compareAtPricePaise: payload.compareAtPricePaise || null,
          hsnCode: payload.hsnCode,
          gstRatePercent: payload.gstRatePercent,
          status: payload.status,
        })
        .returning();

      if (!newProduct) {
        throw new Error('Failed to create product');
      }

      // Insert images
      for (let i = 0; i < payload.images.length; i++) {
        const img = payload.images[i]!;
        await db.insert(productImages).values({
          productId: newProduct.id,
          url: img.url,
          altText: img.altText,
          sortOrder: img.sortOrder ?? i,
          isPrimary: img.isPrimary ?? (i === 0),
        });
      }

      // Insert variants and initialize inventory
      for (const v of payload.variants) {
        const [newVariant] = await db
          .insert(productVariants)
          .values({
            productId: newProduct.id,
            sku: v.sku.toUpperCase(),
            size: v.size,
            colorName: v.colorName,
            colorHex: v.colorHex,
            priceOverridePaise: v.priceOverridePaise || null,
            isActive: true,
          })
          .returning();

        if (newVariant) {
          await db.insert(inventory).values({
            variantId: newVariant.id,
            quantityAvailable: v.initialStock,
            quantityReserved: 0,
            lowStockThreshold: 5,
          });
        }
      }

      // Audit log entry
      await db.insert(auditLogs).values({
        adminUserId: request.user!.userId,
        entityType: 'product',
        entityId: newProduct.id,
        action: 'CREATE',
        diffAfter: { title: newProduct.title, slug: newProduct.slug },
        ipAddress: request.ip || '127.0.0.1',
      });

      // Dispatch newsletter broadcast to subscribers if product is published
      if (newProduct.status === 'published') {
        (async () => {
          try {
            const subs = await db
              .select({ email: newsletterSubscribers.email })
              .from(newsletterSubscribers)
              .where(eq(newsletterSubscribers.isActive, true));

            if (subs.length > 0) {
              const primaryImg = payload.images.find((im) => im.isPrimary) || payload.images[0];
              await sendProductReleaseAnnouncementEmail({
                subscribers: subs.map((s) => s.email),
                product: {
                  title: newProduct.title,
                  slug: newProduct.slug,
                  description: newProduct.shortDescription || newProduct.description,
                  primaryImageUrl: primaryImg?.url,
                  basePricePaise: newProduct.basePricePaise,
                  categoryName: existingCategory ? undefined : undefined,
                },
              });
            }
          } catch (err) {
            request.log.warn({ err }, 'Failed to dispatch newsletter broadcast for new product');
          }
        })();
      }

      return reply.status(201).send({
        success: true,
        data: {
          productId: newProduct.id,
          slug: newProduct.slug,
        },
      });
    }
  );

  // 4. UPDATE INVENTORY
  typedFastify.patch(
    '/inventory/:variantId',
    {
      schema: {
        params: z.object({
          variantId: z.string().uuid(),
        }),
        body: UpdateInventoryRequestSchema,
        response: {
          200: ApiResponseSchema(z.object({ updated: z.literal(true) })),
        },
      },
    },
    async (request, reply) => {
      const { variantId } = request.params;
      const { quantityAvailable, lowStockThreshold } = request.body;
      const db = getDbClient();

      const [existing] = await db
        .select()
        .from(inventory)
        .where(eq(inventory.variantId, variantId))
        .limit(1);

      if (!existing) {
        throw new NotFoundError('Inventory record not found for variant');
      }

      const updateValues: Record<string, any> = {
        quantityAvailable,
        updatedAt: new Date(),
      };
      if (lowStockThreshold !== undefined) {
        updateValues.lowStockThreshold = lowStockThreshold;
      }

      await db
        .update(inventory)
        .set(updateValues)
        .where(eq(inventory.variantId, variantId));

      // Audit log entry
      await db.insert(auditLogs).values({
        adminUserId: request.user!.userId,
        entityType: 'inventory',
        entityId: variantId,
        action: 'UPDATE',
        diffBefore: { quantityAvailable: existing.quantityAvailable },
        diffAfter: { quantityAvailable },
        ipAddress: request.ip || '127.0.0.1',
      });

      return reply.send({
        success: true,
        data: {
          updated: true,
        },
      });
    }
  );

  // 5. CSV VALIDATION
  typedFastify.post(
    '/products/csv-validate',
    {
      schema: {
        body: z.object({
          csvContent: z.string().min(1),
        }),
        response: {
          200: CsvValidationResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { csvContent } = request.body;
      const lines = csvContent.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);

      if (lines.length <= 1) {
        return reply.send({
          success: true,
          data: {
            totalRows: 0,
            validRows: 0,
            errorRows: 0,
            errors: [{ row: 0, field: 'csvContent', message: 'CSV file is empty or missing headers' }],
            previewData: [],
          },
        });
      }

      const headers = lines[0]!.split(',').map((h) => h.trim());
      const dataRows = lines.slice(1);
      const errors: Array<{ row: number; field: string; message: string }> = [];
      const validData: any[] = [];

      dataRows.forEach((line, idx) => {
        const rowNumber = idx + 2;
        const values = line.split(',').map((v) => v.trim());
        const rowObj: Record<string, any> = {};
        headers.forEach((h, i) => {
          rowObj[h] = values[i];
        });

        const parsed = CsvProductRowSchema.safeParse(rowObj);
        if (parsed.success) {
          validData.push(parsed.data);
        } else {
          parsed.error.issues.forEach((issue) => {
            errors.push({
              row: rowNumber,
              field: issue.path.join('.'),
              message: issue.message,
            });
          });
        }
      });

      return reply.send({
        success: true,
        data: {
          totalRows: dataRows.length,
          validRows: validData.length,
          errorRows: errors.length,
          errors,
          previewData: validData.slice(0, 10),
        },
      });
    }
  );

  // 6. CSV BATCH IMPORT
  typedFastify.post(
    '/products/csv-import',
    {
      schema: {
        body: z.object({
          rows: z.array(CsvProductRowSchema).min(1),
        }),
        response: {
          200: ApiResponseSchema(z.object({ importedCount: z.number().int() })),
        },
      },
    },
    async (request, reply) => {
      const { rows } = request.body;
      const db = getDbClient();

      const allCategories = await db.select().from(categories);
      const catMap = new Map(allCategories.map((c) => [c.slug.toLowerCase(), c.id]));

      let count = 0;
      for (const row of rows) {
        let catId = catMap.get(row.categorySlug.toLowerCase());
        if (!catId) {
          const [newCat] = await db
            .insert(categories)
            .values({
              name: row.categorySlug.charAt(0).toUpperCase() + row.categorySlug.slice(1),
              slug: row.categorySlug.toLowerCase(),
            })
            .returning({ id: categories.id });
          if (newCat) {
            catId = newCat.id;
            catMap.set(row.categorySlug.toLowerCase(), catId);
          }
        }

        if (!catId) continue;

        const slug = row.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        // Insert or find product
        let [existingProduct] = await db
          .select({ id: products.id })
          .from(products)
          .where(eq(products.slug, slug))
          .limit(1);

        if (!existingProduct) {
          const [created] = await db
            .insert(products)
            .values({
              categoryId: catId,
              title: row.title,
              slug,
              description: `Editorial cut in ${row.fabricSpecification}`,
              fabricSpecification: row.fabricSpecification,
              collectionName: row.collectionName?.trim() || 'Permanent Core',
              basePricePaise: Math.round(row.priceInr * 100),
              hsnCode: row.hsnCode,
              gstRatePercent: row.gstRate,
              status: 'published',
            })
            .returning({ id: products.id });
          existingProduct = created;
        }

        if (existingProduct) {
          if (row.imageUrl && row.imageUrl.trim()) {
            const [existingImg] = await db
              .select({ id: productImages.id })
              .from(productImages)
              .where(eq(productImages.productId, existingProduct.id))
              .limit(1);

            if (!existingImg) {
              await db.insert(productImages).values({
                productId: existingProduct.id,
                url: row.imageUrl.trim(),
                altText: row.title,
                sortOrder: 0,
                isPrimary: true,
              });
            }
          }

          const [v] = await db
            .insert(productVariants)
            .values({
              productId: existingProduct.id,
              sku: row.sku.toUpperCase(),
              size: row.size,
              colorName: row.colorName,
              colorHex: row.colorHex,
              isActive: true,
            })
            .onConflictDoNothing()
            .returning({ id: productVariants.id });

          if (v) {
            await db
              .insert(inventory)
              .values({
                variantId: v.id,
                quantityAvailable: row.stockQuantity,
                quantityReserved: 0,
                lowStockThreshold: 5,
              })
              .onConflictDoNothing();
          }
          count++;
        }
      }

      await db.insert(auditLogs).values({
        adminUserId: request.user!.userId,
        entityType: 'product',
        entityId: 'csv_batch',
        action: 'CREATE',
        diffAfter: { importedCount: count },
        ipAddress: request.ip || '127.0.0.1',
      });

      return reply.send({
        success: true,
        data: {
          importedCount: count,
        },
      });
    }
  );

  // 7. CLOUDINARY MEDIA UPLOAD
  fastify.post('/uploads', async (request, reply) => {
    if (request.isMultipart()) {
      const fileData = await request.file();
      if (!fileData) {
        throw new BadRequestError('No image file received');
      }
      const buffer = await fileData.toBuffer();
      const prefix = fileData.filename
        ? fileData.filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_')
        : 'garment';
      const result = await uploadBufferToCloudinary(buffer, 'atelier/products', prefix);
      return reply.send({
        success: true,
        data: result,
      });
    }

    const body = request.body as any;
    if (body?.dataUri || body?.base64) {
      const result = await uploadBase64ToCloudinary(body.dataUri || body.base64, 'atelier/products');
      return reply.send({
        success: true,
        data: result,
      });
    }

    throw new BadRequestError('Expected multipart file upload or JSON with base64 dataUri');
  });

  // 8. CLOUDINARY SIGNED PARAMS
  fastify.get('/uploads/signature', async (_request, reply) => {
    const params = generateSignedUploadParams('atelier/products');
    return reply.send({
      success: true,
      data: params,
    });
  });

  // 9. INTEGRATIONS STATUS (Cloudinary & Brevo)
  fastify.get('/integrations/status', async (_request, reply) => {
    return reply.send({
      success: true,
      data: {
        cloudinary: {
          configured: isCloudinaryConfigured(),
        },
        brevo: {
          configured: isBrevoConfigured(),
        },
      },
    });
  });

  // 10. DELETE PRODUCT (Soft delete)
  typedFastify.delete(
    '/products/:id',
    {
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const db = getDbClient();

      const [existing] = await db
        .select()
        .from(products)
        .where(and(eq(products.id, id), isNull(products.deletedAt)))
        .limit(1);

      if (!existing) {
        throw new NotFoundError(`Product '${id}' not found`);
      }

      await db
        .update(products)
        .set({ deletedAt: new Date(), status: 'archived' })
        .where(eq(products.id, id));

      await db.insert(auditLogs).values({
        adminUserId: request.user!.userId,
        entityType: 'product',
        entityId: id,
        action: 'DELETE',
        diffBefore: { title: existing.title, slug: existing.slug },
        ipAddress: request.ip || '127.0.0.1',
      });

      return reply.send({
        success: true,
        data: {
          deleted: true,
          id,
        },
      });
    }
  );

  // 11. CREATE CATEGORY
  typedFastify.post(
    '/categories',
    {
      schema: {
        body: z.object({
          name: z.string().min(1),
          slug: z.string().optional(),
          description: z.string().optional(),
          displayOrder: z.number().int().default(0),
        }),
      },
    },
    async (request, reply) => {
      const { name, slug, description, displayOrder } = request.body;
      const db = getDbClient();

      const catSlug = (slug || name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const [newCategory] = await db
        .insert(categories)
        .values({
          name,
          slug: catSlug,
          description: description || null,
          displayOrder,
          isActive: true,
        })
        .returning();

      if (!newCategory) {
        throw new Error('Failed to create category');
      }

      if (request.user?.userId) {
        await db.insert(auditLogs).values({
          adminUserId: request.user.userId,
          entityType: 'category',
          entityId: newCategory.id,
          action: 'CREATE',
          diffAfter: { name: newCategory.name, slug: newCategory.slug },
          ipAddress: request.ip || '127.0.0.1',
        });
      }

      return reply.status(201).send({
        success: true,
        data: newCategory,
      });
    }
  );

  // 12. DELETE CATEGORY
  typedFastify.delete(
    '/categories/:id',
    {
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const db = getDbClient();

      const [existing] = await db
        .select()
        .from(categories)
        .where(and(eq(categories.id, id), isNull(categories.deletedAt)))
        .limit(1);

      if (!existing) {
        throw new NotFoundError(`Category '${id}' not found`);
      }

      await db
        .update(categories)
        .set({ deletedAt: new Date(), isActive: false })
        .where(eq(categories.id, id));

      return reply.send({
        success: true,
        data: { deleted: true, id },
      });
    }
  );

  // 13. GET COLLECTIONS (Catalog & Custom)
  typedFastify.get('/collections', async (_request, reply) => {
    const db = getDbClient();

    const tableCollections = await db
      .select()
      .from(collections)
      .where(and(eq(collections.isActive, true), isNull(collections.deletedAt)))
      .orderBy(desc(collections.createdAt));

    const productCollections = await db
      .selectDistinct({ name: products.collectionName })
      .from(products)
      .where(isNull(products.deletedAt));

    const set = new Set<string>();
    const result: Array<{ id: string; name: string; slug: string; description: string | null; isCustom: boolean }> = [];

    for (const c of tableCollections) {
      set.add(c.name.toLowerCase());
      result.push({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        isCustom: true,
      });
    }

    for (const p of productCollections) {
      if (p.name && !set.has(p.name.toLowerCase())) {
        set.add(p.name.toLowerCase());
        const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        result.push({
          id: slug,
          name: p.name,
          slug,
          description: null,
          isCustom: false,
        });
      }
    }

    return reply.send({
      success: true,
      data: result,
    });
  });

  // 14. CREATE COLLECTION
  typedFastify.post(
    '/collections',
    {
      schema: {
        body: z.object({
          name: z.string().min(1),
          slug: z.string().optional(),
          description: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      const { name, slug, description } = request.body;
      const db = getDbClient();

      const colSlug = (slug || name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const [newCol] = await db
        .insert(collections)
        .values({
          name,
          slug: colSlug,
          description: description || null,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: collections.name,
          set: {
            deletedAt: null,
            isActive: true,
            description: description || null,
            updatedAt: new Date(),
          },
        })
        .returning();

      return reply.status(201).send({
        success: true,
        data: newCol,
      });
    }
  );

  // 15. DELETE COLLECTION
  typedFastify.delete(
    '/collections/:id',
    {
      schema: {
        params: z.object({
          id: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const db = getDbClient();

      await db
        .update(collections)
        .set({ deletedAt: new Date(), isActive: false })
        .where(eq(collections.id, id));

      return reply.send({
        success: true,
        data: { deleted: true, id },
      });
    }
  );

  // 16. GET ALL ORDERS (Paginated with search and status filtering)
  typedFastify.get(
    '/orders',
    {
      schema: {
        querystring: z.object({
          page: z.coerce.number().int().min(1).default(1),
          limit: z.coerce.number().int().min(1).max(50).default(15),
          status: z.enum(['pending_payment', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']).optional(),
          search: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      const { page, limit, status, search } = request.query;
      const offset = (page - 1) * limit;
      const db = getDbClient();

      const conditions = [];
      if (status) {
        conditions.push(eq(orders.status, status));
      }
      if (search && search.trim()) {
        const query = `%${search.trim()}%`;
        conditions.push(
          or(
            ilike(orders.orderNumber, query),
            ilike(orders.guestEmail, query),
            ilike(orders.guestPhone, query)
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(orders)
        .where(whereClause);

      const total = countResult?.count || 0;
      const totalPages = Math.ceil(total / limit) || 1;

      const orderList = await db
        .select()
        .from(orders)
        .where(whereClause)
        .orderBy(desc(orders.createdAt))
        .limit(limit)
        .offset(offset);

      if (orderList.length === 0) {
        return reply.send({
          success: true,
          data: {
            items: [],
            pagination: {
              page,
              limit,
              total,
              totalPages,
              hasNextPage: page < totalPages,
              hasPrevPage: page > 1,
            },
          },
        });
      }

      const orderIds = orderList.map((o) => o.id);
      const addressIds = orderList.map((o) => o.shippingAddressId).filter(Boolean);

      const [items, addrs, shipList] = await Promise.all([
        db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds)),
        addressIds.length > 0
          ? db.select().from(addresses).where(inArray(addresses.id, addressIds))
          : [],
        db.select().from(shipments).where(inArray(shipments.orderId, orderIds)),
      ]);

      const itemsWithRelations = orderList.map((order) => {
        const shippingAddress = addrs.find((a) => a.id === order.shippingAddressId) || null;
        const shipment = shipList.find((s) => s.orderId === order.id) || null;
        const orderLineItems = items.filter((i) => i.orderId === order.id);

        return {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          totalPaise: order.totalPaise,
          subtotalPaise: order.subtotalPaise,
          shippingFeePaise: order.shippingFeePaise,
          discountPaise: order.discountPaise,
          taxPaise: order.taxPaise,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          createdAt: order.createdAt.toISOString(),
          customerName: shippingAddress?.name || order.guestEmail || 'Patron',
          customerEmail: order.guestEmail,
          customerPhone: shippingAddress?.phone || order.guestPhone,
          itemsCount: orderLineItems.reduce((acc, curr) => acc + curr.quantity, 0),
          shippingAddress: shippingAddress
            ? {
                name: shippingAddress.name,
                phone: shippingAddress.phone,
                city: shippingAddress.city,
                state: shippingAddress.state,
                postalCode: shippingAddress.postalCode,
                addressLine1: shippingAddress.addressLine1,
                addressLine2: shippingAddress.addressLine2,
              }
            : null,
          shipment: shipment
            ? {
                id: shipment.id,
                carrier: shipment.carrier,
                trackingNumber: shipment.trackingNumber,
                trackingUrl: shipment.trackingUrl,
                status: shipment.status,
                dispatchedAt: shipment.dispatchedAt ? shipment.dispatchedAt.toISOString() : null,
                deliveredAt: shipment.deliveredAt ? shipment.deliveredAt.toISOString() : null,
              }
            : null,
        };
      });

      return reply.send({
        success: true,
        data: {
          items: itemsWithRelations,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        },
      });
    }
  );

  // 17. GET SINGLE ORDER DETAILS
  typedFastify.get(
    '/orders/:id',
    {
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const db = getDbClient();

      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, id))
        .limit(1);

      if (!order) {
        throw new NotFoundError('Order not found');
      }

      const [shippingAddr, billingAddr, lineItems, shipment, paymentList] = await Promise.all([
        db.select().from(addresses).where(eq(addresses.id, order.shippingAddressId)).limit(1),
        db.select().from(addresses).where(eq(addresses.id, order.billingAddressId)).limit(1),
        db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
        db.select().from(shipments).where(eq(shipments.orderId, order.id)).limit(1),
        db.select().from(payments).where(eq(payments.orderId, order.id)),
      ]);

      return reply.send({
        success: true,
        data: {
          ...order,
          createdAt: order.createdAt.toISOString(),
          updatedAt: order.updatedAt.toISOString(),
          shippingAddress: shippingAddr[0] || null,
          billingAddress: billingAddr[0] || null,
          items: lineItems,
          shipment: shipment[0] || null,
          payments: paymentList,
        },
      });
    }
  );

  // 18. UPDATE ORDER STATUS
  typedFastify.patch(
    '/orders/:id/status',
    {
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        body: z.object({
          status: z.enum(['pending_payment', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']),
          notes: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { status, notes } = request.body;
      const db = getDbClient();

      const [existing] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
      if (!existing) {
        throw new NotFoundError('Order not found');
      }

      const [updated] = await db
        .update(orders)
        .set({
          status,
          notes: notes !== undefined ? notes : existing.notes,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, id))
        .returning();

      return reply.send({
        success: true,
        data: updated,
      });
    }
  );

  // 19. ASSIGN OR UPDATE FULFILLMENT / DELIVERY SERVICE
  typedFastify.post(
    '/orders/:id/fulfillment',
    {
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        body: z.object({
          carrierId: z.string().uuid().optional(),
          carrier: z.string().min(1),
          trackingNumber: z.string().min(1),
          trackingUrl: z.string().optional(),
          status: z.enum(['label_created', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered']).default('in_transit'),
          notifyCustomer: z.boolean().default(true),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { carrierId, carrier, trackingNumber, trackingUrl, status, notifyCustomer } = request.body;
      const db = getDbClient();

      const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
      if (!order) {
        throw new NotFoundError('Order not found');
      }

      // Auto-resolve tracking URL from carrier template if not explicitly provided
      let resolvedTrackingUrl = trackingUrl ? trackingUrl.trim() : null;
      let matchedCarrierId = carrierId || null;

      if (!matchedCarrierId) {
        const [foundCarrier] = await db
          .select()
          .from(carriers)
          .where(and(eq(carriers.name, carrier.trim()), isNull(carriers.deletedAt)))
          .limit(1);
        if (foundCarrier) {
          matchedCarrierId = foundCarrier.id;
          if (!resolvedTrackingUrl && foundCarrier.trackingUrlTemplate) {
            resolvedTrackingUrl = foundCarrier.trackingUrlTemplate.replace('{trackingNumber}', trackingNumber.trim());
          }
        }
      } else {
        const [foundCarrier] = await db
          .select()
          .from(carriers)
          .where(eq(carriers.id, matchedCarrierId))
          .limit(1);
        if (foundCarrier && !resolvedTrackingUrl && foundCarrier.trackingUrlTemplate) {
          resolvedTrackingUrl = foundCarrier.trackingUrlTemplate.replace('{trackingNumber}', trackingNumber.trim());
        }
      }

      const [existingShipment] = await db
        .select()
        .from(shipments)
        .where(eq(shipments.orderId, order.id))
        .limit(1);

      let savedShipment;

      const dispatchedAt = status !== 'label_created' ? new Date() : null;
      const deliveredAt = status === 'delivered' ? new Date() : null;

      if (existingShipment) {
        const [updated] = await db
          .update(shipments)
          .set({
            carrierId: matchedCarrierId,
            carrier: carrier.trim(),
            trackingNumber: trackingNumber.trim(),
            trackingUrl: resolvedTrackingUrl,
            status,
            dispatchedAt: dispatchedAt || existingShipment.dispatchedAt,
            deliveredAt: deliveredAt || existingShipment.deliveredAt,
            updatedAt: new Date(),
          })
          .where(eq(shipments.id, existingShipment.id))
          .returning();
        savedShipment = updated;
      } else {
        const [inserted] = await db
          .insert(shipments)
          .values({
            orderId: order.id,
            carrierId: matchedCarrierId,
            carrier: carrier.trim(),
            trackingNumber: trackingNumber.trim(),
            trackingUrl: resolvedTrackingUrl,
            status,
            dispatchedAt: dispatchedAt || undefined,
            deliveredAt: deliveredAt || undefined,
          })
          .returning();
        savedShipment = inserted;
      }

      // Automatically sync order status
      let newOrderStatus = order.status;
      if (status === 'delivered') {
        newOrderStatus = 'delivered';
      } else if (['picked_up', 'in_transit', 'out_for_delivery'].includes(status)) {
        newOrderStatus = 'shipped';
      } else if (status === 'label_created' && order.status === 'confirmed') {
        newOrderStatus = 'processing';
      }

      if (newOrderStatus !== order.status) {
        await db
          .update(orders)
          .set({ status: newOrderStatus, updatedAt: new Date() })
          .where(eq(orders.id, order.id));
      }

      // Send dispatch notification email if requested
      if (notifyCustomer && order.guestEmail) {
        const [shipAddr] = await db
          .select()
          .from(addresses)
          .where(eq(addresses.id, order.shippingAddressId))
          .limit(1);

        sendShipmentNotificationEmail({
          orderNumber: order.orderNumber,
          customerName: shipAddr?.name || 'Patron',
          customerEmail: order.guestEmail,
          carrier: carrier.trim(),
          trackingNumber: trackingNumber.trim(),
          trackingUrl: resolvedTrackingUrl || undefined,
        }).catch((err) => {
          console.error('Failed to send dispatch email:', err);
        });
      }

      return reply.send({
        success: true,
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          orderStatus: newOrderStatus,
          shipment: savedShipment,
        },
      });
    }
  );

  // 20. GET ALL ACTIVE CARRIERS
  typedFastify.get(
    '/carriers',
    async (_request, reply) => {
      const db = getDbClient();
      const carrierList = await db
        .select()
        .from(carriers)
        .where(and(eq(carriers.isActive, true), isNull(carriers.deletedAt)))
        .orderBy(asc(carriers.name));

      return reply.send({
        success: true,
        data: carrierList,
      });
    }
  );

  // 21. CREATE NEW CARRIER
  typedFastify.post(
    '/carriers',
    {
      schema: {
        body: z.object({
          name: z.string().min(2),
          code: z.string().min(2).toLowerCase(),
          trackingUrlTemplate: z.string().default(''),
          contactPhone: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      const { name, code, trackingUrlTemplate, contactPhone } = request.body;
      const db = getDbClient();

      const [newCarrier] = await db
        .insert(carriers)
        .values({
          name: name.trim(),
          code: code.trim().toLowerCase(),
          trackingUrlTemplate: trackingUrlTemplate.trim(),
          contactPhone: contactPhone?.trim() || null,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: carriers.code,
          set: {
            name: name.trim(),
            trackingUrlTemplate: trackingUrlTemplate.trim(),
            contactPhone: contactPhone?.trim() || null,
            isActive: true,
            deletedAt: null,
            updatedAt: new Date(),
          },
        })
        .returning();

      return reply.status(201).send({
        success: true,
        data: newCarrier,
      });
    }
  );

  // 22. DELETE / DEACTIVATE CARRIER
  typedFastify.delete(
    '/carriers/:id',
    {
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const db = getDbClient();

      await db
        .update(carriers)
        .set({ isActive: false, deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(carriers.id, id));

      return reply.send({
        success: true,
        data: { deleted: true, id },
      });
    }
  );

  // 23. LIST ALL COUPONS
  typedFastify.get(
    '/coupons',
    async (_request, reply) => {
      const db = getDbClient();
      const list = await db
        .select()
        .from(coupons)
        .orderBy(desc(coupons.createdAt));

      return reply.send({
        success: true,
        data: list,
      });
    }
  );

  // 24. CREATE COUPON
  typedFastify.post(
    '/coupons',
    {
      schema: {
        body: z.object({
          code: z.string().min(2).max(50),
          discountType: z.enum(['percentage', 'flat_paise']),
          discountValue: z.number().int().positive(),
          minOrderValuePaise: z.number().int().nonnegative().default(0),
          maxDiscountPaise: z.number().int().positive().nullable().optional(),
          usageLimitTotal: z.number().int().positive().nullable().optional(),
          usageLimitPerUser: z.number().int().positive().default(1),
          validFrom: z.string().datetime().optional(),
          validUntil: z.string().datetime(),
          isActive: z.boolean().default(true),
        }),
      },
    },
    async (request, reply) => {
      const payload = request.body;
      const cleanCode = payload.code.trim().toUpperCase();
      const db = getDbClient();

      const [existing] = await db
        .select({ id: coupons.id })
        .from(coupons)
        .where(eq(coupons.code, cleanCode))
        .limit(1);

      if (existing) {
        throw new BadRequestError(`Coupon with code "${cleanCode}" already exists.`);
      }

      const [newCoupon] = await db
        .insert(coupons)
        .values({
          code: cleanCode,
          discountType: payload.discountType,
          discountValue: payload.discountValue,
          minOrderValuePaise: payload.minOrderValuePaise,
          maxDiscountPaise: payload.maxDiscountPaise || null,
          usageLimitTotal: payload.usageLimitTotal || null,
          usageLimitPerUser: payload.usageLimitPerUser,
          validFrom: payload.validFrom ? new Date(payload.validFrom) : new Date(),
          validUntil: new Date(payload.validUntil),
          isActive: payload.isActive,
        })
        .returning();

      return reply.status(201).send({
        success: true,
        data: newCoupon,
      });
    }
  );

  // 25. TOGGLE COUPON STATUS
  typedFastify.patch(
    '/coupons/:id/toggle',
    {
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const db = getDbClient();

      const [existing] = await db
        .select()
        .from(coupons)
        .where(eq(coupons.id, id))
        .limit(1);

      if (!existing) {
        throw new NotFoundError('Coupon not found');
      }

      const [updated] = await db
        .update(coupons)
        .set({ isActive: !existing.isActive })
        .where(eq(coupons.id, id))
        .returning();

      return reply.send({
        success: true,
        data: updated,
      });
    }
  );

  // 26. DELETE COUPON
  typedFastify.delete(
    '/coupons/:id',
    {
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const db = getDbClient();

      await db.delete(coupons).where(eq(coupons.id, id));

      return reply.send({
        success: true,
        data: { deleted: true, id },
      });
    }
  );

  // 27. GET NEWSLETTER SUBSCRIBERS
  typedFastify.get(
    '/newsletter/subscribers',
    async (_request, reply) => {
      const db = getDbClient();
      const subs = await db
        .select()
        .from(newsletterSubscribers)
        .orderBy(desc(newsletterSubscribers.subscribedAt));

      return reply.send({
        success: true,
        data: {
          total: subs.length,
          totalCount: subs.length,
          activeCount: subs.filter((s) => s.isActive).length,
          subscribers: subs,
        },
      });
    }
  );

  // 28. BROADCAST NEWSLETTER TO SUBSCRIBERS
  typedFastify.post(
    '/newsletter/broadcast',
    {
      schema: {
        body: z.object({
          subject: z.string().min(3),
          headline: z.string().min(3),
          bodyText: z.string().min(10),
          ctaText: z.string().optional(),
          ctaUrl: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      const { subject, headline, bodyText, ctaText, ctaUrl } = request.body;
      const db = getDbClient();

      const subs = await db
        .select({ email: newsletterSubscribers.email })
        .from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.isActive, true));

      if (subs.length === 0) {
        return reply.send({
          success: true,
          data: { sentCount: 0, message: 'No active subscribers found to broadcast.' },
        });
      }

      // Dispatch announcement asynchronously
      (async () => {
        try {
          const storefrontUrl = env.STOREFRONT_URL || 'http://localhost:3000';
          const link = ctaUrl || `${storefrontUrl}/catalog`;
          const btnText = ctaText || 'Explore Permanent Archive \u2192';

          const emailBody = `
            <div class="headline" style="font-size: 24px; line-height: 1.3; margin-bottom: 16px;">
              ${headline}
            </div>
            <p class="body-text" style="font-size: 13px; line-height: 1.6; color: #444; margin-bottom: 24px;">
              ${bodyText}
            </p>
            <div style="text-align: center; margin-top: 28px;">
              <a href="${link}" style="display: inline-block; padding: 14px 28px; background-color: #1B1C1A; color: #FAF9F6; text-decoration: none; font-size: 11px; font-family: 'Courier New', monospace; text-transform: uppercase; letter-spacing: 0.15em;">
                ${btnText}
              </a>
            </div>
          `;

          const { sendEmail, wrapAtelierEmailTemplate } = await import('../services/email.js');
          const batchSize = 10;
          for (let i = 0; i < subs.length; i += batchSize) {
            const chunk = subs.slice(i, i + batchSize);
            await sendEmail({
              to: chunk.map((s) => ({ email: s.email })),
              subject: `${subject} | ATELIER`,
              htmlContent: wrapAtelierEmailTemplate(headline, emailBody),
              textContent: `${headline}: ${bodyText} - ${link}`,
            });
          }
        } catch (err) {
          request.log.warn({ err }, 'Failed to process newsletter broadcast');
        }
      })();

      return reply.send({
        success: true,
        data: {
          sentCount: subs.length,
          message: `Broadcast initiated for ${subs.length} active registry patrons.`,
        },
      });
    }
  );
};

