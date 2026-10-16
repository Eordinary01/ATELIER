import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';

import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { env } from './config/env.js';
import { errorHandler } from './lib/errors.js';
import { authPlugin } from './plugins/auth.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { categoryRoutes } from './routes/categories.js';
import { collectionRoutes } from './routes/collections.js';
import { productRoutes } from './routes/products.js';
import { adminRoutes } from './routes/admin.js';
import { checkoutRoutes } from './routes/checkout.js';
import { webhookRoutes } from './routes/webhooks.js';
import { couponRoutes } from './routes/coupons.js';
import { newsletterRoutes } from './routes/newsletter.js';


export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger:
      env.NODE_ENV === 'development'
        ? {
            transport: {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            },
          }
        : true,
    trustProxy: true,
  }).withTypeProvider<ZodTypeProvider>();

  // Set Zod compilers
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Allow empty bodies when Content-Type is application/json (e.g. DELETE requests)
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (_req, body, done) => {
      if (!body || (typeof body === 'string' && body.trim() === '')) {
        return done(null, undefined);
      }
      try {
        const json = JSON.parse(body as string);
        done(null, json);
      } catch (err: any) {
        done(err, undefined);
      }
    }
  );

  // Security & Middleware Plugins
  app.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV === 'production',
  });

  app.register(cors, {
    origin: env.CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders:
      env.NODE_ENV === 'production'
        ? ['Content-Type', 'Authorization', 'x-admin-secret']
        : ['Content-Type', 'Authorization', 'x-admin-secret', 'x-dev-admin'],
  });

  app.register(cookie, {
    secret: env.SESSION_SECRET,
  });

  app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max image size
      files: 5,
    },
  });

  // Rate Limiting
  app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    errorResponseBuilder: (_req, context) => ({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Too many requests from this IP. Please retry in ${context.after}`,
      },
    }),
  });

  // Auth Decorator Plugin
  app.register(authPlugin);


  // Global Error Handler
  app.setErrorHandler(errorHandler);

  // Register Routes
  app.register(healthRoutes);
  app.register(authRoutes, { prefix: '/api/v1/auth' });
  app.register(categoryRoutes, { prefix: '/api/v1/categories' });
  app.register(collectionRoutes, { prefix: '/api/v1/collections' });
  app.register(productRoutes, { prefix: '/api/v1/products' });
  app.register(adminRoutes, { prefix: '/api/v1/admin' });
  app.register(checkoutRoutes, { prefix: '/api/v1/checkout' });
  app.register(webhookRoutes, { prefix: '/api/v1/checkout' });
  app.register(couponRoutes, { prefix: '/api/v1/coupons' });
  app.register(newsletterRoutes, { prefix: '/api/v1/newsletter' });

  return app as unknown as FastifyInstance;
}

