import { Response } from 'express';
import { prisma } from '../prisma/client';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAuditEvent } from '../utils/auditLogger';
import { moveToTrash } from '../utils/trashHelper';

export async function getBusinessItems(req: AuthenticatedRequest, res: Response) {
  const { search, category, tag } = req.query;

  let items = await prisma.businessItem.findMany({
    include: {
      owner: { select: { id: true, name: true, email: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Filter in memory for JSON fields & search query
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    items = items.filter(
      item =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.tags.toLowerCase().includes(q)
    );
  }

  if (category && typeof category === 'string' && category !== 'All') {
    items = items.filter(item => item.category.toLowerCase() === category.toLowerCase());
  }

  if (tag && typeof tag === 'string') {
    items = items.filter(item => item.tags.toLowerCase().includes(tag.toLowerCase()));
  }

  const parsedItems = items.map(item => ({
    ...item,
    tags: JSON.parse(item.tags || '[]'),
    links: JSON.parse(item.links || '[]'),
    attachments: JSON.parse(item.attachments || '[]'),
  }));

  return res.json(parsedItems);
}

export async function getBusinessItemById(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  const item = await prisma.businessItem.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  if (!item) {
    return res.status(404).json({ error: 'Business item not found' });
  }

  return res.json({
    ...item,
    tags: JSON.parse(item.tags || '[]'),
    links: JSON.parse(item.links || '[]'),
    attachments: JSON.parse(item.attachments || '[]'),
  });
}

export async function createBusinessItem(req: AuthenticatedRequest, res: Response) {
  const { title, category, description, tags, links, attachments, isShared } = req.body;
  const userId = req.user?.id!;

  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required' });
  }

  const item = await prisma.businessItem.create({
    data: {
      title,
      category: category || 'General',
      description,
      tags: JSON.stringify(tags || []),
      links: JSON.stringify(links || []),
      attachments: JSON.stringify(attachments || []),
      isShared: isShared !== undefined ? isShared : true,
      ownerId: userId,
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  await logAuditEvent({
    eventType: 'BUSINESS_ITEM_CREATED',
    severity: 'INFO',
    actorId: userId,
    actorEmail: req.user?.email,
    targetType: 'BusinessItem',
    targetId: item.id,
    metadata: { title: item.title, category: item.category },
  });

  return res.status(201).json({
    ...item,
    tags: JSON.parse(item.tags),
    links: JSON.parse(item.links),
    attachments: JSON.parse(item.attachments),
  });
}

export async function updateBusinessItem(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { title, category, description, tags, links, attachments, isShared } = req.body;
  const userId = req.user?.id!;

  const existing = await prisma.businessItem.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Item not found' });

  const updated = await prisma.businessItem.update({
    where: { id },
    data: {
      ...(title && { title }),
      ...(category && { category }),
      ...(description !== undefined && { description }),
      ...(tags !== undefined && { tags: JSON.stringify(tags) }),
      ...(links !== undefined && { links: JSON.stringify(links) }),
      ...(attachments !== undefined && { attachments: JSON.stringify(attachments) }),
      ...(isShared !== undefined && { isShared }),
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  await logAuditEvent({
    eventType: 'BUSINESS_ITEM_UPDATED',
    severity: 'INFO',
    actorId: userId,
    actorEmail: req.user?.email,
    targetType: 'BusinessItem',
    targetId: updated.id,
    metadata: { title: updated.title },
  });

  return res.json({
    ...updated,
    tags: JSON.parse(updated.tags),
    links: JSON.parse(updated.links),
    attachments: JSON.parse(updated.attachments),
  });
}

export async function deleteBusinessItem(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const userId = req.user?.id!;

  const existing = await prisma.businessItem.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Item not found' });

  // Move snapshot to Trash
  await moveToTrash({
    originalId: existing.id,
    itemType: 'BUSINESS',
    title: existing.title,
    subtitle: `Category: ${existing.category}`,
    itemData: existing,
    deletedById: userId,
  });

  await prisma.businessItem.delete({ where: { id } });

  await logAuditEvent({
    eventType: 'BUSINESS_ITEM_DELETED',
    severity: 'INFO',
    actorId: userId,
    actorEmail: req.user?.email,
    targetType: 'BusinessItem',
    targetId: id,
    metadata: { title: existing.title },
  });

  return res.json({ success: true, message: 'Business item moved to trash' });
}

