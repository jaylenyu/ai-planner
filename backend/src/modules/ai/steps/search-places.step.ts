import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PlacesService } from '../../places/places.service';
import { PipelineContext } from '../interfaces/pipeline-result.interface';

const FALLBACK_QUERIES: Record<string, string> = {
  attraction: '관광지 명소 볼거리',
  rest: '공원 산책',
  activity: '체험 놀거리',
  cafe: '카페',
  food: '맛집',
};

@Injectable()
export class SearchPlacesStep {
  private readonly logger = new Logger(SearchPlacesStep.name);

  constructor(private readonly placesService: PlacesService) {}

  async execute(ctx: PipelineContext): Promise<void> {
    const intent = ctx.intent!;
    ctx.rawPlaces = {};

    for (const activity of intent.activities) {
      let places = await this.placesService.searchNearby(
        activity.naverQuery,
        activity.type,
        5,
      );

      // 결과 0개 시 넓은 폴백 검색어로 1회 재시도
      if (places.length === 0) {
        const fallbackQ = FALLBACK_QUERIES[activity.type];
        if (fallbackQ) {
          const retryQuery = `${intent.location} ${fallbackQ}`;
          const retry = await this.placesService.searchNearby(retryQuery, activity.type, 5);
          if (retry.length > 0) {
            places = retry;
            this.logger.warn(
              `[${activity.type}] 폴백 검색어로 재시도: ${retryQuery}`,
            );
          }
        }
      }

      // 같은 type이 여러 activities에 있을 때 결과를 누적 (덮어쓰지 않음)
      ctx.rawPlaces[activity.type] = [
        ...(ctx.rawPlaces[activity.type] ?? []),
        ...places,
      ];
      this.logger.log(
        `[${activity.type}] ${places.length}개 검색됨: ${activity.naverQuery}\n` +
        places.map((p, i) => `  ${i + 1}. ${p.name} (${p.address})`).join('\n'),
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
