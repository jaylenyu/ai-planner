import { Module } from '@nestjs/common';
import { PlanController } from './plan.controller';
import { PlanService } from './plan.service';
import { AiModule } from '../ai/ai.module';
import { NotificationModule } from '../notification/notification.module';
import { PaymentModule } from '../payment/payment.module';
import { ApiBudgetModule } from '../api-budget/api-budget.module';

@Module({
  imports: [AiModule, PaymentModule, NotificationModule, ApiBudgetModule],
  controllers: [PlanController],
  providers: [PlanService],
})
export class PlanModule {}
