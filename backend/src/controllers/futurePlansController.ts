import { Response } from 'express';
import { prisma } from '../prisma/client';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAuditEvent } from '../utils/auditLogger';
import { moveToTrash } from '../utils/trashHelper';

export async function getFuturePlans(req: AuthenticatedRequest, res: Response) {
  const { search, priority, status } = req.query;

  let plans = await prisma.futurePlan.findMany({
    include: {
      owner: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    plans = plans.filter(p => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  }

  if (priority && typeof priority === 'string' && priority !== 'ALL') {
    plans = plans.filter(p => p.priority.toUpperCase() === priority.toUpperCase());
  }

  if (status && typeof status === 'string' && status !== 'ALL') {
    plans = plans.filter(p => p.status.toUpperCase() === status.toUpperCase());
  }

  const parsedPlans = plans.map(p => ({
    ...p,
    milestones: JSON.parse(p.milestones || '[]'),
    links: JSON.parse(p.links || '[]'),
  }));

  return res.json(parsedPlans);
}

export async function getFuturePlanById(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  const plan = await prisma.futurePlan.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  if (!plan) {
    return res.status(404).json({ error: 'Future plan not found' });
  }

  return res.json({
    ...plan,
    milestones: JSON.parse(plan.milestones || '[]'),
    links: JSON.parse(plan.links || '[]'),
  });
}

export async function createFuturePlan(req: AuthenticatedRequest, res: Response) {
  const { title, targetQuarter, priority, status, description, milestones, links } = req.body;
  const userId = req.user?.id!;

  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required' });
  }

  const plan = await prisma.futurePlan.create({
    data: {
      title,
      targetQuarter: targetQuarter || 'Q4 2026',
      priority: priority || 'MEDIUM',
      status: status || 'PLANNING',
      description,
      milestones: JSON.stringify(milestones || []),
      links: JSON.stringify(links || []),
      ownerId: userId,
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  await logAuditEvent({
    eventType: 'FUTURE_PLAN_CREATED',
    severity: 'INFO',
    actorId: userId,
    actorEmail: req.user?.email,
    targetType: 'FuturePlan',
    targetId: plan.id,
    metadata: { title: plan.title, targetQuarter: plan.targetQuarter, priority: plan.priority },
  });

  return res.status(201).json({
    ...plan,
    milestones: JSON.parse(plan.milestones),
    links: JSON.parse(plan.links),
  });
}

export async function updateFuturePlan(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { title, targetQuarter, priority, status, description, milestones, links, adNotes, nsNotes, sharedNotes } = req.body;
  const userId = req.user?.id!;

  const existing = await prisma.futurePlan.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Plan not found' });

  const now = new Date();
  const updated = await prisma.futurePlan.update({
    where: { id },
    data: {
      ...(title && { title }),
      ...(targetQuarter && { targetQuarter }),
      ...(priority && { priority }),
      ...(status && { status }),
      ...(description !== undefined && { description }),
      ...(milestones !== undefined && { milestones: JSON.stringify(milestones) }),
      ...(links !== undefined && { links: JSON.stringify(links) }),
      ...(adNotes !== undefined && { adNotes, adNotesUpdatedAt: now }),
      ...(nsNotes !== undefined && { nsNotes, nsNotesUpdatedAt: now }),
      ...(sharedNotes !== undefined && {
        sharedNotes,
        sharedNotesUpdatedAt: now,
        sharedNotesUpdatedBy: req.user?.name || req.user?.role || 'Partner',
      }),
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  await logAuditEvent({
    eventType: 'FUTURE_PLAN_UPDATED',
    severity: 'INFO',
    actorId: userId,
    actorEmail: req.user?.email,
    targetType: 'FuturePlan',
    targetId: updated.id,
    metadata: { title: updated.title, status: updated.status },
  });

  return res.json({
    ...updated,
    milestones: JSON.parse(updated.milestones),
    links: JSON.parse(updated.links),
  });
}

export async function updatePartnerNotes(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { role, notes } = req.body;
  const userId = req.user?.id!;
  
  // Use passed role or fallback to req.user.role
  const userRole = (role || req.user?.role || 'AD').toString().toUpperCase();
  const isAD = userRole === 'AD';
  const isShared = userRole === 'SHARED' || userRole === 'JOINT';

  const existing = await prisma.futurePlan.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Plan not found' });

  const now = new Date();
  let updateData: any = {};
  if (isShared) {
    updateData = {
      sharedNotes: notes,
      sharedNotesUpdatedAt: now,
      sharedNotesUpdatedBy: req.user?.name || (isAD ? 'Partner AD' : 'Partner NS'),
    };
  } else if (isAD) {
    updateData = { adNotes: notes, adNotesUpdatedAt: now };
  } else {
    updateData = { nsNotes: notes, nsNotesUpdatedAt: now };
  }

  const updated = await prisma.futurePlan.update({
    where: { id },
    data: updateData,
    include: {
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  await logAuditEvent({
    eventType: 'FUTURE_PLAN_PARTNER_NOTE_UPDATED',
    severity: 'INFO',
    actorId: userId,
    actorEmail: req.user?.email,
    targetType: 'FuturePlan',
    targetId: updated.id,
    metadata: { partnerRole: userRole, planTitle: updated.title },
  });

  return res.json({
    ...updated,
    milestones: JSON.parse(updated.milestones),
    links: JSON.parse(updated.links),
  });
}

export async function deleteFuturePlan(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const userId = req.user?.id!;

  const existing = await prisma.futurePlan.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Plan not found' });

  // Move snapshot to Trash
  await moveToTrash({
    originalId: existing.id,
    itemType: 'FUTURE_PLAN',
    title: existing.title,
    subtitle: `${existing.targetQuarter} • Priority: ${existing.priority} • Status: ${existing.status}`,
    itemData: existing,
    deletedById: userId,
  });

  await prisma.futurePlan.delete({ where: { id } });

  await logAuditEvent({
    eventType: 'FUTURE_PLAN_DELETED',
    severity: 'INFO',
    actorId: userId,
    actorEmail: req.user?.email,
    targetType: 'FuturePlan',
    targetId: id,
    metadata: { title: existing.title },
  });

  return res.json({ success: true, message: 'Future plan moved to trash' });
}


