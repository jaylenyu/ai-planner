import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export type OAuthProvider = 'google' | 'kakao' | 'naver';

type ProviderIdField = 'googleId' | 'kakaoId' | 'naverId';

const providerField: Record<OAuthProvider, ProviderIdField> = {
  google: 'googleId',
  kakao: 'kakaoId',
  naver: 'naverId',
};

@Injectable()
export class OAuthAccountService {
  constructor(private readonly prisma: PrismaService) {}

  async findByProviderId(provider: OAuthProvider, providerId: string) {
    const field = providerField[provider];
    const providerWhere = { [field]: providerId } as Record<string, string>;
    const existing = await this.prisma.user.findUnique({
      where: providerWhere as unknown as Prisma.UserWhereUniqueInput,
    });

    if (!existing) return null;

    return this.prisma.user.update({
      where: { id: existing.id },
      data: { lastLoginAt: new Date() },
    });
  }

  async completeSignup({
    provider,
    providerId,
    providerEmail,
    nickname,
  }: {
    provider: OAuthProvider;
    providerId: string;
    providerEmail: string | null;
    nickname: string;
  }) {
    const field = providerField[provider];
    const existing = await this.findByProviderId(provider, providerId);
    if (existing) return existing;

    const email = providerEmail?.trim().toLowerCase() || null;
    if (email) {
      const byEmail = await this.prisma.user.findUnique({ where: { email } });
      if (byEmail) {
        if (byEmail.password) {
          const providerName = {
            google: 'Google',
            kakao: 'Kakao',
            naver: 'Naver',
          }[provider];
          throw new UnauthorizedException(
            `이 이메일은 이미 사이트 회원가입으로 사용 중입니다. 이메일/비밀번호로 로그인 후 [설정 → 소셜 연동]에서 ${providerName} 계정을 연결해주세요.`,
          );
        }

        return this.prisma.user.update({
          where: { id: byEmail.id },
          data: { [field]: providerId, lastLoginAt: new Date() },
        });
      }
    }

    return this.prisma.user.create({
      data: {
        email,
        nickname,
        [field]: providerId,
        emailVerified: email != null,
        lastLoginAt: new Date(),
      },
    });
  }

  async findOrLinkOrCreate(
    provider: OAuthProvider,
    providerId: string,
    email: string | null,
  ) {
    const field = providerField[provider];

    // 1. providerId로 직접 매칭
    const existing = await this.findByProviderId(provider, providerId);
    if (existing) {
      return existing;
    }

    // 신규 OAuth 가입은 별도 온보딩 화면에서 닉네임을 받은 뒤 완료한다.
    if (!email) {
      return null;
    }

    // 2. 이메일로 기존 유저 검색
    const byEmail = await this.prisma.user.findUnique({ where: { email } });

    if (!byEmail) {
      return null;
    }

    if (byEmail.password) {
      // 2c. local 가입자 — 안전 모드 거부
      const providerName = { google: 'Google', kakao: 'Kakao', naver: 'Naver' }[
        provider
      ];
      throw new UnauthorizedException(
        `이 이메일은 이미 사이트 회원가입으로 사용 중입니다. 이메일/비밀번호로 로그인 후 [설정 → 소셜 연동]에서 ${providerName} 계정을 연결해주세요.`,
      );
    }

    // 2b. OAuth-only 유저 — providerId 자동 연결
    return this.prisma.user.update({
      where: { id: byEmail.id },
      data: { [field]: providerId, lastLoginAt: new Date() },
    });
  }

  async linkProviderToUser({
    userId,
    provider,
    providerId,
    providerEmail: _providerEmail,
  }: {
    userId: string;
    provider: OAuthProvider;
    providerId: string;
    providerEmail: string | null;
  }) {
    const field = providerField[provider];

    // Check if providerId already belongs to another user
    const existing = await this.prisma.user.findFirst({
      where: {
        [field]: providerId,
        id: { not: userId },
      } as unknown as Prisma.UserWhereInput,
    });
    if (existing) {
      throw new ConflictException('PROVIDER_ALREADY_LINKED');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { [field]: providerId },
    });
  }
}
