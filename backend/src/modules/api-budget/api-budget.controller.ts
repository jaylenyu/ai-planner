import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiBudgetService } from '../../services/api-budget.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('api/budget')
export class ApiBudgetController {
  constructor(private readonly apiBudgetService: ApiBudgetService) {}

  @Get('usage')
  @UseGuards(JwtAuthGuard)
  async getUsage(@Request() req) {
    return await this.apiBudgetService.getUsageStats(req.user.id);
  }

  @Get('limits')
  async getLimits() {
    const monthlyBudget = await this.apiBudgetService.checkMonthlyBudget();
    return {
      limits: {
        daily: 10, // Hardcoded for now, should come from config
        monthlyBudget: monthlyBudget.budget,
      },
      message: 'Free tier: 10 AI requests per day, shared $1.50 monthly budget',
    };
  }
}