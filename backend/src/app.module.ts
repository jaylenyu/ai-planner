import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { PlacesModule } from './modules/places/places.module';
import { AiModule } from './modules/ai/ai.module';
import { PlanModule } from './modules/plan/plan.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    PlacesModule,
    AiModule,
    PlanModule,
  ],
})
export class AppModule {}
