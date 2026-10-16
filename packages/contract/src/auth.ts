import { z } from 'zod';

export const UserRoleSchema = z.enum([
  'customer',
  'admin_super',
  'admin_catalog',
  'admin_orders',
]);

export type UserRole = z.infer<typeof UserRoleSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const RegisterRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().regex(/^(?:\+91[\s-]?)?[6-9]\d{9}$/, 'Invalid 10-digit Indian mobile number').optional(),
});

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().nullable().optional(),
  role: UserRoleSchema,
  createdAt: z.string().datetime(),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
