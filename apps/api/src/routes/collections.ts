import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  getDbClient,
  collections,
  products,
  eq,
  and,
  isNull,
  desc,
} from '@atelier/database';
import { ApiResponseSchema } from '@atelier/contract';

const CollectionItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable().optional(),
  itemCount: z.number().int(),
});

const CollectionsListResponseSchema = ApiResponseSchema(z.array(CollectionItemSchema));

export const collectionRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const typedFastify = fastify.withTypeProvider<ZodTypeProvider>();

  // GET ALL ACTIVE COLLECTIONS (FOR STOREFRONT FOOTER, FILTERS & NAVIGATION)
  typedFastify.get(
    '/',
    {
      schema: {
        response: {
          200: CollectionsListResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      const db = getDbClient();

      const tableCollections = await db
        .select()
        .from(collections)
        .where(and(eq(collections.isActive, true), isNull(collections.deletedAt)))
        .orderBy(desc(collections.createdAt));

      const publishedProducts = await db
        .select({
          collectionName: products.collectionName,
        })
        .from(products)
        .where(and(eq(products.status, 'published'), isNull(products.deletedAt)));

      const countMap = new Map<string, number>();
      for (const p of publishedProducts) {
        if (p.collectionName) {
          const key = p.collectionName.toLowerCase();
          countMap.set(key, (countMap.get(key) ?? 0) + 1);
        }
      }

      const seen = new Set<string>();
      const result: Array<{
        id: string;
        name: string;
        slug: string;
        description: string | null;
        itemCount: number;
      }> = [];

      for (const c of tableCollections) {
        const key = c.name.toLowerCase();
        seen.add(key);
        result.push({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description,
          itemCount: countMap.get(key) ?? 0,
        });
      }

      for (const p of publishedProducts) {
        if (p.collectionName) {
          const key = p.collectionName.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            const slug = p.collectionName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            result.push({
              id: slug,
              name: p.collectionName,
              slug,
              description: null,
              itemCount: countMap.get(key) ?? 0,
            });
          }
        }
      }

      return reply.send({
        success: true,
        data: result,
      });
    }
  );
};
