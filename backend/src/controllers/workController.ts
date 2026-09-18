import { Response } from 'express';
import { prisma } from '../prisma/client';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAuditEvent } from '../utils/auditLogger';
import { moveToTrash } from '../utils/trashHelper';

function parseWorkJsonFields(work: any) {
  let techStack: string[] = [];
  try {
    techStack = JSON.parse(work.techStack || '[]');
  } catch (e) {
    techStack = [];
  }

  let credentials: any[] = [];
  try {
    credentials = JSON.parse(work.credentials || '[]');
  } catch (e) {
    credentials = [];
  }

  let attachments: any[] = [];
  try {
    attachments = JSON.parse(work.attachments || '[]');
  } catch (e) {
    attachments = [];
  }

  return {
    ...work,
    techStack,
    credentials,
    attachments,
  };
}

export async function getWorks(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id!;

  const works = await prisma.workProject.findMany({
    where: {
      OR: [
        { isShared: true },
        { ownerId: userId },
      ],
    },
    include: {
      owner: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return res.json(works.map(parseWorkJsonFields));
}

export async function getWorkById(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const userId = req.user?.id!;

  const work = await prisma.workProject.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  if (!work) return res.status(404).json({ error: 'Work project not found' });
  if (!work.isShared && work.ownerId !== userId) {
    return res.status(403).json({ error: 'Unauthorized access to this work project' });
  }

  return res.json(parseWorkJsonFields(work));
}

export async function createWork(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id!;
  const {
    name,
    clientName,
    careOf,
    place,
    country,
    clientPhone,
    clientWhatsapp,
    techStack,
    hostedPlatform,
    gitLink,
    notes,
    credentials,
    attachments,
    paymentAmount,
    paymentCurrency,
    paymentVia,
    paymentStatus,
    platformDueDate,
    dbDueDate,
    projectDueDate,
    status,
    isShared,
  } = req.body;

  if (!name || !clientName) {
    return res.status(400).json({ error: 'Work Name and Client Name are required' });
  }

  const work = await prisma.workProject.create({
    data: {
      name: name.trim(),
      clientName: clientName.trim(),
      careOf: careOf?.trim() || null,
      place: place?.trim() || null,
      country: country?.trim() || null,
      clientPhone: clientPhone?.trim() || null,
      clientWhatsapp: clientWhatsapp?.trim() || null,
      techStack: Array.isArray(techStack) ? JSON.stringify(techStack) : '[]',
      hostedPlatform: hostedPlatform?.trim() || null,
      gitLink: gitLink?.trim() || null,
      notes: notes?.trim() || null,
      credentials: Array.isArray(credentials) ? JSON.stringify(credentials) : '[]',
      attachments: Array.isArray(attachments) ? JSON.stringify(attachments) : '[]',
      paymentAmount: paymentAmount !== undefined && paymentAmount !== null && paymentAmount !== '' ? parseFloat(paymentAmount) : null,
      paymentCurrency: paymentCurrency || 'USD',
      paymentVia: paymentVia?.trim() || null,
      paymentStatus: paymentStatus || 'PENDING',
      platformDueDate: platformDueDate ? new Date(platformDueDate) : null,
      dbDueDate: dbDueDate ? new Date(dbDueDate) : null,
      projectDueDate: projectDueDate ? new Date(projectDueDate) : null,
      status: status || 'IN_PROGRESS',
      isShared: isShared !== undefined ? isShared : true,
      ownerId: userId,
    },
    include: {
      owner: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  await logAuditEvent({
    eventType: 'WORK_PROJECT_CREATED',
    severity: 'INFO',
    actorId: userId,
    actorEmail: req.user?.email,
    targetType: 'WorkProject',
    targetId: work.id,
    metadata: { name: work.name, clientName: work.clientName },
  });

  return res.status(201).json(parseWorkJsonFields(work));
}

export async function updateWork(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const userId = req.user?.id!;
  const {
    name,
    clientName,
    careOf,
    place,
    country,
    clientPhone,
    clientWhatsapp,
    techStack,
    hostedPlatform,
    gitLink,
    notes,
    credentials,
    attachments,
    paymentAmount,
    paymentCurrency,
    paymentVia,
    paymentStatus,
    platformDueDate,
    dbDueDate,
    projectDueDate,
    status,
    isShared,
  } = req.body;

  const existing = await prisma.workProject.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Work project not found' });

  const updated = await prisma.workProject.update({
    where: { id },
    data: {
      name: name !== undefined ? name.trim() : existing.name,
      clientName: clientName !== undefined ? clientName.trim() : existing.clientName,
      careOf: careOf !== undefined ? (careOf ? careOf.trim() : null) : existing.careOf,
      place: place !== undefined ? (place ? place.trim() : null) : existing.place,
      country: country !== undefined ? (country ? country.trim() : null) : existing.country,
      clientPhone: clientPhone !== undefined ? (clientPhone ? clientPhone.trim() : null) : existing.clientPhone,
      clientWhatsapp: clientWhatsapp !== undefined ? (clientWhatsapp ? clientWhatsapp.trim() : null) : existing.clientWhatsapp,
      techStack: techStack !== undefined ? (Array.isArray(techStack) ? JSON.stringify(techStack) : '[]') : existing.techStack,
      hostedPlatform: hostedPlatform !== undefined ? (hostedPlatform ? hostedPlatform.trim() : null) : existing.hostedPlatform,
      gitLink: gitLink !== undefined ? (gitLink ? gitLink.trim() : null) : existing.gitLink,
      notes: notes !== undefined ? (notes ? notes.trim() : null) : existing.notes,
      credentials: credentials !== undefined ? (Array.isArray(credentials) ? JSON.stringify(credentials) : '[]') : existing.credentials,
      attachments: attachments !== undefined ? (Array.isArray(attachments) ? JSON.stringify(attachments) : '[]') : existing.attachments,
      paymentAmount: paymentAmount !== undefined ? (paymentAmount !== null && paymentAmount !== '' ? parseFloat(paymentAmount) : null) : existing.paymentAmount,
      paymentCurrency: paymentCurrency !== undefined ? paymentCurrency : existing.paymentCurrency,
      paymentVia: paymentVia !== undefined ? (paymentVia ? paymentVia.trim() : null) : existing.paymentVia,
      paymentStatus: paymentStatus !== undefined ? paymentStatus : existing.paymentStatus,
      platformDueDate: platformDueDate !== undefined ? (platformDueDate ? new Date(platformDueDate) : null) : existing.platformDueDate,
      dbDueDate: dbDueDate !== undefined ? (dbDueDate ? new Date(dbDueDate) : null) : existing.dbDueDate,
      projectDueDate: projectDueDate !== undefined ? (projectDueDate ? new Date(projectDueDate) : null) : existing.projectDueDate,
      status: status !== undefined ? status : existing.status,
      isShared: isShared !== undefined ? isShared : existing.isShared,
    },
    include: {
      owner: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  await logAuditEvent({
    eventType: 'WORK_PROJECT_UPDATED',
    severity: 'INFO',
    actorId: userId,
    actorEmail: req.user?.email,
    targetType: 'WorkProject',
    targetId: updated.id,
    metadata: { name: updated.name, clientName: updated.clientName },
  });

  return res.json(parseWorkJsonFields(updated));
}

export async function deleteWork(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const userId = req.user?.id!;

  const existing = await prisma.workProject.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Work project not found' });

  // Move snapshot to Trash
  await moveToTrash({
    originalId: existing.id,
    itemType: 'WORK',
    title: existing.name,
    subtitle: existing.clientName ? `Client: ${existing.clientName}` : undefined,
    itemData: existing,
    deletedById: userId,
  });

  await prisma.workProject.delete({ where: { id } });

  await logAuditEvent({
    eventType: 'WORK_PROJECT_DELETED',
    severity: 'INFO',
    actorId: userId,
    actorEmail: req.user?.email,
    targetType: 'WorkProject',
    targetId: id,
    metadata: { name: existing.name },
  });

  return res.json({ success: true, message: 'Work project moved to trash' });
}

