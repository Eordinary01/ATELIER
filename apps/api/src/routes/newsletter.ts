import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { getDbClient, newsletterSubscribers, eq } from '@atelier/database';
import { ApiResponseSchema } from '@atelier/contract';
import { sendNewsletterWelcomeEmail } from '../services/email.js';

const SubscribeBodySchema = z.object({
  email: z.string().email(),
});

const SubscribeResponseSchema = ApiResponseSchema(
  z.object({
    message: z.string(),
    email: z.string(),
  })
);

export const newsletterRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const typedFastify = fastify.withTypeProvider<ZodTypeProvider>();

  // POST /api/v1/newsletter/subscribe
  typedFastify.post(
    '/subscribe',
    {
      schema: {
        body: SubscribeBodySchema,
        response: {
          200: SubscribeResponseSchema,
          201: SubscribeResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const email = request.body.email.trim().toLowerCase();
      const db = getDbClient();

      // Check if already subscribed
      const [existing] = await db
        .select()
        .from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.email, email))
        .limit(1);

      if (existing) {
        if (!existing.isActive) {
          await db
            .update(newsletterSubscribers)
            .set({ isActive: true, updatedAt: new Date() })
            .where(eq(newsletterSubscribers.id, existing.id));
        }

        // Dispatch welcome email on registry subscription
        sendNewsletterWelcomeEmail({ subscriberEmail: email }).catch((err) => {
          request.log.warn({ err }, 'Failed to send newsletter welcome email');
        });

        return reply.status(200).send({
          success: true,
          data: {
            message: 'You are subscribed to the Atelier Registry. Welcome dispatch confirmed.',
            email,
          },
        });
      }

      // Insert new subscriber
      await db.insert(newsletterSubscribers).values({
        email,
        isActive: true,
      });

      // Dispatch Brevo welcome email asynchronously
      sendNewsletterWelcomeEmail({ subscriberEmail: email }).catch((err) => {
        request.log.warn({ err }, 'Failed to send newsletter welcome email');
      });

      return reply.status(201).send({
        success: true,
        data: {
          message: 'Welcome to the Atelier Registry. Dispatches confirmed.',
          email,
        },
      });
    }
  );
};
