import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

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

      <!-- 헤더 -->
      <tr>
        <td style="padding:28px 32px 24px;border-bottom:1px solid #e8ecef;">
          <span style="display:inline-flex;align-items:center;gap:8px;text-decoration:none;">
            <span style="display:inline-block;width:28px;height:28px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:8px;text-align:center;line-height:28px;vertical-align:middle;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;">
                <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </span>
            <span style="font-size:17px;font-weight:700;color:#1a1a1a;letter-spacing:-0.3px;">DatePlanner</span>
          </span>
        </td>
      </tr>

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
        'DatePlanner <jaylenyu96@gmail.com>',
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
        'DatePlanner <jaylenyu96@gmail.com>',
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
        'DatePlanner <jaylenyu96@gmail.com>',
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
        'DatePlanner <jaylenyu96@gmail.com>',
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
}
