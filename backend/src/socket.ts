import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { config } from './config';
import { prisma } from './prisma/client';
import { verifyAccessToken } from './utils/tokens';

let io: SocketIOServer | null = null;
const userSocketMap = new Map<string, Set<string>>(); // userId -> Set of socketIds

export function initializeSocket(httpServer: HttpServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const normalized = origin.replace(/\/$/, '');
        if (normalized.startsWith('http://localhost:') || normalized.startsWith('http://127.0.0.1:')) {
          return callback(null, true);
        }
        if (normalized.endsWith('.vercel.app')) {
          return callback(null, true);
        }
        const isAllowed = config.corsOrigin.some((allowed) => {
          const normAllowed = allowed.trim().replace(/\/$/, '');
          return normAllowed === '*' || normAllowed === normalized;
        });
        if (isAllowed) return callback(null, true);
        return callback(null, true);
      },
      credentials: true,
    },
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token || typeof token !== 'string') {
      return next(new Error('Authentication error: Missing token'));
    }

    try {
      const decoded = verifyAccessToken(token);
      socket.data.userId = decoded.userId;
      socket.data.email = decoded.email;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    if (!userId) return;

    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, new Set());
    }
    userSocketMap.get(userId)?.add(socket.id);
    socket.join(`user:${userId}`);

    console.log(`[Socket] User ${socket.data.email} connected (socket: ${socket.id})`);

    socket.on('disconnect', () => {
      userSocketMap.get(userId)?.delete(socket.id);
      if (userSocketMap.get(userId)?.size === 0) {
        userSocketMap.delete(userId);
      }
      console.log(`[Socket] User ${socket.data.email} disconnected`);
    });

    // Client acknowledging or silencing siren
    socket.on('acknowledge_siren', (data: { alertId: string }) => {
      console.log(`[Socket] User acknowledged siren for alert:`, data.alertId);
    });

    // Real-time workspace theme change sync
    socket.on('change_workspace_theme', async (data: { colorTheme?: string; themeMode?: string; role?: string }) => {
      try {
        const actorRole = (socket.data.email === 'user2@looser.vault' || data?.role === 'NS') ? 'NS' : 'AD';
        const actorName = actorRole === 'NS' ? 'Bob Vance' : 'Adarsh';
        const updateData: any = {
          updatedByRole: actorRole,
          updatedByName: actorName,
        };
        if (data.colorTheme && (data.colorTheme === 'default' || data.colorTheme === 'red-white')) {
          updateData.colorTheme = data.colorTheme;
        }
        if (data.themeMode && (data.themeMode === 'dark' || data.themeMode === 'light')) {
          updateData.themeMode = data.themeMode;
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

        io?.emit('workspace_theme_changed', {
          colorTheme: setting.colorTheme,
          themeMode: setting.themeMode,
          updatedByRole: setting.updatedByRole,
          updatedByName: setting.updatedByName,
          updatedAt: setting.updatedAt,
        });
      } catch (err: any) {
        console.error('[Socket] change_workspace_theme error:', err);
      }
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.io has not been initialized yet');
  }
  return io;
}

export interface SecurityAlertPayload {
  alertId: string;
  eventType: string;
  severity: 'WARNING' | 'CRITICAL' | 'ALERT';
  message: string;
  noteTitle: string;
  actorEmail: string;
  timestamp: string;
  requiresSiren: boolean;
  metadata?: Record<string, any>;
}

/**
 * Emit a high-priority security alert / siren to a specific user or all sessions of a user
 */
export function emitSecurityAlertToUser(targetUserId: string, alert: SecurityAlertPayload) {
  if (!io) return;
  io.to(`user:${targetUserId}`).emit('security_alert', alert);
}

/**
 * Emit a new chat message to a specific user
 */
export function emitChatMessageToUser(targetUserId: string, message: any) {
  if (!io) return;
  io.to(`user:${targetUserId}`).emit('new_message', message);
}

/**
 * Emit read receipt notification to a specific user
 */
export function emitMessagesReadToUser(targetUserId: string, data: { readBy: string; readAt: string; messageIds?: string[] }) {
  if (!io) return;
  io.to(`user:${targetUserId}`).emit('messages_read', data);
}

/**
 * Check if a user currently has active socket connections
 */
export function isUserOnline(userId: string): boolean {
  return (userSocketMap.get(userId)?.size ?? 0) > 0;
}

/**
 * Broadcast an event to all connected authenticated users
 */
export function broadcastEvent(event: string, data: any) {
  if (!io) return;
  io.emit(event, data);
}
