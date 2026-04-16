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

  let service: PlanService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PlanService(
      prisma,
      aiService,
      paymentService,
      notificationService,
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
});
