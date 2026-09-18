import { Response } from 'express';
import { prisma } from '../prisma/client';
import { AuthenticatedRequest } from '../middlewares/auth';

export async function getNotifications(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id!;

  // Check upcoming work project due dates (Platform, DB, Deliverables)
  try {
    const upcomingWorks = await prisma.workProject.findMany({
      where: {
        OR: [
          { isShared: true },
          { ownerId: userId },
        ],
        status: { not: 'COMPLETED' },
      },
    });

    const now = Date.now();
    for (const work of upcomingWorks) {
      // 1. Platform Due Date
      if (work.platformDueDate) {
        const diffDays = Math.ceil((new Date(work.platformDueDate).getTime() - now) / (1000 * 60 * 60 * 24));
        if (diffDays <= 7) {
          const title = diffDays < 0
            ? `⚠️ Overdue: Hosted Platform Renewal for "${work.name}"`
            : `⏰ Platform Renewal Due in ${diffDays === 0 ? 'Today' : `${diffDays} days`} ("${work.name}")`;
          const msg = `Hosted platform (${work.hostedPlatform || 'Server/Hosting'}) renewal date is ${new Date(work.platformDueDate).toLocaleDateString()}. Please renew on time.`;

          const existing = await prisma.notification.findFirst({
            where: {
              userId,
              metadata: { contains: `"workId":"${work.id}","dueDateType":"PLATFORM"` },
            },
          });
          if (!existing) {
            await prisma.notification.create({
              data: {
                userId,
                title,
                message: msg,
                type: diffDays < 0 ? 'WARNING' : 'INFO',
                metadata: JSON.stringify({ workId: work.id, workName: work.name, dueDateType: 'PLATFORM' }),
              },
            });
          }
        }
      }

      // 2. Database Due Date
      if (work.dbDueDate) {
        const diffDays = Math.ceil((new Date(work.dbDueDate).getTime() - now) / (1000 * 60 * 60 * 24));
        if (diffDays <= 7) {
          const title = diffDays < 0
            ? `⚠️ Overdue: Database Subscription Renewal for "${work.name}"`
            : `⏰ Database Renewal Due in ${diffDays === 0 ? 'Today' : `${diffDays} days`} ("${work.name}")`;
          const msg = `Database service renewal date for project "${work.name}" is ${new Date(work.dbDueDate).toLocaleDateString()}.`;

          const existing = await prisma.notification.findFirst({
            where: {
              userId,
              metadata: { contains: `"workId":"${work.id}","dueDateType":"DATABASE"` },
            },
          });
          if (!existing) {
            await prisma.notification.create({
              data: {
                userId,
                title,
                message: msg,
                type: diffDays < 0 ? 'WARNING' : 'INFO',
                metadata: JSON.stringify({ workId: work.id, workName: work.name, dueDateType: 'DATABASE' }),
              },
            });
          }
        }
      }

      // 3. Project Delivery Due Date
      if (work.projectDueDate) {
        const diffDays = Math.ceil((new Date(work.projectDueDate).getTime() - now) / (1000 * 60 * 60 * 24));
        if (diffDays <= 7) {
          const title = diffDays < 0
            ? `⚠️ Project Milestone Overdue: "${work.name}"`
            : `⏰ Project Delivery Due in ${diffDays === 0 ? 'Today' : `${diffDays} days`} ("${work.name}")`;
          const msg = `Client ${work.clientName} delivery deadline is ${new Date(work.projectDueDate).toLocaleDateString()}.`;

          const existing = await prisma.notification.findFirst({
            where: {
              userId,
              metadata: { contains: `"workId":"${work.id}","dueDateType":"PROJECT"` },
            },
          });
          if (!existing) {
            await prisma.notification.create({
              data: {
                userId,
                title,
                message: msg,
                type: diffDays < 0 ? 'WARNING' : 'INFO',
                metadata: JSON.stringify({ workId: work.id, workName: work.name, dueDateType: 'PROJECT' }),
              },
            });
          }
        }
      }
    }
  } catch (e) {
    // Non-blocking
  }

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return res.json(
    notifications.map(n => ({
      ...n,
      metadata: JSON.parse(n.metadata || '{}'),
    }))
  );
}

export async function markNotificationAsRead(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const userId = req.user?.id!;

  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== userId) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });

  return res.json(updated);
}

export async function markAllNotificationsAsRead(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id!;

  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  return res.json({ success: true, message: 'All notifications marked as read' });
}

export async function clearNotifications(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id!;

  await prisma.notification.deleteMany({
    where: { userId },
  });

  return res.json({ success: true, message: 'Notifications cleared' });
}
