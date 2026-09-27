import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Request } from 'express';
import { config } from '../config';
import { prisma } from '../prisma/client';
import { logAuditEvent } from './auditLogger';

// If two tabs refresh with the same token at the same moment, the loser sees a token that was
// rotated a few seconds ago. That is a benign race, not theft, so we don't revoke the session.
const ROTATION_GRACE_MS = 30 * 1000;

export interface AccessTokenPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  type: 'access';
}

interface TokenUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export function signAccessToken(user: TokenUser): string {
  const payload: AccessTokenPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    type: 'access',
  };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.accessTokenExpiresIn as any });
}

/**
 * Verifies a JWT and ensures it is a usable access token. Throws on failure (jsonwebtoken errors,
 * or a plain Error for tokens of the wrong type such as the pending-2FA token).
 */
export function verifyAccessToken(token: string): { userId: string; email: string } {
  const decoded = jwt.verify(token, config.jwtSecret) as any;
  // Tokens issued before refresh tokens existed have no `type`; accept them until they expire.
  if (decoded.is2FAPending || (decoded.type !== undefined && decoded.type !== 'access')) {
    throw new Error('Not an access token');
  }
  return decoded;
}

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function requestMeta(req: Request) {
  return {
    ipAddress: req.ip || null,
    userAgent: (req.headers['user-agent'] as string | undefined) || null,
  };
}

async function createRefreshToken(userId: string, familyId: string, req: Request) {
  const raw = crypto.randomBytes(48).toString('base64url');
  const record = await prisma.refreshToken.create({
    data: {
      userId,
      familyId,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000),
      ...requestMeta(req),
    },
  });
  return { raw, record };
}

/** Issues a fresh access + refresh token pair, starting a new session family. */
export async function issueTokenPair(user: TokenUser, req: Request) {
  const { raw } = await createRefreshToken(user.id, crypto.randomUUID(), req);
  return { token: signAccessToken(user), refreshToken: raw };
}

export type RotateResult =
  | { ok: true; token: string; refreshToken: string; userId: string }
  | { ok: false; reason: 'invalid' | 'expired' | 'stale' | 'reused' };

/**
 * Exchanges a refresh token for a new pair. The old refresh token is revoked (rotation).
 * Presenting an already-rotated token outside the grace window is treated as theft and
 * revokes every token in that session family.
 */
export async function rotateRefreshToken(raw: string, req: Request): Promise<RotateResult> {
  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(raw) },
    include: { user: { select: { id: true, email: true, name: true, role: true } } },
  });

  if (!existing) return { ok: false, reason: 'invalid' };

  if (existing.revokedAt) {
    const rotatedRecently =
      existing.replacedById && Date.now() - existing.revokedAt.getTime() < ROTATION_GRACE_MS;
    if (rotatedRecently) return { ok: false, reason: 'stale' };

    await prisma.refreshToken.updateMany({
      where: { familyId: existing.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await logAuditEvent({
      eventType: 'AUTH_REFRESH_TOKEN_REUSE',
      severity: 'CRITICAL',
      actorId: existing.userId,
      actorEmail: existing.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { familyId: existing.familyId },
    });
    return { ok: false, reason: 'reused' };
  }

  if (existing.expiresAt.getTime() <= Date.now()) return { ok: false, reason: 'expired' };

  const { raw: nextRaw, record: next } = await createRefreshToken(existing.userId, existing.familyId, req);
  // Conditional update so two concurrent rotations of the same token can't both succeed.
  const { count } = await prisma.refreshToken.updateMany({
    where: { id: existing.id, revokedAt: null },
    data: { revokedAt: new Date(), replacedById: next.id },
  });
  if (count === 0) {
    await prisma.refreshToken.delete({ where: { id: next.id } });
    return { ok: false, reason: 'stale' };
  }

  return { ok: true, token: signAccessToken(existing.user), refreshToken: nextRaw, userId: existing.userId };
}

export async function revokeRefreshToken(raw: string) {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(raw), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllRefreshTokens(userId: string) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
