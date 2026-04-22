import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AdminGuard } from '../auth/guards/admin.guard';
import type { AuthenticatedUser } from '../auth/types';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('summary')
  summary() {
    return this.adminService.getSummary();
  }

  @Get('users')
  users(
    @Query('search') search?: string,
    @Query('provider') provider?: 'google' | 'kakao' | 'naver' | 'local',
    @Query('emailVerified') emailVerified?: string,
    @Query('subscriptionStatus') subscriptionStatus?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listUsers({
      search,
      provider,
      emailVerified:
        emailVerified === undefined ? undefined : emailVerified === 'true',
      subscriptionStatus,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('users/:id')
  user(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Patch('users/:id/role')
  updateRole(
    @Param('id') id: string,
    @Body() body: { role: Role },
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.adminService.updateUserRole(id, body.role, currentUser);
  }

  @Patch('users/:id/suspend')
  suspendUser(
    @Param('id') id: string,
    @Body() body: { suspended: boolean },
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.adminService.suspendUser(id, body.suspended, currentUser);
  }

  @Get('billing')
  billing() {
    return this.adminService.getBillingOverview();
  }

  @Get('plans')
  plans() {
    return this.adminService.getPlansOverview();
  }

  @Get('ops/logs')
  logs(
    @Query('container') container?: 'backend' | 'frontend',
    @Query('search') search?: string,
  ) {
    return this.adminService.getOpsLogs(container ?? 'backend', search);
  }

  @Get('ops/cost')
  cost(@Query('refresh') refresh?: string) {
    return this.adminService.getOpsCost(refresh === '1' || refresh === 'true');
  }

  @Get('ops/sentry')
  sentry() {
    return this.adminService.getOpsSentry();
  }

  @Get('ops/api-usage')
  apiUsage() {
    return this.adminService.getApiUsageOverview();
  }
}
