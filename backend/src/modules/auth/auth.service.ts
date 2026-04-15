import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { SignOptions } from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RedisService } from '../../shared/redis/redis.service';
import { EmailVerificationService } from './email-verification.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const LOGIN_FAIL_TTL = 600; // 10분
const MAX_LOGIN_FAILS = 5;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
    private readonly redis: RedisService,
    private readonly emailVerification: EmailVerificationService,
  ) {}

  private async generateTokenPair(userId: string, email: string) {
    const access_token = this.jwtService.sign(
      { sub: userId, email },
      {
        expiresIn: (this.config.get<string>('JWT_EXPIRES_IN') ??
          '15m') as SignOptions['expiresIn'],
      },
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
    // 이메일 인증 통과 여부 확인 (통과 마커 소비)
    await this.emailVerification.assertVerified(dto.email);

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('이미 사용 중인 이메일입니다.');

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { email: dto.email, password: hashed, emailVerified: true },
    });

    return this.generateTokenPair(user.id, user.email);
  }

  async login(dto: LoginDto, _ip: string) {
    const lockKey = `login_lock:${dto.email}`;
    const failKey = `login_fail:${dto.email}`;

    // 잠금 체크
    const locked = await this.redis.get(lockKey);
    if (locked) {
      const remaining = await this.redis.ttl(lockKey);
      const minutes = Math.ceil(remaining / 60);
      throw new ForbiddenException(
        `일시적으로 로그인이 제한되었습니다. ${minutes}분 후 다시 시도해주세요.`,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      const fails = await this.redis.incr(failKey, LOGIN_FAIL_TTL);
      if (fails >= MAX_LOGIN_FAILS) {
        await this.redis.set(lockKey, '1', LOGIN_FAIL_TTL);
        throw new ForbiddenException(
          '로그인 시도 횟수가 초과되었습니다. 10분 후 다시 시도해주세요.',
        );
      }
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    // 성공: 실패 카운터 초기화
    await this.redis.del(failKey);
    await this.redis.del(lockKey);

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
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) return; // 이메일 존재 여부 노출 방지

    // OAuth-only 계정: 비밀번호 재설정 대신 안내 메일
    if (!user.password && (user.googleId || user.kakaoId || user.naverId)) {
      const providers: string[] = [];
      if (user.googleId) providers.push('Google');
      if (user.kakaoId) providers.push('Kakao');
      if (user.naverId) providers.push('Naver');
      await this.emailService.sendOauthAccountReminder(user.email, providers);
      return;
    }

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

    if (!matched)
      throw new BadRequestException('유효하지 않거나 만료된 링크입니다.');

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
