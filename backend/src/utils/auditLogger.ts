import { prisma } from '../prisma/client';
import { emitSecurityAlertToUser, SecurityAlertPayload } from '../socket';

export interface AuditLogParams {
  eventType: string;
  severity?: 'INFO' | 'WARNING' | 'CRITICAL' | 'ALERT';
  actorId?: string;
  actorEmail?: string;
  targetType?: string;
  targetId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  sirenTriggered?: boolean;
  alertOwnerId?: string;
  noteTitle?: string;
  alertMessage?: string;
}

/**
 * Record an immutable security event and trigger real-time alerts / sirens when applicable.
 * CRITICAL: Never logs plaintext passwords, note secrets, or raw keys.
 */
export async function logAuditEvent(params: AuditLogParams) {
  const {
    eventType,
    severity = 'INFO',
    actorId,
    actorEmail,
    targetType,
    targetId,
    ipAddress,
    userAgent,
    metadata = {},
    sirenTriggered = false,
    alertOwnerId,
    noteTitle,
    alertMessage,
  } = params;

  // Filter out any accidentally passed sensitive keys in metadata
  const sanitizedMetadata = { ...metadata };
  delete sanitizedMetadata.password;
  delete sanitizedMetadata.notePassword;
  delete sanitizedMetadata.content;
  delete sanitizedMetadata.secret;
  delete sanitizedMetadata.token;

  try {
    const logEntry = await prisma.auditLog.create({
      data: {
        eventType,
        severity,
        actorId,
        actorEmail,
        targetType,
        targetId,
        ipAddress,
        userAgent,
        metadata: JSON.stringify(sanitizedMetadata),
        sirenTriggered,
      },
    });

    // If a siren / security alert is needed and owner ID is specified
    if (sirenTriggered && alertOwnerId) {
      const alertPayload: SecurityAlertPayload = {
        alertId: logEntry.id,
        eventType,
        severity: severity as 'WARNING' | 'CRITICAL' | 'ALERT',
        message: alertMessage || `Security Alert: Unauthorized access or emergency access attempt detected on note "${noteTitle || 'Secret Note'}" by ${actorEmail || 'partner'}.`,
        noteTitle: noteTitle || 'Secret Note',
        actorEmail: actorEmail || 'Unknown User',
        timestamp: new Date().toISOString(),
        requiresSiren: true,
        metadata: sanitizedMetadata,
      };

      emitSecurityAlertToUser(alertOwnerId, alertPayload);

      // Also create an in-app persistent notification
      await prisma.notification.create({
        data: {
          userId: alertOwnerId,
          title: `CRITICAL ALERT: Access Attempt on "${noteTitle || 'Secret Note'}"`,
          message: alertPayload.message,
          type: 'SECURITY_ALERT',
          metadata: JSON.stringify({ auditLogId: logEntry.id, ...sanitizedMetadata }),
        },
      });
    }

    return logEntry;
  } catch (error) {
    console.error('[AuditLog] Failed to record audit log entry:', error);
    return null;
  }
}
