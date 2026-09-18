import { Response } from 'express';
import { prisma } from '../prisma/client';
import { AuthenticatedRequest } from '../middlewares/auth';
import { emitChatMessageToUser, emitMessagesReadToUser, isUserOnline } from '../socket';

/**
 * Helper to find the designated partner for a user
 */
async function resolvePartner(userId: string, requestedRecipientId?: string) {
  if (requestedRecipientId) {
    const partner = await prisma.user.findUnique({
      where: { id: requestedRecipientId },
      select: { id: true, name: true, email: true, role: true, avatar: true, lastCheckIn: true, lastLogin: true },
    });
    if (partner) return partner;
  }

  // Find the other user in the vault (if logged in user is AD -> find NS, else find AD or any other user)
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  const targetRole = currentUser?.role === 'AD' ? 'NS' : 'AD';

  let partner = await prisma.user.findFirst({
    where: {
      role: targetRole,
      id: { not: userId },
    },
    select: { id: true, name: true, email: true, role: true, avatar: true, lastCheckIn: true, lastLogin: true },
  });

  if (!partner) {
    partner = await prisma.user.findFirst({
      where: { id: { not: userId } },
      select: { id: true, name: true, email: true, role: true, avatar: true, lastCheckIn: true, lastLogin: true },
    });
  }

  return partner;
}

/**
 * Get current partner info & online status
 */
export async function getChatPartner(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id!;
    const partner = await resolvePartner(userId);

    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    return res.json({
      partner: {
        ...partner,
        isOnline: isUserOnline(partner.id),
      },
    });
  } catch (err: any) {
    console.error('[GetChatPartner Error]', err);
    return res.status(500).json({ error: 'Failed to fetch partner info' });
  }
}

/**
 * Get chat conversation messages between current user and partner
 */
export async function getMessages(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id!;
    const partnerIdQuery = req.query.partnerId as string | undefined;
    const partner = await resolvePartner(userId, partnerIdQuery);

    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    const limit = parseInt(req.query.limit as string) || 100;
    const before = req.query.before as string | undefined;

    const whereClause: any = {
      OR: [
        { senderId: userId, recipientId: partner.id },
        { senderId: partner.id, recipientId: userId },
      ],
    };

    if (before) {
      whereClause.createdAt = { lt: new Date(before) };
    }

    const messages = await prisma.chatMessage.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: {
        sender: {
          select: { id: true, name: true, email: true, role: true, avatar: true },
        },
        recipient: {
          select: { id: true, name: true, email: true, role: true, avatar: true },
        },
      },
    });

    return res.json({
      messages,
      partner: {
        ...partner,
        isOnline: isUserOnline(partner.id),
      },
    });
  } catch (err: any) {
    console.error('[GetMessages Error]', err);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
}

/**
 * Send a new chat message to partner
 */
export async function sendMessage(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id!;
    const { content, recipientId } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content cannot be empty' });
    }

    const partner = await resolvePartner(userId, recipientId);
    if (!partner) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    const message = await prisma.chatMessage.create({
      data: {
        content: content.trim(),
        senderId: userId,
        recipientId: partner.id,
        isDelivered: true,
        deliveredAt: new Date(),
        isRead: false,
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, role: true, avatar: true },
        },
        recipient: {
          select: { id: true, name: true, email: true, role: true, avatar: true },
        },
      },
    });

    // Notify recipient in real-time via WebSocket
    emitChatMessageToUser(partner.id, message);

    return res.status(201).json({ message });
  } catch (err: any) {
    console.error('[SendMessage Error]', err);
    return res.status(500).json({ error: 'Failed to send message' });
  }
}

/**
 * Mark messages as read by recipient (turns ticks into double blue ticks)
 */
export async function markMessagesAsRead(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id!;
    const { senderId, messageIds } = req.body;

    const partner = await resolvePartner(userId, senderId);
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    const now = new Date();

    const whereClause: any = {
      recipientId: userId,
      senderId: partner.id,
      isRead: false,
    };

    if (Array.isArray(messageIds) && messageIds.length > 0) {
      whereClause.id = { in: messageIds };
    }

    const updateResult = await prisma.chatMessage.updateMany({
      where: whereClause,
      data: {
        isRead: true,
        readAt: now,
      },
    });

    // Notify sender that recipient read the messages (triggers blue tick update on sender's screen)
    emitMessagesReadToUser(partner.id, {
      readBy: userId,
      readAt: now.toISOString(),
      messageIds,
    });

    return res.json({
      success: true,
      updatedCount: updateResult.count,
      readAt: now.toISOString(),
    });
  } catch (err: any) {
    console.error('[MarkMessagesAsRead Error]', err);
    return res.status(500).json({ error: 'Failed to mark messages as read' });
  }
}

/**
 * Get total unread messages count for current user
 */
export async function getUnreadCount(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id!;

    const unreadCount = await prisma.chatMessage.count({
      where: {
        recipientId: userId,
        isRead: false,
      },
    });

    return res.json({ unreadCount });
  } catch (err: any) {
    console.error('[GetUnreadCount Error]', err);
    return res.status(500).json({ error: 'Failed to get unread count' });
  }
}
