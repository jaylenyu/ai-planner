import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private connected = false;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('REDIS_HOST');
    if (!host) {
      this.logger.warn('REDIS_HOST 미설정 — RedisService 비활성화');
      return;
    }

    const options: RedisOptions = {
      host,
      port: this.config.get<number>('REDIS_PORT') ?? 6379,
      password: this.config.get<string>('REDIS_PASSWORD') || undefined,
      lazyConnect: true,
    };

    if (this.config.get<string>('REDIS_TLS') === 'true') {
      options.tls = {};
    }

    this.client = new Redis(options);
    this.client.on('error', (err) => {
      this.logger.error(`Redis 오류: ${err.message}`);
    });
  }

  isEnabled(): boolean {
    return !!this.client;
  }

  private async getClient(): Promise<Redis | null> {
    if (!this.client) return null;
    if (!this.connected) {
      await this.client.connect();
      this.connected = true;
    }
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    const client = await this.getClient();
    if (!client) return null;
    return client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const client = await this.getClient();
    if (!client) return;
    if (ttlSeconds) {
      await client.set(key, value, 'EX', ttlSeconds);
    } else {
      await client.set(key, value);
    }
  }

  async getJSON<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.warn(`Redis JSON 파싱 실패 (${key}): ${(err as Error).message}`);
      return null;
    }
  }

  async setJSON(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async del(key: string): Promise<void> {
    const client = await this.getClient();
    if (!client) return;
    await client.del(key);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client && this.connected) {
      await this.client.quit();
      this.connected = false;
    }
  }
}
