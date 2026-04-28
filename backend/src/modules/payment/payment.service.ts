import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Subscription } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PaymentState,
  PreparePaymentResponse,
  SubscriptionState,
  SubscriptionStatusResponse,
} from './payment.types';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { EmailService } from '../email/email.service';

type TossConfirmResponse = {
  paymentKey: string;
  orderId: string;
  method?: string;
  totalAmount?: number;
  status?: string;
  approvedAt?: string;
  requestedAt?: string;
  raw?: unknown;
};

import { PLAN_CODE, resolveMonthlyAmount } from '../../config/billing.config';

const GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000;
const SUBSCRIPTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  private get monthlyAmount() {
    return resolveMonthlyAmount();
  }

  private get tossSecretKey() {
    return process.env.TOSS_SECRET_KEY?.trim() ?? '';
  }

  private get tossClientKey() {
    return process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY?.trim() ?? '';
  }

  private now() {
    return new Date();
  }

  private formatDate(date: Date | null | undefined) {
    return date ? date.toISOString() : null;
  }

  private async ensureSubscription(userId: string) {
    return this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        planCode: PLAN_CODE,
        status: 'inactive',
      },
      update: {},
    });
  }

  private async loadSubscription(userId: string) {
    return this.prisma.subscription.findUnique({
      where: { userId },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });
  }

  private async syncLifecycle(subscription: Subscription) {
    const now = this.now();
    let nextStatus = subscription.status as SubscriptionState;
    let nextGraceEndsAt = subscription.graceEndsAt;

    if (
      nextStatus === 'active' &&
      subscription.currentPeriodEnd &&
      subscription.currentPeriodEnd.getTime() <= now.getTime()
    ) {
      nextStatus = 'grace';
      nextGraceEndsAt =
        nextGraceEndsAt ?? new Date(now.getTime() + GRACE_PERIOD_MS);
    }

    if (
      nextStatus === 'grace' &&
      nextGraceEndsAt &&
      nextGraceEndsAt.getTime() <= now.getTime()
    ) {
      nextStatus = 'expired';
    }

    if (
      nextStatus !== subscription.status ||
      nextGraceEndsAt?.getTime() !== subscription.graceEndsAt?.getTime()
    ) {
      return this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: nextStatus,
          graceEndsAt: nextGraceEndsAt,
        },
      });
    }

    return subscription;
  }

  private mapSubscription(subscription: Subscription) {
    return {
      id: subscription.id,
      userId: subscription.userId,
      planCode: subscription.planCode,
      status: subscription.status as SubscriptionState,
      currentPeriodEnd: this.formatDate(subscription.currentPeriodEnd),
      graceEndsAt: this.formatDate(subscription.graceEndsAt),
      cancelledAt: this.formatDate(subscription.cancelledAt),
      createdAt: subscription.createdAt.toISOString(),
      updatedAt: subscription.updatedAt.toISOString(),
    };
  }

  private toStatusResponse(
    subscription: Subscription,
  ): SubscriptionStatusResponse {
    return {
      subscription: this.mapSubscription(subscription),
      hasAccess:
        subscription.status === 'active' || subscription.status === 'grace',
      monthlyAmount: this.monthlyAmount,
    };
  }

  private createOrderId(userId: string) {
    const safeId = userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'user';
    return `sub_${safeId}_${Date.now()}`;
  }

  private addSubscriptionWindow(base: Date) {
    return new Date(base.getTime() + SUBSCRIPTION_WINDOW_MS);
  }

  private async confirmWithToss(dto: ConfirmPaymentDto) {
    if (!this.tossSecretKey) {
      if (process.env.NODE_ENV === 'production') {
        throw new InternalServerErrorException(
          'TOSS_SECRET_KEY가 설정되지 않았습니다.',
        );
      }

      return {
        paymentKey: dto.paymentKey,
        orderId: dto.orderId,
        method: 'TOSSPAY',
        totalAmount: dto.amount,
        status: 'DONE',
        approvedAt: new Date().toISOString(),
        requestedAt: new Date().toISOString(),
      } satisfies TossConfirmResponse;
    }

    const response = await fetch(
      'https://api.tosspayments.com/v1/payments/confirm',
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.tossSecretKey}:`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentKey: dto.paymentKey,
          orderId: dto.orderId,
          amount: dto.amount,
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new BadRequestException(text || '토스 결제 승인에 실패했습니다.');
    }

    return (await response.json()) as TossConfirmResponse;
  }

  async prepare(userId: string): Promise<PreparePaymentResponse> {
    const subscription = await this.ensureSubscription(userId);
    const orderId = this.createOrderId(userId);
    const payment = await this.prisma.payment.create({
      data: {
        userId,
        subscriptionId: subscription.id,
        orderId,
        amount: this.monthlyAmount,
        method: 'TOSSPAY',
        status: 'READY',
      },
    });

    return {
      ...this.toStatusResponse(subscription),
      orderId,
      customerKey: userId,
      orderName: 'DatePlanner 커플 플랜',
      payment: {
        id: payment.id,
        amount: payment.amount,
        status: payment.status as PaymentState,
        method: payment.method,
      },
    };
  }

  async confirm(
    userId: string,
    dto: ConfirmPaymentDto,
  ): Promise<SubscriptionStatusResponse> {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId: dto.orderId },
      include: {
        subscription: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!payment || payment.subscription.userId !== userId) {
      throw new NotFoundException('결제 정보를 찾을 수 없습니다.');
    }

    if (payment.amount !== dto.amount) {
      throw new BadRequestException('결제 금액이 일치하지 않습니다.');
    }

    if (payment.status === 'DONE' && payment.paymentKey === dto.paymentKey) {
      const subscription = await this.loadSubscription(userId);
      if (!subscription) {
        throw new NotFoundException('구독 정보를 찾을 수 없습니다.');
      }
      return this.toStatusResponse(await this.syncLifecycle(subscription));
    }

    const confirmed = await this.confirmWithToss(dto);
    const nextStatus = 'active' as SubscriptionState;
    const baseDate =
      payment.subscription.currentPeriodEnd &&
      payment.subscription.currentPeriodEnd.getTime() > this.now().getTime()
        ? payment.subscription.currentPeriodEnd
        : this.now();
    const nextPeriodEnd = this.addSubscriptionWindow(baseDate);

    const [updatedPayment, updatedSubscription] =
      await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            paymentKey: confirmed.paymentKey,
            userId,
            method: confirmed.method ?? payment.method,
            status: 'DONE',
            confirmedAt: confirmed.approvedAt
              ? new Date(confirmed.approvedAt)
              : this.now(),
            rawResponse: confirmed as unknown as Prisma.JsonObject,
            failReason: null,
          },
        }),
        this.prisma.subscription.update({
          where: { id: payment.subscriptionId },
          data: {
            status: nextStatus,
            planCode: PLAN_CODE,
            currentPeriodEnd: nextPeriodEnd,
            graceEndsAt: null,
            cancelledAt: null,
          },
        }),
      ]);

    this.logger.log(
      `결제 승인 완료: ${updatedPayment.orderId} (${updatedPayment.amount})`,
    );

    void this.emailService
      .sendPaymentReceipt({
        to: payment.user.email,
        orderId: updatedPayment.orderId,
        paymentKey: updatedPayment.paymentKey,
        amount: updatedPayment.amount,
        method: updatedPayment.method,
        paidAt: updatedPayment.confirmedAt ?? this.now(),
        currentPeriodEnd: updatedSubscription.currentPeriodEnd,
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : 'unknown email error';
        this.logger.warn(
          `영수증 메일 발송 실패: ${updatedPayment.orderId} (${message})`,
        );
      });

    return this.toStatusResponse(updatedSubscription);
  }

  async handleWebhook(body: Record<string, unknown>) {
    const directOrderId =
      typeof body.orderId === 'string' ? body.orderId : null;
    const nestedOrderId =
      typeof body.data === 'object' &&
      body.data !== null &&
      'orderId' in body.data
        ? typeof (body.data as Record<string, unknown>).orderId === 'string'
          ? ((body.data as Record<string, unknown>).orderId as string)
          : null
        : null;
    const orderId = directOrderId ?? nestedOrderId;

    if (!orderId) {
      return { received: true };
    }

    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
      include: { subscription: true },
    });

    if (!payment) {
      return { received: true };
    }

    const status =
      typeof body.status === 'string'
        ? body.status
        : typeof body.eventType === 'string'
          ? body.eventType
          : '';
    if (status.toLowerCase().includes('cancel')) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'CANCELED',
          failReason: 'Webhook cancel',
        },
      });
      return { received: true };
    }

    if (status.toLowerCase().includes('fail')) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          failReason: 'Webhook failure',
        },
      });
      return { received: true };
    }

    return { received: true };
  }

  async getStatus(userId: string): Promise<SubscriptionStatusResponse> {
    const subscription = await this.ensureSubscription(userId);
    const synced = await this.syncLifecycle(subscription);
    return this.toStatusResponse(synced);
  }

  getClientKey() {
    return this.tossClientKey;
  }

  async cancelByUser(userId: string): Promise<void> {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { userId },
      });

      if (!subscription) return;
      if (subscription.status !== 'active' && subscription.status !== 'grace') {
        return;
      }

      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          cancelledAt: new Date(),
        },
      });

      this.logger.log(
        `Subscription cancelled for user ${userId} (account deletion)`,
      );
    } catch (e) {
      this.logger.warn(`cancelByUser failed for user ${userId}:`, e);
    }
  }
}
