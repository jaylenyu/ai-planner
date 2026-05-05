import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsEnum } from 'class-validator';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AdminGuard } from '../auth/guards/admin.guard';
import type { AuthenticatedUser } from '../auth/types';
import { AdminService } from './admin.service';
import { GA4Service } from './ga4.service';

class UpdateRoleDto {
  @IsEnum(Role)
  role!: Role;
}

class SuspendUserDto {
  @IsBoolean()
  suspended!: boolean;
}

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly ga4Service: GA4Service,
  ) {}

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
    const pageNum = Number(page);
    const limitNum = Number(limit);
    return this.adminService.listUsers({
      search,
      provider,
      emailVerified:
        emailVerified === undefined ? undefined : emailVerified === 'true',
      subscriptionStatus,
      page: Number.isFinite(pageNum) && pageNum > 0 ? pageNum : undefined,
      limit: Number.isFinite(limitNum) && limitNum > 0 ? limitNum : undefined,
    });
  }

  @Get('users/:id')
  user(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Patch('users/:id/role')
  updateRole(
    @Param('id') id: string,
    @Body() body: UpdateRoleDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.adminService.updateUserRole(id, body.role, currentUser);
  }

  @Patch('users/:id/suspend')
  suspendUser(
    @Param('id') id: string,
    @Body() body: SuspendUserDto,
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

  @Get('plans/list')
  plansList(@Query('page') page?: string, @Query('limit') limit?: string) {
    const pageNum = Math.max(
      1,
      Number.isFinite(Number(page)) ? Number(page) : 1,
    );
    const limitNum = Math.min(
      100,
      Math.max(1, Number.isFinite(Number(limit)) ? Number(limit) : 10),
    );
    return this.adminService.listPlans(pageNum, limitNum);
  }

  @Get('plans/workspaces')
  workspacesList(@Query('page') page?: string, @Query('limit') limit?: string) {
    const pageNum = Math.max(
      1,
      Number.isFinite(Number(page)) ? Number(page) : 1,
    );
    const limitNum = Math.min(
      100,
      Math.max(1, Number.isFinite(Number(limit)) ? Number(limit) : 10),
    );
    return this.adminService.listWorkspaces(pageNum, limitNum);
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

  @Get('ops/ga4')
  ga4() {
    return this.ga4Service.getOverview();
  }
}
