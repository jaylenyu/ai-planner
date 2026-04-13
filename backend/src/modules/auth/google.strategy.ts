import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
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
    const email = profile.emails[0].value;
    const googleId = profile.id;

    let user = await this.prisma.user.findUnique({ where: { googleId } });

    if (!user) {
      user = await this.prisma.user.findUnique({ where: { email } });
      if (user) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { googleId },
        });
      } else {
        user = await this.prisma.user.create({
          data: { email, googleId },
        });
      }
    }

    done(null, user);
  }
}
