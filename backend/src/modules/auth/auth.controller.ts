import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { EmailVerificationService } from './email-verification.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RequestEmailCodeDto } from './dto/request-email-code.dto';
import { VerifyEmailCodeDto } from './dto/verify-email-code.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailVerification: EmailVerificationService,
    private readonly config: ConfigService,
  ) {}

  private getFrontendUrl(): string {
    return this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
  }

  private async handleOAuthRedirect(
    res: Response,
    user: { id: string; email: string },
  ) {
    const tokens = await this.authService.oauthLogin(user);
    res.redirect(
      `${this.getFrontendUrl()}/auth/callback?access_token=${tokens.access_token}&refresh_token=${tokens.refresh_token}`,
    );
  }

  // ── 이메일 인증 ─────────────────────────────────────────────────

  @Post('email/request-code')
  @HttpCode(HttpStatus.OK)
  async requestEmailCode(
    @Body() dto: RequestEmailCodeDto,
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.ip;
    await this.emailVerification.requestCode(dto.email, dto.captchaToken ?? '', ip);
    return { message: '인증코드를 전송했습니다.' };
  }

  @Post('email/verify-code')
  @HttpCode(HttpStatus.OK)
  async verifyEmailCode(@Body() dto: VerifyEmailCodeDto) {
    await this.emailVerification.verifyCode(dto.email, dto.code);
    return { verified: true };
  }

  // ── 회원가입 / 로그인 ────────────────────────────────────────────

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.ip ?? '';
    return this.authService.login(dto, ip);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refreshTokens(dto.refresh_token);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshDto) {
    await this.authService.logout(dto.refresh_token);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto);
    return { message: '해당 이메일로 안내 메일을 전송했습니다.' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
    return { message: '비밀번호가 변경되었습니다.' };
  }

  // ── OAuth ────────────────────────────────────────────────────────

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @Req() req: Request & { user: { id: string; email: string } },
    @Res() res: Response,
  ) {
    try {
      await this.handleOAuthRedirect(res, req.user);
    } catch (err: any) {
      res.redirect(
        `${this.getFrontendUrl()}/login?error=oauth_local_conflict&provider=google`,
      );
    }
  }

  @Get('kakao')
  @UseGuards(AuthGuard('kakao'))
  kakaoAuth() {}

  @Get('kakao/callback')
  @UseGuards(AuthGuard('kakao'))
  async kakaoCallback(
    @Req() req: Request & { user: { id: string; email: string } },
    @Res() res: Response,
  ) {
    try {
      await this.handleOAuthRedirect(res, req.user);
    } catch (err: any) {
      res.redirect(
        `${this.getFrontendUrl()}/login?error=oauth_local_conflict&provider=kakao`,
      );
    }
  }

  @Get('naver')
  @UseGuards(AuthGuard('naver'))
  naverAuth() {}

  @Get('naver/callback')
  @UseGuards(AuthGuard('naver'))
  async naverCallback(
    @Req() req: Request & { user: { id: string; email: string } },
    @Res() res: Response,
  ) {
    try {
      await this.handleOAuthRedirect(res, req.user);
    } catch (err: any) {
      res.redirect(
        `${this.getFrontendUrl()}/login?error=oauth_local_conflict&provider=naver`,
      );
    }
  }
}
