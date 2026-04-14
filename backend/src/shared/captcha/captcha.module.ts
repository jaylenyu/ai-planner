import { Module } from '@nestjs/common';
import { TurnstileService } from './turnstile.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [TurnstileService],
  exports: [TurnstileService],
})
export class CaptchaModule {}
