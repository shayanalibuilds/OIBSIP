import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  email: z.string().trim().toLowerCase().email('Valid email is required'),
  password: passwordSchema,
});

export const verifyEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  token: z.string().trim().min(1, 'Token is required'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  token: z.string().trim().min(1, 'Token is required'),
  password: passwordSchema,
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1),
});

export const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});
