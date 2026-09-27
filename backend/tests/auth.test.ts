import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/server';
import { prisma } from '../src/prisma/client';
import { config } from '../src/config';

const EMAIL = 'user1@looser.vault';
const PASSWORD = 'VaultPass123!';
const UA = 'jest-auth-test';

async function login() {
  const res = await request(app).post('/api/auth/login').set('User-Agent', UA).send({ email: EMAIL, password: PASSWORD });
  expect(res.status).toBe(200);
  return res.body as { token: string; refreshToken: string; user: { id: string } };
}

function refresh(refreshToken: string) {
  return request(app).post('/api/auth/refresh').set('User-Agent', UA).send({ refreshToken });
}

function profile(token: string) {
  return request(app).get('/api/auth/profile').set('Authorization', `Bearer ${token}`);
}

describe('Session tokens (access + refresh)', () => {
  afterAll(async () => {
    await prisma.refreshToken.deleteMany({ where: { userAgent: UA } });
    await prisma.$disconnect();
  });

  it('login returns a short-lived access token and a refresh token', async () => {
    const session = await login();
    expect(session.refreshToken).toEqual(expect.any(String));

    const decoded = jwt.decode(session.token) as any;
    expect(decoded.type).toBe('access');
    expect(decoded.exp - decoded.iat).toBeLessThanOrEqual(60 * 60);

    // Only a hash is stored, never the raw token.
    const stored = await prisma.refreshToken.findMany({ where: { userId: session.user.id, userAgent: UA } });
    expect(stored.some((t) => t.tokenHash === session.refreshToken)).toBe(false);
  });

  it('refresh rotates the token pair and the new access token works', async () => {
    const session = await login();
    const res = await refresh(session.refreshToken);
    expect(res.status).toBe(200);
    expect(res.body.refreshToken).not.toBe(session.refreshToken);

    expect((await profile(res.body.token)).status).toBe(200);
  });

  it('a just-rotated token is "stale" (tab race) and does not kill the session', async () => {
    const session = await login();
    const first = await refresh(session.refreshToken);
    expect(first.status).toBe(200);

    const again = await refresh(session.refreshToken);
    expect(again.status).toBe(401);
    expect(again.body.code).toBe('REFRESH_STALE');

    // The newer token from the first rotation is still valid.
    expect((await refresh(first.body.refreshToken)).status).toBe(200);
  });

  it('reusing an old rotated token revokes the whole session family', async () => {
    const session = await login();
    const rotated = await refresh(session.refreshToken);
    expect(rotated.status).toBe(200);

    // Move the rotation outside the grace window, as if an attacker replayed it later.
    await prisma.refreshToken.updateMany({
      where: { replacedById: { not: null }, userAgent: UA, revokedAt: { not: null } },
      data: { revokedAt: new Date(Date.now() - 5 * 60 * 1000) },
    });

    const replay = await refresh(session.refreshToken);
    expect(replay.status).toBe(401);
    expect(replay.body.code).toBe('REFRESH_INVALID');

    // The legitimate holder's newer token is now revoked too.
    const legit = await refresh(rotated.body.refreshToken);
    expect(legit.status).toBe(401);
  });

  it('logout revokes the refresh token', async () => {
    const session = await login();
    expect((await request(app).post('/api/auth/logout').send({ refreshToken: session.refreshToken })).status).toBe(200);
    expect((await refresh(session.refreshToken)).status).toBe(401);
  });

  it('rejects unknown, missing and expired refresh tokens', async () => {
    expect((await refresh('not-a-real-token')).status).toBe(401);
    expect((await request(app).post('/api/auth/refresh').send({})).status).toBe(400);

    const session = await login();
    await prisma.refreshToken.updateMany({
      where: { userAgent: UA, revokedAt: null },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect((await refresh(session.refreshToken)).status).toBe(401);
  });

  it('expired access token returns TOKEN_EXPIRED so the client knows to refresh', async () => {
    const session = await login();
    const expired = jwt.sign(
      { userId: session.user.id, email: EMAIL, type: 'access', exp: Math.floor(Date.now() / 1000) - 10 },
      config.jwtSecret
    );
    const res = await profile(expired);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_EXPIRED');
  });

  it('the pending-2FA token cannot be used as a login token (2FA bypass)', async () => {
    const session = await login();
    const pending = jwt.sign({ userId: session.user.id, is2FAPending: true }, config.jwtSecret, { expiresIn: '5m' });
    const res = await profile(pending);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_INVALID');

    const typed = jwt.sign({ userId: session.user.id, type: '2fa_pending' }, config.jwtSecret, { expiresIn: '5m' });
    expect((await profile(typed)).status).toBe(401);
  });

  it('changing the password signs out other sessions and returns a fresh one', async () => {
    const otherDevice = await login();
    const thisDevice = await login();
    const NEW_PASSWORD = 'TempPass456!';

    try {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${thisDevice.token}`)
        .set('User-Agent', UA)
        .send({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD });
      expect(res.status).toBe(200);
      expect(res.body.refreshToken).toEqual(expect.any(String));

      expect((await refresh(otherDevice.refreshToken)).status).toBe(401);
      expect((await refresh(res.body.refreshToken)).status).toBe(200);
    } finally {
      const restore = await request(app)
        .post('/api/auth/login')
        .set('User-Agent', UA)
        .send({ email: EMAIL, password: NEW_PASSWORD });
      if (restore.status === 200) {
        await request(app)
          .post('/api/auth/change-password')
          .set('Authorization', `Bearer ${restore.body.token}`)
          .set('User-Agent', UA)
          .send({ currentPassword: NEW_PASSWORD, newPassword: PASSWORD });
      }
    }
  });
});
