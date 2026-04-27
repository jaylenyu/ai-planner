import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-kakao';
import { OAuthAccountService } from './oauth-account.service';

type DoneFn = (error: Error | null, user?: unknown) => void;

type KakaoProfile = {
  id?: string | number;
  _json?: {
    kakao_account?: {
      email?: string | null;
    };
  };
};

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(
    config: ConfigService,
    private readonly oauthAccount: OAuthAccountService,
  ) {
    super({
      clientID: config.get<string>('KAKAO_CLIENT_ID') ?? 'not-configured',
      clientSecret: config.get<string>('KAKAO_CLIENT_SECRET') ?? undefined,
      callbackURL: config.get<string>('KAKAO_CALLBACK_URL') ?? '',
      passReqToCallback: true,
    });
  }

  async validate(
    req: { cookies?: Record<string, string> },
    _accessToken: string,
    _refreshToken: string,
    profile: KakaoProfile,
    done: DoneFn,
  ) {
    try {
      const kakaoId = String(profile.id ?? '');
      if (!kakaoId)
        return done(new Error('카카오 사용자 정보를 가져올 수 없습니다.'));

      const email: string | null = profile._json?.kakao_account?.email ?? null;
      if (req.cookies?.['oauth_link_token']) {
        return done(null, { id: 'link-mode', email: email ?? '', role: 'USER', providerRawId: kakaoId });
      }
      const user = await this.oauthAccount.findOrLinkOrCreate(
        'kakao',
        kakaoId,
        email,
      );
      done(null, { ...user, providerRawId: kakaoId });
    } catch (err) {
      done(err instanceof Error ? err : new Error(String(err)));
    }
  }
}
