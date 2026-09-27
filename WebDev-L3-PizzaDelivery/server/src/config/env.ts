import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGODB_URI: z.string().url().optional().or(z.literal('')),

  JWT_ACCESS_SECRET: z.string().min(8).default('dev-access-secret-change-me'),
  JWT_REFRESH_SECRET: z.string().min(8).default('dev-refresh-secret-change-me'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),

  CLIENT_URL: z.string().url().default('http://localhost:5173'),

  SMTP_HOST: z.string().optional().or(z.literal('')),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional().or(z.literal('')),
  SMTP_PASS: z.string().optional().or(z.literal('')),
  MAIL_FROM: z.string().default('Ovenly <noreply@ovenly.dev>'),

  ADMIN_EMAIL: z.string().email().default('admin@ovenly.dev'),
  ADMIN_PASSWORD: z.string().optional().or(z.literal('')),
  ADMIN_NAME: z.string().default('Ovenly Admin'),

  RAZORPAY_KEY_ID: z.string().optional().or(z.literal('')),
  RAZORPAY_KEY_SECRET: z.string().optional().or(z.literal('')),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().or(z.literal('')),

  LOW_STOCK_CRON: z.string().default('*/15 * * * *'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
