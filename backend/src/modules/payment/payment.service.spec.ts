import { PaymentService } from './payment.service';

describe('PaymentService', () => {
  const prisma = {
    subscription: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(async (operations: Promise<unknown>[]) =>
      Promise.all(operations),
    ),
  } as any;

  let service: PaymentService;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.TOSS_SECRET_KEY;
    delete process.env.SUBSCRIPTION_MONTHLY_AMOUNT;
    service = new PaymentService(prisma);
  });

  it('prepare는 구독 준비 정보와 주문번호를 반환한다', async () => {
    prisma.subscription.upsert.mockResolvedValue({
      id: 'sub-1',
      userId: 'user-1',
      planCode: 'couple_monthly',
      status: 'inactive',
      currentPeriodEnd: null,
      graceEndsAt: null,
      cancelledAt: null,
      createdAt: new Date('2026-04-16T00:00:00.000Z'),
      updatedAt: new Date('2026-04-16T00:00:00.000Z'),
    });
    prisma.payment.create.mockResolvedValue({
      id: 'pay-1',
      amount: 9900,
      status: 'READY',
      method: 'TOSSPAY',
    });

    const result = await service.prepare('user-1');

    expect(result.customerKey).toBe('user-1');
    expect(result.orderId).toMatch(/^sub_/);
    expect(result.payment.amount).toBe(9900);
  });

  it('confirm은 mock 모드에서 구독을 active로 전환한다', async () => {
    prisma.payment.findUnique.mockResolvedValue({
      id: 'pay-1',
      subscriptionId: 'sub-1',
      orderId: 'order-1',
      paymentKey: null,
      amount: 9900,
      method: 'TOSSPAY',
      status: 'READY',
      subscription: {
        id: 'sub-1',
        userId: 'user-1',
        planCode: 'couple_monthly',
        status: 'inactive',
        currentPeriodEnd: null,
        graceEndsAt: null,
        cancelledAt: null,
        createdAt: new Date('2026-04-16T00:00:00.000Z'),
        updatedAt: new Date('2026-04-16T00:00:00.000Z'),
      },
    });
    prisma.payment.update.mockResolvedValue({
      id: 'pay-1',
      orderId: 'order-1',
      amount: 9900,
      status: 'DONE',
      method: 'TOSSPAY',
    });
    prisma.subscription.update.mockResolvedValue({
      id: 'sub-1',
      userId: 'user-1',
      planCode: 'couple_monthly',
      status: 'active',
      currentPeriodEnd: new Date('2026-05-16T00:00:00.000Z'),
      graceEndsAt: null,
      cancelledAt: null,
      createdAt: new Date('2026-04-16T00:00:00.000Z'),
      updatedAt: new Date('2026-04-16T00:00:00.000Z'),
    });

    const result = await service.confirm('user-1', {
      paymentKey: 'pk_test',
      orderId: 'order-1',
      amount: 9900,
    });

    expect(result.subscription.status).toBe('active');
    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pay-1' },
      }),
    );
  });

  it('getStatus는 만료된 active 구독을 grace로 전환한다', async () => {
    prisma.subscription.upsert.mockResolvedValue({
      id: 'sub-1',
      userId: 'user-1',
      planCode: 'couple_monthly',
      status: 'active',
      currentPeriodEnd: new Date('2020-01-01T00:00:00.000Z'),
      graceEndsAt: null,
      cancelledAt: null,
      createdAt: new Date('2019-12-01T00:00:00.000Z'),
      updatedAt: new Date('2019-12-01T00:00:00.000Z'),
    });
    prisma.subscription.update.mockResolvedValue({
      id: 'sub-1',
      userId: 'user-1',
      planCode: 'couple_monthly',
      status: 'grace',
      currentPeriodEnd: new Date('2020-01-01T00:00:00.000Z'),
      graceEndsAt: new Date('2026-04-19T00:00:00.000Z'),
      cancelledAt: null,
      createdAt: new Date('2019-12-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-16T00:00:00.000Z'),
    });

    const result = await service.getStatus('user-1');

    expect(result.subscription.status).toBe('grace');
    expect(result.hasAccess).toBe(true);
  });
});
