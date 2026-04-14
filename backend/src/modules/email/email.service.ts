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

  async sendVerificationCode(to: string, code: string) {
    await this.transporter.sendMail({
      from:
        this.config.get<string>('EMAIL_FROM') ??
        'DatePlanner <no-reply@dateplanner.com>',
      to,
      subject: '[DatePlanner] 이메일 인증코드',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>이메일 인증</h2>
          <p>아래 인증코드를 입력해주세요. 코드는 <strong>3분</strong> 동안 유효합니다.</p>
          <div style="font-size:36px;font-weight:bold;letter-spacing:8px;padding:24px;background:#f5f5f5;border-radius:8px;text-align:center;margin:24px 0;">
            ${code}
          </div>
          <p style="color:#999;font-size:12px;">본인이 요청하지 않은 경우 이 이메일을 무시하세요.</p>
        </div>
      `,
    });
  }

  async sendOauthAccountReminder(to: string, providers: string[]) {
    const providerList = providers.join(', ');
    await this.transporter.sendMail({
      from:
        this.config.get<string>('EMAIL_FROM') ??
        'DatePlanner <no-reply@dateplanner.com>',
      to,
      subject: '[DatePlanner] 로그인 방법 안내',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>로그인 방법 안내</h2>
          <p>이 이메일 주소는 <strong>${providerList}</strong> 소셜 계정으로 가입되어 있습니다.</p>
          <p>비밀번호 없이 ${providerList} 버튼으로 바로 로그인하실 수 있습니다.</p>
          <a href="${this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000'}/login"
             style="display:inline-block;padding:12px 24px;background:#111;color:#fff;text-decoration:none;border-radius:6px;">
            로그인 페이지로 이동
          </a>
          <p style="color:#999;font-size:12px;margin-top:24px;">본인이 요청하지 않은 경우 이 이메일을 무시하세요.</p>
        </div>
      `,
    });
  }

  async sendPasswordReset(to: string, token: string) {
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    await this.transporter.sendMail({
      from:
        this.config.get<string>('EMAIL_FROM') ??
        'DatePlanner <no-reply@dateplanner.com>',
      to,
      subject: '[DatePlanner] 비밀번호 재설정',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>비밀번호 재설정</h2>
          <p>아래 버튼을 클릭하여 비밀번호를 재설정하세요. 링크는 1시간 동안 유효합니다.</p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#111;color:#fff;text-decoration:none;border-radius:6px;">
            비밀번호 재설정
          </a>
          <p style="color:#999;font-size:12px;margin-top:24px;">본인이 요청하지 않은 경우 이 이메일을 무시하세요.</p>
        </div>
      `,
    });
  }
}
