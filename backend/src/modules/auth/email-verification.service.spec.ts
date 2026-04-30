import { ServiceUnavailableException } from '@nestjs/common';
import { RedisService } from '../../shared/redis/redis.service';
import { TurnstileService } from '../../shared/captcha/turnstile.service';
import { EmailService } from '../email/email.service';
import { EmailVerificationService } from './email-verification.service';

describe('EmailVerificationService', () => {
  let turnstile: jest.Mocked<Pick<TurnstileService, 'verify'>>;
  let email: jest.Mocked<Pick<EmailService, 'sendVerificationCode'>>;

  const createService = (
    redis: jest.Mocked<
      Pick<RedisService, 'getNativeClient' | 'get' | 'ttl' | 'set' | 'del'>
    >,
  ) =>
    new EmailVerificationService(
      redis as unknown as RedisService,
      turnstile as unknown as TurnstileService,
      email as unknown as EmailService,
    );

  beforeEach(() => {
    turnstile = {
      verify: jest.fn().mockResolvedValue(undefined),
    };
    email = {
      sendVerificationCode: jest.fn(),
    };
  });

  it('메일 전송 실패 시 메모리 저장소의 재전송 제한을 남기지 않는다', async () => {
    const redis = {
      getNativeClient: jest.fn().mockResolvedValue(null),
      get: jest.fn(),
      ttl: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };
    const service = createService(redis);
    const error = new ServiceUnavailableException('메일 전송 실패');

    email.sendVerificationCode.mockRejectedValueOnce(error);

    await expect(
      service.requestCode('USER@example.com', 'captcha-token', '127.0.0.1'),
    ).rejects.toBe(error);

    email.sendVerificationCode.mockResolvedValueOnce(undefined);

    await expect(
      service.requestCode('USER@example.com', 'captcha-token', '127.0.0.1'),
    ).resolves.toBeUndefined();
    expect(email.sendVerificationCode).toHaveBeenCalledTimes(2);
  });

  it('메일 전송 실패 시 Redis 인증코드와 재전송 제한을 롤백한다', async () => {
    const redis = {
      getNativeClient: jest.fn().mockResolvedValue({}),
      get: jest.fn().mockResolvedValue(null),
      ttl: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };
    const service = createService(redis);
    const error = new ServiceUnavailableException('메일 전송 실패');

    email.sendVerificationCode.mockRejectedValueOnce(error);

    await expect(
      service.requestCode('USER@example.com', 'captcha-token', '127.0.0.1'),
    ).rejects.toBe(error);

    expect(redis.del).toHaveBeenCalledWith(
      'email_verify:code:user@example.com',
    );
    expect(redis.del).toHaveBeenCalledWith(
      'email_verify:attempts:user@example.com',
    );
    expect(redis.del).toHaveBeenCalledWith(
      'email_verify:resend:user@example.com',
    );
  });
});
