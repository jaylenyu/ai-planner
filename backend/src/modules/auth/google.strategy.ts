import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { OAuthAccountService } from './oauth-account.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    config: ConfigService,
    private readonly oauthAccount: OAuthAccountService,
  ) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID') ?? 'not-configured',
      clientSecret:
        config.get<string>('GOOGLE_CLIENT_SECRET') ?? 'not-configured',
      callbackURL: config.get<string>('GOOGLE_CALLBACK_URL') ?? '',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: { id: string; emails: { value: string }[] },
    done: VerifyCallback,
  ) {
    try {
      const email = profile.emails?.[0]?.value ?? null;
      const user = await this.oauthAccount.findOrLinkOrCreate(
        'google',
        profile.id,
        email,
      );
      done(null, user);
    } catch (err) {
      done(err as Error);
    }
  }
}
