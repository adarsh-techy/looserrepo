import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { prisma } from '../prisma/client';

import { logAuditEvent } from '../utils/auditLogger';

export async function getTrashItems(req: AuthenticatedRequest, res: Response) {
  try {
    const { type, search } = req.query;

    const whereClause: any = {};

    if (type && type !== 'ALL') {
      whereClause.itemType = String(type);
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      whereClause.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { subtitle: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, total, allCounts] = await Promise.all([
      prisma.trashItem.findMany({
        where: whereClause,
        include: {
          deletedBy: {
            select: { id: true, name: true, email: true, role: true, avatar: true },
          },
        },
        orderBy: { deletedAt: 'desc' },
      }),
      prisma.trashItem.count({ where: whereClause }),
      prisma.trashItem.groupBy({
        by: ['itemType'],
        _count: { id: true },
      }),
    ]);

    const countsByType: Record<string, number> = {
      ALL: 0,
      WORK: 0,
      MONEY: 0,
      PAYMENT: 0,
      BUSINESS: 0,
      FUTURE_PLAN: 0,
      DAY_TO_DAY: 0,
      VAULT: 0,
      SHARED_NOTE: 0,
      SECRET_NOTE: 0,
      DOCUMENT: 0,
    };

    allCounts.forEach((c) => {
      countsByType[c.itemType] = c._count.id;
      countsByType.ALL += c._count.id;
    });

    return res.json({
      items,
      total,
      countsByType,
    });
  } catch (error) {
    console.error('Failed to get trash items:', error);
    return res.status(500).json({ error: 'Failed to fetch trash items' });
  }
}

export async function getTrashItemById(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    const item = await prisma.trashItem.findUnique({
      where: { id },
      include: {
        deletedBy: {
          select: { id: true, name: true, email: true, role: true, avatar: true },
        },
      },
    });

    if (!item) {
      return res.status(404).json({ error: 'Trash item not found' });
    }

    let parsedData: any = {};
    try {
      parsedData = JSON.parse(item.itemData);
    } catch (e) {
      parsedData = item.itemData;
    }

    return res.json({
      ...item,
      parsedData,
    });
  } catch (error) {
    console.error('Failed to get trash item by id:', error);
    return res.status(500).json({ error: 'Failed to fetch trash item details' });
  }
}

export async function restoreTrashItem(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user?.id!;

    const trashItem = await prisma.trashItem.findUnique({
      where: { id },
      include: {
        deletedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!trashItem) {
      return res.status(404).json({ error: 'Trash item not found' });
    }

    let rawData: any = {};
    try {
      rawData = JSON.parse(trashItem.itemData);
    } catch (e) {
      return res.status(400).json({ error: 'Corrupted item data snapshot' });
    }

    let restoredRecord: any = null;

    switch (trashItem.itemType) {
      case 'WORK': {
        const { id: _, owner, ...data } = rawData;
        // Verify owner exists, fallback to current user
        let ownerId = data.ownerId;
        const ownerExists = await prisma.user.findUnique({ where: { id: ownerId } });
        if (!ownerExists) ownerId = userId;

        restoredRecord = await prisma.workProject.create({
          data: {
            ...data,
            ownerId,
            id: trashItem.originalId,
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
            updatedAt: new Date(),
            platformDueDate: data.platformDueDate ? new Date(data.platformDueDate) : null,
            dbDueDate: data.dbDueDate ? new Date(data.dbDueDate) : null,
            projectDueDate: data.projectDueDate ? new Date(data.projectDueDate) : null,
          },
        });
        break;
      }

      case 'MONEY': {
        const { id: _, owner, ...data } = rawData;
        let ownerId = data.ownerId;
        const ownerExists = await prisma.user.findUnique({ where: { id: ownerId } });
        if (!ownerExists) ownerId = userId;

        restoredRecord = await prisma.moneyRecord.create({
          data: {
            ...data,
            ownerId,
            id: trashItem.originalId,
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
            updatedAt: new Date(),
          },
        });
        break;
      }

      case 'PAYMENT': {
        const { id: _, owner, ...data } = rawData;
        let ownerId = data.ownerId;
        const ownerExists = await prisma.user.findUnique({ where: { id: ownerId } });
        if (!ownerExists) ownerId = userId;

        restoredRecord = await prisma.paymentRecord.create({
          data: {
            ...data,
            ownerId,
            id: trashItem.originalId,
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
            updatedAt: new Date(),
          },
        });
        break;
      }

      case 'BUSINESS': {
        const { id: _, owner, ...data } = rawData;
        let ownerId = data.ownerId;
        const ownerExists = await prisma.user.findUnique({ where: { id: ownerId } });
        if (!ownerExists) ownerId = userId;

        restoredRecord = await prisma.businessItem.create({
          data: {
            ...data,
            ownerId,
            id: trashItem.originalId,
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
            updatedAt: new Date(),
          },
        });
        break;
      }

      case 'FUTURE_PLAN': {
        const { id: _, owner, ...data } = rawData;
        let ownerId = data.ownerId;
        const ownerExists = await prisma.user.findUnique({ where: { id: ownerId } });
        if (!ownerExists) ownerId = userId;

        restoredRecord = await prisma.futurePlan.create({
          data: {
            ...data,
            ownerId,
            id: trashItem.originalId,
            adNotesUpdatedAt: data.adNotesUpdatedAt ? new Date(data.adNotesUpdatedAt) : null,
            nsNotesUpdatedAt: data.nsNotesUpdatedAt ? new Date(data.nsNotesUpdatedAt) : null,
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
            updatedAt: new Date(),
          },
        });
        break;
      }

      case 'DAY_TO_DAY': {
        const { id: _, author, ...data } = rawData;
        let authorId = data.authorId;
        const authorExists = await prisma.user.findUnique({ where: { id: authorId } });
        if (!authorExists) authorId = userId;

        restoredRecord = await prisma.dayToDayNote.create({
          data: {
            ...data,
            authorId,
            id: trashItem.originalId,
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
            updatedAt: new Date(),
          },
        });
        break;
      }

      case 'VAULT': {
        const { id: _, owner, ...data } = rawData;
        let ownerId = data.ownerId;
        const ownerExists = await prisma.user.findUnique({ where: { id: ownerId } });
        if (!ownerExists) ownerId = userId;

        restoredRecord = await prisma.passwordVaultItem.create({
          data: {
            ...data,
            ownerId,
            id: trashItem.originalId,
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
            updatedAt: new Date(),
          },
        });
        break;
      }

      case 'SHARED_NOTE': {
        const { id: _, author, recipient, ...data } = rawData;
        let authorId = data.authorId;
        let recipientId = data.recipientId;
        const authorExists = await prisma.user.findUnique({ where: { id: authorId } });
        const recipientExists = await prisma.user.findUnique({ where: { id: recipientId } });
        if (!authorExists) authorId = userId;
        if (!recipientExists) recipientId = userId;

        restoredRecord = await prisma.sharedNote.create({
          data: {
            ...data,
            authorId,
            recipientId,
            id: trashItem.originalId,
            reminderDate: data.reminderDate ? new Date(data.reminderDate) : null,
            readAt: data.readAt ? new Date(data.readAt) : null,
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
            updatedAt: new Date(),
          },
        });
        break;
      }

      case 'SECRET_NOTE': {
        const { id: _, owner, designatedRecipient, emergencyRequests, ...data } = rawData;
        let ownerId = data.ownerId;
        let designatedRecipientId = data.designatedRecipientId;
        const ownerExists = await prisma.user.findUnique({ where: { id: ownerId } });
        const recipientExists = await prisma.user.findUnique({ where: { id: designatedRecipientId } });
        if (!ownerExists) ownerId = userId;
        if (!recipientExists) designatedRecipientId = userId;

        restoredRecord = await prisma.secretNote.create({
          data: {
            ...data,
            ownerId,
            designatedRecipientId,
            id: trashItem.originalId,
            ownerLastCheckInAt: data.ownerLastCheckInAt ? new Date(data.ownerLastCheckInAt) : new Date(),
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
            updatedAt: new Date(),
          },
        });
        break;
      }

      case 'DOCUMENT': {
        const { id: _, owner, ...data } = rawData;
        let ownerId = data.ownerId;
        const ownerExists = await prisma.user.findUnique({ where: { id: ownerId } });
        if (!ownerExists) ownerId = userId;

        restoredRecord = await prisma.documentItem.create({
          data: {
            ...data,
            ownerId,
            id: trashItem.originalId,
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
            updatedAt: new Date(),
          },
        });
        break;
      }

      default:
        return res.status(400).json({ error: `Unsupported item type for restoration: ${trashItem.itemType}` });
    }

    // Remove from trash
    await prisma.trashItem.delete({ where: { id } });

    await logAuditEvent({
      eventType: 'TRASH_ITEM_RESTORED',
      severity: 'INFO',
      actorId: userId,
      actorEmail: req.user?.email,
      targetType: trashItem.itemType,
      targetId: trashItem.originalId,
      metadata: { title: trashItem.title, itemType: trashItem.itemType },
    });

    return res.json({
      success: true,
      message: `"${trashItem.title}" restored successfully!`,
      restoredRecord,
    });
  } catch (error: any) {
    console.error('Failed to restore trash item:', error);
    return res.status(500).json({ error: error.message || 'Failed to restore item from trash' });
  }
}

export async function deleteTrashItemPermanently(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user?.id!;

    const item = await prisma.trashItem.findUnique({ where: { id } });
    if (!item) {
      return res.status(404).json({ error: 'Trash item not found' });
    }

    await prisma.trashItem.delete({ where: { id } });

    await logAuditEvent({
      eventType: 'TRASH_ITEM_SECURITY_PURGED',
      severity: 'WARNING',
      actorId: userId,
      actorEmail: req.user?.email,
      targetType: item.itemType,
      targetId: item.originalId,
      metadata: {
        title: item.title,
        itemType: item.itemType,
        purgeReason: reason || item.deleteReason || 'Authorized Security Purge',
        originalDeleteReason: item.deleteReason,
      },
    });

    return res.json({ success: true, message: 'Item permanently purged from security vault' });
  } catch (error) {
    console.error('Failed to permanently delete trash item:', error);
    return res.status(500).json({ error: 'Failed to delete trash item permanently' });
  }
}

export async function updateTrashItemReason(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { deleteReason } = req.body;

    const item = await prisma.trashItem.update({
      where: { id },
      data: { deleteReason: deleteReason?.trim() || null },
    });

    return res.json({ success: true, item });
  } catch (error) {
    console.error('Failed to update deletion reason:', error);
    return res.status(500).json({ error: 'Failed to update deletion reason' });
  }
}

export async function emptyTrash(req: AuthenticatedRequest, res: Response) {
  try {
    const { type, reason } = req.body || req.query;
    const userId = req.user?.id!;

    const whereClause: any = {};
    if (type && type !== 'ALL') {
      whereClause.itemType = String(type);
    }

    const deleted = await prisma.trashItem.deleteMany({
      where: whereClause,
    });

    await logAuditEvent({
      eventType: 'TRASH_SECURITY_PURGED_ALL',
      severity: 'WARNING',
      actorId: userId,
      actorEmail: req.user?.email,
      targetType: 'Trash',
      metadata: {
        count: deleted.count,
        typeFilter: type || 'ALL',
        purgeReason: reason || 'Authorized Bulk Security Purge',
      },
    });

    return res.json({
      success: true,
      message: `Trash emptied (${deleted.count} item(s) permanently purged)`,
      count: deleted.count,
    });
  } catch (error) {
    console.error('Failed to empty trash:', error);
    return res.status(500).json({ error: 'Failed to empty trash' });
  }
}

