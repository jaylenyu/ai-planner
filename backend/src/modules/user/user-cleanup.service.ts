import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UserCleanupService {
  private readonly logger = new Logger(UserCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 18 * * *') // 03:00 KST = 18:00 UTC
  async hardDeleteExpiredUsers() {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const users = await this.prisma.user.findMany({
      where: { deletedAt: { lt: cutoff } },
      select: { id: true },
      take: 200,
    });

    if (!users.length) return;

    this.logger.log(`Hard-deleting ${users.length} expired user(s)`);

    for (const { id } of users) {
      try {
        await this.prisma.user.delete({ where: { id } });
        this.logger.log(`Hard-deleted user ${id}`);
      } catch (e) {
        this.logger.error(`Hard-delete failed for user ${id}:`, e);
      }
    }
  }
}
