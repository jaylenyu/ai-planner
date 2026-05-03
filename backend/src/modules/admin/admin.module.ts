import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PaymentModule } from '../payment/payment.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { GA4Service } from './ga4.service';

@Module({
  imports: [PrismaModule, AuthModule, PaymentModule, WorkspaceModule],
  controllers: [AdminController],
  providers: [AdminService, GA4Service],
  exports: [AdminService],
})
export class AdminModule {}
