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
    const services: Record<string, string> = {};
    let status = 'healthy';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      services.database = 'healthy';
    } catch (error) {
      services.database = 'unhealthy';
      status = 'degraded';
      this.logger.error(
        `Database health check failed: ${(error as Error).message}`,
      );
    }

    let apiBudget: Record<string, unknown> | undefined;
    try {
      const budget = await this.apiBudgetService.checkMonthlyBudget();
      services.apiBudget = 'healthy';
      apiBudget = {
        used: budget.used,
        budget: budget.budget,
        remaining: budget.remaining,
        withinBudget: budget.withinBudget,
      };
    } catch (error) {
      services.apiBudget = 'unhealthy';
      this.logger.error(
        `API budget service check failed: ${(error as Error).message}`,
      );
    }

    const memoryUsage = process.memoryUsage();

    return {
      status,
      timestamp: new Date().toISOString(),
      services,
      ...(apiBudget && { apiBudget }),
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
        external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB',
      },
      uptime: process.uptime(),
    };
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
