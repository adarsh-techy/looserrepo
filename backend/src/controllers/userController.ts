import { Response } from 'express';
import { prisma } from '../prisma/client';
import { AuthenticatedRequest } from '../middlewares/auth';
import bcrypt from 'bcryptjs';
import { logAuditEvent } from '../utils/auditLogger';

export async function getAllUsers(req: AuthenticatedRequest, res: Response) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        totpEnabled: true,
        pagePermissions: true,
        lastLogin: true,
        lastCheckIn: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const parsedUsers = users.map((u) => {
      let perms: string[] = ['*'];
      try {
        if (typeof u.pagePermissions === 'string') {
          const parsed = JSON.parse(u.pagePermissions || '["*"]');
          perms = Array.isArray(parsed) ? parsed : ['*'];
        } else if (Array.isArray(u.pagePermissions)) {
          perms = u.pagePermissions;
        }
      } catch (e) {
        perms = ['*'];
      }
      if (u.role === 'AD' && !perms.includes('*')) {
        perms.push('*');
      }
      return {
        ...u,
        pagePermissions: perms,
      };
    });

    return res.json(parsedUsers);
  } catch (error: any) {
    console.error('[getAllUsers] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to retrieve users' });
  }
}

export async function createUser(req: AuthenticatedRequest, res: Response) {
  try {
    const actor = req.user;
    if (!actor || actor.role !== 'AD') {
      return res.status(403).json({ error: 'Unauthorized: Only role AD can create new users' });
    }

    const { name, email, password, role, pagePermissions } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const normalizedRole = role ? role.toString().trim().toUpperCase() : 'NS';

    let permsToSave = '["*"]';
    if (normalizedRole === 'AD') {
      permsToSave = '["*"]';
    } else if (Array.isArray(pagePermissions)) {
      permsToSave = JSON.stringify(pagePermissions);
    } else {
      permsToSave = JSON.stringify([
        '/works',
        '/business',
        '/future-plans',
        '/day-to-day',
        '/reminders-notes',
        '/messages',
        '/notifications',
        '/passwords',
        '/secret-notes',
        '/my-secret-notes',
        '/audit-log',
      ]);
    }

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: normalizedRole,
        pagePermissions: permsToSave,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        totpEnabled: true,
        pagePermissions: true,
        createdAt: true,
      },
    });

    await logAuditEvent({
      eventType: 'USER_CREATED_BY_ADMIN',
      severity: 'INFO',
      actorId: actor.id,
      actorEmail: actor.email,
      targetType: 'User',
      targetId: newUser.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { createdUserEmail: newUser.email, role: newUser.role },
    });

    let parsedPerms: string[] = ['*'];
    try {
      const parsed = JSON.parse(newUser.pagePermissions || '["*"]');
      parsedPerms = Array.isArray(parsed) ? parsed : ['*'];
    } catch (e) {
      parsedPerms = ['*'];
    }

    return res.status(201).json({
      ...newUser,
      pagePermissions: parsedPerms,
    });
  } catch (error: any) {
    console.error('[createUser] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create user account' });
  }
}

export async function updateUserPermissions(req: AuthenticatedRequest, res: Response) {
  try {
    const actor = req.user;
    if (!actor || actor.role !== 'AD') {
      return res.status(403).json({ error: 'Unauthorized: Only role AD can manage page permissions' });
    }

    const { id } = req.params;
    const { pagePermissions } = req.body;

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        pagePermissions: true,
        email: true,
        name: true,
      },
    });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    let permsToSave = '["*"]';
    if (targetUser.role === 'AD') {
      permsToSave = '["*"]';
    } else if (Array.isArray(pagePermissions)) {
      permsToSave = JSON.stringify(pagePermissions);
    } else {
      permsToSave = JSON.stringify([]);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { pagePermissions: permsToSave },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        pagePermissions: true,
        updatedAt: true,
      },
    });

    await logAuditEvent({
      eventType: 'USER_PERMISSIONS_UPDATED',
      severity: 'INFO',
      actorId: actor.id,
      actorEmail: actor.email,
      targetType: 'User',
      targetId: updatedUser.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        targetEmail: updatedUser.email,
        permissions: permsToSave,
      },
    });

    let parsedPerms: string[] = [];
    try {
      const parsed = JSON.parse(updatedUser.pagePermissions || '[]');
      parsedPerms = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      parsedPerms = [];
    }

    return res.json({
      ...updatedUser,
      pagePermissions: parsedPerms,
    });
  } catch (error: any) {
    console.error('[updateUserPermissions] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to update user permissions' });
  }
}

export async function updateUserRole(req: AuthenticatedRequest, res: Response) {
  try {
    const actor = req.user;
    if (!actor || actor.role !== 'AD') {
      return res.status(403).json({ error: 'Unauthorized: Only role AD can change user roles' });
    }

    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: 'Role is required' });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        pagePermissions: true,
        email: true,
        name: true,
      },
    });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const normalizedRole = role.toString().trim().toUpperCase();
    const existingPerms = (targetUser as any).pagePermissions || '["*"]';
    const permsToSave = normalizedRole === 'AD' ? '["*"]' : existingPerms;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        role: normalizedRole,
        pagePermissions: permsToSave,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        pagePermissions: true,
      },
    });

    await logAuditEvent({
      eventType: 'USER_ROLE_UPDATED',
      severity: 'WARNING',
      actorId: actor.id,
      actorEmail: actor.email,
      targetType: 'User',
      targetId: updatedUser.id,
      metadata: { oldRole: targetUser.role, newRole: normalizedRole },
    });

    return res.json(updatedUser);
  } catch (error: any) {
    console.error('[updateUserRole] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to update user role' });
  }
}

export async function deleteUser(req: AuthenticatedRequest, res: Response) {
  try {
    const actor = req.user;
    if (!actor || actor.role !== 'AD') {
      return res.status(403).json({ error: 'Unauthorized: Only role AD can delete users' });
    }

    const { id } = req.params;
    if (id === actor.id) {
      return res.status(400).json({ error: 'Cannot delete your own administrator account' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    await prisma.user.delete({ where: { id } });

    await logAuditEvent({
      eventType: 'USER_DELETED_BY_ADMIN',
      severity: 'WARNING',
      actorId: actor.id,
      actorEmail: actor.email,
      targetType: 'User',
      targetId: id,
      metadata: { deletedUserEmail: targetUser.email, deletedUserName: targetUser.name },
    });

    return res.json({ success: true, message: `User ${targetUser.name} (${targetUser.email}) was deleted successfully` });
  } catch (error: any) {
    console.error('[deleteUser] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete user account' });
  }
}

export async function adminResetUserPassword(req: AuthenticatedRequest, res: Response) {
  try {
    const actor = req.user;
    if (!actor || actor.role !== 'AD') {
      return res.status(403).json({ error: 'Unauthorized: Only role AD can reset passwords' });
    }

    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    await logAuditEvent({
      eventType: 'USER_PASSWORD_RESET_BY_ADMIN',
      severity: 'WARNING',
      actorId: actor.id,
      actorEmail: actor.email,
      targetType: 'User',
      targetId: id,
      metadata: { targetEmail: targetUser.email, targetName: targetUser.name },
    });

    return res.json({ success: true, message: `Password for ${targetUser.name} has been updated.` });
  } catch (error: any) {
    console.error('[adminResetUserPassword] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to reset password' });
  }
}

export async function getPartnerStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }

    const currentRole = req.user?.role?.toUpperCase() || 'AD';
    const targetRole = currentRole === 'AD' ? 'NS' : 'AD';

    let partner = await prisma.user.findFirst({
      where: {
        role: targetRole,
        id: { not: userId },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        totpEnabled: true,
        lastLogin: true,
        lastCheckIn: true,
        createdAt: true,
      },
    });

    if (!partner) {
      partner = await prisma.user.findFirst({
        where: {
          id: { not: userId },
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatar: true,
          totpEnabled: true,
          lastLogin: true,
          lastCheckIn: true,
          createdAt: true,
        },
      });
    }

    if (!partner) {
      return res.status(404).json({ error: 'Partner account not found' });
    }

    // Query most recent login or activity from AuditLog for the partner
    const latestAuditLog = await prisma.auditLog.findFirst({
      where: {
        actorId: partner.id,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        eventType: true,
      },
    });

    // Calculate most recent activity timestamp across lastLogin, lastCheckIn, and latestAuditLog
    const timestamps = [
      partner.lastLogin ? new Date(partner.lastLogin).getTime() : 0,
      partner.lastCheckIn ? new Date(partner.lastCheckIn).getTime() : 0,
      latestAuditLog?.createdAt ? new Date(latestAuditLog.createdAt).getTime() : 0,
      partner.createdAt ? new Date(partner.createdAt).getTime() : 0,
    ];
    const validTimestamps = timestamps.filter(
      (t): t is number => typeof t === 'number' && !isNaN(t) && t > 0
    );
    const mostRecentTimestamp = validTimestamps.length > 0 ? Math.max(...validTimestamps) : Date.now();
    const diffMs = Math.max(0, Date.now() - mostRecentTimestamp);
    const hoursSinceCheckIn = Math.floor(diffMs / (1000 * 60 * 60));
    const minutesSinceCheckIn = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    // Partner is alive and active if they logged in / checked in within the last 2 days (< 48 hours)
    const isAliveAndActive = hoursSinceCheckIn < 48;

    // Parse readable device info from userAgent
    let deviceInfo = 'Desktop / Web Browser';
    const ua = latestAuditLog?.userAgent || req.headers['user-agent'] || '';
    if (/iphone/i.test(ua)) deviceInfo = 'iPhone (iOS)';
    else if (/ipad/i.test(ua)) deviceInfo = 'iPad (iPadOS)';
    else if (/android/i.test(ua)) deviceInfo = 'Android Mobile Device';
    else if (/macintosh|mac os x/i.test(ua)) {
      if (/chrome/i.test(ua)) deviceInfo = 'MacBook / macOS (Chrome)';
      else if (/safari/i.test(ua)) deviceInfo = 'MacBook / macOS (Safari)';
      else deviceInfo = 'macOS Desktop Device';
    } else if (/windows/i.test(ua)) {
      deviceInfo = 'Windows PC (Desktop)';
    } else if (/linux/i.test(ua)) {
      deviceInfo = 'Linux Workstation';
    }

    const lastActivityDate = mostRecentTimestamp > 0 ? new Date(mostRecentTimestamp).toISOString() : new Date().toISOString();

    return res.json({
      partner,
      hoursSinceCheckIn,
      minutesSinceCheckIn,
      isReachable: isAliveAndActive,
      isAliveAndActive,
      statusText: isAliveAndActive ? 'Active / Reachable' : 'Unreachable (> 48h since contact)',
      latestActivity: {
        ipAddress: latestAuditLog?.ipAddress || req.ip || '127.0.0.1',
        userAgent: ua || 'Mozilla/5.0 Browser',
        deviceInfo,
        createdAt: lastActivityDate,
        eventType: latestAuditLog?.eventType || 'AUTH_LOGIN_SUCCESS',
      },
    });
  } catch (error: any) {
    console.error('[getPartnerStatus] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to retrieve partner status' });
  }
}
