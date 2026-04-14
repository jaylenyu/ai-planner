import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-naver';
import { OAuthAccountService } from './oauth-account.service';

type DoneFn = (error: any, user?: any) => void;

@Injectable()
export class NaverStrategy extends PassportStrategy(Strategy, 'naver') {
  constructor(
    config: ConfigService,
    private readonly oauthAccount: OAuthAccountService,
  ) {
    super({
      clientID: config.get<string>('NAVER_CLIENT_ID') ?? 'not-configured',
      clientSecret:
        config.get<string>('NAVER_CLIENT_SECRET') ?? 'not-configured',
      callbackURL: config.get<string>('NAVER_CALLBACK_URL') ?? '',
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: DoneFn,
  ) {
    try {
      const naverId = String(profile?.id ?? profile?._json?.id ?? '');
      if (!naverId) return done(new Error('네이버 사용자 정보를 가져올 수 없습니다.'));

      const email: string | null = profile?._json?.email ?? null;
      const user = await this.oauthAccount.findOrLinkOrCreate('naver', naverId, email);
      done(null, user);
    } catch (err) {
      done(err);
    }
  }
}
