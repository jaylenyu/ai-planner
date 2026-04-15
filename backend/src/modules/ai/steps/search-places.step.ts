import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PlacesService } from '../../places/places.service';
import { PipelineContext } from '../interfaces/pipeline-result.interface';
import { PlaceResult } from '../interfaces/place.interface';
import { ActivityIntent } from '../interfaces/intent.interface';

const FALLBACK_QUERIES: Record<string, string> = {
  attraction: '관광지 명소 볼거리',
  rest: '공원 산책',
  activity: '체험 놀거리',
  cafe: '카페',
  food: '맛집',
};

const MAX_RESULTS_PER_SOURCE = 5;
const MAX_MERGED_RESULTS = 10;
const GENERIC_FOOD_SLOT_QUERIES = new Set([
  '맛집',
  '한식',
  '일식',
  '중식',
  '양식',
  '고기',
  '해산물',
  '치킨',
  '저녁 맛집',
  '점심 맛집',
  '브런치 카페',
]);

function normalizePlaceKey(name: string): string {
  return name.replace(/\s+/g, '').toLowerCase();
}

@Injectable()
export class SearchPlacesStep {
  private readonly logger = new Logger(SearchPlacesStep.name);

  constructor(private readonly placesService: PlacesService) {}

  async execute(ctx: PipelineContext): Promise<void> {
    const intent = ctx.intent!;
    ctx.rawPlaces = {};
    const preferences = ctx.parsed?.preferences ?? [];

    for (const activity of intent.activities) {
      const queries = this.buildQueries(
        activity,
        intent.searchLocation,
        preferences,
      );
      const naverMerged: PlaceResult[] = [];
      const kakaoMerged: PlaceResult[] = [];

      for (const query of queries) {
        const [naverPlaces, kakaoPlaces] = await Promise.all([
          this.searchNaverPlaces(query, activity.type, intent),
          this.placesService.searchNearbyKakao(
            query,
            intent.lat,
            intent.lng,
            MAX_RESULTS_PER_SOURCE,
          ),
        ]);
        naverMerged.push(...naverPlaces);
        kakaoMerged.push(...kakaoPlaces);
      }

      const dedupedNaver = this.mergeSources(naverMerged, []);
      const dedupedKakao = this.mergeSources([], kakaoMerged);

      const merged = this.mergeSources(dedupedNaver, dedupedKakao);

      ctx.rawPlaces[activity.slotId] = merged;

      const placeLog =
        merged
          .map(
            (p, i) =>
              `  ${i + 1}. ${p.name} (${p.address}) [${p.source ?? 'unknown'}]`,
          )
          .join('\n') || '  (결과 없음)';
      this.logger.log(
        `[${activity.slotId} ${activity.type}] 통합 ${merged.length}개 (Naver ${dedupedNaver.length}, Kakao ${dedupedKakao.length}): ${queries[0]}${queries.length > 1 ? ` [menu queries +${queries.length - 1}]` : ''}\n${placeLog}`,
      );
    }

    const total = Object.values(ctx.rawPlaces).flat().length;
    if (total === 0) {
      throw new BadRequestException(
        '해당 지역에서 장소를 찾지 못했습니다. 다른 지역이나 활동을 입력해보세요.',
      );
    }
  }

  private buildQueries(
    activity: ActivityIntent,
    location: string,
    preferences: string[],
  ): string[] {
    if (activity.type !== 'food' || preferences.length === 0) {
      return [activity.naverQuery];
    }

    if (activity.orderLocked) {
      return [activity.naverQuery];
    }

    if (
      activity.slotQuery &&
      !GENERIC_FOOD_SLOT_QUERIES.has(activity.slotQuery)
    ) {
      return [activity.naverQuery];
    }

    const menuQueries = preferences.flatMap((keyword) => [
      `${location} ${keyword}`,
      `${location} ${keyword} 맛집`,
    ]);
    return [...new Set([...menuQueries, activity.naverQuery])];
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
        const retryQuery = `${intent.searchLocation} ${fallbackQ}`;
        const retry = await this.placesService.searchNearby(
          retryQuery,
          activityType,
          MAX_RESULTS_PER_SOURCE,
        );
        if (retry.length > 0) {
          results = retry;
          this.logger.warn(
            `[${activityType}] 폴백 검색어로 재시도: ${retryQuery}`,
          );
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
