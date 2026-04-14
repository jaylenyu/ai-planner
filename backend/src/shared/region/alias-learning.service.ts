import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { RegionService } from './region.service';

const ALIAS_LOG_PREFIX = 'alias-log:';
const ALIAS_PREFIX = 'alias:';
const PROMOTE_THRESHOLD = 5;
const LOG_TTL_SECONDS = 30 * 24 * 60 * 60; // 30일

@Injectable()
export class AliasLearningService implements OnModuleInit {
  private readonly logger = new Logger(AliasLearningService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly regionService: RegionService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.loadPersistedAliases();
  }

  /**
   * Redis에 저장된 승격된 alias를 RegionService 인메모리에 복원.
   */
  async loadPersistedAliases(): Promise<void> {
    if (!this.redis.isEnabled()) return;

    const client = await (this.redis as any).getClient();
    if (!client) return;

    try {
      const keys: string[] = await client.keys(`${ALIAS_PREFIX}*`);
      if (keys.length === 0) return;

      for (const key of keys) {
        const canonical = await this.redis.get(key);
        if (!canonical) continue;
        const token = key.slice(ALIAS_PREFIX.length);
        this.regionService.addDynamicAlias(token, canonical);
      }

      this.logger.log(`동적 alias ${keys.length}개 복원 완료`);
    } catch (err) {
      this.logger.warn(`alias 복원 실패: ${(err as Error).message}`);
    }
  }

  /**
   * registry에 없는 토큰을 로깅. threshold 도달 시 자동 승격.
   * fire-and-forget — await 없이 호출.
   */
  async logUnrecognized(
    tokens: string[],
    resolvedCanonical: string,
  ): Promise<void> {
    if (!this.redis.isEnabled() || tokens.length === 0) return;

    const client = await (this.redis as any).getClient();
    if (!client) return;

    for (const token of tokens) {
      if (!token || token.length < 2) continue;

      try {
        const logKey = `${ALIAS_LOG_PREFIX}${token}`;
        const count = await client.incr(logKey);
        await client.expire(logKey, LOG_TTL_SECONDS);

        this.logger.debug(`alias 후보 기록: "${token}" → ${count}회`);

        if (count >= PROMOTE_THRESHOLD) {
          await this.promoteAlias(token, resolvedCanonical, client);
        }
      } catch (err) {
        this.logger.warn(
          `alias 로깅 실패 (${token}): ${(err as Error).message}`,
        );
      }
    }
  }

  private async promoteAlias(
    token: string,
    canonical: string,
    client: any,
  ): Promise<void> {
    const aliasKey = `${ALIAS_PREFIX}${token}`;

    // 이미 승격된 alias는 덮어쓰지 않음 (first-write wins)
    const existing = await this.redis.get(aliasKey);
    if (existing) return;

    await client.set(aliasKey, canonical);
    this.regionService.addDynamicAlias(token, canonical);

    this.logger.log(
      `alias 승격: "${token}" → "${canonical}" (${PROMOTE_THRESHOLD}회 이상)`,
    );
  }
}
