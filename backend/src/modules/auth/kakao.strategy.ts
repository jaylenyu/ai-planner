import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-kakao';
import { PrismaService } from '../../prisma/prisma.service';

type DoneFn = (error: any, user?: any) => void;

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      clientID: config.get<string>('KAKAO_CLIENT_ID') ?? 'not-configured',
      clientSecret: config.get<string>('KAKAO_CLIENT_SECRET') ?? undefined,
      callbackURL: config.get<string>('KAKAO_CALLBACK_URL') ?? '',
    });
  }

  async validate(_accessToken: string, _refreshToken: string, profile: any, done: DoneFn) {
    const kakaoId = String(profile?.id ?? '');
    if (!kakaoId) return done(new Error('카카오 사용자 정보를 가져올 수 없습니다.'));

    const email =
      profile?._json?.kakao_account?.email ?? `${kakaoId}@kakao-user.local`;

    let user = await this.prisma.user.findUnique({ where: { kakaoId } });

    if (!user) {
      user = await this.prisma.user.findUnique({ where: { email } });
      if (user) {
        user = await this.prisma.user.update({ where: { id: user.id }, data: { kakaoId } });
      } else {
        user = await this.prisma.user.create({ data: { email, kakaoId } });
      }
    }

    done(null, user);
  }
}
