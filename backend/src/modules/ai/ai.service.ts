import { Injectable, Logger } from '@nestjs/common';
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
  ): Promise<PipelineResult> {
    const ctx: PipelineContext = { rawInput, mode };

    this.logger.log(`[Pipeline] 시작: "${rawInput}" (${mode})`);

    await this.parseInputStep.execute(ctx); // Step 1
    await this.extractIntentStep.execute(ctx); // Step 2
    await this.searchPlacesStep.execute(ctx); // Step 3
    this.selectCandidatesStep.execute(ctx); // Step 4
    this.optimizeRouteStep.execute(ctx); // Step 5
    this.generateScheduleStep.execute(ctx); // Step 6

    this.logger.log(`[Pipeline] 완료: ${ctx.summary}`);

    const startMin = this.parseTimeToMin(ctx.intent!.startTime);
    const lastItem = ctx.scheduleItems![ctx.scheduleItems!.length - 1];
    const endTimeStr = lastItem?.time.split(' - ')[1] ?? ctx.intent!.endTime;
    const endMin = this.parseTimeToMin(endTimeStr);

    return {
      summary: ctx.summary!,
      items: ctx.scheduleItems!,
      polyline: ctx.polyline!,
      totalDurationMin: endMin - startMin,
    };
  }

  private parseTimeToMin(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }
}
