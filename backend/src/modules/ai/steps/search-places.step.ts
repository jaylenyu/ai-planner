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

const MAX_RESULTS_PER_QUERY = 5;
const AI_MIN_RESULTS = 2;

function mergePlaces(
  primary: PlaceResult[],
  fallback: PlaceResult[],
): PlaceResult[] {
  const seen = new Set(primary.map((p) => p.name));
  const merged = [...primary];
  for (const place of fallback) {
    if (seen.has(place.name)) continue;
    merged.push(place);
    seen.add(place.name);
  }
  return merged.slice(0, MAX_RESULTS_PER_QUERY);
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
      let aiAugmented = false;
      let places = await this.placesService.searchNearby(
        activity.naverQuery,
        activity.type,
        MAX_RESULTS_PER_QUERY,
      );

      if (places.length === 0) {
        const fallbackQ = FALLBACK_QUERIES[activity.type];
        if (fallbackQ) {
          const retryQuery = `${intent.location} ${fallbackQ}`;
          const retry = await this.placesService.searchNearby(
            retryQuery,
            activity.type,
            MAX_RESULTS_PER_QUERY,
          );
          if (retry.length > 0) {
            places = retry;
            this.logger.warn(
              `[${activity.type}] 폴백 검색어로 재시도: ${retryQuery}`,
            );
          }
        }
      }

      if (places.length < AI_MIN_RESULTS) {
        const aiPlaces = await this.aiPlacesFallbackService.suggestPlaces({
          location: intent.location,
          activityType: activity.type,
          originalQuery: activity.naverQuery,
          rawInput: ctx.rawInput,
          lat: intent.lat,
          lng: intent.lng,
          limit: MAX_RESULTS_PER_QUERY,
        });
        if (aiPlaces.length > 0) {
          aiAugmented = true;
          places = mergePlaces(places, aiPlaces);
          this.logger.warn(
            `[${activity.type}] AI 폴백${places.length === aiPlaces.length ? ' 대체' : ' 보강'} — ${aiPlaces.length}개 활용`,
          );
        }
      }

      ctx.rawPlaces[activity.type] = [
        ...(ctx.rawPlaces[activity.type] ?? []),
        ...places,
      ];

      const placeLog =
        places
          .map((p, i) => `  ${i + 1}. ${p.name} (${p.address})`)
          .join('\n') || '  (결과 없음)';
      this.logger.log(
        `[${activity.type}] ${places.length}개 검색됨${aiAugmented ? ' (AI 보강)' : ''}: ${activity.naverQuery}\n${placeLog}`,
      );
    }

    const total = Object.values(ctx.rawPlaces).flat().length;
    if (total === 0) {
      throw new BadRequestException(
        '해당 지역에서 장소를 찾지 못했습니다. 다른 지역이나 활동을 입력해보세요.',
      );
    }
  }
}
