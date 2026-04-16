import { Module } from '@nestjs/common';
import { ApiBudgetService } from '../../services/api-budget.service';
import { ApiBudgetController } from './api-budget.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ApiBudgetController],
  providers: [ApiBudgetService],
  exports: [ApiBudgetService],
})
export class ApiBudgetModule {}
