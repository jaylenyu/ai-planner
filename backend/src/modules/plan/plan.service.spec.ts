import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PlanService } from './plan.service';

describe('PlanService', () => {
  const prisma = {
    plan: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
    },
    workspaceMember: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    planMemo: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  } as any;

  const aiService = {
    runPipeline: jest.fn(),
  } as any;

  const paymentService = {
    getStatus: jest.fn(),
  } as any;

  const notificationService = {
    createMany: jest.fn(),
  } as any;

  const apiBudgetService = {
    trackRequest: jest.fn(),
  } as any;

  let service: PlanService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PlanService(
      prisma,
      aiService,
      paymentService,
      notificationService,
      apiBudgetService,
    );
  });

  const personalPlan = {
    id: 'plan-1',
    userId: 'user-1',
    workspaceId: null,
    categoryId: 'cat-1',
    summary: 'old',
    updatedAt: new Date('2026-04-16T00:00:00.000Z'),
    category: { id: 'cat-1', name: '데이트', color: '#f97316' },
    workspace: null,
    user: { id: 'user-1', email: 'test@example.com' },
    memos: [],
    items: [],
  };

  const workspaceMembership = {
    id: 'member-1',
    userId: 'user-1',
    workspaceId: 'workspace-1',
    role: 'owner',
    workspace: {
      id: 'workspace-1',
      name: '우리 일정',
      ownerId: 'user-1',
      members: [],
    },
  };

  it('list는 category 필터를 전달한다', async () => {
    prisma.plan.findMany.mockResolvedValue([]);

    await service.list('user-1', 'cat-1');

    expect(prisma.plan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ categoryId: 'cat-1' }),
      }),
    );
  });

  it('update는 stale updatedAt이면 409를 던진다', async () => {
    const current = {
      id: 'plan-1',
      userId: 'user-1',
      categoryId: null,
      summary: 'old',
      updatedAt: new Date('2026-04-16T00:00:00.000Z'),
      category: null,
      workspace: null,
      user: { id: 'user-1', email: 'test@example.com' },
      memos: [],
      items: [],
    };

    prisma.plan.findFirst.mockResolvedValue(current);
    prisma.plan.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.update('user-1', 'plan-1', {
        updatedAt: '2026-04-15T00:00:00.000Z',
        summary: 'new',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('delete는 없는 플랜이면 404를 던진다', async () => {
    prisma.plan.findFirst.mockResolvedValue(null);

    await expect(service.delete('user-1', 'plan-404')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('share는 개인 일정을 커플 플랜으로 이동하고 카테고리를 비운다', async () => {
    const sharedPlan = {
      ...personalPlan,
      workspaceId: 'workspace-1',
      categoryId: null,
      category: null,
      workspace: {
        id: 'workspace-1',
        name: '우리 일정',
        ownerId: 'user-1',
      },
    };
    prisma.plan.findFirst
      .mockResolvedValueOnce(personalPlan)
      .mockResolvedValueOnce(sharedPlan);
    prisma.workspaceMember.findFirst.mockResolvedValue(workspaceMembership);
    prisma.workspaceMember.findMany.mockResolvedValue([{ userId: 'user-2' }]);
    prisma.plan.updateMany.mockResolvedValue({ count: 1 });
    paymentService.getStatus.mockResolvedValue({ hasAccess: true });

    const result = await service.share('user-1', 'plan-1', {
      updatedAt: '2026-04-16T00:00:00.000Z',
    });

    expect(prisma.plan.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'plan-1',
        userId: 'user-1',
        workspaceId: null,
        updatedAt: new Date('2026-04-16T00:00:00.000Z'),
      },
      data: {
        workspaceId: 'workspace-1',
        categoryId: null,
      },
    });
    expect(notificationService.createMany).toHaveBeenCalledWith(
      ['user-2'],
      'plan_shared',
      {
        planId: 'plan-1',
        summary: 'old',
        workspaceName: '우리 일정',
      },
    );
    expect(result).toBe(sharedPlan);
  });

  it('share는 이미 공유된 일정이면 400을 던진다', async () => {
    prisma.plan.findFirst.mockResolvedValue({
      ...personalPlan,
      workspaceId: 'workspace-1',
    });

    await expect(
      service.share('user-1', 'plan-1', {
        updatedAt: '2026-04-16T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('share는 커플 플랜이 없으면 404를 던진다', async () => {
    prisma.plan.findFirst.mockResolvedValue(personalPlan);
    prisma.workspaceMember.findFirst.mockResolvedValue(null);

    await expect(
      service.share('user-1', 'plan-1', {
        updatedAt: '2026-04-16T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('share는 구독이 만료된 커플 플랜이면 403을 던진다', async () => {
    prisma.plan.findFirst.mockResolvedValue(personalPlan);
    prisma.workspaceMember.findFirst.mockResolvedValue(workspaceMembership);
    paymentService.getStatus.mockResolvedValue({ hasAccess: false });

    await expect(
      service.share('user-1', 'plan-1', {
        updatedAt: '2026-04-16T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('share는 stale updatedAt이면 409를 던진다', async () => {
    prisma.plan.findFirst.mockResolvedValue(personalPlan);
    prisma.workspaceMember.findFirst.mockResolvedValue(workspaceMembership);
    paymentService.getStatus.mockResolvedValue({ hasAccess: true });
    prisma.plan.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.share('user-1', 'plan-1', {
        updatedAt: '2026-04-15T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('createMemo는 개인 일정이면 400을 던진다', async () => {
    prisma.plan.findFirst.mockResolvedValue(personalPlan);

    await expect(
      service.createMemo('user-1', 'plan-1', { content: '메모' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('listMemos는 개인 일정이면 400을 던진다', async () => {
    prisma.plan.findFirst.mockResolvedValue(personalPlan);

    await expect(service.listMemos('user-1', 'plan-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('generate는 같은 입력 최근 10개 장소 이력을 AI 파이프라인에 전달한다', async () => {
    prisma.plan.findMany.mockResolvedValue([
      {
        rawInput: '홍대 맛집',
        items: [{ name: 'A식당' }, { name: '스타벅스 홍대점' }],
      },
      {
        rawInput: '다른 입력',
        items: [{ name: 'B식당' }],
      },
    ]);
    aiService.runPipeline.mockResolvedValue({
      summary: '홍대 데이트',
      items: [],
      polyline: [],
      totalDurationMin: 0,
      unsupportedHints: [],
      llmCost: 0,
    });
    prisma.plan.create.mockResolvedValue({
      id: 'plan-1',
      workspace: null,
      items: [],
    });

    await service.generate('user-1', {
      rawInput: '홍대   맛집',
      mode: 'date',
    });

    expect(aiService.runPipeline).toHaveBeenCalledWith('홍대   맛집', 'date', {
      diversityHistory: {
        placeCounts: {
          a식당: 1,
          스타벅스홍대점: 1,
        },
        chainCounts: {
          스타벅스: 1,
        },
      },
    });
  });
});
