import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { config } from './config';

let io: SocketIOServer | null = null;
const userSocketMap = new Map<string, Set<string>>(); // userId -> Set of socketIds

export function initializeSocket(httpServer: HttpServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const normalized = origin.replace(/\/$/, '');
        if (config.nodeEnv === 'development' && (normalized.startsWith('http://localhost:') || normalized.startsWith('http://127.0.0.1:'))) {
          return callback(null, true);
        }
        const isAllowed = config.corsOrigin.some((allowed) => {
          const normAllowed = allowed.trim().replace(/\/$/, '');
          return normAllowed === '*' || normAllowed === normalized;
        });
        if (isAllowed) return callback(null, true);
        return callback(new Error(`Socket CORS: Origin ${origin} not allowed`));
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
      const decoded = jwt.verify(token, config.jwtSecret) as { userId: string; email: string };
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
