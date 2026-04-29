import { ConflictException, NotFoundException } from '@nestjs/common';
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
