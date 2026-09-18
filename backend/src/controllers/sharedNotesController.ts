import { Response } from 'express';
import { prisma } from '../prisma/client';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAuditEvent } from '../utils/auditLogger';
import { broadcastEvent } from '../socket';
import { moveToTrash } from '../utils/trashHelper';


export async function getSharedNotes(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id!;

  // Notes where current user is recipient or author
  const notes = await prisma.sharedNote.findMany({
    where: {
      OR: [
        { recipientId: userId },
        { authorId: userId },
      ],
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
      recipient: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return res.json(notes);
}

export async function createSharedNote(req: AuthenticatedRequest, res: Response) {
  const { title, content, recipientId, reminderDate, promptOnLogin } = req.body;
  const authorId = req.user?.id!;

  if (!title || !content || !recipientId) {
    return res.status(400).json({ error: 'Title, content, and recipient are required' });
  }

  const note = await prisma.sharedNote.create({
    data: {
      title,
      content,
      authorId,
      recipientId,
      reminderDate: reminderDate ? new Date(reminderDate) : null,
      promptOnLogin: promptOnLogin !== undefined ? promptOnLogin : true,
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
      recipient: { select: { id: true, name: true, email: true } },
    },
  });

  // Notify recipient via in-app notification & real-time websocket
  await prisma.notification.create({
    data: {
      userId: recipientId,
      title: `New note from ${req.user?.name || 'Partner'}`,
      message: `"${title}" has been left for you.`,
      type: 'INFO',
      metadata: JSON.stringify({ noteId: note.id }),
    },
  });

  broadcastEvent(`new_shared_note:${recipientId}`, { noteId: note.id, title, authorName: req.user?.name });

  await logAuditEvent({
    eventType: 'SHARED_NOTE_CREATED',
    severity: 'INFO',
    actorId: authorId,
    actorEmail: req.user?.email,
    targetType: 'SharedNote',
    targetId: note.id,
    metadata: { title: note.title, recipientId },
  });

  return res.status(201).json(note);
}

export async function markNoteAsRead(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const userId = req.user?.id!;

  const note = await prisma.sharedNote.findUnique({
    where: { id },
    include: { author: true },
  });

  if (!note) return res.status(404).json({ error: 'Note not found' });
  if (note.recipientId !== userId) {
    return res.status(403).json({ error: 'Only the recipient can mark this note as read' });
  }

  const now = new Date();
  const updated = await prisma.sharedNote.update({
    where: { id },
    data: {
      isRead: true,
      readAt: now,
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
      recipient: { select: { id: true, name: true, email: true } },
    },
  });

  // Notify author of read receipt
  broadcastEvent(`note_read_receipt:${note.authorId}`, {
    noteId: note.id,
    readBy: req.user?.name,
    readAt: now.toISOString(),
  });

  await logAuditEvent({
    eventType: 'SHARED_NOTE_READ',
    severity: 'INFO',
    actorId: userId,
    actorEmail: req.user?.email,
    targetType: 'SharedNote',
    targetId: id,
    metadata: { title: note.title, readAt: now.toISOString() },
  });

  return res.json(updated);
}

export async function deleteSharedNote(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const userId = req.user?.id!;

  const note = await prisma.sharedNote.findUnique({ where: { id } });
  if (!note) return res.status(404).json({ error: 'Note not found' });
  if (note.authorId !== userId && note.recipientId !== userId) {
    return res.status(403).json({ error: 'Unauthorized to delete this note' });
  }

  // Move snapshot to Trash
  await moveToTrash({
    originalId: note.id,
    itemType: 'SHARED_NOTE',
    title: note.title,
    subtitle: `Shared Reminder / Note`,
    itemData: note,
    deletedById: userId,
  });

  await prisma.sharedNote.delete({ where: { id } });

  await logAuditEvent({
    eventType: 'SHARED_NOTE_DELETED',
    severity: 'INFO',
    actorId: userId,
    actorEmail: req.user?.email,
    targetType: 'SharedNote',
    targetId: id,
    metadata: { title: note.title },
  });

  return res.json({ success: true, message: 'Note moved to trash' });
}

