import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PlaceResult } from '../interfaces/place.interface';

const TYPE_HINTS: Record<string, { label: string; keywords: string }> = {
  food: { label: '식사', keywords: '맛집, 레스토랑, 식당, 코스요리' },
  cafe: { label: '카페', keywords: '카페, 디저트, 커피, 브런치' },
  activity: { label: '액티비티', keywords: '체험, 실내 놀거리, 게임' },
  rest: { label: '휴식/산책', keywords: '산책, 공원, 전망' },
  attraction: { label: '전시/관광', keywords: '미술관, 박물관, 전시, 관광지' },
};

interface AiPlaceFallbackOptions {
  location: string;
  activityType: string;
  originalQuery: string;
  rawInput?: string;
  lat: number;
  lng: number;
  limit?: number;
}

interface AiPlacePayload {
  name?: string;
  address?: string;
  lat?: number | string;
  lng?: number | string;
  category?: string;
  link?: string;
}

@Injectable()
export class AiPlacesFallbackService {
  private readonly logger = new Logger(AiPlacesFallbackService.name);
  private readonly openai: OpenAI | null;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('OPENROUTER_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'OPENROUTER_API_KEY가 없어 AI 장소 폴백을 비활성화합니다.',
      );
      this.openai = null;
      return;
    }

    this.openai = new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://date-planner.us',
        'X-Title': 'AI Itinerary Planner',
      },
    });
  }

  async suggestPlaces(options: AiPlaceFallbackOptions): Promise<PlaceResult[]> {
    if (!this.openai) return [];

    const limit = Math.min(options.limit ?? 3, 5);
    const typeHint =
      TYPE_HINTS[options.activityType] ??
      ({ label: options.activityType, keywords: '' } as const);

    const systemPrompt =
      '당신은 한국 데이트/여행 코스를 제안하는 어시스턴트입니다. ' +
      '반드시 JSON 배열만 출력하며 형식은 [{"name":"", "address":"", "lat":37.56, "lng":126.97, "category":"", "link":""}] 입니다. ' +
      '좌표는 위도(lat), 경도(lng) 실수로 기입하고, 요청 지역 반경 15km 이내의 실제 장소만 포함하세요. ' +
      '잘 모를 경우 추측하지 말고 배열을 비워두세요.';

    const userPrompt =
      `사용자 입력: ${options.rawInput ?? '(직접 입력 미제공)'}` +
      `\n요청 지역: ${options.location} (${options.lat.toFixed(4)}, ${options.lng.toFixed(4)})` +
      `\n활동 분류: ${typeHint.label}` +
      `\n검색어 힌트: ${options.originalQuery}` +
      `\n연관 키워드: ${typeHint.keywords}` +
      `\n필요 개수: ${limit}개` +
      '\n각 장소는 구체적인 상호명과 도로명주소를 포함해야 합니다.';

    try {
      const response = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        temperature: 0.4,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 600,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        this.logger.warn('AI 장소 폴백 응답이 비어있습니다.');
        return [];
      }

      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        this.logger.warn(
          `AI 장소 폴백 JSON 파싱 실패: ${content.slice(0, 80)}`,
        );
        return [];
      }

      const payload = JSON.parse(jsonMatch[0]) as AiPlacePayload[];
      const mapped = payload
        .map((item) => this.mapToPlace(item, options.activityType))
        .filter((item): item is PlaceResult => item !== null);

      return mapped.slice(0, limit);
    } catch (error) {
      this.logger.warn(`AI 장소 폴백 생성 실패: ${(error as Error).message}`);
      return [];
    }
  }

  private mapToPlace(
    item: AiPlacePayload,
    activityType: string,
  ): PlaceResult | null {
    if (!item?.name) return null;
    const lat = this.parseNumber(item.lat);
    const lng = this.parseNumber(item.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }

    return {
      name: item.name.trim(),
      address: (item.address ?? '').trim() || '주소 미기재',
      lat,
      lng,
      category: item.category?.trim() || `[AI] ${activityType}`,
      link: item.link,
    };
  }

  private parseNumber(value?: number | string): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = Number(value.replace(/[^0-9.\-]/g, ''));
      return Number.isNaN(parsed) ? NaN : parsed;
    }
    return NaN;
  }
}
