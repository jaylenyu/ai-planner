import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { PlacesModule } from './modules/places/places.module';
import { AiModule } from './modules/ai/ai.module';
import { PlanModule } from './modules/plan/plan.module';
import { CategoryModule } from './modules/category/category.module';
import { NotificationModule } from './modules/notification/notification.module';
import { PaymentModule } from './modules/payment/payment.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';
import { ApiBudgetModule } from './modules/api-budget/api-budget.module';
import { AdminModule } from './modules/admin/admin.module';
import { UserModule } from './modules/user/user.module';
import { ApiBudgetMiddleware } from './middleware/api-budget.middleware';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    PlacesModule,
    AiModule,
    PlanModule,
    CategoryModule,
    NotificationModule,
    PaymentModule,
    WorkspaceModule,
    ApiBudgetModule,
    AdminModule,
    UserModule,
  ],
  controllers: [AppController],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ApiBudgetMiddleware)
      .forRoutes(
        { path: 'plan/generate', method: RequestMethod.POST },
        { path: 'plan/preview', method: RequestMethod.POST },
      );
  }
}
