import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { PlanService } from './plan.service';
import { GeneratePlanDto } from './dto/generate-plan.dto';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('plan')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Get('list')
  @UseGuards(JwtAuthGuard)
  list(@CurrentUser() user: { userId: string }) {
    return this.planService.list(user.userId);
  }

  @Post('generate')
  @UseGuards(JwtAuthGuard)
  generate(
    @Body() dto: GeneratePlanDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.planService.generate(user.userId, dto);
  }
}
