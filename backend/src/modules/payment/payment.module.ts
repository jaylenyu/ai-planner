import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import {
  PaymentController,
  SubscriptionController,
} from './payment.controller';
import { PaymentService } from './payment.service';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentController, SubscriptionController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
