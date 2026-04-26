import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import type { Response, Request } from 'express';
import { AuthService, OAuthProvider } from './auth.service';
import { OAuthAccountService } from './oauth-account.service';
import { EmailVerificationService } from './email-verification.service';
import { JwtAuthGuard } from './auth.guard';
import { CurrentUser } from './current-user.decorator';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RequestEmailCodeDto } from './dto/request-email-code.dto';
import { VerifyEmailCodeDto } from './dto/verify-email-code.dto';
import { CheckEmailDto } from './dto/check-email.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { DeleteMeDto } from './dto/delete-me.dto';
import { VerifyPasswordSetupDto } from './dto/verify-password-setup.dto';
import type { AuthenticatedUser, OAuthAuthenticatedUser } from './types';

const VALID_PROVIDERS: OAuthProvider[] = ['google', 'kakao', 'naver'];

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly oauthAccountService: OAuthAccountService,
    private readonly emailVerification: EmailVerificationService,
    private readonly config: ConfigService,
  ) {}

  private readonly logger = new Logger(AuthController.name);

  private getFrontendUrl(): string {
    return this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
  }

  private validateProvider(provider: string): OAuthProvider {
    if (!VALID_PROVIDERS.includes(provider as OAuthProvider)) {
      throw new BadRequestException(`Invalid provider: ${provider}`);
    }
    return provider as OAuthProvider;
  }

  private async handleOAuthRedirect(
    res: Response,
    req: Request,
    user: OAuthAuthenticatedUser,
    provider: OAuthProvider,
  ) {
    // Check if this is a link-token flow
    const linkCookie = (req.cookies as Record<string, string> | undefined)?.[
      'oauth_link_token'
    ];

    if (linkCookie) {
      const linkData = this.authService.verifyOAuthLinkToken(
        linkCookie,
        provider,
      );
      if (linkData) {
        // Clear cookie immediately
        res.clearCookie('oauth_link_token', { path: '/' });
        try {
          await this.oauthAccountService.linkProviderToUser({
            userId: linkData.userId,
            provider,
            providerId: user.id,
            providerEmail: user.email,
          });
          return res.redirect(
            `${this.getFrontendUrl()}/settings?linked=${provider}`,
          );
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'unknown';
          this.logger.warn(`OAuth link failed: ${message}`);
          const errCode =
            message === 'PROVIDER_ALREADY_LINKED'
              ? 'already_linked'
              : 'link_error';
          return res.redirect(
            `${this.getFrontendUrl()}/settings?linkError=${errCode}`,
          );
        }
      }
    }

    // Normal OAuth login flow
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
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.ip;
    await this.authService.assertEmailAvailable(dto.email);
    await this.emailVerification.requestCode(
      dto.email,
      dto.captchaToken ?? '',
      ip,
    );
    return { message: '인증코드를 전송했습니다.' };
  }

  @Post('email/verify-code')
  @HttpCode(HttpStatus.OK)
  async verifyEmailCode(@Body() dto: VerifyEmailCodeDto) {
    await this.emailVerification.verifyCode(dto.email, dto.code);
    return { verified: true };
  }

  @Post('email/check')
  @HttpCode(HttpStatus.OK)
  async checkEmail(@Body() dto: CheckEmailDto) {
    return this.authService.checkEmailAvailability(dto.email);
  }

  // ── 회원가입 / 로그인 ────────────────────────────────────────────

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.ip ?? '';
    return this.authService.login(dto, ip);
  }

  @Post('admin/login')
  loginAdmin(@Body() dto: LoginDto, @Req() req: Request) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.ip ?? '';
    return this.authService.adminLogin(dto, ip);
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

  // ── 인증된 사용자 엔드포인트 ─────────────────────────────────────

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.userId);
  }

  @Patch('password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.userId, dto);
  }

  @Post('password/setup-request')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  requestPasswordSetup(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.requestPasswordSetup(user.userId);
  }

  @Post('password/setup-verify')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  verifyPasswordSetup(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: VerifyPasswordSetupDto,
  ) {
    return this.authService.verifyPasswordSetup(user.userId, dto.code);
  }

  @Patch('settings')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.authService.updateSettings(user.userId, dto);
  }

  @Post('oauth/:provider/link-token')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  createOAuthLinkToken(
    @CurrentUser() user: AuthenticatedUser,
    @Param('provider') provider: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const validProvider = this.validateProvider(provider);
    const token = this.authService.createOAuthLinkToken(
      user.userId,
      validProvider,
    );
    res.cookie('oauth_link_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 300 * 1000,
      path: '/',
    });
    return { ok: true };
  }

  @Delete('oauth/:provider')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  unlinkOAuth(
    @CurrentUser() user: AuthenticatedUser,
    @Param('provider') provider: string,
  ) {
    const validProvider = this.validateProvider(provider);
    return this.authService.unlinkOAuth(user.userId, validProvider);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  logoutAll(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.logoutAll(user.userId);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  deleteMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: DeleteMeDto) {
    return this.authService.deleteMe(user.userId, dto);
  }

  // ── OAuth ────────────────────────────────────────────────────────

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @Req()
    req: Request & {
      user: OAuthAuthenticatedUser;
    },
    @Res() res: Response,
  ) {
    try {
      await this.handleOAuthRedirect(res, req, req.user, 'google');
    } catch (err: any) {
      this.logger.warn(`Google OAuth conflict: ${(err as Error).message}`);
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
    @Req()
    req: Request & {
      user: OAuthAuthenticatedUser;
    },
    @Res() res: Response,
  ) {
    try {
      await this.handleOAuthRedirect(res, req, req.user, 'kakao');
    } catch (err: any) {
      this.logger.warn(`Kakao OAuth conflict: ${(err as Error).message}`);
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
    @Req()
    req: Request & {
      user: OAuthAuthenticatedUser;
    },
    @Res() res: Response,
  ) {
    try {
      await this.handleOAuthRedirect(res, req, req.user, 'naver');
    } catch (err: any) {
      this.logger.warn(`Naver OAuth conflict: ${(err as Error).message}`);
      res.redirect(
        `${this.getFrontendUrl()}/login?error=oauth_local_conflict&provider=naver`,
      );
    }
  }
}
