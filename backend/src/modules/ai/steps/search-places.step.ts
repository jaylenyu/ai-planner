import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PlacesService } from '../../places/places.service';
import { PipelineContext } from '../interfaces/pipeline-result.interface';

@Injectable()
export class SearchPlacesStep {
  private readonly logger = new Logger(SearchPlacesStep.name);

  constructor(private readonly placesService: PlacesService) {}

  async execute(ctx: PipelineContext): Promise<void> {
    const intent = ctx.intent!;
    ctx.rawPlaces = {};

    for (const activity of intent.activities) {
      const places = await this.placesService.searchNearby(
        activity.naverQuery,
        activity.type,
        5,
      );
      ctx.rawPlaces[activity.type] = places;
      this.logger.log(
        `[${activity.type}] ${places.length}개 검색됨: ${activity.naverQuery}`,
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
