import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.category.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'asc' }],
    });
  }

  async create(userId: string, dto: CreateCategoryDto) {
    try {
      return await this.prisma.category.create({
        data: {
          userId,
          name: dto.name.trim(),
          color: dto.color?.trim() || '#6366f1',
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException('이미 존재하는 카테고리 이름입니다.');
      }
      throw error;
    }
  }

  async update(userId: string, categoryId: string, dto: UpdateCategoryDto) {
    const existing = await this.prisma.category.findFirst({
      where: { id: categoryId, userId },
    });
    if (!existing) {
      throw new NotFoundException('카테고리를 찾을 수 없습니다.');
    }

    try {
      return await this.prisma.category.update({
        where: { id: categoryId },
        data: {
          name: dto.name?.trim() ?? existing.name,
          color: dto.color?.trim() ?? existing.color,
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException('이미 존재하는 카테고리 이름입니다.');
      }
      throw error;
    }
  }

  async delete(userId: string, categoryId: string) {
    const existing = await this.prisma.category.findFirst({
      where: { id: categoryId, userId },
    });
    if (!existing) {
      throw new NotFoundException('카테고리를 찾을 수 없습니다.');
    }

    await this.prisma.category.delete({
      where: { id: categoryId },
    });

    return { deleted: true };
  }
}
