import { prisma } from '../utils/prisma';
import { AppError } from '../types';
import type { CreateAvailabilityInput, UpdateAvailabilityInput } from '@1hrlearning/shared';

export class AvailabilityService {
  async getForUser(userId: string, fromDate?: Date, toDate?: Date) {
    return prisma.availability.findMany({
      where: {
        userId,
        ...(fromDate || toDate
          ? {
              startTime: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : {}),
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async create(userId: string, input: CreateAvailabilityInput) {
    const start = new Date(input.startTime);
    const end = new Date(input.endTime);

    if (end <= start) throw new AppError('End time must be after start time', 400);
    if (start < new Date()) throw new AppError('Cannot create availability in the past', 400);

    // Check for overlapping open slots
    const overlap = await prisma.availability.findFirst({
      where: {
        userId,
        status: { in: ['OPEN', 'HELD'] },
        OR: [
          { startTime: { lt: end }, endTime: { gt: start } },
        ],
      },
    });
    if (overlap) throw new AppError('This slot overlaps with an existing availability', 400);

    return prisma.availability.create({
      data: { userId, startTime: start, endTime: end, status: 'OPEN' },
    });
  }

  async update(id: string, userId: string, input: UpdateAvailabilityInput) {
    const slot = await prisma.availability.findUnique({ where: { id } });
    if (!slot) throw new AppError('Availability slot not found', 404);
    if (slot.userId !== userId) throw new AppError('Access denied', 403);
    if (slot.status === 'BOOKED') throw new AppError('Cannot modify a booked slot', 400);

    return prisma.availability.update({
      where: { id },
      data: {
        ...(input.startTime ? { startTime: new Date(input.startTime) } : {}),
        ...(input.endTime ? { endTime: new Date(input.endTime) } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
    });
  }

  async delete(id: string, userId: string) {
    const slot = await prisma.availability.findUnique({ where: { id } });
    if (!slot) throw new AppError('Availability slot not found', 404);
    if (slot.userId !== userId) throw new AppError('Access denied', 403);
    if (slot.status === 'BOOKED') throw new AppError('Cannot delete a booked slot', 400);

    await prisma.availability.delete({ where: { id } });
  }
}

export const availabilityService = new AvailabilityService();
