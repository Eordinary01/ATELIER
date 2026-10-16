import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { randomUUID } from 'node:crypto';
import { getDbClient, users, addresses, orders, orderItems, shipments, eq, and, desc, inArray } from '@atelier/database';
import {
  LoginRequestSchema,
  RegisterRequestSchema,
  UserProfileSchema,
  ApiResponseSchema,
  UserRole,
} from '@atelier/contract';
import { z } from 'zod';
import { hashPassword, verifyPassword } from '../lib/argon2.js';
import { deleteSession, getSession, saveSession } from '../lib/redis.js';
import { ConflictError, NotFoundError, UnauthorizedError } from '../lib/errors.js';
import { env } from '../config/env.js';
import { sendWelcomeEmail } from '../services/email.js';

const AuthSuccessResponseSchema = ApiResponseSchema(
  z.object({
    user: UserProfileSchema,
    accessToken: z.string(),
  })
);

const RefreshSuccessResponseSchema = ApiResponseSchema(
  z.object({
    accessToken: z.string(),
  })
);

const MessageResponseSchema = ApiResponseSchema(
  z.object({
    message: z.string(),
  })
);

const ProfileResponseSchema = ApiResponseSchema(UserProfileSchema);

const COOKIE_NAME = 'atelier_refresh_token';
const REFRESH_TTL_SECONDS = env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60;

export const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const typedFastify = fastify.withTypeProvider<ZodTypeProvider>();

  // 1. REGISTER (Customer)
  typedFastify.post(
    '/register',
    {
      schema: {
        body: RegisterRequestSchema,
        response: {
          201: AuthSuccessResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { email, password, firstName, lastName, phone } = request.body;
      const db = getDbClient();

      // Check if user with email already exists
      const [existing] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
      if (existing) {
        throw new ConflictError('User with this email already exists');
      }

      // Hash password with Argon2id
      const passwordHash = await hashPassword(password);

      // Insert new user
      const [newUser] = await db
        .insert(users)
        .values({
          email: email.toLowerCase(),
          passwordHash,
          firstName,
          lastName,
          phone: phone || null,
          role: 'customer',
          isActive: true,
        })
        .returning();

      if (!newUser) {
        throw new Error('Failed to create user');
      }

      // Create JWT access token
      const accessToken = fastify.jwt.sign(
        {
          userId: newUser.id,
          email: newUser.email,
          role: newUser.role as UserRole,
        },
        { expiresIn: env.ACCESS_TOKEN_EXPIRES_IN }
      );

      // Create Redis session & refresh token
      const sessionId = randomUUID();
      await saveSession(
        sessionId,
        {
          userId: newUser.id,
          role: newUser.role,
          email: newUser.email,
          createdAt: new Date().toISOString(),
        },
        REFRESH_TTL_SECONDS
      );

      // Set httpOnly secure refresh cookie
      reply.setCookie(COOKIE_NAME, sessionId, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: env.NODE_ENV === 'production',
        maxAge: REFRESH_TTL_SECONDS,
      });

      // Dispatch welcome email asynchronously via Brevo
      sendWelcomeEmail({
        customerName: `${newUser.firstName} ${newUser.lastName}`.trim(),
        customerEmail: newUser.email,
      }).catch((err) => {
        request.log.warn({ err }, 'Failed to dispatch Brevo welcome email');
      });

      return reply.status(201).send({
        success: true,
        data: {
          user: {
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            phone: newUser.phone,
            role: newUser.role as UserRole,
            createdAt: newUser.createdAt.toISOString(),
          },
          accessToken,
        },
      });
    }
  );

  // 2. LOGIN
  typedFastify.post(
    '/login',
    {
      schema: {
        body: LoginRequestSchema,
        response: {
          200: AuthSuccessResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;
      const db = getDbClient();

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (!user || !user.isActive) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const isPasswordValid = await verifyPassword(user.passwordHash, password);
      if (!isPasswordValid) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const accessToken = fastify.jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role as UserRole,
        },
        { expiresIn: env.ACCESS_TOKEN_EXPIRES_IN }
      );

      const sessionId = randomUUID();
      await saveSession(
        sessionId,
        {
          userId: user.id,
          role: user.role,
          email: user.email,
          createdAt: new Date().toISOString(),
        },
        REFRESH_TTL_SECONDS
      );

      reply.setCookie(COOKIE_NAME, sessionId, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: env.NODE_ENV === 'production',
        maxAge: REFRESH_TTL_SECONDS,
      });

      return reply.send({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            role: user.role as UserRole,
            createdAt: user.createdAt.toISOString(),
          },
          accessToken,
        },
      });
    }
  );

  // 3. REFRESH TOKEN
  typedFastify.post(
    '/refresh',
    {
      schema: {
        body: z.object({ refreshToken: z.string().optional() }).optional(),
        response: {
          200: RefreshSuccessResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tokenFromCookie = request.cookies[COOKIE_NAME];
      const tokenFromBody = request.body?.refreshToken;
      const sessionId = tokenFromCookie || tokenFromBody;

      if (!sessionId) {
        throw new UnauthorizedError('Refresh token required');
      }

      const session = await getSession(sessionId);
      if (!session) {
        throw new UnauthorizedError('Session expired or invalid');
      }

      const db = getDbClient();
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);

      if (!user || !user.isActive) {
        await deleteSession(sessionId);
        throw new UnauthorizedError('Account is disabled or does not exist');
      }

      const newAccessToken = fastify.jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role as UserRole,
        },
        { expiresIn: env.ACCESS_TOKEN_EXPIRES_IN }
      );

      return reply.send({
        success: true,
        data: {
          accessToken: newAccessToken,
        },
      });
    }
  );

  // 4. LOGOUT
  typedFastify.post(
    '/logout',
    {
      schema: {
        response: {
          200: MessageResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const sessionId = request.cookies[COOKIE_NAME];
      if (sessionId) {
        await deleteSession(sessionId);
      }

      reply.clearCookie(COOKIE_NAME, {
        path: '/',
      });

      return reply.send({
        success: true,
        data: {
          message: 'Logged out successfully',
        },
      });
    }
  );

  // 5. CURRENT USER (ME)
  typedFastify.get(
    '/me',
    {
      preHandler: [fastify.authenticate],
      schema: {
        response: {
          200: ProfileResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const userId = request.user!.userId;
      const db = getDbClient();

      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user) {
        throw new NotFoundError('User profile not found');
      }

      return reply.send({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role as UserRole,
          createdAt: user.createdAt.toISOString(),
        },
      });
    }
  );

  // 6. GET USER SAVED ADDRESSES
  typedFastify.get(
    '/addresses',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const userId = request.user!.userId;
      const db = getDbClient();

      const userAddresses = await db
        .select()
        .from(addresses)
        .where(eq(addresses.userId, userId))
        .orderBy(desc(addresses.isDefault), desc(addresses.createdAt));

      return reply.send({
        success: true,
        data: userAddresses,
      });
    }
  );

  // 7. SAVE NEW ADDRESS
  typedFastify.post(
    '/addresses',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: z.object({
          name: z.string().min(1),
          phone: z.string().min(10),
          addressLine1: z.string().min(3),
          addressLine2: z.string().optional(),
          landmark: z.string().optional(),
          city: z.string().min(2),
          state: z.string().min(2),
          postalCode: z.string().regex(/^\d{6}$/, 'Enter valid 6-digit Indian PIN code'),
          country: z.string().default('India'),
          type: z.enum(['shipping', 'billing']).default('shipping'),
          isDefault: z.boolean().default(false),
        }),
      },
    },
    async (request, reply) => {
      const userId = request.user!.userId;
      const payload = request.body;
      const db = getDbClient();

      // If marked as default, unset other defaults
      if (payload.isDefault) {
        await db
          .update(addresses)
          .set({ isDefault: false })
          .where(and(eq(addresses.userId, userId), eq(addresses.type, payload.type)));
      }

      const [savedAddress] = await db
        .insert(addresses)
        .values({
          userId,
          type: payload.type,
          name: payload.name,
          phone: payload.phone,
          addressLine1: payload.addressLine1,
          addressLine2: payload.addressLine2 || null,
          landmark: payload.landmark || null,
          city: payload.city,
          state: payload.state,
          postalCode: payload.postalCode,
          country: payload.country || 'India',
          isDefault: payload.isDefault,
        })
        .returning();

      return reply.status(201).send({
        success: true,
        data: savedAddress,
      });
    }
  );

  // 8. DELETE SAVED ADDRESS
  typedFastify.delete(
    '/addresses/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      const userId = request.user!.userId;
      const { id } = request.params;
      const db = getDbClient();

      const [existing] = await db
        .select()
        .from(addresses)
        .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
        .limit(1);

      if (!existing) {
        throw new NotFoundError('Address not found');
      }

      await db.delete(addresses).where(eq(addresses.id, id));

      return reply.send({
        success: true,
        data: { deleted: true, id },
      });
    }
  );

  // 9. GET USER ORDERS / COMMISSIONS
  typedFastify.get(
    '/orders',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const userId = request.user!.userId;
      const db = getDbClient();

      const userOrders = await db
        .select()
        .from(orders)
        .where(eq(orders.userId, userId))
        .orderBy(desc(orders.createdAt));

      if (userOrders.length === 0) {
        return reply.send({
          success: true,
          data: [],
        });
      }

      const orderIds = userOrders.map((o) => o.id);
      const [items, shipList] = await Promise.all([
        db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds)),
        db.select().from(shipments).where(inArray(shipments.orderId, orderIds)),
      ]);

      const result = userOrders.map((ord) => ({
        id: ord.id,
        orderNumber: ord.orderNumber,
        status: ord.status,
        totalPaise: ord.totalPaise,
        paymentStatus: ord.paymentStatus,
        createdAt: ord.createdAt.toISOString(),
        items: items.filter((i) => i.orderId === ord.id),
        shipment: shipList.find((s) => s.orderId === ord.id) || null,
      }));

      return reply.send({
        success: true,
        data: result,
      });
    }
  );
};
