import { prisma } from '../utils/prisma';
import { AppError } from '../types';
import type { CreateConnectionInput, UpdateConnectionInput } from '@1hrlearning/shared';
import { notificationService } from './notification.service';

export class ConnectionsService {
  async sendRequest(requesterId: string, input: CreateConnectionInput) {
    if (requesterId === input.addresseeId) {
      throw new AppError('You cannot connect with yourself', 400);
    }

    const addressee = await prisma.user.findUnique({ where: { id: input.addresseeId } });
    if (!addressee) throw new AppError('User not found', 404);

    const existing = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId: input.addresseeId },
          { requesterId: input.addresseeId, addresseeId: requesterId },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'BLOCKED') throw new AppError('Cannot send connection request', 400);
      if (existing.status === 'PENDING') throw new AppError('Connection request already sent', 409);
      if (existing.status === 'ACCEPTED') throw new AppError('Already connected', 409);
      throw new AppError('Connection already exists', 409);
    }

    const requester = await prisma.user.findUnique({ where: { id: requesterId }, select: { displayName: true } });

    const connection = await prisma.connection.create({
      data: { requesterId, addresseeId: input.addresseeId, message: input.message ?? null },
    });

    await notificationService.create(input.addresseeId, {
      type: 'CONNECTION_REQUEST',
      title: 'New Connection Request',
      message: `${requester?.displayName} wants to connect with you`,
      data: { connectionId: connection.id, requesterId },
    });

    return connection;
  }

  async updateConnection(connectionId: string, userId: string, input: UpdateConnectionInput) {
    const connection = await prisma.connection.findUnique({ where: { id: connectionId } });
    if (!connection) throw new AppError('Connection not found', 404);

    if (connection.addresseeId !== userId && connection.requesterId !== userId) {
      throw new AppError('Access denied', 403);
    }

    if (input.status === 'ACCEPTED' && connection.addresseeId !== userId) {
      throw new AppError('Only the recipient can accept connection requests', 403);
    }

    const updated = await prisma.connection.update({
      where: { id: connectionId },
      data: { status: input.status },
    });

    if (input.status === 'ACCEPTED') {
      await notificationService.create(connection.requesterId, {
        type: 'CONNECTION_ACCEPTED',
        title: 'Connection Accepted',
        message: 'Your connection request was accepted',
        data: { connectionId },
      });
    }

    return updated;
  }

  async getConnections(userId: string, status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = {
      OR: [{ requesterId: userId }, { addresseeId: userId }],
      ...(status ? { status: status as 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'BLOCKED' } : {}),
    };

    const [connections, total] = await Promise.all([
      prisma.connection.findMany({
        where,
        include: {
          requester: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          addressee: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.connection.count({ where }),
    ]);

    return {
      data: connections,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: skip + connections.length < total,
        hasPrev: page > 1,
      },
    };
  }
}

export const connectionsService = new ConnectionsService();
