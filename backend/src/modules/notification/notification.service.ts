import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  listUnread(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId, read: false },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async create(userId: string, type: string, payload: Record<string, unknown>) {
    return this.prisma.notification.create({
      data: {
        userId,
        type,
        payload: payload as Prisma.InputJsonValue,
      },
    });
  }

  async createMany(
    userIds: string[],
    type: string,
    payload: Record<string, unknown>,
  ) {
    if (userIds.length === 0) return { count: 0 };

    return this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type,
        payload: payload as Prisma.InputJsonValue,
      })),
    });
  }

  async markRead(userId: string, id: string) {
    const updated = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });

    if (updated.count === 0) {
      throw new NotFoundException('알림을 찾을 수 없습니다.');
    }

    return { updated: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { updated: true };
  }
}
