import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

type PaymentReceiptInput = {
  to: string;
  orderId: string;
  paymentKey?: string | null;
  amount: number;
  method: string;
  paidAt: Date;
  currentPeriodEnd?: Date | null;
};

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get<string>('EMAIL_HOST'),
      port: config.get<number>('EMAIL_PORT') ?? 587,
      secure: false,
      auth: {
        user: config.get<string>('EMAIL_USER'),
        pass: config.get<string>('EMAIL_PASS'),
      },
    });
  }

  private buildHtml(body: string): string {
    return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:32px 0;">
  <tr><td align="center">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;">

      <!-- 본문 -->
      <tr>
        <td style="padding:32px 32px 28px;">
          ${body}
          <p style="margin:28px 0 0;font-size:13px;color:#999;line-height:1.6;">
            이 메일을 중요 메일로 설정해주세요.<br>
            그래야 DatePlanner가 보내는 이메일이 스팸으로 처리되지 않아요.<br>
            요청하지 않은 경우 이 메일을 무시하셔도 됩니다.
          </p>
        </td>
      </tr>

      <!-- 푸터 -->
      <tr>
        <td style="border-top:1px solid #e8ecef;padding:24px 32px;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#1a1a1a;">(주)데이트플래너</p>
          <p style="margin:0;font-size:12px;color:#888;line-height:1.8;">
            서비스 문의: <a href="mailto:jaylenyu96@gmail.com" style="color:#888;">jaylenyu96@gmail.com</a>
          </p>
          <p style="margin:12px 0 0;font-size:11px;color:#aaa;">
            ※ 본 이메일은 발신 전용입니다. 이 메일에 회신하실 수 없습니다.
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
  }

  async sendVerificationCode(to: string, code: string) {
    await this.transporter.sendMail({
      from:
        this.config.get<string>('EMAIL_FROM') ??
        'DatePlanner <no-reply@date-planner.us>',
      to,
      subject: '[DatePlanner] 이메일 인증 안내',
      html: this.buildHtml(`
        <h1 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#1a1a1a;">[DatePlanner] 이메일 인증 안내</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#3d3d3d;line-height:1.6;">
          DatePlanner 회원 가입을 위한 인증번호는 <strong>${code}</strong> 에요.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:#ffffff;border:1px solid #e8ecef;border-radius:10px;padding:24px;text-align:center;">
              <span style="display:block;font-size:13px;color:#888;margin-bottom:10px;">인증번호</span>
              <span style="display:block;font-size:30px;font-weight:700;color:#1a1a1a;letter-spacing:6px;">${code}</span>
            </td>
          </tr>
        </table>
        <p style="margin:20px 0 0;font-size:13px;color:#888;">인증번호는 <strong>3분</strong> 동안 유효합니다.</p>
      `),
    });
  }

  async sendOauthAccountReminder(to: string, providers: string[]) {
    const providerList = providers.join(', ');
    const loginUrl = `${this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000'}/login`;
    await this.transporter.sendMail({
      from:
        this.config.get<string>('EMAIL_FROM') ??
        'DatePlanner <no-reply@date-planner.us>',
      to,
      subject: '[DatePlanner] 로그인 방법 안내',
      html: this.buildHtml(`
        <h1 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#1a1a1a;">[DatePlanner] 로그인 방법 안내</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#3d3d3d;line-height:1.6;">
          이 이메일 주소는 <strong>${providerList}</strong> 소셜 계정으로 가입되어 있어요.<br>
          비밀번호 없이 소셜 로그인 버튼으로 바로 로그인할 수 있어요.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:#ffffff;border:1px solid #e8ecef;border-radius:10px;padding:24px;text-align:center;">
              <span style="display:block;font-size:13px;color:#888;margin-bottom:16px;">아래 버튼으로 로그인하세요</span>
              <a href="${loginUrl}" style="display:inline-block;padding:12px 32px;background:#5c67f2;color:#fff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">
                로그인 페이지로 이동
              </a>
            </td>
          </tr>
        </table>
      `),
    });
  }

  async sendPasswordReset(to: string, token: string) {
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    await this.transporter.sendMail({
      from:
        this.config.get<string>('EMAIL_FROM') ??
        'DatePlanner <no-reply@date-planner.us>',
      to,
      subject: '[DatePlanner] 비밀번호 재설정 안내',
      html: this.buildHtml(`
        <h1 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#1a1a1a;">[DatePlanner] 비밀번호 재설정 안내</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#3d3d3d;line-height:1.6;">
          비밀번호 재설정을 요청하셨어요.<br>
          아래 버튼을 눌러 새 비밀번호를 설정해주세요.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:#ffffff;border:1px solid #e8ecef;border-radius:10px;padding:24px;text-align:center;">
              <span style="display:block;font-size:13px;color:#888;margin-bottom:16px;">링크는 <strong>1시간</strong> 동안 유효합니다</span>
              <a href="${resetUrl}" style="display:inline-block;padding:12px 32px;background:#5c67f2;color:#fff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">
                비밀번호 재설정
              </a>
            </td>
          </tr>
        </table>
      `),
    });
  }

  async sendWorkspaceInvite(
    to: string,
    workspaceName: string,
    inviteUrl: string,
  ) {
    await this.transporter.sendMail({
      from:
        this.config.get<string>('EMAIL_FROM') ??
        'DatePlanner <no-reply@date-planner.us>',
      to,
      subject: '[DatePlanner] 커플 워크스페이스 초대',
      html: this.buildHtml(`
        <h1 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#1a1a1a;">[DatePlanner] 커플 워크스페이스 초대</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#3d3d3d;line-height:1.6;">
          <strong>${workspaceName}</strong> 워크스페이스에 초대되었어요.<br>
          수락하면 공유 일정과 메모 기능을 함께 사용할 수 있어요.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:#ffffff;border:1px solid #e8ecef;border-radius:10px;padding:24px;text-align:center;">
              <span style="display:block;font-size:13px;color:#888;margin-bottom:16px;">초대 링크는 <strong>7일</strong> 동안 유효합니다</span>
              <a href="${inviteUrl}" style="display:inline-block;padding:12px 32px;background:#5c67f2;color:#fff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">
                초대 수락하기
              </a>
            </td>
          </tr>
        </table>
      `),
    });
  }

  async sendPaymentReceipt(input: PaymentReceiptInput) {
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const supportEmail =
      this.config.get<string>('SUPPORT_EMAIL') ?? 'jaylenyu96@gmail.com';
    const formatDate = (value: Date) =>
      new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(value);
    const formatDateTime = (value: Date) =>
      new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(value);
    const formatAmount = (value: number) =>
      new Intl.NumberFormat('ko-KR').format(value);

    const methodLabelMap: Record<string, string> = {
      CARD: 'Card',
      TRANSFER: 'Toss Bank Transfer',
      MOBILE_PHONE: 'Mobile Phone',
      TOSSPAY: 'Toss Pay',
      KAKAOPAY: 'KakaoPay',
      NAVERPAY: 'NaverPay',
    };

    const methodLabel = methodLabelMap[input.method] ?? input.method;
    const paidDate = formatDate(input.paidAt);
    const paidAtText = formatDateTime(input.paidAt);
    const renewalText = input.currentPeriodEnd
      ? formatDate(input.currentPeriodEnd)
      : null;

    await this.transporter.sendMail({
      from:
        this.config.get<string>('EMAIL_FROM') ??
        'DatePlanner <no-reply@date-planner.us>',
      to: input.to,
      subject: '[DatePlanner] Receipt',
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#ffffff;color:#1d1d1f;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;">
          <tr>
            <td style="padding:0 0 24px;">
              <div style="font-size:28px;font-weight:700;letter-spacing:-0.02em;">DatePlanner</div>
              <div style="font-size:24px;font-weight:600;letter-spacing:-0.02em;margin-top:4px;">Receipt</div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 24px;font-size:16px;line-height:1.7;">
              <div>${paidDate}</div>
              <div>Order ID: ${input.orderId}</div>
              ${input.paymentKey ? `<div>Document: ${input.paymentKey}</div>` : ''}
              <div>DatePlanner Account: ${input.to}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 0;border-top:1px solid #e5e5e7;border-bottom:1px solid #e5e5e7;">
              <div style="font-size:18px;font-weight:600;">DatePlanner</div>
              <div style="font-size:16px;line-height:1.7;margin-top:8px;">
                Couple Plan (Monthly)<br />
                ${renewalText ? `Renews ${renewalText}<br />` : ''}
                Paid at ${paidAtText}
              </div>
              <div style="font-size:20px;font-weight:600;margin-top:12px;">₩${formatAmount(input.amount)}</div>
              <div style="font-size:14px;color:#6e6e73;margin-top:4px;">VAT included</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 0;">
              <div style="font-size:18px;font-weight:600;margin-bottom:12px;">Billing and Payment</div>
              <div style="font-size:16px;line-height:1.8;">
                ${input.to}<br />
                ${methodLabel}<br />
                ₩${formatAmount(input.amount)}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 24px;font-size:14px;color:#6e6e73;line-height:1.8;">
              If you have any questions about your bill, contact
              <a href="mailto:${supportEmail}" style="color:#06c;text-decoration:none;">${supportEmail}</a>.<br />
              This email confirms payment for your DatePlanner subscription. Your subscription renews automatically until you cancel.
            </td>
          </tr>
          <tr>
            <td style="padding:16px 0 0;border-top:1px solid #e5e5e7;font-size:13px;color:#6e6e73;line-height:1.8;">
              <a href="${frontendUrl}/subscribe" style="color:#06c;text-decoration:none;">Manage Subscription</a><br />
              <a href="mailto:${supportEmail}" style="color:#06c;text-decoration:none;">Visit Support</a><br />
              DatePlanner
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    });
  }
}
