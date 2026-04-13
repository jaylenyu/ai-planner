import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  private async generateTokenPair(userId: string, email: string) {
    const access_token = this.jwtService.sign(
      { sub: userId, email },
      { expiresIn: (this.config.get<string>('JWT_EXPIRES_IN') ?? '15m') as any },
    );

    const rawRefresh = crypto.randomBytes(40).toString('hex');
    const hashedRefresh = await bcrypt.hash(rawRefresh, 10);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.refreshToken.create({
      data: { token: hashedRefresh, userId, expiresAt },
    });

    return { access_token, refresh_token: rawRefresh };
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('이미 사용 중인 이메일입니다.');

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { email: dto.email, password: hashed },
    });

    return this.generateTokenPair(user.id, user.email);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.password) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');

    return this.generateTokenPair(user.id, user.email);
  }

  async oauthLogin(user: { id: string; email: string }) {
    return this.generateTokenPair(user.id, user.email);
  }

  async refreshTokens(rawToken: string) {
    const tokens = await this.prisma.refreshToken.findMany({
      where: { expiresAt: { gt: new Date() } },
      include: { user: true },
    });

    for (const stored of tokens) {
      const match = await bcrypt.compare(rawToken, stored.token);
      if (match) {
        await this.prisma.refreshToken.delete({ where: { id: stored.id } });
        return this.generateTokenPair(stored.user.id, stored.user.email);
      }
    }

    throw new UnauthorizedException('유효하지 않거나 만료된 토큰입니다.');
  }

  async logout(rawToken: string) {
    const tokens = await this.prisma.refreshToken.findMany();

    for (const stored of tokens) {
      const match = await bcrypt.compare(rawToken, stored.token);
      if (match) {
        await this.prisma.refreshToken.delete({ where: { id: stored.id } });
        return;
      }
    }
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) return; // 이메일 존재 여부 노출 방지

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(rawToken, 10);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await this.prisma.passwordResetToken.create({
      data: { token: hashedToken, userId: user.id, expiresAt },
    });

    await this.emailService.sendPasswordReset(user.email, rawToken);
  }

  async resetPassword(dto: ResetPasswordDto) {
    const activeTokens = await this.prisma.passwordResetToken.findMany({
      where: { used: false, expiresAt: { gt: new Date() } },
    });

    let matched: (typeof activeTokens)[0] | null = null;
    for (const stored of activeTokens) {
      const match = await bcrypt.compare(dto.token, stored.token);
      if (match) {
        matched = stored;
        break;
      }
    }

    if (!matched) throw new BadRequestException('유효하지 않거나 만료된 링크입니다.');

    const hashed = await bcrypt.hash(dto.password, 10);
    await this.prisma.user.update({
      where: { id: matched.userId },
      data: { password: hashed },
    });

    await this.prisma.passwordResetToken.update({
      where: { id: matched.id },
      data: { used: true },
    });
  }
}
