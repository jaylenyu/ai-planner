import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  HttpException,
  HttpStatus,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { SignOptions } from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as jose from 'jsonwebtoken';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RedisService } from '../../shared/redis/redis.service';
import { EmailVerificationService } from './email-verification.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PaymentService } from '../payment/payment.service';
import { CompleteOAuthSignupDto } from './dto/complete-oauth-signup.dto';
import { UpdateEmailDto } from './dto/update-email.dto';
import { OAuthAccountService } from './oauth-account.service';

const LOGIN_FAIL_TTL = 600; // 10분
const MAX_LOGIN_FAILS = 5;
const CODE_TTL = 300; // 5분 (password_setup)
const RESEND_COOLDOWN = 60; // 1분
const MAX_ATTEMPTS = 5;
const ATTEMPT_TTL = 600;

type LoginOptions = {
  namespace?: 'user' | 'admin';
  requireAdmin?: boolean;
};

export type OAuthProvider = 'google' | 'kakao' | 'naver';

type TokenUser = {
  id: string;
  email: string | null;
  nickname: string;
  role: 'USER' | 'ADMIN';
  adminReadOnly: boolean;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
    private readonly redis: RedisService,
    private readonly emailVerification: EmailVerificationService,
    private readonly oauthAccountService: OAuthAccountService,
    @Inject(forwardRef(() => PaymentService))
    private readonly paymentService: PaymentService,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────────

  private isAccountAccessible(user: {
    isSuspended: boolean;
    deletedAt: Date | null;
  }): boolean {
    return !user.isSuspended && !user.deletedAt;
  }

  private async generateTokenPair(
    userId: string,
    email: string | null,
    nickname: string,
    role: 'USER' | 'ADMIN',
    adminReadOnly = false,
  ) {
    const payload: Record<string, unknown> = {
      sub: userId,
      nickname,
      role,
      adminReadOnly,
    };
    if (email) payload.email = email;

    const access_token = this.jwtService.sign(payload, {
      expiresIn: (this.config.get<string>('JWT_EXPIRES_IN') ??
        '15m') as SignOptions['expiresIn'],
    });

    const rawRefresh = crypto.randomBytes(40).toString('hex');
    const hashedRefresh = await bcrypt.hash(rawRefresh, 10);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.refreshToken.create({
      data: { token: hashedRefresh, userId, expiresAt },
    });

    return { access_token, refresh_token: rawRefresh };
  }

  private normalizeNickname(raw: string): string {
    return raw.replace(/\s+/g, ' ').trim();
  }

  private assertNickname(raw: string): string {
    const nickname = this.normalizeNickname(raw);
    if (nickname.length < 2 || nickname.length > 20) {
      throw new BadRequestException(
        '닉네임은 2자 이상 20자 이하로 입력해주세요.',
      );
    }
    const ALLOWED =
      /^[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9]([가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9 _-]*[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9])?$/;
    if (!ALLOWED.test(nickname)) {
      throw new BadRequestException(
        '닉네임은 한글, 영문, 숫자, 공백, 밑줄(_), 하이픈(-)만 사용할 수 있으며, 첫 글자와 마지막 글자는 한글·영문·숫자여야 합니다.',
      );
    }
    const HAS_LETTER = /[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z]/;
    if (!HAS_LETTER.test(nickname)) {
      throw new BadRequestException(
        '닉네임에는 한글 또는 영문이 하나 이상 포함되어야 합니다.',
      );
    }
    return nickname;
  }

  private tokensForUser(user: TokenUser) {
    return this.generateTokenPair(
      user.id,
      user.email,
      user.nickname,
      user.role,
      user.adminReadOnly,
    );
  }

  private getJwtSecret(): string {
    const secret = this.config.get<string>('JWT_SECRET')?.trim();
    if (!secret) throw new Error('JWT_SECRET is required');
    return secret;
  }

  // ── Register / Login ──────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const nickname = this.assertNickname(dto.nickname);
    await this.emailVerification.assertVerified(email);

    const existing = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existing) throw new ConflictException('이미 사용 중인 이메일입니다.');

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        nickname,
        password: hashed,
        emailVerified: true,
        lastLoginAt: new Date(),
      },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    return this.tokensForUser(user);
  }

  async checkEmailAvailability(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return {
        available: false,
        message: '이미 사용 중인 이메일입니다.',
      };
    }

    return {
      available: true,
      message: '사용 가능한 이메일입니다.',
    };
  }

  async assertEmailAvailable(email: string) {
    const result = await this.checkEmailAvailability(email);
    if (!result.available) {
      throw new ConflictException(result.message);
    }
  }

  private getLoginKeys(email: string, _namespace: 'user' | 'admin') {
    return {
      lockKey: `login_lock:${email}`,
      failKey: `login_fail:${email}`,
    };
  }

  private async loginInternal(
    dto: LoginDto,
    _ip: string,
    options: LoginOptions = {},
  ) {
    const namespace = options.namespace ?? 'user';
    const email = dto.email.trim().toLowerCase();
    const { lockKey, failKey } = this.getLoginKeys(email, namespace);

    const locked = await this.redis.get(lockKey);
    if (locked) {
      const remaining = await this.redis.ttl(lockKey);
      const minutes = Math.ceil(remaining / 60);
      throw new ForbiddenException(
        `일시적으로 로그인이 제한되었습니다. ${minutes}분 후 다시 시도해주세요.`,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
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

    if (!this.isAccountAccessible(user)) {
      throw new ForbiddenException('정지되었거나 탈퇴한 계정입니다.');
    }

    if (options.requireAdmin && user.role !== 'ADMIN') {
      const fails = await this.redis.incr(failKey, LOGIN_FAIL_TTL);
      if (fails >= MAX_LOGIN_FAILS) {
        await this.redis.set(lockKey, '1', LOGIN_FAIL_TTL);
      }
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    await this.redis.del(failKey);
    await this.redis.del(lockKey);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.tokensForUser(user);
  }

  async login(dto: LoginDto, ip: string) {
    return this.loginInternal(dto, ip, { namespace: 'user' });
  }

  async adminLogin(dto: LoginDto, ip: string) {
    return this.loginInternal(dto, ip, {
      namespace: 'admin',
      requireAdmin: true,
    });
  }

  async oauthLogin(user: {
    id: string;
    email: string | null;
    nickname?: string;
    role: 'USER' | 'ADMIN';
    isSuspended?: boolean;
    deletedAt?: Date | null;
    adminReadOnly?: boolean;
  }) {
    if (
      !this.isAccountAccessible({
        isSuspended: user.isSuspended ?? false,
        deletedAt: user.deletedAt ?? null,
      })
    ) {
      throw new ForbiddenException('정지되었거나 탈퇴한 계정입니다.');
    }
    return this.tokensForUser({
      id: user.id,
      email: user.email,
      nickname: user.nickname ?? '사용자',
      role: user.role,
      adminReadOnly: user.adminReadOnly ?? false,
    });
  }

  async refreshTokens(rawToken: string) {
    const tokens = await this.prisma.refreshToken.findMany({
      where: { expiresAt: { gt: new Date() } },
      include: { user: true },
    });

    for (const stored of tokens) {
      const match = await bcrypt.compare(rawToken, stored.token);
      if (match) {
        if (!this.isAccountAccessible(stored.user)) {
          throw new ForbiddenException('정지되었거나 탈퇴한 계정입니다.');
        }
        await this.prisma.refreshToken.delete({ where: { id: stored.id } });
        return this.tokensForUser({
          id: stored.user.id,
          email: stored.user.email,
          nickname: stored.user.nickname,
          role: stored.user.role as 'USER' | 'ADMIN',
          adminReadOnly: stored.user.adminReadOnly,
        });
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
    if (!user) return;
    if (!user.email) return;

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

    const resetToken = await this.prisma.passwordResetToken.create({
      data: { token: hashedToken, userId: user.id, expiresAt },
    });

    try {
      await this.emailService.sendPasswordReset(user.email, rawToken);
    } catch (error) {
      await this.prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      });
      throw error;
    }
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

  // ── GET /auth/me ──────────────────────────────────────────────────

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nickname: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
        password: true,
        googleId: true,
        kakaoId: true,
        naverId: true,
        emailVerified: true,
        inAppNotificationsEnabled: true,
        emailNotificationsEnabled: true,
      },
    });

    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      role: user.role,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      hasPassword: user.password != null,
      emailVerified: user.emailVerified,
      providers: {
        google: user.googleId != null,
        kakao: user.kakaoId != null,
        naver: user.naverId != null,
      },
      inAppNotificationsEnabled: user.inAppNotificationsEnabled,
      emailNotificationsEnabled: user.emailNotificationsEnabled,
    };
  }

  // ── PATCH /auth/password ──────────────────────────────────────────

  async changePassword(
    userId: string,
    dto: {
      currentPassword?: string;
      newPassword: string;
      verifyToken?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    if (user.password) {
      // Has existing password — validate currentPassword
      if (!dto.currentPassword) {
        throw new BadRequestException('현재 비밀번호를 입력해주세요.');
      }
      const valid = await bcrypt.compare(dto.currentPassword, user.password);
      if (!valid) {
        throw new UnauthorizedException('현재 비밀번호가 올바르지 않습니다.');
      }
    } else {
      // OAuth-only — validate verifyToken
      if (!dto.verifyToken) {
        throw new BadRequestException('인증 토큰이 필요합니다.');
      }
      this.verifyPasswordSetupToken(dto.verifyToken, userId);
    }

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    // Invalidate all refresh tokens
    await this.prisma.refreshToken.deleteMany({ where: { userId } });

    // Issue new token pair
    return this.tokensForUser(user);
  }

  // ── POST /auth/password/setup-request ────────────────────────────

  async requestPasswordSetup(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, password: true },
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    if (user.password) {
      throw new BadRequestException('이미 비밀번호가 설정된 계정입니다.');
    }
    if (!user.email) {
      throw new BadRequestException(
        '비밀번호 설정을 위해 먼저 이메일을 등록해주세요.',
      );
    }

    const normalized = user.email.trim().toLowerCase();

    if (!(await this.redis.getNativeClient())) {
      throw new BadRequestException(
        '인증코드 저장소가 구성되지 않아 인증을 진행할 수 없습니다.',
      );
    }

    const resendKey = `password_setup:resend:${normalized}`;
    const onCooldown = await this.redis.get(resendKey);
    if (onCooldown) {
      const remaining = await this.redis.ttl(resendKey);
      throw new HttpException(
        `인증코드 재전송은 ${remaining}초 후에 가능합니다.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = crypto.randomInt(100000, 1000000).toString();
    const codeKey = `password_setup:code:${normalized}`;
    const attemptsKey = `password_setup:attempts:${normalized}`;

    await this.redis.set(codeKey, code, CODE_TTL);
    await this.redis.del(attemptsKey);
    await this.redis.set(resendKey, '1', RESEND_COOLDOWN);
    try {
      await this.emailService.sendVerificationCode(user.email, code);
    } catch (error) {
      await this.redis.del(codeKey);
      await this.redis.del(attemptsKey);
      await this.redis.del(resendKey);
      throw error;
    }

    return { message: '인증코드를 전송했습니다.' };
  }

  // ── POST /auth/password/setup-verify ─────────────────────────────

  async verifyPasswordSetup(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, password: true },
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    if (user.password) {
      throw new BadRequestException('이미 비밀번호가 설정된 계정입니다.');
    }
    if (!user.email) {
      throw new BadRequestException(
        '비밀번호 설정을 위해 먼저 이메일을 등록해주세요.',
      );
    }

    const normalized = user.email.trim().toLowerCase();

    if (!(await this.redis.getNativeClient())) {
      throw new BadRequestException(
        '인증코드 저장소가 구성되지 않아 인증을 진행할 수 없습니다.',
      );
    }

    const codeKey = `password_setup:code:${normalized}`;
    const attemptsKey = `password_setup:attempts:${normalized}`;

    const attemptsStr = await this.redis.get(attemptsKey);
    const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;
    if (attempts >= MAX_ATTEMPTS) {
      throw new BadRequestException(
        '인증 시도 횟수가 초과되었습니다. 인증코드를 다시 요청해주세요.',
      );
    }

    const stored = await this.redis.get(codeKey);
    if (!stored) {
      throw new BadRequestException(
        '인증코드가 만료되었습니다. 다시 요청해주세요.',
      );
    }

    await this.redis.incr(attemptsKey, ATTEMPT_TTL);

    if (stored !== code) {
      const newAttempts = attempts + 1;
      const remaining = MAX_ATTEMPTS - newAttempts;
      throw new BadRequestException(
        remaining > 0
          ? `인증코드가 올바르지 않습니다. (${remaining}회 남음)`
          : '인증 시도 횟수가 초과되었습니다. 인증코드를 다시 요청해주세요.',
      );
    }

    await this.redis.del(codeKey);
    await this.redis.del(attemptsKey);

    // Issue verifyToken JWT (5min)
    const secret = this.getJwtSecret();
    const verifyToken = this.jwtService.sign(
      { sub: userId, purpose: 'password_setup' },
      { secret, expiresIn: '5m' },
    );

    return { verifyToken };
  }

  private verifyPasswordSetupToken(token: string, userId: string): void {
    try {
      const secret = this.getJwtSecret();
      const payload = jose.verify(token, secret) as {
        sub: string;
        purpose: string;
      };
      if (payload.purpose !== 'password_setup') {
        throw new BadRequestException('유효하지 않은 인증 토큰입니다.');
      }
      if (payload.sub !== userId) {
        throw new UnauthorizedException('인증 토큰이 일치하지 않습니다.');
      }
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof UnauthorizedException
      ) {
        throw err;
      }
      throw new BadRequestException(
        '인증 토큰이 만료되었거나 유효하지 않습니다.',
      );
    }
  }

  // ── PATCH /auth/settings ──────────────────────────────────────────

  async updateSettings(
    userId: string,
    dto: {
      inAppNotificationsEnabled?: boolean;
      emailNotificationsEnabled?: boolean;
    },
  ) {
    if (
      dto.inAppNotificationsEnabled === undefined &&
      dto.emailNotificationsEnabled === undefined
    ) {
      throw new BadRequestException('변경할 설정이 없습니다.');
    }

    const data: Record<string, boolean> = {};
    if (dto.inAppNotificationsEnabled !== undefined)
      data['inAppNotificationsEnabled'] = dto.inAppNotificationsEnabled;
    if (dto.emailNotificationsEnabled !== undefined)
      data['emailNotificationsEnabled'] = dto.emailNotificationsEnabled;

    await this.prisma.user.update({ where: { id: userId }, data });
    return { updated: true };
  }

  // ── PATCH /auth/nickname ──────────────────────────────────────────

  async updateNickname(userId: string, rawNickname: string) {
    const nickname = this.assertNickname(rawNickname);
    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true },
    });
    if (current?.nickname === nickname) {
      throw new BadRequestException('현재 닉네임과 동일합니다.');
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { nickname },
      select: {
        id: true,
        email: true,
        nickname: true,
        role: true,
        adminReadOnly: true,
      },
    });
    return this.generateTokenPair(
      user.id,
      user.email,
      user.nickname,
      user.role,
      user.adminReadOnly,
    );
  }

  // ── POST /auth/oauth/:provider/link-token ─────────────────────────

  createOAuthLinkToken(userId: string, provider: OAuthProvider): string {
    const secret = this.getLinkTokenSecret();
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 300; // 5 min
    const payload = JSON.stringify({
      sub: userId,
      intent: 'link',
      provider,
      iat,
      exp,
    });
    const sig = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    return Buffer.from(JSON.stringify({ payload, sig })).toString('base64');
  }

  verifyOAuthLinkToken(
    token: string,
    provider: OAuthProvider,
  ): { userId: string } | null {
    try {
      const secret = this.getLinkTokenSecret();
      const { payload, sig } = JSON.parse(
        Buffer.from(token, 'base64').toString('utf8'),
      ) as { payload: string; sig: string };
      const expected = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      if (expected !== sig) return null;
      const data = JSON.parse(payload) as {
        sub: string;
        intent: string;
        provider: string;
        iat: number;
        exp: number;
      };
      if (
        data.intent !== 'link' ||
        data.provider !== provider ||
        data.exp < Math.floor(Date.now() / 1000)
      ) {
        return null;
      }
      return { userId: data.sub };
    } catch {
      return null;
    }
  }

  createOAuthSignupToken(input: {
    provider: OAuthProvider;
    providerId: string;
    providerEmail: string | null;
  }): string {
    const secret = this.getLinkTokenSecret();
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 600;
    const payload = JSON.stringify({
      intent: 'oauth_signup',
      provider: input.provider,
      providerId: input.providerId,
      providerEmail: input.providerEmail,
      iat,
      exp,
    });
    const sig = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    return Buffer.from(JSON.stringify({ payload, sig })).toString('base64url');
  }

  private verifyOAuthSignupToken(token: string): {
    provider: OAuthProvider;
    providerId: string;
    providerEmail: string | null;
  } | null {
    try {
      const secret = this.getLinkTokenSecret();
      const { payload, sig } = JSON.parse(
        Buffer.from(token, 'base64url').toString('utf8'),
      ) as { payload: string; sig: string };
      const expected = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      if (expected !== sig) return null;
      const data = JSON.parse(payload) as {
        intent: string;
        provider: OAuthProvider;
        providerId: string;
        providerEmail?: string | null;
        exp: number;
      };
      if (
        data.intent !== 'oauth_signup' ||
        !(['google', 'kakao', 'naver'] as const).includes(data.provider) ||
        !data.providerId ||
        data.exp < Math.floor(Date.now() / 1000)
      ) {
        return null;
      }
      return {
        provider: data.provider,
        providerId: data.providerId,
        providerEmail: data.providerEmail ?? null,
      };
    } catch {
      return null;
    }
  }

  async completeOAuthSignup(dto: CompleteOAuthSignupDto) {
    const payload = this.verifyOAuthSignupToken(dto.token);
    if (!payload) {
      throw new BadRequestException('OAuth 가입 세션이 만료되었습니다.');
    }

    const user = await this.oauthAccountService.completeSignup({
      provider: payload.provider,
      providerId: payload.providerId,
      providerEmail: payload.providerEmail,
      nickname: this.assertNickname(dto.nickname),
    });

    if (!this.isAccountAccessible(user)) {
      throw new ForbiddenException('정지되었거나 탈퇴한 계정입니다.');
    }

    return this.tokensForUser(user);
  }

  async updateEmail(userId: string, dto: UpdateEmailDto) {
    const email = dto.email.trim().toLowerCase();
    await this.emailVerification.assertVerified(email);

    const existing = await this.prisma.user.findFirst({
      where: { email, id: { not: userId } },
    });
    if (existing) {
      throw new ConflictException('이미 사용 중인 이메일입니다.');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { email, emailVerified: true },
    });

    return this.tokensForUser(user);
  }

  private getLinkTokenSecret(): string {
    return (
      this.config.get<string>('LINK_TOKEN_SECRET')?.trim() ||
      this.getJwtSecret()
    );
  }

  // ── DELETE /auth/oauth/:provider ─────────────────────────────────

  async unlinkOAuth(userId: string, provider: OAuthProvider) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const fieldMap: Record<OAuthProvider, 'googleId' | 'kakaoId' | 'naverId'> =
      {
        google: 'googleId',
        kakao: 'kakaoId',
        naver: 'naverId',
      };

    // Remaining providers after removal
    const others: OAuthProvider[] = (
      ['google', 'kakao', 'naver'] as const
    ).filter((p) => p !== provider && user[fieldMap[p]] != null);

    if (!user.password && others.length === 0) {
      throw new ConflictException('LAST_LOGIN_METHOD');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { [fieldMap[provider]]: null },
    });

    return { unlinked: true };
  }

  // ── POST /auth/logout-all ─────────────────────────────────────────

  async logoutAll(userId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    return { loggedOut: true };
  }

  // ── DELETE /auth/me ───────────────────────────────────────────────

  async deleteMe(
    userId: string,
    dto: { password?: string; verifyToken?: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    if (user.password) {
      if (!dto.password) {
        throw new BadRequestException('비밀번호를 입력해주세요.');
      }
      const valid = await bcrypt.compare(dto.password, user.password);
      if (!valid) {
        throw new UnauthorizedException('비밀번호가 올바르지 않습니다.');
      }
    } else {
      if (!dto.verifyToken) {
        throw new BadRequestException('인증 토큰이 필요합니다.');
      }
      this.verifyPasswordSetupToken(dto.verifyToken, userId);
    }

    // Cancel active subscription (best-effort)
    try {
      await this.paymentService.cancelByUser(userId);
    } catch (e) {
      console.warn(`cancelByUser failed for ${userId}:`, e);
    }

    // Invalidate all refresh tokens
    await this.prisma.refreshToken.deleteMany({ where: { userId } });

    // Soft-delete
    await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });

    return { deleted: true };
  }
}
