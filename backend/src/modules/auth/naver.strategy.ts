import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-naver';
import { OAuthAccountService } from './oauth-account.service';

type DoneFn = (error: any, user?: any) => void;

interface NaverProfileJson {
  id?: string;
  email?: string;
}

interface NaverProfile {
  id?: string;
  _json?: NaverProfileJson;
}

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
      passReqToCallback: true,
    });
  }

  async validate(
    req: { cookies?: Record<string, string> },
    _accessToken: string,
    _refreshToken: string,
    profile: NaverProfile,
    done: DoneFn,
  ) {
    try {
      const naverId = String(profile?.id ?? profile?._json?.id ?? '');
      if (!naverId)
        return done(new Error('네이버 사용자 정보를 가져올 수 없습니다.'));

      const email: string | null = profile?._json?.email ?? null;
      if (req.cookies?.['oauth_link_token']) {
        return done(null, { id: 'link-mode', email: email ?? '', role: 'USER', providerRawId: naverId });
      }
      const user = await this.oauthAccount.findOrLinkOrCreate(
        'naver',
        naverId,
        email,
      );
      done(null, { ...user, providerRawId: naverId });
    } catch (err) {
      done(err);
    }
  }
}
