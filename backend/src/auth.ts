import crypto from 'node:crypto';
import { Request, Response } from 'express';
import { prisma } from './db.js';

const SESSION_AGE_SECONDS = 7 * 24 * 3600;
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 32 * 1024 * 1024,
  });
  return `${salt.toString('hex')}$${key.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [saltHex, keyHex] = stored.split('$');
    if (!saltHex || !keyHex) return false;
    const salt = Buffer.from(saltHex, 'hex');
    const expectedKey = Buffer.from(keyHex, 'hex');
    const actualKey = crypto.scryptSync(password, salt, 64, {
      N: 16384,
      r: 8,
      p: 1,
      maxmem: 32 * 1024 * 1024,
    });
    return crypto.timingSafeEqual(actualKey, expectedKey);
  } catch {
    return false;
  }
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

export async function createSession(res: Response, userId: number): Promise<string> {
  const sessionId = crypto.randomBytes(24).toString('base64url');
  const csrfToken = crypto.randomBytes(16).toString('hex');
  const tokenHash = hashToken(sessionId);
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_AGE_SECONDS;

  await prisma.session.create({
    data: {
      tokenHash,
      userId,
      csrf: csrfToken,
      expiresAt,
    },
  });

  res.cookie('session_id', sessionId, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'lax',
    maxAge: SESSION_AGE_SECONDS * 1000,
    path: '/',
  });

  return csrfToken;
}

export async function clearSession(req: Request, res: Response): Promise<void> {
  const sessionId = req.cookies?.session_id;
  if (sessionId) {
    const tokenHash = hashToken(sessionId);
    await prisma.session.deleteMany({
      where: { tokenHash },
    });
  }
  res.clearCookie('session_id', {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
  });
}

export interface AuthenticatedUser {
  userId: number;
  email: string;
  csrf: string;
}

export async function getCurrentUser(
  req: Request,
  requireCsrf = false
): Promise<AuthenticatedUser | null> {
  const sessionId = req.cookies?.session_id;
  if (!sessionId) return null;

  const tokenHash = hashToken(sessionId);
  const now = Math.floor(Date.now() / 1000);

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session || session.expiresAt < now) {
    return null;
  }

  if (requireCsrf) {
    const headerCsrf = req.headers['x-csrf-token'];
    if (!headerCsrf || headerCsrf !== session.csrf) {
      return null;
    }
  }

  return {
    userId: session.userId,
    email: session.user.email,
    csrf: session.csrf,
  };
}
