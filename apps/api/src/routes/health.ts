import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getDbClient, sql } from '@atelier/database';
import { pingRedis } from '../lib/redis.js';

export const healthRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/health', async (_request, reply) => {
    let dbOk = false;
    try {
      const db = getDbClient();
      await db.execute(sql`SELECT 1`);
      dbOk = true;
    } catch {
      dbOk = false;
    }

    const redisOk = await pingRedis();

    const isHealthy = dbOk; // DB is critical, Redis has in-memory fallback in dev

    return reply.status(isHealthy ? 200 : 503).send({
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: dbOk ? 'up' : 'down',
        redis: redisOk ? 'up' : 'down (fallback active)',
      },
      uptime: process.uptime(),
    });
  });

  fastify.get('/ready', async (_request, reply) => {
    return reply.send({ ready: true });
  });
};
