import { Response } from 'express';
import { prisma } from '../prisma/client';
import { AuthenticatedRequest } from '../middlewares/auth';
import { broadcastEvent } from '../socket';
import { logAuditEvent } from '../utils/auditLogger';

/**
 * GET /api/workspace/theme
 * Retrieves the current synchronized workspace theme & mode.
 */
export async function getWorkspaceTheme(req: AuthenticatedRequest, res: Response) {
  try {
    let setting = await prisma.workspaceSetting.findUnique({
      where: { id: 'default' },
    });

    if (!setting) {
      setting = await prisma.workspaceSetting.create({
        data: {
          id: 'default',
          colorTheme: 'default',
          themeMode: 'dark',
        },
      });
    }

    return res.json({
      success: true,
      colorTheme: setting.colorTheme,
      themeMode: setting.themeMode,
      updatedByRole: setting.updatedByRole,
      updatedByName: setting.updatedByName,
      updatedAt: setting.updatedAt,
    });
  } catch (error: any) {
    console.error('[getWorkspaceTheme] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch workspace theme' });
  }
}

/**
 * PUT /api/workspace/theme
 * Updates the shared workspace theme and broadcasts in real-time to both AD and NS.
 */
export async function updateWorkspaceTheme(req: AuthenticatedRequest, res: Response) {
  try {
    const actor = req.user;
    const { colorTheme, themeMode } = req.body;

    if (!colorTheme && !themeMode) {
      return res.status(400).json({ error: 'colorTheme or themeMode must be provided' });
    }

    const actorRole = ((actor?.role || 'AD').toUpperCase() === 'NS') ? 'NS' : 'AD';
    const actorName = actor?.name || (actorRole === 'AD' ? 'Adarsh' : 'Bob Vance');

    const updateData: any = {
      updatedByRole: actorRole,
      updatedByName: actorName,
    };

    if (colorTheme && (colorTheme === 'default' || colorTheme === 'red-white')) {
      updateData.colorTheme = colorTheme;
    }

    if (themeMode && (themeMode === 'dark' || themeMode === 'light')) {
      updateData.themeMode = themeMode;
    }

    const setting = await prisma.workspaceSetting.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        colorTheme: updateData.colorTheme || 'default',
        themeMode: updateData.themeMode || 'dark',
        updatedByRole: actorRole,
        updatedByName: actorName,
      },
      update: updateData,
    });

    // Also sync user theme preference if themeMode was specified
    if (updateData.themeMode) {
      await prisma.user.updateMany({
        data: { themePref: updateData.themeMode },
      }).catch((e) => console.warn('[updateWorkspaceTheme] Sync user themePref warning:', e.message));
    }

    // Broadcast in real-time to all connected users (AD & NS)
    const payload = {
      colorTheme: setting.colorTheme,
      themeMode: setting.themeMode,
      updatedByRole: setting.updatedByRole,
      updatedByName: setting.updatedByName,
      updatedAt: setting.updatedAt,
    };

    broadcastEvent('workspace_theme_changed', payload);

    // Audit log
    await logAuditEvent({
      eventType: 'WORKSPACE_THEME_UPDATE',
      severity: 'INFO',
      actorId: actor?.id,
      actorEmail: actor?.email,
      targetType: 'WORKSPACE_SETTING',
      targetId: 'default',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        colorTheme: setting.colorTheme,
        themeMode: setting.themeMode,
        updatedByRole: setting.updatedByRole,
      },
    });

    return res.json({
      success: true,
      message: `Workspace theme synchronized successfully by ${actorRole}`,
      setting: payload,
    });
  } catch (error: any) {
    console.error('[updateWorkspaceTheme] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to update workspace theme' });
  }
}
