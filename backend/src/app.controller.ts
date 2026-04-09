import { Controller, Get, Logger } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { ApiBudgetService } from './services/api-budget.service';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly apiBudgetService: ApiBudgetService,
  ) {}

  @Get('health')
  async getHealth() {
    const health: any = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {},
    };

    try {
      // Check database connection
      await this.prisma.$queryRaw`SELECT 1`;
      health.services.database = 'healthy';
    } catch (error) {
      health.services.database = 'unhealthy';
      health.status = 'degraded';
      this.logger.error(`Database health check failed: ${error.message}`);
    }

    // Check API budget status
    try {
      const budget = await this.apiBudgetService.checkMonthlyBudget();
      health.services.apiBudget = 'healthy';
      health.apiBudget = {
        used: budget.used,
        budget: budget.budget,
        remaining: budget.remaining,
        withinBudget: budget.withinBudget,
      };
    } catch (error) {
      health.services.apiBudget = 'unhealthy';
      this.logger.error(`API budget service check failed: ${error.message}`);
    }

    // Memory usage (approximate)
    const memoryUsage = process.memoryUsage();
    health.memory = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
      external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB',
    };

    // Uptime
    health.uptime = process.uptime();

    return health;
  }

  @Get('version')
  getVersion() {
    return {
      version: process.env.npm_package_version || '0.0.1',
      node: process.version,
      platform: process.platform,
    };
  }
}
