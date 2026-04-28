import { Module } from '@nestjs/common';
import { UserCleanupService } from './user-cleanup.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [UserCleanupService],
})
export class UserModule {}
