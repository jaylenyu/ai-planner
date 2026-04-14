import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../shared/redis/redis.service';

export interface PlaceResult {
  name: string;
  lat: number;
  lng: number;
  category: string;
  address: string;
  link?: string;
  source?: 'naver' | 'ai';
  score?: number;
}

interface CacheEntry<T> {
  value: T;
  expiry: number;
}

/**
 * 매우 단순한 LRU 스타일 TTL 캐시 (키는 문자열)
 * TTL(밀리초) 지난 캐시는 get 시 삭제
 */
class TTLCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  constructor(private ttlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.ttlMs,
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

@Injectable()
export class PlacesService {
  private readonly logger = new Logger(PlacesService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private rateLimitCache = new TTLCache<boolean>(5 * 60 * 1000); // 5분 TTL
  private searchCache = new TTLCache<PlaceResult[]>(5 * 60 * 1000); // 5분 TTL

  constructor(
    private readonly config: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.clientId = this.config.get<string>('NAVER_SEARCH_CLIENT_ID') ?? '';
    this.clientSecret = this.config.get<string>('NAVER_SEARCH_CLIENT_SECRET') ?? '';
  }

  private async getCachedPlaces(key: string): Promise<PlaceResult[] | null> {
    if (!this.redisService.isEnabled()) return null;
    return this.redisService.getJSON<PlaceResult[]>(key);
  }

  private async cachePlaces(
    key: string,
    value: PlaceResult[],
    ttlSeconds = 60 * 60,
  ): Promise<void> {
    if (!this.redisService.isEnabled()) return;
    await this.redisService.setJSON(key, value, ttlSeconds);
  }

  private async getCachedGeo(
    key: string,
  ): Promise<{ lat: number; lng: number } | null> {
    if (!this.redisService.isEnabled()) return null;
    return this.redisService.getJSON<{ lat: number; lng: number }>(key);
  }

  private async cacheGeo(
    key: string,
    value: { lat: number; lng: number },
    ttlSeconds = 7 * 24 * 60 * 60,
  ): Promise<void> {
    if (!this.redisService.isEnabled()) return;
    await this.redisService.setJSON(key, value, ttlSeconds);
  }

  async searchNearby(query: string, type: string, display = 5): Promise<PlaceResult[]> {
    if (!this.clientId || !this.clientSecret) {
      this.logger.warn(`Naver API 키 없음 — 빈 결과 반환 (query: ${query})`);
      return [];
    }

    const cacheKey = `places:${type}:${query}:${display}`;
    if (this.rateLimitCache.get(cacheKey)) {
      const cached = this.searchCache.get(cacheKey);
      if (cached) {
        this.logger.warn(`429 상태 캐시 히트: ${cacheKey}`);
        return cached;
      }
    }

    const redisCached = await this.getCachedPlaces(cacheKey);
    if (redisCached) {
      return redisCached;
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const encoded = encodeURIComponent(query);
        const url = `https://openapi.naver.com/v1/search/local.json?query=${encoded}&display=${display}&sort=comment`;
        const response = await fetch(url, {
          headers: {
            'X-Naver-Client-Id': this.clientId,
            'X-Naver-Client-Secret': this.clientSecret,
          },
        });

        if (!response.ok) {
          this.logger.warn(`Naver API 오류 ${response.status} (시도 ${attempt + 1}/3) — (query: ${query})`);
          if (response.status === 429) {
            this.rateLimitCache.set(cacheKey, true);
            const backoff = 300 * (attempt + 1) * (Math.random() + 0.5);
            this.logger.warn(`429 감지, ${backoff.toFixed(0)}ms 후 재시도`);
            await new Promise((r) => setTimeout(r, backoff));
            continue;
          } else {
            return [];
          }
        }

        const data = (await response.json()) as { items: NaverLocalItem[] };
        if (!data.items || data.items.length === 0) {
          return [];
        }

        const places = data.items.map((item) => ({
          name: item.title.replace(/<[^>]*>/g, ''),
          lat: parseInt(item.mapy) / 10_000_000,
          lng: parseInt(item.mapx) / 10_000_000,
          category: item.category,
          address: item.roadAddress || item.address,
          link: item.link,
          source: 'naver' as const,
        }));

        this.searchCache.set(cacheKey, places);
        await this.cachePlaces(cacheKey, places);
        return places;
      } catch (err) {
        this.logger.warn(`Naver API 요청 실패 — 빈 결과 반환 (query: ${query}): ${err}`);
        await new Promise((r) => setTimeout(r, 500)); // 짧은 대기 후 재시도
      }
    }

    return [];
  }

  async geocodeCity(name: string): Promise<{ lat: number; lng: number } | null> {
    // 도시/지역명 geocoding: 행정 랜드마크를 순차 시도
    // 시청(시) → 군청(군) → 구청(구) → 터미널(시외버스) → 역(기차역) → plain
    // 사업체가 아닌 정부기관/교통허브를 우선 검색해 정확한 도시 좌표 확보

    const queries = [
      `${name}시청`,
      `${name}군청`,
      `${name}구청`,
      `${name}터미널`,
      `${name}역`,
      name,
    ];

    for (const q of queries) {
      const result = await this.geocodeLocation(q);
      if (result) {
        this.logger.log(
          `geocodeCity: "${name}" → "${q}" (${result.lat.toFixed(4)},${result.lng.toFixed(4)})`,
        );
        return result;
      }
    }

    return null;
  }

  async geocodeLocation(keyword: string): Promise<{ lat: number; lng: number } | null> {
    if (!this.clientId || !this.clientSecret) {
      return null;
    }

    const cacheKey = 'geo:' + keyword;
    if (this.rateLimitCache.get(cacheKey)) {
      this.logger.warn('429 상태 캐시 히트: ' + cacheKey);
      return null;
    }

    const cachedGeo = await this.getCachedGeo(cacheKey);
    if (cachedGeo) return cachedGeo;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const encoded = encodeURIComponent(keyword);
        const url =
          'https://openapi.naver.com/v1/search/local.json?query=' +
          encoded +
          '&display=1&sort=comment';
        const response = await fetch(url, {
          headers: {
            'X-Naver-Client-Id': this.clientId,
            'X-Naver-Client-Secret': this.clientSecret,
          },
        });

        if (!response.ok) {
          this.logger.warn(
            'Naver API 오류 ' +
              response.status +
              ' (시도 ' +
              (attempt + 1) +
              '/3) — (query: ' +
              keyword +
              ')',
          );
          if (response.status === 429) {
            this.rateLimitCache.set(cacheKey, true);
            const backoff = 300 * (attempt + 1) * (Math.random() + 0.5);
            this.logger.warn('429 감지, ' + backoff.toFixed(0) + 'ms 후 재시도');
            await new Promise((r) => setTimeout(r, backoff));
            continue;
          } else {
            return null;
          }
        }

        const data = (await response.json()) as { items: NaverLocalItem[] };
        const item = data.items?.[0];
        if (!item) {
          return null;
        }

        const result = {
          lat: parseInt(item.mapy) / 10_000_000,
          lng: parseInt(item.mapx) / 10_000_000,
        };
        await this.cacheGeo(cacheKey, result);
        return result;
      } catch (err) {
        this.logger.warn('Naver 위치 검색 실패: ' + keyword + ' (' + err + ')');
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    return null;
  }
}

interface NaverLocalItem {
  title: string;
  link: string;
  category: string;
  description: string;
  telephone: string;
  address: string;
  roadAddress: string;
  mapx: string;
  mapy: string;
}
