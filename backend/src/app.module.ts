import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
import { ApiBudgetMiddleware } from './middleware/api-budget.middleware';
import { AppController } from './app.controller';
import { ApiBudgetService } from './services/api-budget.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
  ],
  controllers: [AppController],
  providers: [ApiBudgetService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ApiBudgetMiddleware)
      .forRoutes({ path: 'plan/generate', method: RequestMethod.POST });
  }
}
