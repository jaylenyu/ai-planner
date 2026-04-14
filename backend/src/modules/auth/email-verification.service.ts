import {
  Injectable,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { RedisService } from '../../shared/redis/redis.service';
import { TurnstileService } from '../../shared/captcha/turnstile.service';
import { EmailService } from '../email/email.service';

const CODE_TTL = 180; // 3분
const ATTEMPT_TTL = 600; // 10분 (코드보다 길게)
const RESEND_COOLDOWN = 60; // 1분
const PASSED_TTL = 600; // 인증 통과 마커 유효 시간
const MAX_ATTEMPTS = 5;

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly redis: RedisService,
    private readonly turnstile: TurnstileService,
    private readonly email: EmailService,
  ) {}

  async requestCode(emailAddr: string, captchaToken: string, ip?: string): Promise<void> {
    await this.turnstile.verify(captchaToken, ip);

    // 재전송 쿨다운 체크
    const resendKey = `email_verify:resend:${emailAddr}`;
    const onCooldown = await this.redis.get(resendKey);
    if (onCooldown) {
      const remaining = await this.redis.ttl(resendKey);
      throw new HttpException(
        `인증코드 재전송은 ${remaining}초 후에 가능합니다.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 6자리 코드 생성
    const code = crypto.randomInt(100000, 1000000).toString();

    // Redis 저장
    const codeKey = `email_verify:code:${emailAddr}`;
    const attemptsKey = `email_verify:attempts:${emailAddr}`;

    await this.redis.set(codeKey, code, CODE_TTL);
    await this.redis.del(attemptsKey); // 재전송 시 시도 횟수 초기화
    await this.redis.set(resendKey, '1', RESEND_COOLDOWN);

    await this.email.sendVerificationCode(emailAddr, code);
  }

  async verifyCode(emailAddr: string, code: string): Promise<void> {
    const codeKey = `email_verify:code:${emailAddr}`;
    const attemptsKey = `email_verify:attempts:${emailAddr}`;
    const passedKey = `email_verify:passed:${emailAddr}`;

    // 시도 횟수 확인
    const attemptsStr = await this.redis.get(attemptsKey);
    const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;
    if (attempts >= MAX_ATTEMPTS) {
      throw new BadRequestException(
        '인증 시도 횟수가 초과되었습니다. 인증코드를 다시 요청해주세요.',
      );
    }

    const stored = await this.redis.get(codeKey);
    if (!stored) {
      throw new BadRequestException(
        '인증코드가 만료되었습니다. 다시 요청해주세요.',
      );
    }

    // 시도 횟수 증가
    await this.redis.incr(attemptsKey, ATTEMPT_TTL);

    if (stored !== code) {
      const newAttempts = attempts + 1;
      const remaining = MAX_ATTEMPTS - newAttempts;
      throw new BadRequestException(
        remaining > 0
          ? `인증코드가 올바르지 않습니다. (${remaining}회 남음)`
          : '인증 시도 횟수가 초과되었습니다. 인증코드를 다시 요청해주세요.',
      );
    }

    // 성공: 코드 삭제 + 통과 마커 세팅
    await this.redis.del(codeKey);
    await this.redis.del(attemptsKey);
    await this.redis.set(passedKey, '1', PASSED_TTL);
  }

  async assertVerified(emailAddr: string): Promise<void> {
    const passedKey = `email_verify:passed:${emailAddr}`;
    const passed = await this.redis.get(passedKey);
    if (!passed) {
      throw new BadRequestException('이메일 인증이 필요합니다.');
    }
    // 1회용: 가입 완료 후 삭제
    await this.redis.del(passedKey);
  }
}
