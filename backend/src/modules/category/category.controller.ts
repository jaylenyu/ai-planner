import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryService } from './category.service';

@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get('list')
  @UseGuards(JwtAuthGuard)
  list(@CurrentUser() user: { userId: string }) {
    return this.categoryService.list(user.userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categoryService.create(user.userId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(user.userId, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  delete(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.categoryService.delete(user.userId, id);
  }
}
