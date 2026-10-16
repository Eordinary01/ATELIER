import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  getDbClient,
  products,
  categories,
  productVariants,
  eq,
  and,
  isNull,
  gte,
  lte,
  ilike,
  or,
  asc,
  desc,
} from '@atelier/database';
import {
  CatalogFilterQuerySchema,
  ProductCardSchema,
  ProductDetailSchema,
  ApiResponseSchema,
  SizeEnum,
  ProductCard,
  ProductDetail,
} from '@atelier/contract';
import { NotFoundError } from '../lib/errors.js';

const ProductsListResponseSchema = ApiResponseSchema(z.array(ProductCardSchema));
const ProductDetailResponseSchema = ApiResponseSchema(ProductDetailSchema);

const CatalogFacetsResponseSchema = ApiResponseSchema(
  z.object({
    categories: z.array(
      z.object({
        id: z.string().uuid(),
        name: z.string(),
        slug: z.string(),
        count: z.number().int(),
      })
    ),
    collections: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        slug: z.string(),
        count: z.number().int(),
      })
    ),
    sizes: z.array(SizeEnum),
    colors: z.array(
      z.object({
        name: z.string(),
        hex: z.string(),
      })
    ),
    priceRange: z.object({
      minPaise: z.number().int(),
      maxPaise: z.number().int(),
    }),
  })
);

function formatProductCard(p: any): ProductCard {
  // Sort images and find primary
  const images = (p.images || []).sort(
    (a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0)
  );
  const primary = images.find((img: any) => img.isPrimary) || images[0] || {
    id: p.id,
    productId: p.id,
    url: 'https://images.unsplash.com/photo-1523381294911-8d3cead13475',
    altText: p.title,
    sortOrder: 0,
    isPrimary: true,
  };

  const variants = p.variants || [];

  // Available unique sizes
  const availableSizesSet = new Set<string>();
  const colorMap = new Map<string, string>();
  let totalAvailableStock = 0;

  for (const v of variants) {
    if (v.isActive) {
      availableSizesSet.add(v.size);
      if (v.colorName && v.colorHex) {
        colorMap.set(v.colorName, v.colorHex);
      }
      const stock = v.inventory?.quantityAvailable ?? 0;
      totalAvailableStock += stock;
    }
  }

  const colorShades = Array.from(colorMap.entries()).map(([name, hex]) => ({
    name,
    hex,
  }));

  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    shortDescription: p.shortDescription,
    fabricSpecification: p.fabricSpecification,
    collectionName: p.collectionName,
    status: p.status,
    basePricePaise: p.basePricePaise,
    compareAtPricePaise: p.compareAtPricePaise,
    category: {
      id: p.category.id,
      name: p.category.name,
      slug: p.category.slug,
    },
    primaryImage: {
      id: primary.id,
      productId: p.id,
      url: primary.url,
      altText: primary.altText || p.title,
      sortOrder: primary.sortOrder ?? 0,
      isPrimary: primary.isPrimary ?? false,
    },
    availableSizes: Array.from(availableSizesSet) as any,
    colorShades,
    isSoldOut: totalAvailableStock <= 0,
  };
}

function formatProductDetail(p: any): ProductDetail {
  const card = formatProductCard(p);
  const images = (p.images || []).sort(
    (a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0)
  );

  const formattedVariants = (p.variants || []).map((v: any) => ({
    id: v.id,
    productId: p.id,
    sku: v.sku,
    size: v.size,
    colorName: v.colorName,
    colorHex: v.colorHex,
    priceOverridePaise: v.priceOverridePaise,
    quantityAvailable: v.inventory?.quantityAvailable ?? 0,
    quantityReserved: v.inventory?.quantityReserved ?? 0,
    isActive: v.isActive,
  }));

  return {
    ...card,
    description: p.description,
    hsnCode: p.hsnCode,
    gstRatePercent: p.gstRatePercent,
    images: images.map((img: any) => ({
      id: img.id,
      productId: p.id,
      url: img.url,
      altText: img.altText || p.title,
      sortOrder: img.sortOrder ?? 0,
      isPrimary: img.isPrimary ?? false,
    })),
    variants: formattedVariants,
  };
}

export const productRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const typedFastify = fastify.withTypeProvider<ZodTypeProvider>();

  // 1. GET CATALOG FACETS (FILTER METADATA)
  typedFastify.get(
    '/facets',
    {
      schema: {
        response: {
          200: CatalogFacetsResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      const db = getDbClient();

      const activeCategories = await db
        .select()
        .from(categories)
        .where(and(eq(categories.isActive, true), isNull(categories.deletedAt)))
        .orderBy(asc(categories.displayOrder));

      const publishedProducts = await db
        .select({
          categoryId: products.categoryId,
          basePricePaise: products.basePricePaise,
        })
        .from(products)
        .where(and(eq(products.status, 'published'), isNull(products.deletedAt)));

      const catCounts = new Map<string, number>();
      let minPrice = Infinity;
      let maxPrice = 0;

      for (const p of publishedProducts) {
        catCounts.set(p.categoryId, (catCounts.get(p.categoryId) ?? 0) + 1);
        if (p.basePricePaise < minPrice) minPrice = p.basePricePaise;
        if (p.basePricePaise > maxPrice) maxPrice = p.basePricePaise;
      }

      const activeVariants = await db
        .select({
          size: productVariants.size,
          colorName: productVariants.colorName,
          colorHex: productVariants.colorHex,
        })
        .from(productVariants)
        .where(
          and(eq(productVariants.isActive, true), isNull(productVariants.deletedAt))
        );

      const sizeSet = new Set<string>();
      const colorMap = new Map<string, string>();
      for (const v of activeVariants) {
        sizeSet.add(v.size);
        if (v.colorName && v.colorHex) {
          colorMap.set(v.colorName, v.colorHex);
        }
      }

      const publishedCollections = await db
        .select({
          collectionName: products.collectionName,
        })
        .from(products)
        .where(and(eq(products.status, 'published'), isNull(products.deletedAt)));

      const colCounts = new Map<string, number>();
      for (const p of publishedCollections) {
        if (p.collectionName) {
          colCounts.set(p.collectionName, (colCounts.get(p.collectionName) ?? 0) + 1);
        }
      }

      const collectionsList = Array.from(colCounts.entries()).map(([name, count]) => ({
        id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        count,
      }));

      return reply.send({
        success: true,
        data: {
          categories: activeCategories.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            count: catCounts.get(c.id) ?? 0,
          })),
          collections: collectionsList,
          sizes: Array.from(sizeSet) as any,
          colors: Array.from(colorMap.entries()).map(([name, hex]) => ({
            name,
            hex,
          })),
          priceRange: {
            minPaise: minPrice === Infinity ? 0 : minPrice,
            maxPaise: maxPrice,
          },
        },
      });
    }
  );

  // 2. GET FILTERED & SEARCHED PRODUCTS (LIST / CATALOG)
  typedFastify.get(
    '/',
    {
      schema: {
        querystring: CatalogFilterQuerySchema,
        response: {
          200: ProductsListResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const {
        category,
        collection,
        sizes,
        colors,
        minPrice,
        maxPrice,
        sort,
        search,
        page,
        limit,
      } = request.query;

      const db = getDbClient();

      // Resolve category filter if slug provided
      let categoryIdFilter: string | undefined = undefined;
      if (category) {
        const [cat] = await db
          .select({ id: categories.id })
          .from(categories)
          .where(and(eq(categories.slug, category.toLowerCase()), isNull(categories.deletedAt)))
          .limit(1);
        if (cat) {
          categoryIdFilter = cat.id;
        } else {
          // Empty result if specified category does not exist
          return reply.send({
            success: true,
            data: [],
            meta: {
              page,
              total: 0,
              totalPages: 0,
            },
          });
        }
      }

      // Query products using Drizzle Relational API
      let sortOrder;
      switch (sort) {
        case 'price-asc':
          sortOrder = asc(products.basePricePaise);
          break;
        case 'price-desc':
          sortOrder = desc(products.basePricePaise);
          break;
        case 'newest':
          sortOrder = desc(products.createdAt);
          break;
        case 'featured':
        default:
          sortOrder = desc(products.createdAt);
          break;
      }

      // Base conditions
      const conditions = [
        eq(products.status, 'published'),
        isNull(products.deletedAt),
      ];

      if (categoryIdFilter) {
        conditions.push(eq(products.categoryId, categoryIdFilter));
      }

      if (collection && collection.trim().length > 0) {
        conditions.push(ilike(products.collectionName, collection.trim()));
      }

      if (minPrice !== undefined) {
        conditions.push(gte(products.basePricePaise, minPrice));
      }

      if (maxPrice !== undefined) {
        conditions.push(lte(products.basePricePaise, maxPrice));
      }

      if (search && search.trim().length > 0) {
        const term = `%${search.trim()}%`;
        conditions.push(
          or(
            ilike(products.title, term),
            ilike(products.description, term),
            ilike(products.fabricSpecification, term),
            ilike(products.collectionName, term)
          )!
        );
      }

      // Fetch all candidate products matching base & text filters
      const matchedProducts = await db.query.products.findMany({
        where: and(...conditions),
        orderBy: [sortOrder],
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

      // Filter in-memory for size and color variants if requested
      let filtered = matchedProducts;

      if (sizes && sizes.length > 0) {
        const targetSizes = new Set(sizes);
        filtered = filtered.filter((p) =>
          p.variants.some((v) => targetSizes.has(v.size as any) && v.isActive)
        );
      }

      if (colors && colors.length > 0) {
        const targetColors = new Set(colors.map((c) => c.toLowerCase()));
        filtered = filtered.filter((p) =>
          p.variants.some(
            (v) => targetColors.has(v.colorName.toLowerCase()) && v.isActive
          )
        );
      }

      const total = filtered.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const offset = (page - 1) * limit;
      const paginated = filtered.slice(offset, offset + limit);

      const data = paginated.map(formatProductCard);

      // Construct nextCursor if more items exist
      let nextCursor: string | null = null;
      if (offset + limit < total) {
        const nextItem = paginated[paginated.length - 1];
        if (nextItem) {
          nextCursor = Buffer.from(
            JSON.stringify({ page: page + 1, id: nextItem.id })
          ).toString('base64');
        }
      }

      return reply.send({
        success: true,
        data,
        meta: {
          page,
          total,
          totalPages,
          nextCursor,
        },
      });
    }
  );

  // 3. GET PRODUCT BY SLUG (DETAIL VIEW)
  typedFastify.get(
    '/:slug',
    {
      schema: {
        params: z.object({
          slug: z.string().min(1),
        }),
        response: {
          200: ProductDetailResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { slug } = request.params;
      const db = getDbClient();

      const product = await db.query.products.findFirst({
        where: and(
          eq(products.slug, slug.toLowerCase()),
          eq(products.status, 'published'),
          isNull(products.deletedAt)
        ),
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

      if (!product) {
        throw new NotFoundError(`Product '${slug}' not found`);
      }

      const formatted = formatProductDetail(product);

      return reply.send({
        success: true,
        data: formatted,
      });
    }
  );
};
