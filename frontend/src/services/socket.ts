import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(token?: string): Socket | null {
  if (!token) {
    token = localStorage.getItem('looser_token') || undefined;
  }

  if (!token) {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    return null;
  }

  if (!socket || !socket.connected) {
    const socketUrl =
      (import.meta.env.VITE_SOCKET_URL as string | undefined) ||
      (import.meta.env.VITE_API_URL
        ? (import.meta.env.VITE_API_URL as string).replace(/\/api\/?$/, '')
        : '/');

    socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('⚡ Socket connected:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('⚡ Socket disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('⚡ Socket connection error:', err.message);
    });
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
