import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-naver';
import { PrismaService } from '../../prisma/prisma.service';

type DoneFn = (error: any, user?: any) => void;

@Injectable()
export class NaverStrategy extends PassportStrategy(Strategy, 'naver') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      clientID: config.get<string>('NAVER_CLIENT_ID') ?? 'not-configured',
      clientSecret: config.get<string>('NAVER_CLIENT_SECRET') ?? 'not-configured',
      callbackURL: config.get<string>('NAVER_CALLBACK_URL') ?? '',
    });
  }

  async validate(_accessToken: string, _refreshToken: string, profile: any, done: DoneFn) {
    const naverId = String(profile?.id ?? profile?._json?.id ?? '');
    if (!naverId) return done(new Error('네이버 사용자 정보를 가져올 수 없습니다.'));

    const email = profile?._json?.email ?? `${naverId}@naver-user.local`;

    let user = await this.prisma.user.findUnique({ where: { naverId } });

    if (!user) {
      user = await this.prisma.user.findUnique({ where: { email } });
      if (user) {
        user = await this.prisma.user.update({ where: { id: user.id }, data: { naverId } });
      } else {
        user = await this.prisma.user.create({ data: { email, naverId } });
      }
    }

    done(null, user);
  }
}
