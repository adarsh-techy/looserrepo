import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../prisma/client';
import rateLimit from 'express-rate-limit';
import { verifyAccessToken } from '../utils/tokens';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    pagePermissions: string[];
  };
  reauthVerified?: boolean;
}

/** Page permissions are stored as a JSON string; AD always has full access. */
export function parsePagePermissions(raw: string | null | undefined, role: string): string[] {
  let perms: string[] = ['*'];
  try {
    const parsed = JSON.parse(raw || '["*"]');
    if (Array.isArray(parsed)) perms = parsed;
  } catch {
    perms = ['*'];
  }
  if (role === 'AD' && !perms.includes('*')) perms.push('*');
  return perms;
}

/**
 * Standard JWT Authentication Middleware
 */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization token' });
  }

  const token = authHeader.split(' ')[1];
  let decoded: { userId: string; email: string };
  try {
    decoded = verifyAccessToken(token);
  } catch (err: any) {
    // `code` lets the client tell "refresh and retry" apart from "log out".
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please re-authenticate.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Unauthorized: Invalid token signature', code: 'TOKEN_INVALID' });
  }

  // Outside the try above: a database outage must surface as a 500, not as "invalid token"
  // (which would log the user out).
  try {
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true, pagePermissions: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: User account no longer exists', code: 'TOKEN_INVALID' });
    }

    req.user = { ...user, pagePermissions: parsePagePermissions(user.pagePermissions, user.role) };
  } catch (err) {
    return next(err);
  }
  next();
}

/**
 * Re-authentication verification for high-security operations (e.g. password vault reveals)
 * Requires 'x-reauth-token' header generated via recent password verification
 */
export async function requireReauth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const reauthToken = req.headers['x-reauth-token'] as string;
  if (!reauthToken) {
    return res.status(403).json({
      error: 'Re-authentication required: Please provide a valid re-auth token before accessing sensitive credentials',
      requiresReauth: true,
    });
  }

  try {
    const decoded = jwt.verify(reauthToken, config.reauthSecret) as { userId: string; reauth: boolean };
    if (!req.user || req.user.id !== decoded.userId || !decoded.reauth) {
      return res.status(403).json({ error: 'Invalid re-auth session', requiresReauth: true });
    }
    req.reauthVerified = true;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Re-authentication expired. Please confirm your password again.', requiresReauth: true });
  }
}

/**
 * Strict rate limiting for sensitive endpoints (login, password verify, unlock attempts)
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
});

// Separate budget from login: every open tab refreshes roughly every 15 minutes.
export const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many session refresh attempts. Please try again shortly.' },
});

export const unlockRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // 10 unlock attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many secret unlock attempts. System alert dispatched.' },
});
