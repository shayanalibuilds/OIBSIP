import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';
import { logger } from '../../shared/utils/logger.js';

let transporter: nodemailer.Transporter | null = null;
let etherealUrl: string | null = null;

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) return transporter;

  if (env.SMTP_HOST && env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? 587,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
    return transporter;
  }

  // No SMTP configured - create an Ethereal test account on the fly.
  const testAccount = await nodemailer.createTestAccount();
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  logger.info('SMTP not configured - using Ethereal test account', { user: testAccount.user });
  return transporter;
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ previewUrl?: string }> {
  const t = await getTransporter();
  const info = await t.sendMail({
    from: env.MAIL_FROM,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });
  const rawPreview = nodemailer.getTestMessageUrl(info);
  const previewUrl = typeof rawPreview === 'string' ? rawPreview : undefined;
  if (previewUrl) {
    etherealUrl = previewUrl;
    logger.info('Email sent (Ethereal)', { previewUrl });
  } else {
    logger.info('Email sent', { messageId: info.messageId, to: opts.to });
  }
  return { previewUrl };
}

export function getLastEtherealUrl(): string | null {
  return etherealUrl;
}

export function resetEmailTransport(): void {
  transporter = null;
  etherealUrl = null;
}

export function buildVerifyEmailUrl(email: string, token: string): string {
  const u = new URL('/verify', env.CLIENT_URL);
  u.searchParams.set('email', email);
  u.searchParams.set('token', token);
  return u.toString();
}

export function buildResetPasswordUrl(email: string, token: string): string {
  const u = new URL('/reset', env.CLIENT_URL);
  u.searchParams.set('email', email);
  u.searchParams.set('token', token);
  return u.toString();
}
