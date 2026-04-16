import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { NotificationService } from '../notification/notification.service';
import { PaymentService } from '../payment/payment.service';
import { CreatePlanMemoDto } from './dto/create-plan-memo.dto';
import { CreatePlanItemDto } from './dto/create-plan-item.dto';
import { DeletePlanItemDto } from './dto/delete-plan-item.dto';
import { GeneratePlanDto } from './dto/generate-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { UpdatePlanItemDto } from './dto/update-plan-item.dto';

const planInclude = {
  category: true,
  workspace: {
    select: {
      id: true,
      name: true,
      ownerId: true,
    },
  },
  user: {
    select: {
      id: true,
      email: true,
    },
  },
  items: { orderBy: { order: 'asc' as const } },
  memos: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      author: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  },
};

@Injectable()
export class PlanService {
  private readonly logger = new Logger(PlanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly paymentService: PaymentService,
    private readonly notificationService: NotificationService,
  ) {}

  private buildAccessibleWhere(userId: string, planId?: string) {
    return {
      ...(planId ? { id: planId } : {}),
      OR: [
        { userId, workspaceId: null },
        { workspace: { members: { some: { userId } } } },
      ],
    };
  }

  private async getWorkspaceMembership(userId: string, workspaceId: string) {
    return this.prisma.workspaceMember.findFirst({
      where: { userId, workspaceId },
      include: {
        workspace: {
          include: {
            members: true,
          },
        },
      },
    });
  }

  private async assertWorkspaceWritable(userId: string, workspaceId: string) {
    const membership = await this.getWorkspaceMembership(userId, workspaceId);
    if (!membership) {
      throw new NotFoundException('워크스페이스를 찾을 수 없습니다.');
    }

    const ownerStatus = await this.paymentService.getStatus(
      membership.workspace.ownerId,
    );
    if (!ownerStatus.hasAccess) {
      throw new ForbiddenException(
        '공유 워크스페이스 구독이 만료되어 읽기 전용입니다.',
      );
    }

    return membership;
  }

  private async notifyWorkspaceMembers(
    workspaceId: string | null,
    actorUserId: string,
    type: string,
    payload: Record<string, unknown>,
  ) {
    if (!workspaceId) return;

    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId, userId: { not: actorUserId } },
      select: { userId: true },
    });

    await this.notificationService.createMany(
      members.map((item) => item.userId),
      type,
      payload,
    );
  }

  private async touchPlan(
    userId: string,
    planId: string,
    updatedAt: string,
    currentPlan?: Awaited<ReturnType<PlanService['get']>>,
  ) {
    const current = currentPlan ?? (await this.get(userId, planId));
    const touched = await this.prisma.plan.updateMany({
      where: {
        id: planId,
        updatedAt: new Date(updatedAt),
      },
      data: {
        updatedAt: new Date(),
      },
    });

    if (touched.count === 0) {
      throw new ConflictException({
        message: '다른 기기에서 플랜이 수정되었습니다. 다시 불러와주세요.',
        currentPlan: current,
      });
    }

    return current;
  }

  async list(
    userId: string,
    categoryId?: string,
    scope?: 'personal' | 'shared',
  ) {
    const sharedWhere = { workspace: { members: { some: { userId } } } };
    const personalWhere = { userId, workspaceId: null };
    const where =
      scope === 'shared'
        ? { ...sharedWhere, ...(categoryId ? { categoryId } : {}) }
        : scope === 'personal'
          ? { ...personalWhere, ...(categoryId ? { categoryId } : {}) }
          : {
              ...(categoryId ? { categoryId } : {}),
              OR: [personalWhere, sharedWhere],
            };

    return this.prisma.plan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        items: { orderBy: { order: 'asc' } },
      },
    });
  }

  async get(userId: string, planId: string) {
    const plan = await this.prisma.plan.findFirst({
      where: this.buildAccessibleWhere(userId, planId),
      include: planInclude,
    });

    if (!plan) {
      throw new NotFoundException('플랜을 찾을 수 없습니다.');
    }

    return plan;
  }

  async update(userId: string, planId: string, dto: UpdatePlanDto) {
    const current = await this.get(userId, planId);
    if (current.workspaceId) {
      await this.assertWorkspaceWritable(userId, current.workspaceId);
    }
    const nextCategoryId =
      dto.categoryId === undefined ? current.categoryId : dto.categoryId;

    if (nextCategoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: nextCategoryId, userId },
      });
      if (!category) {
        throw new NotFoundException('카테고리를 찾을 수 없습니다.');
      }
    }

    const updateResult = await this.prisma.plan.updateMany({
      where: {
        id: planId,
        updatedAt: new Date(dto.updatedAt),
      },
      data: {
        summary: dto.summary === undefined ? current.summary : dto.summary,
        categoryId: nextCategoryId,
      },
    });

    if (updateResult.count === 0) {
      throw new ConflictException({
        message: '다른 기기에서 플랜이 수정되었습니다. 다시 불러와주세요.',
        currentPlan: current,
      });
    }

    const updated = await this.get(userId, planId);
    await this.notifyWorkspaceMembers(
      updated.workspaceId,
      userId,
      'plan_edited',
      {
        planId: updated.id,
        summary: updated.summary,
        workspaceName: updated.workspace?.name ?? null,
      },
    );
    return updated;
  }

  async delete(userId: string, planId: string) {
    const current = await this.get(userId, planId);
    if (current.workspaceId) {
      await this.assertWorkspaceWritable(userId, current.workspaceId);
    }
    await this.prisma.plan.delete({
      where: { id: planId },
    });

    await this.notifyWorkspaceMembers(
      current.workspaceId,
      userId,
      'plan_deleted',
      {
        planId,
        summary: current.summary,
        workspaceName: current.workspace?.name ?? null,
      },
    );

    return { deleted: true };
  }

  async generate(userId: string, dto: GeneratePlanDto) {
    let workspaceId: string | null = null;
    if (dto.workspaceId) {
      const membership = await this.assertWorkspaceWritable(
        userId,
        dto.workspaceId,
      );
      workspaceId = membership.workspaceId;
    }

    const result = await this.aiService.runPipeline(dto.rawInput, dto.mode);

    const plan = await this.prisma.plan.create({
      data: {
        userId,
        workspaceId,
        rawInput: dto.rawInput,
        mode: dto.mode,
        summary: result.summary,
        items: {
          create: result.items.map((item) => ({
            order: item.order,
            name: item.name,
            lat: item.lat,
            lng: item.lng,
            type: item.type,
            time: item.time,
            address: item.address,
            link: item.link,
            source: item.source,
            distanceFromPrev: item.distanceFromPrev,
          })),
        },
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
        items: { orderBy: { order: 'asc' } },
      },
    });

    this.logger.log(`플랜 저장 완료: ${plan.id}`);

    await this.notifyWorkspaceMembers(workspaceId, userId, 'plan_created', {
      planId: plan.id,
      summary: result.summary,
      workspaceName: plan.workspace?.name ?? null,
    });

    return {
      planId: plan.id,
      summary: result.summary,
      items: result.items,
      polyline: result.polyline,
      totalDurationMin: result.totalDurationMin,
      unsupportedHints: result.unsupportedHints,
      workspace: plan.workspace,
    };
  }

  async addItem(userId: string, planId: string, dto: CreatePlanItemDto) {
    const current = await this.touchPlan(userId, planId, dto.updatedAt);
    if (current.workspaceId) {
      await this.assertWorkspaceWritable(userId, current.workspaceId);
    }
    const nextOrder = current.items.length + 1;

    await this.prisma.planItem.create({
      data: {
        planId,
        order: nextOrder,
        name: dto.name,
        type: dto.type,
        time: dto.time,
        address: dto.address,
        lat: dto.lat,
        lng: dto.lng,
        link: dto.link,
        source: dto.source,
        distanceFromPrev: dto.distanceFromPrev,
      },
    });

    const updated = await this.get(userId, planId);
    await this.notifyWorkspaceMembers(
      updated.workspaceId,
      userId,
      'plan_item_added',
      {
        planId: updated.id,
        itemName: dto.name,
        workspaceName: updated.workspace?.name ?? null,
      },
    );
    return updated;
  }

  async updateItem(
    userId: string,
    planId: string,
    itemId: string,
    dto: UpdatePlanItemDto,
  ) {
    const current = await this.touchPlan(userId, planId, dto.updatedAt);
    if (current.workspaceId) {
      await this.assertWorkspaceWritable(userId, current.workspaceId);
    }
    const existingItem = current.items.find((item) => item.id === itemId);
    if (!existingItem) {
      throw new NotFoundException('플랜 아이템을 찾을 수 없습니다.');
    }

    await this.prisma.planItem.update({
      where: { id: itemId },
      data: {
        name: dto.name ?? existingItem.name,
        type: dto.type ?? existingItem.type,
        time: dto.time ?? existingItem.time,
        address: dto.address ?? existingItem.address,
        lat: dto.lat ?? existingItem.lat,
        lng: dto.lng ?? existingItem.lng,
        link:
          dto.link === undefined
            ? existingItem.link
            : dto.link === null
              ? null
              : dto.link,
        source:
          dto.source === undefined
            ? existingItem.source
            : dto.source === null
              ? null
              : dto.source,
        distanceFromPrev:
          dto.distanceFromPrev === undefined
            ? existingItem.distanceFromPrev
            : dto.distanceFromPrev,
      },
    });

    const updated = await this.get(userId, planId);
    await this.notifyWorkspaceMembers(
      updated.workspaceId,
      userId,
      'plan_item_updated',
      {
        planId: updated.id,
        itemName: dto.name ?? existingItem.name,
        workspaceName: updated.workspace?.name ?? null,
      },
    );
    return updated;
  }

  async deleteItem(
    userId: string,
    planId: string,
    itemId: string,
    dto: DeletePlanItemDto,
  ) {
    const current = await this.touchPlan(userId, planId, dto.updatedAt);
    if (current.workspaceId) {
      await this.assertWorkspaceWritable(userId, current.workspaceId);
    }
    const existingItem = current.items.find((item) => item.id === itemId);
    if (!existingItem) {
      throw new NotFoundException('플랜 아이템을 찾을 수 없습니다.');
    }

    await this.prisma.planItem.delete({
      where: { id: itemId },
    });

    const remaining = await this.prisma.planItem.findMany({
      where: { planId },
      orderBy: { order: 'asc' },
    });
    await this.prisma.$transaction(
      remaining.map((item, index) =>
        this.prisma.planItem.update({
          where: { id: item.id },
          data: { order: index + 1 },
        }),
      ),
    );

    const updated = await this.get(userId, planId);
    await this.notifyWorkspaceMembers(
      updated.workspaceId,
      userId,
      'plan_item_deleted',
      {
        planId: updated.id,
        itemName: existingItem.name,
        workspaceName: updated.workspace?.name ?? null,
      },
    );
    return updated;
  }

  async listMemos(userId: string, planId: string) {
    const plan = await this.get(userId, planId);
    return plan.memos;
  }

  async createMemo(userId: string, planId: string, dto: CreatePlanMemoDto) {
    const plan = await this.get(userId, planId);
    if (plan.workspaceId) {
      await this.assertWorkspaceWritable(userId, plan.workspaceId);
    }
    const memo = await this.prisma.planMemo.create({
      data: {
        planId,
        authorId: userId,
        content: dto.content.trim(),
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    await this.notifyWorkspaceMembers(plan.workspaceId, userId, 'memo_added', {
      planId: plan.id,
      summary: plan.summary,
      workspaceName: plan.workspace?.name ?? null,
    });
    return memo;
  }

  async deleteMemo(userId: string, planId: string, memoId: string) {
    const plan = await this.get(userId, planId);
    if (plan.workspaceId) {
      await this.assertWorkspaceWritable(userId, plan.workspaceId);
    }
    const deleted = await this.prisma.planMemo.deleteMany({
      where: {
        id: memoId,
        authorId: userId,
        planId,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('메모를 찾을 수 없습니다.');
    }

    return { deleted: true };
  }
}
