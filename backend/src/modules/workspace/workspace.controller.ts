import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteWorkspaceDto } from './dto/invite-workspace.dto';
import { WorkspaceService } from './workspace.service';

@Controller('workspace')
@UseGuards(JwtAuthGuard)
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post()
  create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateWorkspaceDto,
  ) {
    return this.workspaceService.create(user.userId, dto);
  }

  @Get('mine')
  getMine(@CurrentUser() user: { userId: string }) {
    return this.workspaceService.getMine(user.userId);
  }

  @Post(':id/invite')
  invite(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: InviteWorkspaceDto,
  ) {
    return this.workspaceService.invite(user.userId, id, dto);
  }

  @Post('join/:token')
  join(@CurrentUser() user: { userId: string }, @Param('token') token: string) {
    return this.workspaceService.join(user.userId, token);
  }

  @Delete(':id')
  dissolve(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.workspaceService.dissolve(user.userId, id);
  }
}
