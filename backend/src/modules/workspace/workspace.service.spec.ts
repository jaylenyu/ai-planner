import { ForbiddenException } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';

describe('WorkspaceService', () => {
  const prisma = {
    workspaceMember: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    workspace: {
      create: jest.fn(),
      delete: jest.fn(),
    },
    workspaceInvite: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    plan: {
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(async (operations: Promise<unknown>[]) =>
      Promise.all(operations),
    ),
  } as any;

  const paymentService = {
    getStatus: jest.fn(),
  } as any;

  const emailService = {
    sendWorkspaceInvite: jest.fn(),
  } as any;

  const notificationService = {
    create: jest.fn(),
    createMany: jest.fn(),
  } as any;

  let service: WorkspaceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WorkspaceService(
      prisma,
      paymentService,
      emailService,
      notificationService,
    );
  });

  it('구독 접근이 없으면 워크스페이스 생성을 막는다', async () => {
    paymentService.getStatus.mockResolvedValue({ hasAccess: false });

    await expect(
      service.create('user-1', { name: '우리 일정' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('join은 유효한 초대면 멤버를 추가한다', async () => {
    paymentService.getStatus.mockResolvedValue({ hasAccess: true });
    prisma.workspaceInvite.findUnique.mockResolvedValue({
      id: 'invite-1',
      workspaceId: 'ws-1',
      email: 'guest@example.com',
      status: 'pending',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      workspace: {
        id: 'ws-1',
        ownerId: 'owner-1',
        name: '우리 일정',
        members: [{ userId: 'owner-1', user: { email: 'owner@example.com' } }],
      },
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-2',
      email: 'guest@example.com',
    });
    prisma.workspaceMember.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        role: 'member',
        workspace: {
          id: 'ws-1',
          name: '우리 일정',
          ownerId: 'owner-1',
          members: [
            {
              id: 'm1',
              userId: 'owner-1',
              role: 'owner',
              user: { id: 'owner-1', email: 'owner@example.com' },
            },
            {
              id: 'm2',
              userId: 'user-2',
              role: 'member',
              user: { id: 'user-2', email: 'guest@example.com' },
            },
          ],
          invites: [],
        },
      });
    prisma.workspaceMember.create.mockResolvedValue({});
    prisma.workspaceInvite.update.mockResolvedValue({});

    const result = await service.join('user-2', 'token-123');

    expect(prisma.workspaceMember.create).toHaveBeenCalled();
    expect(result.workspace?.id).toBe('ws-1');
    expect(result.role).toBe('member');
  });
});
