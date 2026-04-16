import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Delete,
  Patch,
  Param,
  Query,
} from '@nestjs/common';
import { PlanService } from './plan.service';
import { CreatePlanMemoDto } from './dto/create-plan-memo.dto';
import { CreatePlanItemDto } from './dto/create-plan-item.dto';
import { DeletePlanItemDto } from './dto/delete-plan-item.dto';
import { GeneratePlanDto } from './dto/generate-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { UpdatePlanItemDto } from './dto/update-plan-item.dto';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('plan')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Get('list')
  @UseGuards(JwtAuthGuard)
  list(
    @CurrentUser() user: { userId: string },
    @Query('categoryId') categoryId?: string,
    @Query('scope') scope?: 'personal' | 'shared',
  ) {
    return this.planService.list(user.userId, categoryId, scope);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  get(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.planService.get(user.userId, id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePlanDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.planService.update(user.userId, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  delete(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.planService.delete(user.userId, id);
  }

  @Post(':id/items')
  @UseGuards(JwtAuthGuard)
  addItem(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: CreatePlanItemDto,
  ) {
    return this.planService.addItem(user.userId, id, dto);
  }

  @Patch(':id/items/:itemId')
  @UseGuards(JwtAuthGuard)
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdatePlanItemDto,
  ) {
    return this.planService.updateItem(user.userId, id, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  @UseGuards(JwtAuthGuard)
  deleteItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: DeletePlanItemDto,
  ) {
    return this.planService.deleteItem(user.userId, id, itemId, dto);
  }

  @Get(':id/memos')
  @UseGuards(JwtAuthGuard)
  listMemos(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.planService.listMemos(user.userId, id);
  }

  @Post(':id/memos')
  @UseGuards(JwtAuthGuard)
  createMemo(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: CreatePlanMemoDto,
  ) {
    return this.planService.createMemo(user.userId, id, dto);
  }

  @Delete(':id/memos/:memoId')
  @UseGuards(JwtAuthGuard)
  deleteMemo(
    @Param('id') id: string,
    @Param('memoId') memoId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.planService.deleteMemo(user.userId, id, memoId);
  }

  @Post('generate')
  @UseGuards(JwtAuthGuard)
  generate(
    @Body() dto: GeneratePlanDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.planService.generate(user.userId, dto);
  }
}
