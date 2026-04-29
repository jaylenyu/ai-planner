import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ParseInputStep } from './steps/parse-input.step';
import { ExtractIntentStep } from './steps/extract-intent.step';
import { SearchPlacesStep } from './steps/search-places.step';
import { SelectCandidatesStep } from './steps/select-candidates.step';
import { OptimizeRouteStep } from './steps/optimize-route.step';
import { GenerateScheduleStep } from './steps/generate-schedule.step';
import {
  PipelineContext,
  PipelineResult,
} from './interfaces/pipeline-result.interface';
import { DiversityHistory } from './utils/place-diversity.util';

interface RunPipelineOptions {
  diversityHistory?: DiversityHistory;
  randomFn?: () => number;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly parseInputStep: ParseInputStep,
    private readonly extractIntentStep: ExtractIntentStep,
    private readonly searchPlacesStep: SearchPlacesStep,
    private readonly selectCandidatesStep: SelectCandidatesStep,
    private readonly optimizeRouteStep: OptimizeRouteStep,
    private readonly generateScheduleStep: GenerateScheduleStep,
  ) {}

  async runPipeline(
    rawInput: string,
    mode: 'date' | 'trip',
    options: RunPipelineOptions = {},
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    const ctx: PipelineContext = {
      rawInput,
      mode,
      diversityHistory: options.diversityHistory,
      randomFn: options.randomFn,
    };

    this.logger.log(`[Pipeline] 시작: "${rawInput}" (${mode})`);

    try {
      await this.parseInputStep.execute(ctx);
      await this.extractIntentStep.execute(ctx);
      await this.searchPlacesStep.execute(ctx);
      this.selectCandidatesStep.execute(ctx);
      this.optimizeRouteStep.execute(ctx);
      this.generateScheduleStep.execute(ctx);
    } catch (err) {
      const elapsed = Date.now() - startTime;
      this.logger.error(
        `[Pipeline] 실패 (${elapsed}ms): ${(err as Error).message}`,
      );
      if (
        err instanceof BadRequestException ||
        err instanceof InternalServerErrorException
      ) {
        throw err;
      }
      throw new InternalServerErrorException(
        '일정 생성 중 오류가 발생했습니다. 다시 시도해주세요.',
      );
    }

    const elapsed = Date.now() - startTime;

    if (!ctx.scheduleItems?.length || !ctx.intent) {
      this.logger.warn(`[Pipeline] 빈 결과 (${elapsed}ms)`);
      throw new BadRequestException(
        '일정을 생성할 수 없습니다. 지역과 활동을 좀 더 구체적으로 입력해주세요.',
      );
    }

    this.logger.log(`[Pipeline] 완료 (${elapsed}ms): ${ctx.summary}`);

    const startMin = this.parseTimeToMin(ctx.intent.startTime);
    const lastItem = ctx.scheduleItems[ctx.scheduleItems.length - 1];
    const endTimeStr = lastItem?.time.split(' - ')[1] ?? ctx.intent.endTime;
    const endMin = this.parseTimeToMin(endTimeStr);

    return {
      summary: ctx.summary!,
      items: ctx.scheduleItems,
      polyline: ctx.polyline!,
      totalDurationMin: endMin - startMin,
      unsupportedHints: ctx.unsupportedHints ?? [],
      llmCost: ctx.llmCost ?? 0,
    };
  }

  private parseTimeToMin(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }
}
