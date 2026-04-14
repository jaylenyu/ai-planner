import { Module } from '@nestjs/common';
import { PlacesService } from './places.service';
import { RedisModule } from '../../shared/redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [PlacesService],
  exports: [PlacesService],
})
export class PlacesModule {}
