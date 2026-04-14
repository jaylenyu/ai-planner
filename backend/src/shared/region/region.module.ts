import { Module } from '@nestjs/common';
import { RegionService } from './region.service';
import { AliasLearningService } from './alias-learning.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [RegionService, AliasLearningService],
  exports: [RegionService, AliasLearningService],
})
export class RegionModule {}
