import type { Server as HttpServer } from 'http';
import { Server as SocketServer, type Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { config } from '../config';
import { redis } from '../utils/redis';

interface AuthenticatedSocket extends Socket {
  userId: string;
  username: string;
}

const userSocketKey = (userId: string) => `socket:user:${userId}`;

export function createSocketServer(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: config.cors.origins,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.use(async (socket: Socket, next) => {
    try {
      // Browser clients use the auth payload; header fallback supports non-browser Socket.IO clients.
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, username: true, isActive: true },
      });

      // JWT validity alone is insufficient because an account may have been deactivated after issuance.
      if (!user || !user.isActive) {
        return next(new Error('User not found'));
      }

      (socket as AuthenticatedSocket).userId = user.id;
      (socket as AuthenticatedSocket).username = user.username;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const { userId, username } = authSocket;

    logger.debug(`Socket connected: ${username} (${userId})`);

    // A set supports multiple concurrent devices/tabs for the same authenticated user.
    await redis.sadd(userSocketKey(userId), socket.id);
    await redis.expire(userSocketKey(userId), 86400);

    socket.join(`user:${userId}`);

    socket.on('join:session', (sessionId: string) => {
      socket.join(`session:${sessionId}`);
      logger.debug(`${username} joined session room: ${sessionId}`);
    });

    socket.on('leave:session', (sessionId: string) => {
      socket.leave(`session:${sessionId}`);
    });

    socket.on('session:message', async (data: { sessionId: string; message: string }) => {
      if (!data.sessionId || !data.message) return;
      // Room membership is not authorization; re-check that the sender participates in the session.
      const session = await prisma.session.findFirst({
        where: {
          id: data.sessionId,
          OR: [{ teacherId: userId }, { learnerId: userId }],
        },
      });
      if (!session) return;

      io.to(`session:${data.sessionId}`).emit('session:message', {
        userId,
        username,
        message: data.message,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('disconnect', async () => {
      await redis.srem(userSocketKey(userId), socket.id);
      logger.debug(`Socket disconnected: ${username} (${userId})`);
    });
  });

  return io;
}

export async function sendNotificationToUser(
  io: SocketServer,
  userId: string,
  notification: Record<string, unknown>,
): Promise<void> {
  io.to(`user:${userId}`).emit('notification', notification);
}
