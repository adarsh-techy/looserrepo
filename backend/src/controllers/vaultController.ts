import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma/client';
import { AuthenticatedRequest } from '../middlewares/auth';
import { config } from '../config';
import { encryptWithMasterKey, decryptWithMasterKey, maskSensitiveValue } from '../utils/crypto';
import { logAuditEvent } from '../utils/auditLogger';
import { moveToTrash } from '../utils/trashHelper';


export async function getVaultItems(req: AuthenticatedRequest, res: Response) {
  const { search, isPersonal } = req.query;
  const isPersonalQuery = isPersonal === 'true';

  // Strictly enforce that only role AD can view personal passwords
  if (isPersonalQuery && req.user?.role !== 'AD') {
    return res.status(403).json({ error: 'Access denied: Personal Passwords Vault is strictly restricted to Adarsh (AD).' });
  }

  let items = await prisma.passwordVaultItem.findMany({
    where: {
      isPersonal: isPersonalQuery,
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    items = items.filter(i =>
      i.accountName.toLowerCase().includes(q) ||
      i.usernameOrEmail.toLowerCase().includes(q) ||
      (i.websiteUrl && i.websiteUrl.toLowerCase().includes(q))
    );
  }

  // Return items with masked password (NEVER return ciphertext or IV without explicit reveal)
  const safeItems = items.map(item => ({
    id: item.id,
    accountName: item.accountName,
    usernameOrEmail: item.usernameOrEmail,
    maskedPassword: maskSensitiveValue(14),
    websiteUrl: item.websiteUrl,
    notes: item.notes,
    attachments: JSON.parse(item.attachments || '[]'),
    isPersonal: item.isPersonal,
    ownerId: item.ownerId,
    owner: item.owner,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));

  return res.json(safeItems);
}

export async function createVaultItem(req: AuthenticatedRequest, res: Response) {
  const { accountName, usernameOrEmail, password, websiteUrl, notes, attachments, isPersonal } = req.body;
  const userId = req.user?.id!;
  const isPersonalFlag = Boolean(isPersonal);

  if (isPersonalFlag && req.user?.role !== 'AD') {
    return res.status(403).json({ error: 'Access denied: Only Adarsh (AD) can create Personal Passwords.' });
  }

  if (!accountName || !usernameOrEmail || !password) {
    return res.status(400).json({ error: 'Account name, username/email, and password are required' });
  }

  // Encrypt with AES-256-GCM using master vault key
  const { ciphertext, iv, authTag } = encryptWithMasterKey(password, config.vaultMasterKey);

  const item = await prisma.passwordVaultItem.create({
    data: {
      accountName,
      usernameOrEmail,
      encryptedPassword: ciphertext,
      iv,
      authTag,
      websiteUrl: websiteUrl || null,
      notes: notes || null,
      attachments: JSON.stringify(attachments || []),
      isPersonal: isPersonalFlag,
      ownerId: userId,
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  await logAuditEvent({
    eventType: isPersonalFlag ? 'PERSONAL_VAULT_ITEM_CREATED' : 'VAULT_ITEM_CREATED',
    severity: 'INFO',
    actorId: userId,
    actorEmail: req.user?.email,
    targetType: 'PasswordVaultItem',
    targetId: item.id,
    metadata: { accountName: item.accountName, usernameOrEmail: item.usernameOrEmail, isPersonal: isPersonalFlag },
  });

  return res.status(201).json({
    id: item.id,
    accountName: item.accountName,
    usernameOrEmail: item.usernameOrEmail,
    maskedPassword: maskSensitiveValue(14),
    websiteUrl: item.websiteUrl,
    notes: item.notes,
    attachments: JSON.parse(item.attachments),
    isPersonal: item.isPersonal,
    ownerId: item.ownerId,
    owner: item.owner,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  });
}

/**
 * Reveal the plaintext password for a vault item.
 */
export async function revealVaultPassword(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const userId = req.user?.id!;

  const item = await prisma.passwordVaultItem.findUnique({
    where: { id },
    include: { owner: { select: { id: true, name: true, email: true } } },
  });

  if (!item) return res.status(404).json({ error: 'Vault credential not found' });

  if (item.isPersonal && req.user?.role !== 'AD') {
    return res.status(403).json({ error: 'Access denied: Personal credential restricted to Adarsh (AD).' });
  }

  try {
    const decryptedPassword = decryptWithMasterKey(
      item.encryptedPassword,
      item.iv,
      item.authTag,
      config.vaultMasterKey
    );

    // Audit log this reveal without storing plaintext password
    await logAuditEvent({
      eventType: 'VAULT_PASSWORD_REVEALED',
      severity: 'WARNING',
      actorId: userId,
      actorEmail: req.user?.email,
      targetType: 'PasswordVaultItem',
      targetId: item.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { accountName: item.accountName, usernameOrEmail: item.usernameOrEmail },
    });

    return res.json({
      id: item.id,
      accountName: item.accountName,
      usernameOrEmail: item.usernameOrEmail,
      password: decryptedPassword, // Decrypted in memory only
      autoHideSeconds: 30, // UI will auto-mask after 30 seconds
    });
  } catch (err: any) {
    console.error('[Vault] Decryption failure:', err);
    return res.status(500).json({ error: 'Failed to decrypt vault credential. Key integrity check failed.' });
  }
}

export async function updateVaultItem(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { accountName, usernameOrEmail, password, websiteUrl, notes, attachments } = req.body;
  const userId = req.user?.id!;

  const existing = await prisma.passwordVaultItem.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Vault item not found' });

  if (existing.isPersonal && req.user?.role !== 'AD') {
    return res.status(403).json({ error: 'Access denied: Personal credential restricted to Adarsh (AD).' });
  }

  let updateData: any = {
    ...(accountName && { accountName }),
    ...(usernameOrEmail && { usernameOrEmail }),
    ...(websiteUrl !== undefined && { websiteUrl }),
    ...(notes !== undefined && { notes }),
    ...(attachments !== undefined && { attachments: JSON.stringify(attachments) }),
  };

  if (password) {
    const { ciphertext, iv, authTag } = encryptWithMasterKey(password, config.vaultMasterKey);
    updateData.encryptedPassword = ciphertext;
    updateData.iv = iv;
    updateData.authTag = authTag;
  }

  const updated = await prisma.passwordVaultItem.update({
    where: { id },
    data: updateData,
    include: { owner: { select: { id: true, name: true, email: true } } },
  });

  await logAuditEvent({
    eventType: existing.isPersonal ? 'PERSONAL_VAULT_ITEM_UPDATED' : 'VAULT_ITEM_UPDATED',
    severity: 'INFO',
    actorId: userId,
    actorEmail: req.user?.email,
    targetType: 'PasswordVaultItem',
    targetId: updated.id,
    metadata: { accountName: updated.accountName },
  });

  return res.json({
    id: updated.id,
    accountName: updated.accountName,
    usernameOrEmail: updated.usernameOrEmail,
    maskedPassword: maskSensitiveValue(14),
    websiteUrl: updated.websiteUrl,
    notes: updated.notes,
    attachments: JSON.parse(updated.attachments),
    isPersonal: updated.isPersonal,
    ownerId: updated.ownerId,
    owner: updated.owner,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  });
}

export async function deleteVaultItem(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { password } = req.body;
  const userId = req.user?.id!;

  if (!password) {
    return res.status(400).json({ error: 'Your account password is required to permanently delete an encrypted vault credential.' });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    await logAuditEvent({
      eventType: 'VAULT_ITEM_DELETE_FAILED',
      severity: 'WARNING',
      actorId: userId,
      actorEmail: req.user?.email,
      targetType: 'PasswordVaultItem',
      targetId: id,
      metadata: { reason: 'Incorrect password entered during deletion confirmation' },
    });
    return res.status(401).json({ error: 'Incorrect account password. Deletion aborted.' });
  }

  const existing = await prisma.passwordVaultItem.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Vault item not found' });

  if (existing.isPersonal && req.user?.role !== 'AD') {
    return res.status(403).json({ error: 'Access denied: Personal credential restricted to Adarsh (AD).' });
  }

  // Move snapshot to Trash
  await moveToTrash({
    originalId: existing.id,
    itemType: 'VAULT',
    title: existing.accountName,
    subtitle: existing.usernameOrEmail ? `User: ${existing.usernameOrEmail}` : (existing.websiteUrl || 'Encrypted Credential'),
    itemData: existing,
    deletedById: userId,
  });

  await prisma.passwordVaultItem.delete({ where: { id } });

  await logAuditEvent({
    eventType: 'VAULT_ITEM_DELETED',
    severity: 'INFO',
    actorId: userId,
    actorEmail: req.user?.email,
    targetType: 'PasswordVaultItem',
    targetId: id,
    metadata: { accountName: existing.accountName },
  });

  return res.json({ success: true, message: 'Vault item moved to trash' });
}

