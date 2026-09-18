import { Response } from 'express';
import { prisma } from '../prisma/client';
import { AuthenticatedRequest } from '../middlewares/auth';

export async function getAuditLogs(req: AuthenticatedRequest, res: Response) {
  const { severity, eventType, search, limit = '20', page = '1', offset } = req.query;

  const take = Math.min(parseInt(limit as string, 10) || 20, 200);
  const skip =
    offset !== undefined
      ? Math.max(0, parseInt(offset as string, 10) || 0)
      : Math.max(0, ((parseInt(page as string, 10) || 1) - 1) * take);

  const where: any = {};

  if (severity && typeof severity === 'string' && severity !== 'ALL') {
    where.severity = severity.toUpperCase();
  }

  if (eventType && typeof eventType === 'string' && eventType !== 'ALL') {
    where.eventType = { contains: eventType, mode: 'insensitive' };
  }

  if (search && typeof search === 'string' && search.trim().length > 0) {
    const q = search.trim();
    where.OR = [
      { eventType: { contains: q, mode: 'insensitive' } },
      { actorEmail: { contains: q, mode: 'insensitive' } },
      { targetType: { contains: q, mode: 'insensitive' } },
      { metadata: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [totalCount, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: {
        actor: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  const parsedLogs = logs.map((l) => ({
    ...l,
    metadata: (() => {
      try {
        return JSON.parse(l.metadata || '{}');
      } catch (e) {
        return {};
      }
    })(),
  }));

  res.setHeader('X-Total-Count', totalCount.toString());
  res.setHeader('X-Has-More', (skip + parsedLogs.length < totalCount).toString());

  return res.json(parsedLogs);
}

export async function logSecurityAlertEvent(req: AuthenticatedRequest, res: Response) {
  const { eventType, severity, alertMessage, noteTitle, metadata } = req.body;
  const userId = req.user?.id!;
  const userEmail = req.user?.email!;

  const { logAuditEvent } = await import('../utils/auditLogger');

  // Find the other partner (vice versa: if AD -> NS, if NS -> AD)
  const actor = await prisma.user.findUnique({ where: { id: userId } });
  const partnerRole = actor?.role === 'AD' ? 'NS' : 'AD';
  let partner = await prisma.user.findFirst({
    where: {
      id: { not: userId },
      role: partnerRole,
    },
  });
  if (!partner) {
    partner = await prisma.user.findFirst({
      where: { id: { not: userId } },
    });
  }

  await logAuditEvent({
    eventType: eventType || 'EMERGENCY_ACCESS_CHEAT_BLOCKED',
    severity: (severity as any) || 'CRITICAL',
    actorId: userId,
    actorEmail: userEmail,
    ipAddress: req.ip || metadata?.ipAddress,
    userAgent: req.headers['user-agent'] || metadata?.deviceInfo,
    noteTitle: noteTitle || 'Emergency Secret Vault',
    sirenTriggered: true,
    alertOwnerId: partner?.id,
    alertMessage:
      alertMessage ||
      `🚨 SIREN ALERT: Partner ${actor?.name || actor?.role} attempted unauthorized entry into Emergency Secret Notes claiming ${partner?.name || partner?.role} is missing, but ${partner?.name || partner?.role} is ALIVE and active within the last 2 days! Access blocked.`,
    metadata: {
      ...metadata,
      actorName: actor?.name || actor?.role || 'Partner',
      actorRole: actor?.role,
      targetPartnerId: partner?.id,
      targetPartnerName: partner?.name || partner?.role,
      timestamp: new Date().toISOString(),
    },
  });

  return res.json({ success: true });
}

export async function getPartnerBreachAlerts(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id!;

  const alerts = await prisma.notification.findMany({
    where: {
      userId,
      type: 'SECURITY_ALERT',
      isRead: false,
    },
    orderBy: { createdAt: 'desc' },
  });

  return res.json(
    alerts.map((a) => ({
      ...a,
      metadata: (() => {
        try {
          return JSON.parse(a.metadata || '{}');
        } catch (e) {
          return {};
        }
      })(),
    }))
  );
}

export async function acknowledgeBreachAlert(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id!;
  const { notificationId } = req.body;

  if (notificationId) {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  } else {
    await prisma.notification.updateMany({
      where: { userId, type: 'SECURITY_ALERT' },
      data: { isRead: true },
    });
  }

  return res.json({ success: true });
}

