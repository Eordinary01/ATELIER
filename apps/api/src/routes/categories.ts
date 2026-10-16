import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { getDbClient, categories, products, eq, and, isNull, asc } from '@atelier/database';
import { CategorySchema, ApiResponseSchema } from '@atelier/contract';
import { NotFoundError } from '../lib/errors.js';

const CategoriesListResponseSchema = ApiResponseSchema(z.array(CategorySchema));
const CategorySingleResponseSchema = ApiResponseSchema(CategorySchema);

export const categoryRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const typedFastify = fastify.withTypeProvider<ZodTypeProvider>();

  // 1. GET ALL ACTIVE CATEGORIES
  typedFastify.get(
    '/',
    {
      schema: {
        response: {
          200: CategoriesListResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      const db = getDbClient();

      const allCategories = await db
        .select()
        .from(categories)
        .where(and(eq(categories.isActive, true), isNull(categories.deletedAt)))
        .orderBy(asc(categories.displayOrder));

      // Fetch product counts per category for published products
      const activeProducts = await db
        .select({
          categoryId: products.categoryId,
        })
        .from(products)
        .where(and(eq(products.status, 'published'), isNull(products.deletedAt)));

      const countMap = new Map<string, number>();
      for (const p of activeProducts) {
        countMap.set(p.categoryId, (countMap.get(p.categoryId) ?? 0) + 1);
      }

      const formatted = allCategories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        parentId: cat.parentId,
        displayOrder: cat.displayOrder,
        isActive: cat.isActive,
        itemCount: countMap.get(cat.id) ?? 0,
      }));

      return reply.send({
        success: true,
        data: formatted,
      });
    }
  );

  // 2. GET CATEGORY BY SLUG
  typedFastify.get(
    '/:slug',
    {
      schema: {
        params: z.object({
          slug: z.string().min(1),
        }),
        response: {
          200: CategorySingleResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { slug } = request.params;
      const db = getDbClient();

      const [cat] = await db
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.slug, slug.toLowerCase()),
            eq(categories.isActive, true),
            isNull(categories.deletedAt)
          )
        )
        .limit(1);

      if (!cat) {
        throw new NotFoundError(`Category '${slug}' not found`);
      }

      // Count products in this category
      const activeProducts = await db
        .select({ id: products.id })
        .from(products)
        .where(
          and(
            eq(products.categoryId, cat.id),
            eq(products.status, 'published'),
            isNull(products.deletedAt)
          )
        );

      return reply.send({
        success: true,
        data: {
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          parentId: cat.parentId,
          displayOrder: cat.displayOrder,
          isActive: cat.isActive,
          itemCount: activeProducts.length,
        },
      });
    }
  );
};
