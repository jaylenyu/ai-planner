import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationService } from '../notification/notification.service';
import { PaymentService } from '../payment/payment.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteWorkspaceDto } from './dto/invite-workspace.dto';

const WORKSPACE_MEMBER_LIMIT = 2;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
  ) {}

  private async assertPaidAccess(userId: string) {
    const status = await this.paymentService.getStatus(userId);
    if (!status.hasAccess) {
      throw new ForbiddenException('유료 플랜 구독이 필요합니다.');
    }
    return status;
  }

  private async findMembership(userId: string) {
    return this.prisma.workspaceMember.findUnique({
      where: { userId },
      include: {
        workspace: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, email: true },
                },
              },
            },
            invites: {
              where: {
                status: 'pending',
                expiresAt: { gt: new Date() },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });
  }

  async getMine(userId: string) {
    const membership = await this.findMembership(userId);
    if (!membership) {
      return { workspace: null };
    }
    return {
      workspace: membership.workspace,
      role: membership.role,
    };
  }

  async create(userId: string, dto: CreateWorkspaceDto) {
    await this.assertPaidAccess(userId);

    const existing = await this.findMembership(userId);
    if (existing) {
      throw new ConflictException('이미 참여 중인 워크스페이스가 있습니다.');
    }

    const workspace = await this.prisma.workspace.create({
      data: {
        ownerId: userId,
        name: dto.name?.trim() || '우리 일정',
        members: {
          create: {
            userId,
            role: 'owner',
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, email: true },
            },
          },
        },
        invites: true,
      },
    });

    return { workspace, role: 'owner' };
  }

  private async getWorkspaceForUser(userId: string, workspaceId: string) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: { userId, workspaceId },
      include: {
        workspace: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, email: true },
                },
              },
            },
            invites: {
              where: {
                status: 'pending',
                expiresAt: { gt: new Date() },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('워크스페이스를 찾을 수 없습니다.');
    }

    return membership;
  }

  async invite(userId: string, workspaceId: string, dto: InviteWorkspaceDto) {
    await this.assertPaidAccess(userId);
    const membership = await this.getWorkspaceForUser(userId, workspaceId);
    if (membership.role !== 'owner') {
      throw new ForbiddenException(
        '초대는 워크스페이스 소유자만 할 수 있습니다.',
      );
    }

    if (membership.workspace.members.length >= WORKSPACE_MEMBER_LIMIT) {
      throw new BadRequestException(
        '워크스페이스는 최대 2명까지 참여할 수 있습니다.',
      );
    }

    const email = dto.email.trim().toLowerCase();
    if (
      membership.workspace.members.some(
        (member) => member.user.email.toLowerCase() === email,
      )
    ) {
      throw new BadRequestException('본인 이메일은 초대할 수 없습니다.');
    }

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    const invite = await this.prisma.workspaceInvite.create({
      data: {
        workspaceId,
        inviterId: userId,
        email,
        token,
        expiresAt,
      },
    });

    const frontendUrl =
      process.env.FRONTEND_URL?.trim() || 'http://localhost:3000';
    const inviteUrl = `${frontendUrl}/workspace/join/${token}`;

    try {
      await this.emailService.sendWorkspaceInvite(
        email,
        membership.workspace.name,
        inviteUrl,
      );
    } catch {
      // Email config can be absent in local/dev. The invite URL is still returned.
    }

    const invitedUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (invitedUser) {
      await this.notificationService.create(invitedUser.id, 'invite_received', {
        workspaceId,
        workspaceName: membership.workspace.name,
        inviteUrl,
      });
    }

    return { invite, inviteUrl };
  }

  async join(userId: string, token: string) {
    const invite = await this.prisma.workspaceInvite.findUnique({
      where: { token },
      include: {
        workspace: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, email: true },
                },
              },
            },
          },
        },
      },
    });

    if (!invite || invite.status !== 'pending') {
      throw new NotFoundException('유효한 초대를 찾을 수 없습니다.');
    }

    const ownerStatus = await this.paymentService.getStatus(
      invite.workspace.ownerId,
    );
    if (!ownerStatus.hasAccess) {
      throw new ForbiddenException(
        '워크스페이스 구독이 활성 상태가 아닙니다.',
      );
    }

    if (invite.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('초대가 만료되었습니다.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
      throw new ForbiddenException('초대받은 이메일과 로그인 계정이 다릅니다.');
    }

    const existingMembership = await this.findMembership(userId);
    if (existingMembership) {
      if (existingMembership.workspace.id === invite.workspaceId) {
        return {
          workspace: existingMembership.workspace,
          role: existingMembership.role,
        };
      }
      throw new ConflictException('이미 다른 워크스페이스에 참여 중입니다.');
    }

    if (invite.workspace.members.length >= WORKSPACE_MEMBER_LIMIT) {
      throw new BadRequestException('워크스페이스 인원이 이미 가득 찼습니다.');
    }

    await this.prisma.$transaction([
      this.prisma.workspaceMember.create({
        data: {
          workspaceId: invite.workspaceId,
          userId,
          role: 'member',
        },
      }),
      this.prisma.workspaceInvite.update({
        where: { id: invite.id },
        data: {
          status: 'accepted',
          acceptedAt: new Date(),
        },
      }),
    ]);

    await this.notificationService.create(
      invite.workspace.ownerId,
      'workspace_joined',
      {
        workspaceId: invite.workspaceId,
        workspaceName: invite.workspace.name,
        userEmail: user.email,
      },
    );

    return this.getMine(userId);
  }

  async dissolve(userId: string, workspaceId: string) {
    const membership = await this.getWorkspaceForUser(userId, workspaceId);
    if (membership.role !== 'owner') {
      throw new ForbiddenException(
        '워크스페이스 해체는 소유자만 할 수 있습니다.',
      );
    }

    const sharedPlans = await this.prisma.plan.findMany({
      where: { workspaceId },
      include: {
        items: {
          orderBy: { order: 'asc' },
        },
      },
    });

    const memberIds = membership.workspace.members.map((item) => item.userId);
    const cloneOperations = sharedPlans.flatMap((plan) =>
      memberIds
        .filter((memberId) => memberId !== plan.userId)
        .map((memberId) =>
          this.prisma.plan.create({
            data: {
              userId: memberId,
              rawInput: plan.rawInput,
              mode: plan.mode,
              summary: plan.summary,
              items: {
                create: plan.items.map((item) => ({
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
          }),
        ),
    );

    await this.prisma.$transaction([
      ...cloneOperations,
      this.prisma.plan.updateMany({
        where: { workspaceId },
        data: { workspaceId: null },
      }),
      this.prisma.workspace.delete({
        where: { id: workspaceId },
      }),
    ]);

    await this.notificationService.createMany(
      memberIds.filter((memberId) => memberId !== userId),
      'workspace_dissolved',
      {
        workspaceName: membership.workspace.name,
      },
    );

    return { deleted: true };
  }
}
