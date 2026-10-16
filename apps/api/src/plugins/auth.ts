import { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { env } from '../config/env.js';
import { ForbiddenError, UnauthorizedError } from '../lib/errors.js';
import { UserRole } from '@atelier/contract';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (
      ...roles: UserRole[]
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      userId: string;
      email: string;
      role: UserRole;
    };
    user: {
      userId: string;
      email: string;
      role: UserRole;
    };
  }
}

import { getDbClient, users, eq } from '@atelier/database';

const authPluginCallback: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  await fastify.register(fastifyJwt, {
    secret: env.SESSION_SECRET,
  });

  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
      // 1. Check for Admin Secret header or local dev admin header
      const adminSecret = request.headers['x-admin-secret'];
      const isDevAdmin = env.NODE_ENV === 'development' && request.headers['x-dev-admin'] === 'true';

      if (
        isDevAdmin ||
        (typeof adminSecret === 'string' &&
          adminSecret.length > 0 &&
          (adminSecret === env.SESSION_SECRET || adminSecret === env.ADMIN_SESSION_SECRET))
      ) {
        try {
          const db = getDbClient();
          const [adminUser] = await db
            .select({ id: users.id, email: users.email, role: users.role })
            .from(users)
            .where(eq(users.role, 'admin_super'))
            .limit(1);

          if (adminUser) {
            request.user = {
              userId: adminUser.id,
              email: adminUser.email,
              role: adminUser.role as UserRole,
            };
            return;
          }
        } catch {
          // DB check failure
        }

        // Only allow fallback mock identity during local development
        if (env.NODE_ENV === 'development') {
          request.user = {
            userId: '7b5708cb-bd5c-4684-a5c2-2b2794235318',
            email: 'admin@atelier.in',
            role: 'admin_super',
          };
          return;
        }

        throw new UnauthorizedError('Administrative clearance failed: Admin account required');
      }

      // 2. Standard JWT Bearer verification
      try {
        await request.jwtVerify();
      } catch (err) {
        throw new UnauthorizedError('Invalid or expired authentication token');
      }
    }
  );

  fastify.decorate(
    'requireRole',
    (...roles: UserRole[]) => {
      return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
        // Run authentication first if not already authenticated
        if (!request.user) {
          await fastify.authenticate(request, reply);
        }

        if (!request.user || !roles.includes(request.user.role)) {
          throw new ForbiddenError(
            `Access restricted to role(s): ${roles.join(', ')}`
          );
        }
      };
    }
  );
};

export const authPlugin = fp(authPluginCallback, {
  name: 'atelier-auth-plugin',
});
