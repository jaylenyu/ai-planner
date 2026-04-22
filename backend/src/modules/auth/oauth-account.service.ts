import { Injectable, UnauthorizedException } from '@nestjs/common';
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

  async findOrLinkOrCreate(
    provider: OAuthProvider,
    providerId: string,
    email: string | null,
  ) {
    const field = providerField[provider];

    // 1. providerId로 직접 매칭
    const providerWhere = { [field]: providerId } as Record<string, string>;
    const existing = await this.prisma.user.findUnique({
      where: providerWhere as unknown as Prisma.UserWhereUniqueInput,
    });
    if (existing) return existing;

    // email 없을 경우 (Kakao 이메일 동의 미제공 등) — placeholder 이메일로 신규 생성
    if (!email) {
      return this.prisma.user.create({
        data: {
          email: `${provider}-${providerId}@oauth.local`,
          [field]: providerId,
          emailVerified: true,
          lastLoginAt: new Date(),
        },
      });
    }

    // 2. 이메일로 기존 유저 검색
    const byEmail = await this.prisma.user.findUnique({ where: { email } });

    if (!byEmail) {
      // 2a. 신규 생성
      return this.prisma.user.create({
        data: {
          email,
          [field]: providerId,
          emailVerified: true,
          lastLoginAt: new Date(),
        },
      });
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
}
