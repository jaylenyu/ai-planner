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
  private readonly maxSize: number;

  constructor(
    private ttlMs: number,
    maxSize = 500,
  ) {
    this.maxSize = maxSize;
  }

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
    if (this.cache.size >= this.maxSize) {
      // Map은 삽입 순서를 유지하므로 첫 번째 키가 가장 오래된 항목
      const firstEntry = this.cache.keys().next();
      if (!firstEntry.done) {
        this.cache.delete(firstEntry.value);
      }
    }
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
  private naverUnauthorized = false; // 401 감지 시 정적 폴백 사용

  constructor(
    private readonly config: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.clientId = this.config.get<string>('NAVER_SEARCH_CLIENT_ID') ?? '';
    this.clientSecret =
      this.config.get<string>('NAVER_SEARCH_CLIENT_SECRET') ?? '';
  }

  /**
   * 일부 주요 지역/도시의 정적 중심 좌표 테이블.
   * 키는 RegionService의 shortName(정규화 결과) 또는 널리 쓰는 지명 키워드.
   */
  private staticCoords: Record<string, { lat: number; lng: number }> = {
    // 서울권 핵심 권역/동 단위
    서울: { lat: 37.5665, lng: 126.9780 },
    종로: { lat: 37.5720, lng: 126.9794 },
    강남: { lat: 37.4979, lng: 127.0276 },
    홍대: { lat: 37.5563, lng: 126.9239 },
    이태원: { lat: 37.5349, lng: 126.9945 },
    여의도: { lat: 37.5236, lng: 126.9256 },
    성동: { lat: 37.5636, lng: 127.0365 }, // 구 단위 중심
    성수동: { lat: 37.5446, lng: 127.0565 }, // 동 단위(성수 카페거리 중심 부근)
    성수: { lat: 37.5446, lng: 127.0565 },
    뚝섬: { lat: 37.5311, lng: 127.0662 },
    잠실: { lat: 37.5133, lng: 127.1002 },
    종각: { lat: 37.5704, lng: 126.9827 },
    합정: { lat: 37.5499, lng: 126.9145 },
    상수: { lat: 37.5474, lng: 126.9234 },
    연남동: { lat: 37.5613, lng: 126.9250 },
    한남: { lat: 37.5352, lng: 127.0059 },

    // 광역시/도 주요 도시
    부산: { lat: 35.1796, lng: 129.0756 },
    해운대: { lat: 35.1631, lng: 129.1635 },
    대구: { lat: 35.8714, lng: 128.6014 },
    대전: { lat: 36.3504, lng: 127.3845 },
    광주: { lat: 35.1595, lng: 126.8526 },
    인천: { lat: 37.4563, lng: 126.7052 },
    울산: { lat: 35.5384, lng: 129.3114 },
    수원: { lat: 37.2636, lng: 127.0286 },
    춘천: { lat: 37.8813, lng: 127.7298 },
    전주: { lat: 35.8242, lng: 127.1480 },
    여수: { lat: 34.7604, lng: 127.6622 },
    강릉: { lat: 37.7519, lng: 128.8761 },
    제주: { lat: 33.4996, lng: 126.5312 },
    제주시: { lat: 33.4996, lng: 126.5312 },
    서귀포: { lat: 33.2539, lng: 126.5600 },
  };

  /** 정적 좌표 테이블 조회. 없으면 null */
  geocodeCityStatic(name: string): { lat: number; lng: number } | null {
    if (!name) return null;
    const key = name.trim();
    const direct = this.staticCoords[key];
    if (direct) return direct;
    // 흔한 접미사 제거(시/군/구) 후 재시도
    const stripped = key.replace(/(시|군|구)$/u, '');
    return this.staticCoords[stripped] ?? null;
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

  async searchNearby(
    query: string,
    type: string,
    display = 5,
  ): Promise<PlaceResult[]> {
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
          this.logger.warn(
            `Naver API 오류 ${response.status} (시도 ${attempt + 1}/3) — (query: ${query})`,
          );
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
        this.logger.warn(
          `Naver API 요청 실패 — 빈 결과 반환 (query: ${query}): ${err}`,
        );
        await new Promise((r) => setTimeout(r, 500)); // 짧은 대기 후 재시도
      }
    }

    return [];
  }

  async geocodeCity(
    name: string,
  ): Promise<{ lat: number; lng: number } | null> {
    // 도시/지역명 geocoding: 행정 랜드마크를 순차 시도
    // 시청(시) → 군청(군) → 구청(구) → 터미널(시외버스) → 역(기차역) → plain
    // 사업체가 아닌 정부기관/교통허브를 우선 검색해 정확한 도시 좌표 확보

    // 네이버 키 누락 또는 이전 호출에서 401 감지 시 정적 폴백 우선 시도
    if (!this.clientId || !this.clientSecret || this.naverUnauthorized) {
      const staticHit = this.geocodeCityStatic(name);
      if (staticHit) {
        this.logger.warn(
          `geocodeCity: 정적 좌표 사용 (${name}) → ${staticHit.lat.toFixed(4)},${staticHit.lng.toFixed(4)}`,
        );
        return staticHit;
      }
    }

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
      // 동적 시도가 모두 실패하고 401이 감지된 경우 즉시 정적 폴백
      if (this.naverUnauthorized) {
        const staticHit = this.geocodeCityStatic(name);
        if (staticHit) {
          this.logger.warn(
            `geocodeCity: 401 감지로 정적 좌표 사용 (${name}) → ${staticHit.lat.toFixed(4)},${staticHit.lng.toFixed(4)}`,
          );
          return staticHit;
        }
      }
    }

    return null;
  }

  async geocodeLocation(
    keyword: string,
  ): Promise<{ lat: number; lng: number } | null> {
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
          if (response.status === 401) {
            // 인증 오류는 재시도 이득이 적으므로 플래그 세팅 후 중단
            this.naverUnauthorized = true;
            return null;
          }
          if (response.status === 429) {
            this.rateLimitCache.set(cacheKey, true);
            const backoff = 300 * (attempt + 1) * (Math.random() + 0.5);
            this.logger.warn(
              '429 감지, ' + backoff.toFixed(0) + 'ms 후 재시도',
            );
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
