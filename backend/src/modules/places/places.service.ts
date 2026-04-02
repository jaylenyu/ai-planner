import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getMockPlaces } from './places-mock.data';

export interface PlaceResult {
  name: string;
  lat: number;
  lng: number;
  category: string;
  address: string;
  link?: string;
}

@Injectable()
export class PlacesService {
  private readonly logger = new Logger(PlacesService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(private readonly config: ConfigService) {
    this.clientId = this.config.get<string>('NAVER_CLIENT_ID') ?? '';
    this.clientSecret = this.config.get<string>('NAVER_CLIENT_SECRET') ?? '';
  }

  async searchNearby(query: string, type: string, display = 5): Promise<PlaceResult[]> {
    if (!this.clientId || !this.clientSecret) {
      this.logger.warn(`Naver API 키 없음 — mock 데이터 사용 (query: ${query})`);
      return getMockPlaces(type);
    }

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
        this.logger.warn(`Naver API 오류 ${response.status} — mock 데이터 사용`);
        return getMockPlaces(type);
      }

      const data = await response.json() as { items: NaverLocalItem[] };
      if (!data.items || data.items.length === 0) {
        return getMockPlaces(type);
      }

      return data.items.map((item) => ({
        name: item.title.replace(/<[^>]*>/g, ''),
        lat: parseInt(item.mapy) / 10_000_000,
        lng: parseInt(item.mapx) / 10_000_000,
        category: item.category,
        address: item.roadAddress || item.address,
        link: item.link,
      }));
    } catch (err) {
      this.logger.warn(`Naver API 요청 실패 — mock 데이터 사용: ${err}`);
      return getMockPlaces(type);
    }
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
