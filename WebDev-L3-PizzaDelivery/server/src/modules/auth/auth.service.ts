import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/utils/AppError.js';
import { UserRepo, type UserDoc } from '../users/user.model.js';
import { RefreshTokenRepo } from './auth.tokens.js';
import {
  registerSchema,
  verifyEmailSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.validation.js';
import {
  sendMail,
  buildVerifyEmailUrl,
  buildResetPasswordUrl,
  getLastEtherealUrl,
} from './auth.email.js';
import { logger } from '../../shared/utils/logger.js';

export const BCRYPT_COST = 12;
const VERIFY_TOKEN_BYTES = 32;
const RESET_TOKEN_BYTES = 32;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function randomToken(bytes = VERIFY_TOKEN_BYTES): string {
  return crypto.randomBytes(bytes).toString('hex');
}

function publicUser(u: UserDoc) {
  return {
    id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    emailVerified: u.emailVerified,
  };
}

function signAccessToken(u: UserDoc): string {
  return jwt.sign(
    { sub: u._id, email: u.email, role: u.role, emailVerified: u.emailVerified, type: 'access' },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions['expiresIn'] },
  );
}

async function issueRefreshToken(u: UserDoc): Promise<string> {
  const raw = crypto.randomBytes(48).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  const ms = parseDuration(env.JWT_REFRESH_TTL);
  await RefreshTokenRepo.create({
    userId: u._id,
    tokenHash,
    expiresAt: new Date(Date.now() + ms),
  });
  return raw;
}

export async function register(input: { name: string; email: string; password: string }) {
  const parsed = registerSchema.parse(input);
  const existing = await UserRepo.findByEmail(parsed.email);
  if (existing) {
    // Generic error - no user enumeration.
    throw AppError.conflict('Unable to create account');
  }
  const passwordHash = await hashPassword(parsed.password);
  const token = randomToken();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const user = await UserRepo.create({
    name: parsed.name,
    email: parsed.email,
    passwordHash,
    role: 'customer',
    emailVerified: false,
    emailVerifyToken: token,
    emailVerifyExpires: expires,
  });

  try {
    const url = buildVerifyEmailUrl(user.email, token);
    await sendMail({
      to: user.email,
      subject: 'Verify your Ovenly account',
      text: `Visit this link to verify your email: ${url}`,
      html: `<p>Verify your Ovenly account:</p><p><a href="${url}">${url}</a></p>`,
    });
  } catch (err) {
    logger.warn('Verify email send failed', { error: (err as Error).message });
  }

  return {
    user: publicUser(user),
    message: 'Account created. Check your email for a verification link.',
    etherealPreviewUrl: getLastEtherealUrl(),
  };
}

export async function verifyEmail(input: { email: string; token: string }) {
  const parsed = verifyEmailSchema.parse(input);
  const user = await UserRepo.findByEmail(parsed.email);
  if (!user || !user.emailVerifyToken || !user.emailVerifyExpires) {
    throw AppError.badRequest('Invalid or expired verification token');
  }
  if (user.emailVerifyToken !== parsed.token) {
    throw AppError.badRequest('Invalid or expired verification token');
  }
  if (user.emailVerifyExpires.getTime() < Date.now()) {
    throw AppError.badRequest('Verification token expired');
  }
  const updated = await UserRepo.updateById(user._id, {
    emailVerified: true,
    emailVerifyToken: null,
    emailVerifyExpires: null,
  });
  if (!updated) throw AppError.internal();
  return { user: publicUser(updated), message: 'Email verified. You can log in.' };
}

export async function login(input: { email: string; password: string }) {
  const parsed = loginSchema.parse(input);
  const user = await UserRepo.findByEmail(parsed.email);
  // Same message for unknown user and bad password - no enumeration.
  const invalid = AppError.unauthorized('Invalid email or password');
  if (!user) throw invalid;
  const ok = await verifyPassword(parsed.password, user.passwordHash);
  if (!ok) throw invalid;
  if (user.role !== 'admin' && !user.emailVerified) {
    throw AppError.forbidden('Please verify your email before logging in');
  }
  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user);
  return {
    user: publicUser(user),
    accessToken,
    refreshToken,
  };
}

export async function refresh(input: { refreshToken: string }) {
  const parsed = refreshSchema.parse(input);
  const hash = crypto.createHash('sha256').update(parsed.refreshToken).digest('hex');
  const stored = await RefreshTokenRepo.findByHash(hash);
  if (!stored) throw AppError.unauthorized('Invalid refresh token');
  if (stored.expiresAt.getTime() < Date.now()) {
    await RefreshTokenRepo.revoke(hash);
    throw AppError.unauthorized('Refresh token expired');
  }
  const user = await UserRepo.findById(stored.userId);
  if (!user) throw AppError.unauthorized('Invalid refresh token');
  await RefreshTokenRepo.revoke(hash);
  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user);
  return { accessToken, refreshToken, user: publicUser(user) };
}

export async function logout(input: { refreshToken: string }) {
  const parsed = refreshSchema.parse(input);
  const hash = crypto.createHash('sha256').update(parsed.refreshToken).digest('hex');
  await RefreshTokenRepo.revoke(hash);
  return { ok: true };
}

export async function forgotPassword(input: { email: string }) {
  const parsed = forgotPasswordSchema.parse(input);
  const user = await UserRepo.findByEmail(parsed.email);
  // Always return the same response to avoid enumeration.
  if (user) {
    const token = randomToken(RESET_TOKEN_BYTES);
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    await UserRepo.updateById(user._id, { resetToken: token, resetExpires: expires });
    try {
      const url = buildResetPasswordUrl(user.email, token);
      await sendMail({
        to: user.email,
        subject: 'Ovenly password reset',
        text: `Reset your password: ${url}`,
        html: `<p>Reset your Ovenly password:</p><p><a href="${url}">${url}</a></p>`,
      });
    } catch (err) {
      logger.warn('Reset email send failed', { error: (err as Error).message });
    }
  }
  return { message: 'If that email exists, a reset link has been sent.' };
}

export async function resetPassword(input: { email: string; token: string; password: string }) {
  const parsed = resetPasswordSchema.parse(input);
  const user = await UserRepo.findByEmail(parsed.email);
  if (!user || !user.resetToken || !user.resetExpires || user.resetToken !== parsed.token) {
    throw AppError.badRequest('Invalid or expired reset token');
  }
  if (user.resetExpires.getTime() < Date.now()) {
    throw AppError.badRequest('Reset token expired');
  }
  const passwordHash = await hashPassword(parsed.password);
  const updated = await UserRepo.updateById(user._id, {
    passwordHash,
    resetToken: null,
    resetExpires: null,
  });
  if (!updated) throw AppError.internal();
  await RefreshTokenRepo.revokeAllForUser(user._id);
  return { message: 'Password updated. You can log in.' };
}

export async function me(userId: string) {
  const user = await UserRepo.findById(userId);
  if (!user) throw AppError.notFound('User not found');
  return { user: publicUser(user) };
}

function parseDuration(s: string): number {
  const m = /^(\d+)([smhd])$/.exec(s);
  if (!m) return 7 * 24 * 60 * 60 * 1000;
  const n = Number(m[1]);
  const unit = m[2];
  const mult = unit === 's' ? 1000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
  return n * mult;
}

export const auth = {
  register,
  verifyEmail,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  me,
  hashPassword,
  verifyPassword,
  randomToken,
};
