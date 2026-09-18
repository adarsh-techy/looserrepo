import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { prisma } from '../prisma/client';
import { config } from '../config';
import { logAuditEvent } from '../utils/auditLogger';
import { AuthenticatedRequest } from '../middlewares/auth';

export async function register(req: Request, res: Response) {
  const { email, password, name, role } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const normalizedRole = role ? role.toString().trim().toUpperCase() : 'AD';
  if (!['AD', 'NS'].includes(normalizedRole)) {
    return res.status(400).json({ error: 'Role must be either AD or NS' });
  }

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      name: name.trim(),
      passwordHash,
      role: normalizedRole,
    },
  });

  const now = new Date();
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: now, lastCheckIn: now },
  });

  const token = jwt.sign(
    { userId: user.id, email: user.email, name: user.name, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as any }
  );

  await logAuditEvent({
    eventType: 'AUTH_REGISTER_SUCCESS',
    severity: 'INFO',
    actorId: user.id,
    actorEmail: user.email,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    metadata: { name: user.name, role: user.role },
  });

  return res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      totpEnabled: user.totpEnabled,
      sirenSoundPref: user.sirenSoundPref,
      themePref: user.themePref,
      pagePermissions: ['*'],
      lastLogin: now,
      lastCheckIn: now,
    },
  });
}

export async function login(req: Request, res: Response) {
  const { email, password, totpCode } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user) {
    await logAuditEvent({
      eventType: 'AUTH_LOGIN_FAILED',
      severity: 'WARNING',
      actorEmail: email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { reason: 'User not found' },
    });
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    await logAuditEvent({
      eventType: 'AUTH_LOGIN_FAILED',
      severity: 'WARNING',
      actorId: user.id,
      actorEmail: user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { reason: 'Invalid password' },
    });
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Check if TOTP is enabled and required
  if (user.totpEnabled && user.totpSecret) {
    if (!totpCode) {
      return res.status(200).json({
        requires2FA: true,
        message: 'Two-factor authentication code required',
        tempToken: jwt.sign({ userId: user.id, is2FAPending: true }, config.jwtSecret, { expiresIn: '5m' as any }),
      });
    }

    const isTotpValid = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: 'base32',
      token: totpCode,
      window: 1,
    });

    if (!isTotpValid) {
      await logAuditEvent({
        eventType: 'AUTH_2FA_FAILED',
        severity: 'WARNING',
        actorId: user.id,
        actorEmail: user.email,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      return res.status(401).json({ error: 'Invalid two-factor authentication code' });
    }
  }

  // Update last login and check-in
  const now = new Date();
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: now, lastCheckIn: now },
  });

  const token = jwt.sign(
    { userId: user.id, email: user.email, name: user.name, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as any }
  );

  await logAuditEvent({
    eventType: 'AUTH_LOGIN_SUCCESS',
    severity: 'INFO',
    actorId: user.id,
    actorEmail: user.email,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  // Check if there are unread shared notes for this user
  const unreadSharedNotes = await prisma.sharedNote.findMany({
    where: {
      recipientId: user.id,
      isRead: false,
      promptOnLogin: true,
    },
    include: {
      author: { select: { name: true, email: true } },
    },
  });

  let pagePermissions: string[] = ['*'];
  try {
    pagePermissions = JSON.parse(user.pagePermissions || '["*"]');
  } catch (e) {
    pagePermissions = ['*'];
  }
  if (user.role === 'AD' && !pagePermissions.includes('*')) {
    pagePermissions.push('*');
  }

  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      totpEnabled: user.totpEnabled,
      sirenSoundPref: user.sirenSoundPref,
      themePref: user.themePref,
      pagePermissions,
      lastLogin: now,
      lastCheckIn: now,
    },
    unreadSharedNotes,
  });
}

/**
 * Re-authenticate with user's primary password to obtain a temporary re-auth token
 */
export async function reauthenticate(req: AuthenticatedRequest, res: Response) {
  const { password } = req.body;
  const userId = req.user?.id;

  if (!userId || !password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    await logAuditEvent({
      eventType: 'AUTH_REAUTH_FAILED',
      severity: 'WARNING',
      actorId: user.id,
      actorEmail: user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.status(401).json({ error: 'Incorrect password' });
  }

  const reauthToken = jwt.sign(
    { userId: user.id, reauth: true },
    config.reauthSecret,
    { expiresIn: config.reauthExpiresIn as any }
  );

  await logAuditEvent({
    eventType: 'AUTH_REAUTH_SUCCESS',
    severity: 'INFO',
    actorId: user.id,
    actorEmail: user.email,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  return res.json({
    reauthToken,
    expiresInSeconds: 300,
    message: 'Re-authentication successful. Credential reveals unlocked for 5 minutes.',
  });
}

export async function setup2FA(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const secret = speakeasy.generateSecret({
    name: `Looser Vault (${user.email})`,
    issuer: 'Looser Vault System',
    length: 20,
  });

  const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url || '');

  await prisma.user.update({
    where: { id: user.id },
    data: { totpSecret: secret.base32 },
  });

  return res.json({
    secret: secret.base32,
    qrCodeDataUrl,
    otpauthUrl: secret.otpauth_url,
  });
}

export async function verifyAndEnable2FA(req: AuthenticatedRequest, res: Response) {
  const { code } = req.body;
  const userId = req.user?.id;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.totpSecret) {
    return res.status(400).json({ error: '2FA setup not initiated' });
  }

  const verified = speakeasy.totp.verify({
    secret: user.totpSecret,
    encoding: 'base32',
    token: code,
    window: 1,
  });

  if (!verified) {
    return res.status(400).json({ error: 'Invalid verification code. Please try again.' });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: true },
  });

  await logAuditEvent({
    eventType: 'AUTH_2FA_ENABLED',
    severity: 'INFO',
    actorId: user.id,
    actorEmail: user.email,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  return res.json({ success: true, message: 'Two-factor authentication has been successfully enabled!' });
}

export async function disable2FA(req: AuthenticatedRequest, res: Response) {
  const { password } = req.body;
  const userId = req.user?.id;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) return res.status(401).json({ error: 'Invalid password' });

  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: false, totpSecret: null },
  });

  await logAuditEvent({
    eventType: 'AUTH_2FA_DISABLED',
    severity: 'WARNING',
    actorId: user.id,
    actorEmail: user.email,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  return res.json({ success: true, message: 'Two-factor authentication disabled' });
}

export async function ownerCheckIn(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const now = new Date();

  await prisma.user.update({
    where: { id: userId },
    data: { lastCheckIn: now },
  });

  await prisma.secretNote.updateMany({
    where: { ownerId: userId },
    data: { ownerLastCheckInAt: now },
  });

  await logAuditEvent({
    eventType: 'OWNER_CHECKIN',
    severity: 'INFO',
    actorId: userId,
    actorEmail: req.user?.email,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    metadata: { checkInTime: now.toISOString() },
  });

  return res.json({ success: true, lastCheckIn: now, message: 'Check-in recorded successfully. Inactivity timers refreshed.' });
}

export async function getProfile(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatar: true,
      totpEnabled: true,
      sirenSoundPref: true,
      themePref: true,
      notificationEmail: true,
      pagePermissions: true,
      lastLogin: true,
      lastCheckIn: true,
      createdAt: true,
    },
  });

  if (!user) return res.status(404).json({ error: 'User not found' });

  let pagePermissions: string[] = ['*'];
  try {
    pagePermissions = JSON.parse(user.pagePermissions || '["*"]');
  } catch (e) {
    pagePermissions = ['*'];
  }
  if (user.role === 'AD' && !pagePermissions.includes('*')) {
    pagePermissions.push('*');
  }

  return res.json({
    ...user,
    pagePermissions,
  });
}

export async function updatePreferences(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const { sirenSoundPref, themePref, notificationEmail, name } = req.body;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(sirenSoundPref !== undefined && { sirenSoundPref }),
      ...(themePref !== undefined && { themePref }),
      ...(notificationEmail !== undefined && { notificationEmail }),
      ...(name && { name }),
    },
  });

  return res.json({
    success: true,
    user: {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      sirenSoundPref: updated.sirenSoundPref,
      themePref: updated.themePref,
      notificationEmail: updated.notificationEmail,
    },
  });
}

export async function changePassword(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long' });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    await logAuditEvent({
      eventType: 'AUTH_PASSWORD_CHANGE_FAILED',
      severity: 'WARNING',
      actorId: user.id,
      actorEmail: user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { reason: 'Incorrect current/temporary password' },
    });
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
    },
  });

  await logAuditEvent({
    eventType: 'AUTH_PASSWORD_CHANGED',
    severity: 'INFO',
    actorId: user.id,
    actorEmail: user.email,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  return res.json({ success: true, message: 'Password changed successfully' });
}

