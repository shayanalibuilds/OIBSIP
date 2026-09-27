import { describe, it, expect, beforeEach } from 'vitest';
import { register, login, verifyEmail, hashPassword, randomToken } from '../src/modules/auth/auth.service.js';
import { UserRepo } from '../src/modules/users/user.model.js';
import { resetMemory } from '../src/shared/db/memory.js';

beforeEach(() => {
  resetMemory();
});

describe('auth validation', () => {
  it('rejects a password shorter than 8 chars', async () => {
    await expect(
      register({ name: 'Alice', email: 'alice@example.com', password: 'short1' }),
    ).rejects.toThrow();
  });

  it('rejects a password with no number', async () => {
    await expect(
      register({ name: 'Alice', email: 'alice@example.com', password: 'longerpass' }),
    ).rejects.toThrow();
  });

  it('accepts a valid password and creates an unverified user', async () => {
    const out = await register({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'password1',
    });
    expect(out.user.email).toBe('alice@example.com');
    expect(out.user.emailVerified).toBe(false);
    expect(out.user.role).toBe('customer');

    const saved = await UserRepo.findByEmail('alice@example.com');
    expect(saved).not.toBeNull();
    expect(saved?.passwordHash).not.toBe('password1');
  });

  it('does not let two users share an email', async () => {
    await register({ name: 'Alice', email: 'alice@example.com', password: 'password1' });
    await expect(
      register({ name: 'Alice2', email: 'alice@example.com', password: 'password2' }),
    ).rejects.toThrow();
  });

  it('rejects login before email verification', async () => {
    await register({ name: 'Bob', email: 'bob@example.com', password: 'password1' });
    await expect(login({ email: 'bob@example.com', password: 'password1' })).rejects.toThrow();
  });

  it('rejects login with wrong password (same error as unknown user)', async () => {
    const email = 'carol@example.com';
    const passwordHash = await hashPassword('password1');
    const token = randomToken();
    const expires = new Date(Date.now() + 86400000);
    await UserRepo.create({
      name: 'Carol',
      email,
      passwordHash,
      role: 'customer',
      emailVerified: true,
      emailVerifyToken: null,
      emailVerifyExpires: null,
      resetToken: null,
      resetExpires: null,
    });
    void token;
    void expires;

    let unknownErr: unknown;
    let badPwdErr: unknown;
    try {
      await login({ email: 'doesnotexist@example.com', password: 'password1' });
    } catch (e) {
      unknownErr = e;
    }
    try {
      await login({ email, password: 'wrongpassword' });
    } catch (e) {
      badPwdErr = e;
    }
    expect(unknownErr).toBeDefined();
    expect(badPwdErr).toBeDefined();
    expect((unknownErr as Error).message).toBe((badPwdErr as Error).message);
  });

  it('logs in after email verification', async () => {
    const reg = await register({ name: 'Dan', email: 'dan@example.com', password: 'password1' });
    const user = await UserRepo.findByEmail('dan@example.com');
    expect(user).not.toBeNull();
    await verifyEmail({ email: 'dan@example.com', token: user!.emailVerifyToken! });
    void reg;

    const out = await login({ email: 'dan@example.com', password: 'password1' });
    expect(out.accessToken).toBeTruthy();
    expect(out.refreshToken).toBeTruthy();
    expect(out.user.emailVerified).toBe(true);
  });
});
