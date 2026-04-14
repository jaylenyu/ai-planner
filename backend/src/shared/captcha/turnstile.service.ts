import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name);
  private readonly secretKey: string | undefined;

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {
    this.secretKey = this.config.get<string>('TURNSTILE_SECRET_KEY');
    if (!this.secretKey) {
      this.logger.warn('TURNSTILE_SECRET_KEY 미설정 — CAPTCHA 검증 우회됨 (dev 모드)');
    }
  }

  async verify(token: string, ip?: string): Promise<void> {
    if (!this.secretKey) return; // dev bypass

    if (!token) {
      throw new BadRequestException('CAPTCHA 토큰이 필요합니다.');
    }

    // 1회용 토큰 중복 사용 방지
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const usedKey = `captcha_used:${tokenHash}`;
    const alreadyUsed = await this.redis.get(usedKey);
    if (alreadyUsed) {
      throw new BadRequestException('CAPTCHA 토큰이 이미 사용되었습니다.');
    }

    const body = new URLSearchParams({
      secret: this.secretKey,
      response: token,
      ...(ip ? { remoteip: ip } : {}),
    });

    let data: { success: boolean; 'error-codes'?: string[] };
    try {
      const res = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        { method: 'POST', body },
      );
      data = await res.json() as typeof data;
    } catch (err) {
      this.logger.error(`Turnstile 검증 요청 실패: ${(err as Error).message}`);
      throw new BadRequestException('CAPTCHA 검증에 실패했습니다. 다시 시도해주세요.');
    }

    if (!data.success) {
      this.logger.warn(`Turnstile 실패 (${ip}): ${JSON.stringify(data['error-codes'])}`);
      throw new BadRequestException('CAPTCHA 검증에 실패했습니다. 다시 시도해주세요.');
    }

    // 사용 표시 (5분 TTL)
    await this.redis.set(usedKey, '1', 300);
  }
}
