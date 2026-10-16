import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'node:path';

// Load .env from root if not already loaded
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z
    .string()
    .default('postgres://atelier_admin:atelier_dev_password@localhost:5433/atelier_commerce'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET must be at least 32 characters')
    .default('dev_secret_key_change_in_production_min_32_characters'),
  ADMIN_SESSION_SECRET: z
    .string()
    .default('dev_admin_secret_key_change_in_production_32_chars'),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_DAYS: z.coerce.number().default(7),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://localhost:3001')
    .transform((val) => val.split(',').map((s) => s.trim())),
  // Cloudinary configuration
  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),
  CLOUDINARY_URL: z.string().optional(),
  // Brevo transactional email configuration
  BREVO_API_KEY: z.string().default(''),
  BREVO_SENDER_EMAIL: z.string().default('orders@atelier.in'),
  BREVO_SENDER_NAME: z.string().default('ATELIER Haute Couture'),
  // Razorpay payment gateway
  RAZORPAY_KEY_ID: z.string().default(''),
  RAZORPAY_KEY_SECRET: z.string().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().default(''),
  // Storefront base URL
  STOREFRONT_URL: z.string().default('http://localhost:3000'),
});


export type Env = z.infer<typeof EnvSchema>;

export const env = EnvSchema.parse(process.env);
