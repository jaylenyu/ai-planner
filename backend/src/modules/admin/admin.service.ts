import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import {
  CostExplorerClient,
  GetCostAndUsageCommand,
} from '@aws-sdk/client-cost-explorer';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/types';

type UserListFilters = {
  search?: string;
  provider?: 'google' | 'kakao' | 'naver' | 'local';
  emailVerified?: boolean;
  subscriptionStatus?: string;
  page?: number;
  limit?: number;
};

type OpsLogsResponse = {
  configured: boolean;
  available: boolean;
  source: 'cloudwatch' | 'fallback';
  container: 'backend' | 'frontend';
  search: string;
  error?: string;
  lines: Array<{
    timestamp: string;
    level: 'INFO' | 'WARN' | 'ERROR';
    message: string;
    raw?: unknown;
  }>;
};

type OpsCostResponse = {
  configured: boolean;
  available: boolean;
  source: 'cost-explorer' | 'fallback';
  currency: string;
  total: number;
  monthly: number;
  deltaPct: number;
  byService: Record<string, number>;
  points: Array<{ date: string; cost: number }>;
  error?: string;
};

type OpsSentryResponse = {
  configured: boolean;
  available: boolean;
  error?: string;
  totalCount: number;
  issues: Array<{
    id: string;
    title: string;
    count: number;
    firstSeen: string;
    lastSeen: string;
    permalink: string;
  }>;
};

type CachedCostEntry = {
  expiresAt: number;
  data: OpsCostResponse;
};

type CachedSentryEntry = {
  expiresAt: number;
  data: OpsSentryResponse;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const COST_CACHE_TTL_MS = 15 * 60 * 1000;
const SENTRY_CACHE_TTL_MS = 5 * 60 * 1000;

function startOfDay(date = new Date()) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function toNumber(value: string | undefined, fallback: number) {
  const parsed = value ? Number(value) : fallback;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getAwsClientConfig() {
  const region = process.env.AWS_REGION?.trim();
  if (!region) return null;

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();

  return {
    region,
    credentials:
      accessKeyId && secretAccessKey
        ? { accessKeyId, secretAccessKey }
        : undefined,
  };
}

@Injectable()
export class AdminService {
  private readonly costCache = new Map<string, CachedCostEntry>();
  private sentryCache: CachedSentryEntry | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private get monthlyAmount() {
    return toNumber(process.env.SUBSCRIPTION_MONTHLY_AMOUNT, 9900);
  }

  async getSummary() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const dayStart = startOfDay(now);

    const [
      totalUsers,
      activeSubscriptions,
      plansToday,
      recentFailures,
      recentUsers,
      unresolvedSentryCount,
      awsCost,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.subscription.count({
        where: { status: { in: ['active', 'grace'] } },
      }),
      this.prisma.plan.count({ where: { createdAt: { gte: dayStart } } }),
      this.prisma.payment.findMany({
        where: { status: 'FAILED' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          user: {
            select: { id: true, email: true, role: true, adminReadOnly: true },
          },
          subscription: { select: { id: true, status: true, planCode: true } },
        },
      }),
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          email: true,
          role: true,
          adminReadOnly: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
        },
      }),
      this.countSentryIssues(),
      this.getMonthlyCost(monthStart, now),
    ]);

    return {
      kpis: {
        totalUsers,
        activeSubscriptions,
        mrr: activeSubscriptions * this.monthlyAmount,
        plansToday,
        monthlyAwsCost: awsCost.total,
        unresolvedSentryCount,
      },
      recentFailures: recentFailures.map((payment) => ({
        id: payment.id,
        orderId: payment.orderId,
        amount: payment.amount,
        method: payment.method,
        status: payment.status,
        failReason: payment.failReason,
        createdAt: payment.createdAt,
        user: payment.user,
        subscription: payment.subscription,
      })),
      recentUsers,
    };
  }

  async listUsers(filters: UserListFilters) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, filters.limit ?? DEFAULT_LIMIT),
    );
    const skip = (page - 1) * limit;
    const search = filters.search?.trim();

    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (filters.emailVerified !== undefined) {
      where.emailVerified = filters.emailVerified;
    }

    if (filters.provider === 'local') {
      where.AND = [{ googleId: null }, { kakaoId: null }, { naverId: null }];
    } else if (filters.provider === 'google') {
      where.googleId = { not: null };
    } else if (filters.provider === 'kakao') {
      where.kakaoId = { not: null };
    } else if (filters.provider === 'naver') {
      where.naverId = { not: null };
    }

    if (filters.subscriptionStatus) {
      where.subscription = { status: filters.subscriptionStatus };
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          subscription: true,
          _count: {
            select: {
              plans: true,
              payments: true,
              notifications: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: {
          include: {
            payments: { orderBy: { createdAt: 'desc' }, take: 50 },
          },
        },
        payments: { orderBy: { createdAt: 'desc' }, take: 50 },
        plans: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { workspace: true, items: true },
        },
        ownedWorkspaces: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            members: {
              take: 50,
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    role: true,
                    adminReadOnly: true,
                  },
                },
              },
            },
            invites: {
              orderBy: { createdAt: 'desc' },
              take: 50,
            },
            plans: {
              orderBy: { createdAt: 'desc' },
              take: 50,
            },
          },
        },
        workspaceMembership: {
          include: {
            workspace: {
              include: {
                owner: {
                  select: {
                    id: true,
                    email: true,
                    role: true,
                    adminReadOnly: true,
                  },
                },
                members: {
                  take: 50,
                  include: {
                    user: {
                      select: {
                        id: true,
                        email: true,
                        role: true,
                        adminReadOnly: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return user;
  }

  async updateUserRole(
    userId: string,
    role: Role,
    requester: AuthenticatedUser,
  ) {
    if (requester.adminReadOnly) {
      throw new ForbiddenException(
        '읽기 전용 관리자 계정은 변경 작업을 수행할 수 없습니다.',
      );
    }

    if (requester.userId === userId) {
      throw new BadRequestException('자기 자신은 변경할 수 없습니다.');
    }

    return this.prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          role: true,
          adminReadOnly: true,
          isSuspended: true,
        },
      });

      if (!target) {
        throw new NotFoundException('사용자를 찾을 수 없습니다.');
      }

      if (target.role === 'ADMIN' && target.isSuspended) {
        // 정지된 관리자 계정은 강등 대상이 아니므로 그대로 업데이트 가능
      } else if (target.role === 'ADMIN' && role === 'USER') {
        const activeAdminCount = await tx.user.count({
          where: { role: 'ADMIN', isSuspended: false },
        });
        if (activeAdminCount <= 1) {
          throw new BadRequestException(
            '마지막 관리자 계정은 강등할 수 없습니다.',
          );
        }
      }

      return tx.user.update({
        where: { id: userId },
        data: { role },
        select: {
          id: true,
          email: true,
          role: true,
          adminReadOnly: true,
          isSuspended: true,
        },
      });
    });
  }

  async suspendUser(
    userId: string,
    isSuspended: boolean,
    requester: AuthenticatedUser,
  ) {
    if (requester.adminReadOnly) {
      throw new ForbiddenException(
        '읽기 전용 관리자 계정은 변경 작업을 수행할 수 없습니다.',
      );
    }

    if (requester.userId === userId) {
      throw new BadRequestException('자기 자신은 변경할 수 없습니다.');
    }

    return this.prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          role: true,
          adminReadOnly: true,
          isSuspended: true,
        },
      });

      if (!target) {
        throw new NotFoundException('사용자를 찾을 수 없습니다.');
      }

      if (target.role === 'ADMIN' && !target.isSuspended && isSuspended) {
        const activeAdminCount = await tx.user.count({
          where: { role: 'ADMIN', isSuspended: false },
        });
        if (activeAdminCount <= 1) {
          throw new BadRequestException(
            '마지막 관리자 계정은 정지할 수 없습니다.',
          );
        }
      }

      return tx.user.update({
        where: { id: userId },
        data: { isSuspended },
        select: {
          id: true,
          email: true,
          role: true,
          adminReadOnly: true,
          isSuspended: true,
        },
      });
    });
  }

  async getBillingOverview() {
    const [subscriptionGroups, subscriptions, payments, failedPayments] =
      await Promise.all([
        this.prisma.subscription.groupBy({
          by: ['status'],
          _count: { _all: true },
        }),
        this.prisma.subscription.findMany({
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
                adminReadOnly: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
          take: 100,
        }),
        this.prisma.payment.findMany({
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
                adminReadOnly: true,
              },
            },
          },
        }),
        this.prisma.payment.findMany({
          where: { status: 'FAILED' },
          orderBy: { createdAt: 'desc' },
          take: 25,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
                adminReadOnly: true,
              },
            },
          },
        }),
      ]);

    const statusCounts = subscriptionGroups.reduce<Record<string, number>>(
      (acc, item) => {
        acc[item.status] = item._count._all;
        return acc;
      },
      {},
    );

    return {
      statusCounts,
      subscriptions,
      payments,
      failedPayments,
    };
  }

  async getPlansOverview() {
    const [plans, workspaces] = await Promise.all([
      this.prisma.plan.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          rawInput: true,
          mode: true,
          summary: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: { id: true, email: true, role: true, adminReadOnly: true },
          },
          workspace: {
            select: {
              id: true,
              name: true,
              ownerId: true,
              createdAt: true,
              updatedAt: true,
              owner: {
                select: {
                  id: true,
                  email: true,
                  role: true,
                  adminReadOnly: true,
                },
              },
              _count: {
                select: {
                  members: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.workspace.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          name: true,
          ownerId: true,
          createdAt: true,
          updatedAt: true,
          owner: {
            select: { id: true, email: true, role: true, adminReadOnly: true },
          },
          _count: {
            select: {
              members: true,
              plans: true,
              invites: true,
            },
          },
        },
      }),
    ]);

    const suspiciousPlanGroups = await this.prisma.plan.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      _count: { _all: true },
    });
    const suspiciousIds = suspiciousPlanGroups
      .filter((item) => item._count._all > 100)
      .map((item) => item.userId);
    const suspiciousUsersById =
      suspiciousIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: suspiciousIds } },
            select: {
              id: true,
              email: true,
              role: true,
              adminReadOnly: true,
            },
          })
        : [];
    const suspiciousUsers = suspiciousPlanGroups
      .filter((item) => item._count._all > 100)
      .map((item) => ({
        userId: item.userId,
        count: item._count._all,
        user: suspiciousUsersById.find((user) => user.id === item.userId),
      }))
      .filter(
        (
          item,
        ): item is {
          userId: string;
          count: number;
          user: {
            id: string;
            email: string;
            role: Role;
            adminReadOnly: boolean;
          };
        } => !!item.user,
      );

    const [daily, weekly, monthly] = await Promise.all([
      this.prisma.plan.count({ where: { createdAt: { gte: startOfDay() } } }),
      this.prisma.plan.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.plan.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    return {
      timeline: { daily, weekly, monthly },
      suspiciousUsers,
      workspaces,
      plans,
    };
  }

  async getApiUsageOverview() {
    const now = new Date();
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.apiUsage.findMany({
      where: { timestamp: { gte: start } },
      orderBy: { timestamp: 'asc' },
    });

    const totalsByDay = rows.reduce<
      Record<string, { count: number; cost: number }>
    >((acc, row) => {
      const key = row.timestamp.toISOString().slice(0, 10);
      acc[key] ??= { count: 0, cost: 0 };
      acc[key].count += 1;
      acc[key].cost += row.cost;
      return acc;
    }, {});

    const topUsers = await this.prisma.apiUsage.groupBy({
      by: ['userId'],
      _sum: { cost: true },
      _count: { _all: true },
      orderBy: { _sum: { cost: 'desc' } },
      take: 10,
    });

    return {
      totalsByDay,
      topUsers,
    };
  }

  private inferLogLevel(message: string): 'INFO' | 'WARN' | 'ERROR' {
    if (/\b(error|exception|fatal)\b/i.test(message)) {
      return 'ERROR';
    }
    if (/\b(warn|warning)\b/i.test(message)) {
      return 'WARN';
    }
    return 'INFO';
  }

  async getOpsLogs(
    container: 'backend' | 'frontend',
    search?: string,
  ): Promise<OpsLogsResponse> {
    const config = getAwsClientConfig();
    const logGroupName =
      container === 'backend'
        ? process.env.CLOUDWATCH_LOG_GROUP_BACKEND?.trim()
        : process.env.CLOUDWATCH_LOG_GROUP_FRONTEND?.trim();

    if (config && logGroupName) {
      try {
        const client = new CloudWatchLogsClient(config);
        const response = await client.send(
          new FilterLogEventsCommand({
            logGroupName,
            filterPattern: search ? search : undefined,
            limit: 50,
          }),
        );

        return {
          configured: true,
          available: true,
          source: 'cloudwatch' as const,
          container,
          search: search ?? '',
          lines:
            response.events?.map((event) => ({
              timestamp: event.timestamp
                ? new Date(event.timestamp).toISOString()
                : new Date().toISOString(),
              level: this.inferLogLevel(event.message ?? ''),
              message: event.message ?? '',
            })) ?? [],
        };
      } catch (error) {
        return {
          configured: true,
          available: false,
          source: 'fallback' as const,
          container,
          search: search ?? '',
          error:
            error instanceof Error
              ? error.message
              : 'CloudWatch 로그를 불러오지 못했습니다.',
          lines: [],
        };
      }
    }

    const lines = await this.prisma.apiUsage.findMany({
      orderBy: { timestamp: 'desc' },
      take: 25,
      where: search
        ? {
            OR: [
              { endpoint: { contains: search, mode: 'insensitive' } },
              { userAgent: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {},
    });

    return {
      configured: false,
      available: false,
      source: 'fallback' as const,
      container,
      search: search ?? '',
      error: 'CloudWatch 로그가 설정되지 않았습니다.',
      lines: lines.map((row) => ({
        timestamp: row.timestamp.toISOString(),
        level: row.cost > 0.03 ? ('WARN' as const) : ('INFO' as const),
        message: `[${row.endpoint}] ${row.userAgent}`,
        raw: row,
      })),
    };
  }

  private async buildFallbackCost(
    start: Date,
    end: Date,
  ): Promise<Omit<OpsCostResponse, 'configured' | 'available' | 'source'>> {
    const rows = await this.prisma.apiUsage.findMany({
      where: { timestamp: { gte: start, lte: end } },
      orderBy: { timestamp: 'asc' },
    });

    const total = rows.reduce((sum, row) => sum + row.cost, 0);
    const byService = rows.reduce<Record<string, number>>((acc, row) => {
      const service = row.endpoint.startsWith('/plan')
        ? 'Plan API'
        : row.endpoint.startsWith('/auth')
          ? 'Auth'
          : row.endpoint.startsWith('/payment')
            ? 'Payment'
            : 'Other';
      acc[service] = (acc[service] ?? 0) + row.cost;
      return acc;
    }, {});
    const pointsByDate = rows.reduce<Record<string, number>>((acc, row) => {
      const date = row.timestamp.toISOString().slice(0, 10);
      acc[date] = (acc[date] ?? 0) + row.cost;
      return acc;
    }, {});
    const points = Object.entries(pointsByDate)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, cost]) => ({
        date,
        cost,
      }));

    return {
      currency: 'USD' as const,
      total,
      monthly: total,
      deltaPct: 0,
      byService,
      points,
    };
  }

  async getOpsCost(refresh = false): Promise<OpsCostResponse> {
    const config = getAwsClientConfig();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const cacheKey = monthStart.toISOString().slice(0, 10);
    const cached = this.costCache.get(cacheKey);

    if (!refresh && cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    if (config) {
      try {
        const client = new CostExplorerClient(config);
        const response = await client.send(
          new GetCostAndUsageCommand({
            TimePeriod: {
              Start: monthStart.toISOString().slice(0, 10),
              End: new Date(now.getTime() + 24 * 60 * 60 * 1000)
                .toISOString()
                .slice(0, 10),
            },
            Granularity: 'DAILY',
            Metrics: ['UnblendedCost'],
            GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
          }),
        );

        const points =
          response.ResultsByTime?.map((bucket) => ({
            date: bucket.TimePeriod?.Start ?? '',
            cost: Number(bucket.Total?.UnblendedCost?.Amount ?? 0),
          })) ?? [];
        const byService: Record<string, number> = {};
        response.ResultsByTime?.forEach((bucket) => {
          bucket.Groups?.forEach((group) => {
            const key = group.Keys?.[0] ?? 'Other';
            byService[key] =
              (byService[key] ?? 0) +
              Number(group.Metrics?.UnblendedCost?.Amount ?? 0);
          });
        });
        const total = points.reduce((sum, row) => sum + row.cost, 0);
        const data = {
          configured: true,
          available: true,
          source: 'cost-explorer' as const,
          currency: 'USD' as const,
          total,
          monthly: total,
          deltaPct: 0,
          byService,
          points,
        };

        this.costCache.set(cacheKey, {
          expiresAt: Date.now() + COST_CACHE_TTL_MS,
          data,
        });

        return data;
      } catch (error) {
        const fallback = await this.buildFallbackCost(monthStart, now);
        return {
          ...fallback,
          configured: true,
          available: false,
          source: 'fallback' as const,
          error:
            error instanceof Error
              ? error.message
              : 'Cost Explorer를 불러오지 못했습니다.',
        };
      }
    }

    const fallback = await this.buildFallbackCost(monthStart, now);
    return {
      ...fallback,
      configured: false,
      available: false,
      source: 'fallback' as const,
      error: 'Cost Explorer가 설정되지 않았습니다.',
    };
  }

  async getOpsSentry(): Promise<OpsSentryResponse> {
    if (this.sentryCache && this.sentryCache.expiresAt > Date.now()) {
      return this.sentryCache.data;
    }

    const apiKey = process.env.SENTRY_AUTH_TOKEN?.trim();
    const org = process.env.SENTRY_ORG?.trim();
    const project = process.env.SENTRY_PROJECT?.trim();

    if (!apiKey || !org || !project) {
      return {
        configured: false,
        available: false,
        error: 'Sentry가 설정되지 않았습니다.',
        totalCount: 0,
        issues: [],
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(
        `https://sentry.io/api/0/projects/${org}/${project}/issues/?query=is:unresolved&per_page=100`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
          },
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        return {
          configured: true,
          available: false,
          error: `Sentry API 요청에 실패했습니다. (${response.status})`,
          totalCount: 0,
          issues: [],
        };
      }

      const data = (await response.json()) as Array<{
        id: string;
        title: string;
        count: string;
        firstSeen: string;
        lastSeen: string;
        permalink: string;
      }>;

      const result = {
        configured: true,
        available: true,
        totalCount: data.length,
        issues: data.map((item) => ({
          id: item.id,
          title: item.title,
          count: Number(item.count),
          firstSeen: item.firstSeen,
          lastSeen: item.lastSeen,
          permalink: item.permalink,
        })),
      };

      this.sentryCache = {
        expiresAt: Date.now() + SENTRY_CACHE_TTL_MS,
        data: result,
      };

      return result;
    } catch (error) {
      return {
        configured: true,
        available: false,
        error:
          error instanceof Error && error.name === 'AbortError'
            ? 'Sentry API 요청 시간이 초과되었습니다.'
            : error instanceof Error
              ? error.message
              : 'Sentry API 요청에 실패했습니다.',
        totalCount: 0,
        issues: [],
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async countSentryIssues() {
    const issues = await this.getOpsSentry();
    return issues.totalCount;
  }

  private async getMonthlyCost(start: Date, end: Date) {
    const rows = await this.prisma.apiUsage.findMany({
      where: { timestamp: { gte: start, lte: end } },
      select: { cost: true },
    });
    return {
      total: rows.reduce((sum, row) => sum + row.cost, 0),
    };
  }
}
