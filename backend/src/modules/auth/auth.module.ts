import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { SignOptions } from 'jsonwebtoken';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy } from './google.strategy';
import { EmailModule } from '../email/email.module';
import { KakaoStrategy } from './kakao.strategy';
import { NaverStrategy } from './naver.strategy';
import { EmailVerificationService } from './email-verification.service';
import { OAuthAccountService } from './oauth-account.service';
import { RedisModule } from '../../shared/redis/redis.module';
import { CaptchaModule } from '../../shared/captcha/captcha.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [
    PassportModule,
    EmailModule,
    RedisModule,
    CaptchaModule,
    PrismaModule,
    forwardRef(() => PaymentModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: (() => {
          const secret = config.get<string>('JWT_SECRET')?.trim();
          if (!secret) {
            throw new Error('JWT_SECRET is required');
          }
          return secret;
        })(),
        signOptions: {
          expiresIn: (config.get<string>('JWT_EXPIRES_IN') ??
            '15m') as SignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    GoogleStrategy,
    KakaoStrategy,
    NaverStrategy,
    EmailVerificationService,
    OAuthAccountService,
  ],
  exports: [JwtModule, AuthService],
})
export class AuthModule {}
