import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

interface DailyLimitCheck {
  allowed: boolean;
  limit: number;
  used: number;
  resetTime: Date;
}

interface MonthlyBudgetCheck {
  withinBudget: boolean;
  budget: number;
  used: number;
  remaining: number;
}

interface ApiRequest {
  userId: string;
  ipAddress: string;
  userAgent: string;
  endpoint: string;
  cost: number;
  timestamp: Date;
}

@Injectable()
export class ApiBudgetService implements OnModuleInit {
  private readonly logger = new Logger(ApiBudgetService.name);
  private dailyLimit: number;
  private monthlyBudget: number;
  private currentMonthUsage: number = 0;
  private currentMonth: string;

  // In-memory cache for performance (0.5GB RAM constraint)
  private dailyUsageCache = new Map<string, number>(); // userId/ip -> count
  private lastResetDate = new Date().toISOString().split('T')[0];

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.dailyLimit = parseInt(
      this.configService.get<string>('DAILY_API_LIMIT', '10'),
    );
    this.monthlyBudget = parseFloat(
      this.configService.get<string>('MONTHLY_API_BUDGET', '1.5'),
    );
    this.currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  }

  async onModuleInit() {
    await this.loadCurrentMonthUsage();
    await this.cleanupOldRecords();
    this.startUsageResetScheduler();
  }

  async checkDailyLimit(
    userId: string,
    ipAddress: string,
  ): Promise<DailyLimitCheck> {
    const today = new Date().toISOString().split('T')[0];

    // Check if we need to reset daily cache
    if (today !== this.lastResetDate) {
      this.dailyUsageCache.clear();
      this.lastResetDate = today;
    }

    const cacheKey = userId !== 'anonymous' ? userId : ipAddress;
    const usedToday = this.dailyUsageCache.get(cacheKey) || 0;

    // If cache has data, use it for fast response
    if (usedToday > 0) {
      return {
        allowed: usedToday < this.dailyLimit,
        limit: this.dailyLimit,
        used: usedToday,
        resetTime: this.getNextResetTime(),
      };
    }

    // Otherwise check database
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const count = await this.prisma.apiUsage.count({
        where: {
          OR: [
            { userId: userId !== 'anonymous' ? userId : undefined },
            { ipAddress: ipAddress },
          ],
          timestamp: {
            gte: startOfDay,
          },
        },
      });

      // Update cache
      this.dailyUsageCache.set(cacheKey, count);

      return {
        allowed: count < this.dailyLimit,
        limit: this.dailyLimit,
        used: count,
        resetTime: this.getNextResetTime(),
      };
    } catch (error) {
      this.logger.error(`Error checking daily limit: ${error.message}`);
      // Fail-open: allow request if database is unavailable
      return {
        allowed: true,
        limit: this.dailyLimit,
        used: 0,
        resetTime: this.getNextResetTime(),
      };
    }
  }

  async checkMonthlyBudget(): Promise<MonthlyBudgetCheck> {
    const used = this.currentMonthUsage;
    const remaining = this.monthlyBudget - used;

    return {
      withinBudget: used < this.monthlyBudget,
      budget: this.monthlyBudget,
      used: parseFloat(used.toFixed(4)),
      remaining: parseFloat(Math.max(0, remaining).toFixed(4)),
    };
  }

  async trackRequest(
    userId: string,
    ipAddress: string,
    userAgent: string,
    cost: number,
  ): Promise<void> {
    const now = new Date();
    const cacheKey = userId !== 'anonymous' ? userId : ipAddress;

    try {
      // Update in-memory cache
      const currentCount = this.dailyUsageCache.get(cacheKey) || 0;
      this.dailyUsageCache.set(cacheKey, currentCount + 1);

      // Update monthly usage
      this.currentMonthUsage += cost;

      // Store in database (async, don't wait)
      this.storeUsageRecord({
        userId,
        ipAddress,
        userAgent,
        endpoint: 'ai-pipeline',
        cost,
        timestamp: now,
      }).catch((error) => {
        this.logger.error(`Failed to store usage record: ${error.message}`);
      });

      // Log budget status periodically
      if (Math.random() < 0.1) {
        // 10% chance to log
        const remaining = this.monthlyBudget - this.currentMonthUsage;
        this.logger.log(
          `API Budget: $${this.currentMonthUsage.toFixed(4)}/${
            this.monthlyBudget
          } used, $${remaining.toFixed(4)} remaining`,
        );
      }

      // Warn if approaching budget limit
      if (this.currentMonthUsage > this.monthlyBudget * 0.8) {
        this.logger.warn(
          `API Budget warning: $${this.currentMonthUsage.toFixed(4)}/${
            this.monthlyBudget
          } used (${Math.round((this.currentMonthUsage / this.monthlyBudget) * 100)}%)`,
        );
      }
    } catch (error) {
      this.logger.error(`Error tracking API request: ${error.message}`);
      // Don't throw - we don't want to break the user experience
    }
  }

  async getUsageStats(userId?: string): Promise<{
    daily: { used: number; limit: number };
    monthly: { used: number; budget: number; remaining: number };
    totalRequests: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const whereClause = userId ? { userId } : {};

    const [dailyCount, _monthlyCount, totalCount] = await Promise.all([
      this.prisma.apiUsage.count({
        where: {
          ...whereClause,
          timestamp: { gte: today },
        },
      }),
      this.prisma.apiUsage.count({
        where: {
          ...whereClause,
          timestamp: { gte: startOfMonth },
        },
      }),
      this.prisma.apiUsage.count({
        where: whereClause,
      }),
    ]);

    return {
      daily: {
        used: dailyCount,
        limit: this.dailyLimit,
      },
      monthly: {
        used: parseFloat(this.currentMonthUsage.toFixed(4)),
        budget: this.monthlyBudget,
        remaining: parseFloat(
          Math.max(0, this.monthlyBudget - this.currentMonthUsage).toFixed(4),
        ),
      },
      totalRequests: totalCount,
    };
  }

  private async loadCurrentMonthUsage(): Promise<void> {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const result = await this.prisma.apiUsage.aggregate({
        where: {
          timestamp: { gte: startOfMonth },
        },
        _sum: {
          cost: true,
        },
      });

      this.currentMonthUsage = result._sum.cost || 0;
      this.logger.log(
        `Loaded monthly usage: $${this.currentMonthUsage.toFixed(4)}`,
      );
    } catch (error) {
      this.logger.error(`Error loading monthly usage: ${error.message}`);
      this.currentMonthUsage = 0;
    }
  }

  private async storeUsageRecord(request: ApiRequest): Promise<void> {
    await this.prisma.apiUsage.create({
      data: {
        userId: request.userId,
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        endpoint: request.endpoint,
        cost: request.cost,
        timestamp: request.timestamp,
      },
    });
  }

  private async cleanupOldRecords(): Promise<void> {
    try {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      await this.prisma.apiUsage.deleteMany({
        where: {
          timestamp: { lt: threeMonthsAgo },
        },
      });

      this.logger.log('Cleaned up old API usage records');
    } catch (error) {
      this.logger.error(`Error cleaning up old records: ${error.message}`);
    }
  }

  private startUsageResetScheduler(): void {
    // Reset daily cache at midnight
    setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        this.dailyUsageCache.clear();
        this.lastResetDate = now.toISOString().split('T')[0];
        this.logger.log('Daily usage cache reset');
      }

      // Check if month changed
      const currentMonth = now.toISOString().slice(0, 7);
      if (currentMonth !== this.currentMonth) {
        this.currentMonth = currentMonth;
        this.currentMonthUsage = 0;
        this.logger.log(
          `Month changed to ${currentMonth}, resetting monthly usage`,
        );
      }
    }, 60000); // Check every minute
  }

  private getNextResetTime(): Date {
    const now = new Date();
    const resetTime = new Date(now);
    resetTime.setDate(resetTime.getDate() + 1);
    resetTime.setHours(0, 0, 0, 0);
    return resetTime;
  }
}
