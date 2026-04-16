import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { ApiBudgetService } from '../../services/api-budget.service';
import { JwtAuthGuard } from '../auth/auth.guard';

type AuthedRequest = ExpressRequest & { user?: { id?: string } };

@Controller('budget')
export class ApiBudgetController {
  constructor(private readonly apiBudgetService: ApiBudgetService) {}

  @Get('usage')
  @UseGuards(JwtAuthGuard)
  async getUsage(@Request() req: AuthedRequest) {
    return await this.apiBudgetService.getUsageStats(req.user?.id);
  }

  @Get('limits')
  async getLimits() {
    const monthlyBudget = await this.apiBudgetService.checkMonthlyBudget();
    return {
      limits: {
        daily: 500,
        monthlyBudget: monthlyBudget.budget,
      },
      message:
        'Free tier: 500 AI requests per day, shared $1.50 monthly budget',
    };
  }
}
