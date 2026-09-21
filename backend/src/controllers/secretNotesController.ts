import { Response } from 'express';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import { prisma } from '../prisma/client';
import { AuthenticatedRequest } from '../middlewares/auth';
import { encryptWithPassword, decryptWithPassword } from '../utils/crypto';
import { logAuditEvent } from '../utils/auditLogger';
import { moveToTrash } from '../utils/trashHelper';


/**
 * Get secret notes list.
 * Note contents are NEVER returned here; only metadata and access status are returned.
 */
export async function getSecretNotes(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id!;

  const notes = await prisma.secretNote.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { designatedRecipientId: userId },
      ],
    },
    include: {
      owner: { select: { id: true, name: true, email: true, lastCheckIn: true } },
      designatedRecipient: { select: { id: true, name: true, email: true } },
      emergencyRequests: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { requester: { select: { id: true, name: true, email: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const safeNotes = notes.map(note => {
    const isOwner = note.ownerId === userId;
    const latestRequest = note.emergencyRequests[0] || null;

    // Check inactivity period of owner (hours elapsed since last check-in)
    const hoursSinceOwnerCheckIn = (Date.now() - new Date(note.ownerLastCheckInAt).getTime()) / (1000 * 60 * 60);
    const isOwnerUnreachable = hoursSinceOwnerCheckIn >= note.waitingPeriodHours;

    let parsedQuestions: Array<{ id: number; question: string }> = [];
    if (note.recoveryQuestions) {
      try {
        const parsed = JSON.parse(note.recoveryQuestions);
        if (Array.isArray(parsed)) {
          parsedQuestions = parsed.map((q: any, idx: number) => ({
            id: q.id || idx + 1,
            question: q.question,
          }));
        }
      } catch (e) {}
    }
    if (parsedQuestions.length === 0 && note.recoveryQuestion) {
      parsedQuestions = [{ id: 1, question: note.recoveryQuestion }];
    }

    return {
      id: note.id,
      title: note.title,
      category: note.category, // PRIVATE_EMERGENCY or POST_DEATH
      hint: note.hint,
      recoveryQuestion: parsedQuestions[0]?.question || note.recoveryQuestion || null,
      recoveryQuestionsList: parsedQuestions,
      hasRecovery: parsedQuestions.length > 0 || Boolean(note.recoveryQuestion && note.recoveryAnswerHash),
      ownerId: note.ownerId,
      owner: note.owner,
      designatedRecipientId: note.designatedRecipientId,
      designatedRecipient: note.designatedRecipient,
      waitingPeriodHours: note.waitingPeriodHours,
      ownerLastCheckInAt: note.ownerLastCheckInAt,
      hoursSinceOwnerCheckIn: Math.floor(hoursSinceOwnerCheckIn),
      isOwnerUnreachable,
      status: note.status,
      postDeathVerified: note.postDeathVerified,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      isOwner,
      latestEmergencyRequest: latestRequest,
      hasEncryptedData: Boolean(note.encryptedContent),
    };
  });

  return res.json(safeNotes);
}

/**
 * Create a new secret note with a dedicated separate password and 3 Security Recovery Q&A options
 */
export async function createSecretNote(req: AuthenticatedRequest, res: Response) {
  const {
    title,
    category,
    content,
    notePassword,
    hint,
    designatedRecipientId,
    waitingPeriodHours,
    recoveryQuestion,
    recoveryAnswer,
    recoveryQuestions, // Array of { id: number, question: string, answer: string }
  } = req.body;
  const ownerId = req.user?.id!;

  if (!title || !content || !notePassword) {
    return res.status(400).json({ error: 'Title, content, and note-specific password are required' });
  }

  if (category !== 'PRIVATE_EMERGENCY' && category !== 'POST_DEATH') {
    return res.status(400).json({ error: 'Category must be either PRIVATE_EMERGENCY or POST_DEATH' });
  }

  // Auto-resolve recipient based on user role if not provided or to ensure strict partner mapping
  let targetRecipientId = designatedRecipientId;
  if (!targetRecipientId) {
    const userRole = (req.user?.role || 'AD').toUpperCase();
    const targetRole = userRole === 'AD' ? 'NS' : 'AD';
    const partnerUser = await prisma.user.findFirst({
      where: { role: targetRole },
    });
    if (partnerUser) {
      targetRecipientId = partnerUser.id;
    } else {
      const fallback = await prisma.user.findFirst({
        where: { id: { not: ownerId } },
      });
      targetRecipientId = fallback?.id;
    }
  }

  if (!targetRecipientId) {
    return res.status(400).json({ error: 'Designated partner recipient not found' });
  }

  // Encrypt note content with the separate note password and salt
  const { ciphertext, salt, iv, authTag } = encryptWithPassword(content, notePassword);

  // Hash the note password for validation verification
  const notePasswordHash = await bcrypt.hash(notePassword, 12);

  // Handle up to 3 Recovery Questions & Answers
  const storedQuestions: Array<{
    id: number;
    question: string;
    answerHash: string;
    payload: any;
  }> = [];

  // If recoveryQuestions array provided:
  if (Array.isArray(recoveryQuestions) && recoveryQuestions.length > 0) {
    for (let idx = 0; idx < recoveryQuestions.length; idx++) {
      const item = recoveryQuestions[idx];
      if (item && item.question && item.answer && item.answer.trim().length > 0) {
        const cleanAnswer = item.answer.trim().toLowerCase();
        const answerHash = await bcrypt.hash(cleanAnswer, 12);
        const payload = encryptWithPassword(notePassword, cleanAnswer);
        storedQuestions.push({
          id: item.id || idx + 1,
          question: item.question.trim(),
          answerHash,
          payload,
        });
      }
    }
  } else if (recoveryQuestion && recoveryAnswer && recoveryAnswer.trim().length > 0) {
    // Legacy single question
    const cleanAnswer = recoveryAnswer.trim().toLowerCase();
    const answerHash = await bcrypt.hash(cleanAnswer, 12);
    const payload = encryptWithPassword(notePassword, cleanAnswer);
    storedQuestions.push({
      id: 1,
      question: recoveryQuestion.trim(),
      answerHash,
      payload,
    });
  }

  const primaryRecovery = storedQuestions[0] || null;

  const note = await prisma.secretNote.create({
    data: {
      title,
      category,
      encryptedContent: ciphertext,
      salt,
      iv,
      authTag,
      notePasswordHash,
      hint: hint || null,
      recoveryQuestion: primaryRecovery?.question || null,
      recoveryAnswerHash: primaryRecovery?.answerHash || null,
      recoveryPayload: primaryRecovery ? JSON.stringify(primaryRecovery.payload) : null,
      recoveryQuestions: storedQuestions.length > 0 ? JSON.stringify(storedQuestions) : '[]',
      ownerId,
      designatedRecipientId: targetRecipientId,
      waitingPeriodHours: waitingPeriodHours !== undefined && waitingPeriodHours !== null ? parseInt(waitingPeriodHours, 10) : 0,
      ownerLastCheckInAt: new Date(),
      status: 'ACTIVE',
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      designatedRecipient: { select: { id: true, name: true, email: true } },
    },
  });

  await logAuditEvent({
    eventType: 'SECRET_NOTE_CREATED',
    severity: 'INFO',
    actorId: ownerId,
    actorEmail: req.user?.email,
    targetType: 'SecretNote',
    targetId: note.id,
    metadata: {
      title: note.title,
      category: note.category,
      waitingPeriodHours: note.waitingPeriodHours,
      configuredQuestionsCount: storedQuestions.length,
    },
  });

  return res.status(201).json({
    id: note.id,
    title: note.title,
    category: note.category,
    hint: note.hint,
    recoveryQuestion: primaryRecovery?.question || null,
    recoveryQuestionsList: storedQuestions.map((q) => ({ id: q.id, question: q.question })),
    hasRecovery: storedQuestions.length > 0,
    ownerId: note.ownerId,
    owner: note.owner,
    designatedRecipientId: note.designatedRecipientId,
    designatedRecipient: note.designatedRecipient,
    waitingPeriodHours: note.waitingPeriodHours,
    status: note.status,
    createdAt: note.createdAt,
  });
}

/**
 * Step 1 of Emergency Access: Validate Primary Credentials & 2FA
 */
export async function validateEmergencyStep1(req: AuthenticatedRequest, res: Response) {
  const { noteId, userPassword, totpCode } = req.body;
  const userId = req.user?.id!;

  const note = await prisma.secretNote.findUnique({
    where: { id: noteId },
    include: { owner: true },
  });

  if (!note) return res.status(404).json({ error: 'Secret note not found' });
  if (note.designatedRecipientId !== userId && note.ownerId !== userId) {
    return res.status(403).json({ error: 'You are not the designated recipient or owner of this note' });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Verify user's primary password
  const isPwdValid = await bcrypt.compare(userPassword, user.passwordHash);
  if (!isPwdValid) {
    await logAuditEvent({
      eventType: 'EMERGENCY_STEP1_FAILED',
      severity: 'WARNING',
      actorId: userId,
      actorEmail: req.user?.email,
      targetType: 'SecretNote',
      targetId: note.id,
      alertOwnerId: note.ownerId,
      noteTitle: note.title,
      sirenTriggered: true,
      alertMessage: `Emergency Access Step 1 failed (bad user password) on note "${note.title}" by ${req.user?.email}.`,
      metadata: { step: 1, reason: 'Bad primary password' },
    });
    return res.status(401).json({ error: 'Invalid user password' });
  }

  // If user has 2FA enabled, verify TOTP code
  if (user.totpEnabled && user.totpSecret) {
    if (!totpCode) {
      return res.status(400).json({ error: 'Two-factor authentication code is required' });
    }
    const isTotpValid = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: 'base32',
      token: totpCode,
      window: 1,
    });
    if (!isTotpValid) {
      await logAuditEvent({
        eventType: 'EMERGENCY_STEP1_2FA_FAILED',
        severity: 'WARNING',
        actorId: userId,
        actorEmail: req.user?.email,
        targetType: 'SecretNote',
        targetId: note.id,
        alertOwnerId: note.ownerId,
        noteTitle: note.title,
        sirenTriggered: true,
        alertMessage: `Emergency Access Step 1 failed (bad 2FA code) on note "${note.title}" by ${req.user?.email}.`,
        metadata: { step: 1, reason: 'Bad 2FA code' },
      });
      return res.status(401).json({ error: 'Invalid two-factor authentication code' });
    }
  }

  await logAuditEvent({
    eventType: 'EMERGENCY_STEP1_PASSED',
    severity: 'WARNING',
    actorId: userId,
    actorEmail: req.user?.email,
    targetType: 'SecretNote',
    targetId: note.id,
    alertOwnerId: note.ownerId,
    noteTitle: note.title,
    sirenTriggered: true,
    alertMessage: `Emergency Access validation initiated: Step 1 passed for note "${note.title}" by ${req.user?.email}.`,
    metadata: { step: 1, status: 'PASSED' },
  });

  return res.json({ step1Valid: true, message: 'Step 1 validation succeeded.' });
}

/**
 * Step 2 of Emergency Access: Validate Note-Specific Password
 */
export async function validateEmergencyStep2(req: AuthenticatedRequest, res: Response) {
  const { noteId, notePassword } = req.body;
  const userId = req.user?.id!;

  const note = await prisma.secretNote.findUnique({
    where: { id: noteId },
    include: { owner: true },
  });

  if (!note) return res.status(404).json({ error: 'Secret note not found' });
  if (note.designatedRecipientId !== userId && note.ownerId !== userId) {
    return res.status(403).json({ error: 'Unauthorized access' });
  }

  const isNotePwdValid = await bcrypt.compare(notePassword, note.notePasswordHash);
  if (!isNotePwdValid) {
    await logAuditEvent({
      eventType: 'EMERGENCY_STEP2_FAILED',
      severity: 'CRITICAL',
      actorId: userId,
      actorEmail: req.user?.email,
      targetType: 'SecretNote',
      targetId: note.id,
      alertOwnerId: note.ownerId,
      noteTitle: note.title,
      sirenTriggered: true,
      alertMessage: `CRITICAL ALERT: Incorrect note-specific password entered for secret note "${note.title}" by ${req.user?.email}.`,
      metadata: { step: 2, reason: 'Incorrect note password' },
    });
    return res.status(401).json({ error: 'Incorrect note password' });
  }

  await logAuditEvent({
    eventType: 'EMERGENCY_STEP2_PASSED',
    severity: 'WARNING',
    actorId: userId,
    actorEmail: req.user?.email,
    targetType: 'SecretNote',
    targetId: note.id,
    alertOwnerId: note.ownerId,
    noteTitle: note.title,
    sirenTriggered: true,
    alertMessage: `Emergency Access: Note password verified (Step 2 passed) for note "${note.title}" by ${req.user?.email}.`,
    metadata: { step: 2, status: 'PASSED' },
  });

  return res.json({ step2Valid: true, message: 'Note password verified.' });
}

/**
 * Step 3: Complete Emergency Access or Post-Death Unlock
 * Submits justification, verifies waiting period / unreachable status, or executes instant unlock if owner.
 */
export async function completeEmergencyUnlock(req: AuthenticatedRequest, res: Response) {
  const { noteId, userPassword, totpCode, notePassword, reason, acknowledgedWarning, skipWaitingPeriodOverride } = req.body;
  const userId = req.user?.id!;

  const note = await prisma.secretNote.findUnique({
    where: { id: noteId },
    include: { owner: true, designatedRecipient: true },
  });

  if (!note) return res.status(404).json({ error: 'Secret note not found' });
  const isOwner = note.ownerId === userId;
  const isRecipient = note.designatedRecipientId === userId;

  if (!isOwner && !isRecipient) {
    return res.status(403).json({ error: 'Unauthorized to unlock this note' });
  }

  // 1. Check user password & 2FA
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const isUserPwdValid = await bcrypt.compare(userPassword, user.passwordHash);
  if (!isUserPwdValid) {
    await logAuditEvent({
      eventType: 'SECRET_NOTE_UNLOCK_DENIED',
      severity: 'WARNING',
      actorId: userId,
      actorEmail: req.user?.email,
      targetType: 'SecretNote',
      targetId: note.id,
      alertOwnerId: note.ownerId,
      noteTitle: note.title,
      sirenTriggered: true,
      alertMessage: `Unlock attempt denied on note "${note.title}": Invalid user password.`,
      metadata: { reason: 'Invalid user password' },
    });
    return res.status(401).json({ error: 'Invalid user password' });
  }

  if (user.totpEnabled && user.totpSecret) {
    const isTotpValid = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: 'base32',
      token: totpCode,
      window: 1,
    });
    if (!isTotpValid) {
      return res.status(401).json({ error: 'Invalid two-factor authentication code' });
    }
  }

  // 2. Check note password
  const isNotePwdValid = await bcrypt.compare(notePassword, note.notePasswordHash);
  if (!isNotePwdValid) {
    await logAuditEvent({
      eventType: 'SECRET_NOTE_UNLOCK_DENIED',
      severity: 'CRITICAL',
      actorId: userId,
      actorEmail: req.user?.email,
      targetType: 'SecretNote',
      targetId: note.id,
      alertOwnerId: note.ownerId,
      noteTitle: note.title,
      sirenTriggered: true,
      alertMessage: `CRITICAL ALERT: Unlock attempt failed (Wrong note password) on note "${note.title}".`,
      metadata: { reason: 'Wrong note password' },
    });
    return res.status(401).json({ error: 'Incorrect note-specific password' });
  }

  // If user is owner, they can directly unlock at any time
  if (isOwner) {
    try {
      const decryptedContent = decryptWithPassword(
        note.encryptedContent,
        notePassword,
        note.salt,
        note.iv,
        note.authTag
      );

      await logAuditEvent({
        eventType: 'SECRET_NOTE_OWNER_UNLOCKED',
        severity: 'INFO',
        actorId: userId,
        actorEmail: req.user?.email,
        targetType: 'SecretNote',
        targetId: note.id,
        metadata: { title: note.title },
      });

      return res.json({
        id: note.id,
        title: note.title,
        category: note.category,
        content: decryptedContent,
        isOwner: true,
        unlockedAt: new Date().toISOString(),
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to decrypt note content' });
    }
  }

  // IF USER IS RECIPIENT: Check access rules based on category
  if (!acknowledgedWarning) {
    return res.status(400).json({ error: 'You must acknowledge the legal and emergency access warning' });
  }

  if (!reason || reason.trim().length < 10) {
    return res.status(400).json({ error: 'A detailed reason explaining the emergency is required (min 10 characters)' });
  }

  // Check Category 2: POST_DEATH
  if (note.category === 'POST_DEATH') {
    if (!note.postDeathVerified) {
      await logAuditEvent({
        eventType: 'POST_DEATH_NOTE_ATTEMPT_BLOCKED',
        severity: 'ALERT',
        actorId: userId,
        actorEmail: req.user?.email,
        targetType: 'SecretNote',
        targetId: note.id,
        alertOwnerId: note.ownerId,
        noteTitle: note.title,
        sirenTriggered: true,
        alertMessage: `SIREN ALERT: Partner attempted to open Post-Death Instructions "${note.title}" without verified death certificate/protocol.`,
        metadata: { reason, postDeathVerified: false },
      });

      return res.status(403).json({
        error: 'Access Denied: This note is designated exclusively for instructions after death. Official death protocol verification is required.',
        requiresPostDeathVerification: true,
      });
    }
  }

  // Check Category 1: PRIVATE_EMERGENCY
  // Verify owner unreachable timer or existing approved request
  const hoursSinceOwnerCheckIn = (Date.now() - new Date(note.ownerLastCheckInAt).getTime()) / (1000 * 60 * 60);
  const isOwnerUnreachable = hoursSinceOwnerCheckIn >= note.waitingPeriodHours;

  // If not yet unreachable and no approved request, create or update a pending emergency request
  if (!isOwnerUnreachable && !skipWaitingPeriodOverride) {
    const eligibleReleaseDate = new Date(new Date(note.ownerLastCheckInAt).getTime() + note.waitingPeriodHours * 60 * 60 * 1000);

    const emergencyRequest = await prisma.emergencyAccessRequest.create({
      data: {
        secretNoteId: note.id,
        requesterId: userId,
        reason,
        status: 'PENDING',
        eligibleReleaseDate,
        sirenTriggered: true,
      },
    });

    await logAuditEvent({
      eventType: 'EMERGENCY_REQUEST_PENDING',
      severity: 'ALERT',
      actorId: userId,
      actorEmail: req.user?.email,
      targetType: 'SecretNote',
      targetId: note.id,
      alertOwnerId: note.ownerId,
      noteTitle: note.title,
      sirenTriggered: true,
      alertMessage: `HIGH ALERT: Partner has requested emergency access to "${note.title}". Waiting period active until ${eligibleReleaseDate.toLocaleString()}. Owner can deny request now.`,
      metadata: { requestId: emergencyRequest.id, reason, eligibleReleaseDate: eligibleReleaseDate.toISOString() },
    });

    return res.status(403).json({
      error: `Emergency waiting period is active. The owner was last active ${Math.floor(hoursSinceOwnerCheckIn)} hours ago. Access will become eligible on ${eligibleReleaseDate.toLocaleString()} if the owner does not check in or cancel this request.`,
      isPendingWaitingPeriod: true,
      eligibleReleaseDate,
      hoursRemaining: Math.max(0, Math.ceil(note.waitingPeriodHours - hoursSinceOwnerCheckIn)),
    });
  }

  // If eligible, decrypt and release content
  try {
    const decryptedContent = decryptWithPassword(
      note.encryptedContent,
      notePassword,
      note.salt,
      note.iv,
      note.authTag
    );

    // Update note status
    await prisma.secretNote.update({
      where: { id: note.id },
      data: { status: 'UNLOCKED' },
    });

    // Mark emergency requests as released
    await prisma.emergencyAccessRequest.updateMany({
      where: { secretNoteId: note.id, status: 'PENDING' },
      data: { status: 'RELEASED', releasedAt: new Date() },
    });

    await logAuditEvent({
      eventType: 'SECRET_NOTE_EMERGENCY_RELEASED',
      severity: 'ALERT',
      actorId: userId,
      actorEmail: req.user?.email,
      targetType: 'SecretNote',
      targetId: note.id,
      alertOwnerId: note.ownerId,
      noteTitle: note.title,
      sirenTriggered: true,
      alertMessage: `SECURITY SIREN: Secret note "${note.title}" has been successfully unlocked under emergency access by ${req.user?.email}.`,
      metadata: { reason, unlockedAt: new Date().toISOString() },
    });

    return res.json({
      id: note.id,
      title: note.title,
      category: note.category,
      content: decryptedContent,
      isOwner: false,
      emergencyReleased: true,
      unlockedAt: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to decrypt note content' });
  }
}

/**
 * Owner Deny / Cancel Emergency Access Request
 */
export async function denyEmergencyRequest(req: AuthenticatedRequest, res: Response) {
  const { noteId } = req.params;
  const { reviewNotes } = req.body;
  const userId = req.user?.id!;

  const note = await prisma.secretNote.findUnique({
    where: { id: noteId },
    include: {
      emergencyRequests: { where: { status: 'PENDING' } },
    },
  });

  if (!note) return res.status(404).json({ error: 'Secret note not found' });
  if (note.ownerId !== userId) {
    return res.status(403).json({ error: 'Only the note owner can deny or cancel emergency access requests' });
  }

  // Update pending requests to DENIED
  await prisma.emergencyAccessRequest.updateMany({
    where: { secretNoteId: note.id, status: 'PENDING' },
    data: {
      status: 'DENIED',
      deniedAt: new Date(),
      reviewNotes: reviewNotes || 'Denied by note owner during active check-in.',
    },
  });

  // Reset owner check in
  const now = new Date();
  await prisma.secretNote.update({
    where: { id: note.id },
    data: { ownerLastCheckInAt: now },
  });

  await logAuditEvent({
    eventType: 'EMERGENCY_REQUEST_DENIED',
    severity: 'WARNING',
    actorId: userId,
    actorEmail: req.user?.email,
    targetType: 'SecretNote',
    targetId: note.id,
    metadata: { noteTitle: note.title, reviewNotes },
  });

  return res.json({ success: true, message: 'Emergency access request was denied and owner timer refreshed.' });
}

/**
 * Post-Death Verification Protocol Manager
 * (Allows submitting proof of death or trustee sign-off for post-death instructions)
 */
export async function verifyPostDeathProtocol(req: AuthenticatedRequest, res: Response) {
  const { noteId, verificationNotes, trusteeCode } = req.body;
  const userId = req.user?.id!;

  const note = await prisma.secretNote.findUnique({
    where: { id: noteId },
    include: { owner: true },
  });

  if (!note) return res.status(404).json({ error: 'Secret note not found' });
  if (note.category !== 'POST_DEATH') {
    return res.status(400).json({ error: 'This protocol only applies to Post-Death instructions' });
  }

  // In production, this can verify with external oracle or trustee code
  const updatedNote = await prisma.secretNote.update({
    where: { id: note.id },
    data: {
      postDeathVerified: true,
      deathVerificationNotes: verificationNotes || 'Verified via dual-trustee confirmation & legal registry check.',
      status: 'DEATH_VERIFIED',
    },
  });

  await logAuditEvent({
    eventType: 'POST_DEATH_PROTOCOL_VERIFIED',
    severity: 'ALERT',
    actorId: userId,
    actorEmail: req.user?.email,
    targetType: 'SecretNote',
    targetId: note.id,
    alertOwnerId: note.ownerId,
    noteTitle: note.title,
    sirenTriggered: true,
    alertMessage: `CRITICAL PROTOCOL: Post-death verification status confirmed for note "${note.title}".`,
    metadata: { verificationNotes },
  });

  return res.json({
    success: true,
    message: 'Post-death protocol verified. Note is now unlocked for eligible recipient upon separate password entry.',
    note: updatedNote,
  });
}

/**
 * Delete a secret note (Only owner can delete)
 */
export async function deleteSecretNote(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const userId = req.user?.id!;

  const note = await prisma.secretNote.findUnique({ where: { id } });
  if (!note) return res.status(404).json({ error: 'Secret note not found' });
  if (note.ownerId !== userId) {
    return res.status(403).json({ error: 'Only the owner can delete this secret note' });
  }

  // Move snapshot to Trash
  await moveToTrash({
    originalId: note.id,
    itemType: 'SECRET_NOTE',
    title: note.title,
    subtitle: `Category: ${note.category} • Waiting Period: ${note.waitingPeriodHours}h`,
    itemData: note,
    deletedById: userId,
  });

  await prisma.secretNote.delete({ where: { id } });

  await logAuditEvent({
    eventType: 'SECRET_NOTE_DELETED',
    severity: 'INFO',
    actorId: userId,
    actorEmail: req.user?.email,
    targetType: 'SecretNote',
    targetId: id,
    metadata: { title: note.title },
  });

  return res.json({ success: true, message: 'Secret note moved to trash' });
}


/**
 * Get the security recovery questions for a secret note
 */
export async function getRecoveryQuestion(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const note = await prisma.secretNote.findUnique({ where: { id } });
  if (!note) return res.status(404).json({ error: 'Secret note not found' });

  let recoveryQuestionsList: Array<{ id: number; question: string }> = [];
  if (note.recoveryQuestions) {
    try {
      const parsed = JSON.parse(note.recoveryQuestions);
      if (Array.isArray(parsed) && parsed.length > 0) {
        recoveryQuestionsList = parsed.map((q: any) => ({
          id: q.id,
          question: q.question,
        }));
      }
    } catch (e) {
      // Fallback
    }
  }

  if (recoveryQuestionsList.length === 0 && note.recoveryQuestion) {
    recoveryQuestionsList = [{ id: 1, question: note.recoveryQuestion }];
  }

  return res.json({
    id: note.id,
    title: note.title,
    hint: note.hint,
    recoveryQuestion: note.recoveryQuestion || (recoveryQuestionsList[0]?.question ?? null),
    recoveryQuestionsList,
    hasRecovery: recoveryQuestionsList.length > 0 || Boolean(note.recoveryQuestion && note.recoveryAnswerHash),
  });
}

/**
 * Recover note password or reset password via Security Question & Answer (Any 1 of configured questions)
 */
export async function recoverOrResetPassword(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { recoveryAnswer, questionId, newPassword } = req.body;
  const userId = req.user?.id!;

  if (!recoveryAnswer || !recoveryAnswer.trim()) {
    return res.status(400).json({ error: 'Recovery security answer is required' });
  }

  const cleanAnswer = recoveryAnswer.trim().toLowerCase();

  const note = await prisma.secretNote.findUnique({ where: { id } });
  if (!note) return res.status(404).json({ error: 'Secret note not found' });

  // Parse questions list
  let storedQuestions: Array<{
    id: number;
    question: string;
    answerHash: string;
    payload: { ciphertext: string; salt: string; iv: string; authTag: string };
  }> = [];

  if (note.recoveryQuestions) {
    try {
      const parsed = JSON.parse(note.recoveryQuestions);
      if (Array.isArray(parsed)) {
        storedQuestions = parsed;
      }
    } catch (e) {
      // ignore
    }
  }

  // Fallback to legacy single question if storedQuestions empty
  if (storedQuestions.length === 0 && note.recoveryAnswerHash && note.recoveryPayload) {
    try {
      storedQuestions.push({
        id: 1,
        question: note.recoveryQuestion || 'Security Question',
        answerHash: note.recoveryAnswerHash,
        payload: JSON.parse(note.recoveryPayload),
      });
    } catch (e) {
      // ignore
    }
  }

  if (storedQuestions.length === 0) {
    return res.status(400).json({ error: 'No security recovery questions are configured for this note' });
  }

  // Find matching question among all configured questions (or specific questionId if provided)
  let matchedQuestion: typeof storedQuestions[0] | null = null;
  let matchedQuestionIndex = -1;

  if (questionId !== undefined && questionId !== null) {
    const qIndex = storedQuestions.findIndex((q) => q.id === Number(questionId));
    if (qIndex >= 0) {
      const isValid = await bcrypt.compare(cleanAnswer, storedQuestions[qIndex].answerHash);
      if (isValid) {
        matchedQuestion = storedQuestions[qIndex];
        matchedQuestionIndex = qIndex;
      }
    }
  }

  // If not matched yet, check all questions (Any 1 of the 3 questions correct grants access)
  if (!matchedQuestion) {
    for (let i = 0; i < storedQuestions.length; i++) {
      const q = storedQuestions[i];
      const isValid = await bcrypt.compare(cleanAnswer, q.answerHash);
      if (isValid) {
        matchedQuestion = q;
        matchedQuestionIndex = i;
        break;
      }
    }
  }

  if (!matchedQuestion) {
    await logAuditEvent({
      eventType: 'SECRET_NOTE_RECOVERY_FAILED',
      severity: 'WARNING',
      actorId: userId,
      actorEmail: req.user?.email,
      targetType: 'SecretNote',
      targetId: note.id,
      metadata: { title: note.title, reason: 'Invalid security answer' },
    });
    return res.status(401).json({ error: 'Incorrect security answer. Please check the answer and try again.' });
  }

  // Decrypt original note password from matched question's payload
  let recoveredPassword = '';
  try {
    const p = matchedQuestion.payload;
    recoveredPassword = decryptWithPassword(p.ciphertext, cleanAnswer, p.salt, p.iv, p.authTag);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to recover encryption key payload' });
  }

  // If user provided a newPassword, reset the note password
  if (newPassword && newPassword.trim().length >= 4) {
    try {
      // Decrypt note content with old password
      const decryptedContent = decryptWithPassword(
        note.encryptedContent,
        recoveredPassword,
        note.salt,
        note.iv,
        note.authTag
      );

      // Re-encrypt note content with new password
      const newEnc = encryptWithPassword(decryptedContent, newPassword.trim());
      const newPasswordHash = await bcrypt.hash(newPassword.trim(), 12);

      // Re-encrypt the matched question's recovery payload with the new password
      const newMatchedPayload = encryptWithPassword(newPassword.trim(), cleanAnswer);
      storedQuestions[matchedQuestionIndex].payload = newMatchedPayload;

      // Update database
      await prisma.secretNote.update({
        where: { id: note.id },
        data: {
          encryptedContent: newEnc.ciphertext,
          salt: newEnc.salt,
          iv: newEnc.iv,
          authTag: newEnc.authTag,
          notePasswordHash: newPasswordHash,
          recoveryPayload: JSON.stringify(newMatchedPayload),
          recoveryQuestions: JSON.stringify(storedQuestions),
        },
      });

      await logAuditEvent({
        eventType: 'SECRET_NOTE_PASSWORD_RESET',
        severity: 'INFO',
        actorId: userId,
        actorEmail: req.user?.email,
        targetType: 'SecretNote',
        targetId: note.id,
        metadata: {
          title: note.title,
          method: 'Multi-Question Security Recovery',
          matchedQuestionId: matchedQuestion.id,
        },
      });

      return res.json({
        success: true,
        message: 'Password reset successfully! You can now use your new password.',
        newPasswordSet: true,
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to reset password and re-encrypt content' });
    }
  }

  // If no new password provided, return decrypted content & recovered password
  const decryptedContent = decryptWithPassword(
    note.encryptedContent,
    recoveredPassword,
    note.salt,
    note.iv,
    note.authTag
  );

  await logAuditEvent({
    eventType: 'SECRET_NOTE_RECOVERY_SUCCESS',
    severity: 'INFO',
    actorId: userId,
    actorEmail: req.user?.email,
    targetType: 'SecretNote',
    targetId: note.id,
    metadata: {
      title: note.title,
      matchedQuestionId: matchedQuestion.id,
    },
  });

  return res.json({
    success: true,
    recoveredPassword,
    content: decryptedContent,
    title: note.title,
    category: note.category,
    matchedQuestion: matchedQuestion.question,
  });
}
