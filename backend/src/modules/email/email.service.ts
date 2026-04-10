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

  async sendPasswordReset(to: string, token: string) {
    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    await this.transporter.sendMail({
      from: this.config.get<string>('EMAIL_FROM') ?? 'Dayplan <no-reply@dayplan.com>',
      to,
      subject: '[Dayplan] 비밀번호 재설정',
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
