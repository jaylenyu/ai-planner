import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PlacesService } from '../../places/places.service';
import { PipelineContext } from '../interfaces/pipeline-result.interface';
import { AiPlacesFallbackService } from '../services/ai-places-fallback.service';
import { PlaceResult } from '../interfaces/place.interface';

const FALLBACK_QUERIES: Record<string, string> = {
  attraction: '관광지 명소 볼거리',
  rest: '공원 산책',
  activity: '체험 놀거리',
  cafe: '카페',
  food: '맛집',
};

const MAX_RESULTS_PER_SOURCE = 6;
const MAX_MERGED_RESULTS = 10;

function normalizePlaceKey(name: string): string {
  return name.replace(/\s+/g, '').toLowerCase();
}

@Injectable()
export class SearchPlacesStep {
  private readonly logger = new Logger(SearchPlacesStep.name);

  constructor(
    private readonly placesService: PlacesService,
    private readonly aiPlacesFallbackService: AiPlacesFallbackService,
  ) {}

  async execute(ctx: PipelineContext): Promise<void> {
    const intent = ctx.intent!;
    ctx.rawPlaces = {};

    for (const activity of intent.activities) {
      const [naverPlaces, aiPlaces] = await Promise.all([
        this.searchNaverPlaces(activity.naverQuery, activity.type, intent),
        this.aiPlacesFallbackService.suggestPlaces({
          location: intent.location,
          activityType: activity.type,
          originalQuery: activity.naverQuery,
          rawInput: ctx.rawInput,
          lat: intent.lat,
          lng: intent.lng,
          limit: MAX_RESULTS_PER_SOURCE,
        }),
      ]);

      const merged = this.mergeSources(naverPlaces, aiPlaces);

      ctx.rawPlaces[activity.type] = [
        ...(ctx.rawPlaces[activity.type] ?? []),
        ...merged,
      ];

      const placeLog =
        merged
          .map(
            (p, i) =>
              `  ${i + 1}. ${p.name} (${p.address}) [${p.source ?? 'unknown'}]`,
          )
          .join('\n') || '  (결과 없음)';
      this.logger.log(
        `[${activity.type}] 통합 ${merged.length}개 (Naver ${naverPlaces.length}, AI ${aiPlaces.length}): ${activity.naverQuery}\n${placeLog}`,
      );
    }

    const total = Object.values(ctx.rawPlaces).flat().length;
    if (total === 0) {
      throw new BadRequestException(
        '해당 지역에서 장소를 찾지 못했습니다. 다른 지역이나 활동을 입력해보세요.',
      );
    }
  }

  private async searchNaverPlaces(
    query: string,
    activityType: string,
    intent: NonNullable<PipelineContext['intent']>,
  ): Promise<PlaceResult[]> {
    let results = await this.placesService.searchNearby(
      query,
      activityType,
      MAX_RESULTS_PER_SOURCE,
    );

    if (results.length === 0) {
      const fallbackQ = FALLBACK_QUERIES[activityType];
      if (fallbackQ) {
        const retryQuery = `${intent.location} ${fallbackQ}`;
        const retry = await this.placesService.searchNearby(
          retryQuery,
          activityType,
          MAX_RESULTS_PER_SOURCE,
        );
        if (retry.length > 0) {
          results = retry;
          this.logger.warn(`[${activityType}] 폴백 검색어로 재시도: ${retryQuery}`);
        }
      }
    }

    return results;
  }

  private mergeSources(
    naverPlaces: PlaceResult[],
    aiPlaces: PlaceResult[],
  ): PlaceResult[] {
    const merged: PlaceResult[] = [];
    const seen = new Set<string>();

    const pushIfNew = (place: PlaceResult) => {
      const key = normalizePlaceKey(place.name);
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(place);
    };

    for (const place of naverPlaces) pushIfNew(place);
    for (const place of aiPlaces) pushIfNew(place);

    return merged.slice(0, MAX_MERGED_RESULTS);
  }
}
