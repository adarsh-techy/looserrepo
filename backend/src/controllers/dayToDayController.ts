import { Response } from 'express';
import { prisma } from '../prisma/client';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAuditEvent } from '../utils/auditLogger';
import { moveToTrash } from '../utils/trashHelper';

export async function getDayToDayNotes(req: AuthenticatedRequest, res: Response) {
  const { date, month, search } = req.query;

  let whereClause: any = {};

  if (date && typeof date === 'string') {
    whereClause.date = date;
  } else if (month && typeof month === 'string') {
    // Matches "YYYY-MM" prefix
    whereClause.date = { startsWith: month };
  }

  let notes = await prisma.dayToDayNote.findMany({
    where: whereClause,
    include: {
      author: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: [
      { date: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    notes = notes.filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.category.toLowerCase().includes(q)
    );
  }

  const safeNotes = notes.map(n => ({
    ...n,
    tags: JSON.parse(n.tags || '[]'),
  }));

  return res.json(safeNotes);
}

export async function createDayToDayNote(req: AuthenticatedRequest, res: Response) {
  const { date, title, content, category, priority, time, tags } = req.body;
  const userId = req.user?.id!;

  if (!date || !title) {
    return res.status(400).json({ error: 'Date and Title are required for day-to-day notes' });
  }

  const note = await prisma.dayToDayNote.create({
    data: {
      date: date.trim(),
      title: title.trim(),
      content: content ? content.trim() : '',
      category: category || 'General',
      priority: priority || 'MEDIUM',
      time: time || null,
      tags: JSON.stringify(tags || []),
      authorId: userId,
    },
    include: {
      author: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  await logAuditEvent({
    eventType: 'DAY_TO_DAY_NOTE_CREATED',
    severity: 'INFO',
    actorId: userId,
    actorEmail: req.user?.email,
    targetType: 'DayToDayNote',
    targetId: note.id,
    metadata: { date: note.date, title: note.title },
  });

  return res.status(201).json({
    ...note,
    tags: JSON.parse(note.tags),
  });
}

export async function updateDayToDayNote(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { date, title, content, category, priority, isCompleted, time, tags } = req.body;
  const userId = req.user?.id!;

  const existing = await prisma.dayToDayNote.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Note entry not found' });

  const updated = await prisma.dayToDayNote.update({
    where: { id },
    data: {
      ...(date && { date: date.trim() }),
      ...(title && { title: title.trim() }),
      ...(content !== undefined && { content: content.trim() }),
      ...(category && { category }),
      ...(priority && { priority }),
      ...(isCompleted !== undefined && { isCompleted }),
      ...(time !== undefined && { time }),
      ...(tags !== undefined && { tags: JSON.stringify(tags) }),
    },
    include: {
      author: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  await logAuditEvent({
    eventType: 'DAY_TO_DAY_NOTE_UPDATED',
    severity: 'INFO',
    actorId: userId,
    actorEmail: req.user?.email,
    targetType: 'DayToDayNote',
    targetId: updated.id,
    metadata: { date: updated.date, title: updated.title },
  });

  return res.json({
    ...updated,
    tags: JSON.parse(updated.tags),
  });
}

export async function toggleCompleteDayToDayNote(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const userId = req.user?.id!;

  const existing = await prisma.dayToDayNote.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Note entry not found' });

  const updated = await prisma.dayToDayNote.update({
    where: { id },
    data: { isCompleted: !existing.isCompleted },
    include: {
      author: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  return res.json({
    ...updated,
    tags: JSON.parse(updated.tags),
  });
}

export async function deleteDayToDayNote(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const userId = req.user?.id!;

  const existing = await prisma.dayToDayNote.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Note entry not found' });

  // Move snapshot to Trash
  await moveToTrash({
    originalId: existing.id,
    itemType: 'DAY_TO_DAY',
    title: existing.title,
    subtitle: `${existing.date} • ${existing.category} • Priority: ${existing.priority}`,
    itemData: existing,
    deletedById: userId,
  });

  await prisma.dayToDayNote.delete({ where: { id } });

  await logAuditEvent({
    eventType: 'DAY_TO_DAY_NOTE_DELETED',
    severity: 'INFO',
    actorId: userId,
    actorEmail: req.user?.email,
    targetType: 'DayToDayNote',
    targetId: id,
    metadata: { date: existing.date, title: existing.title },
  });

  return res.json({ success: true, message: 'Note moved to trash' });
}

