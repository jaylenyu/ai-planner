import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { ParseInputStep } from './steps/parse-input.step';
import { ExtractIntentStep } from './steps/extract-intent.step';
import { SearchPlacesStep } from './steps/search-places.step';
import { SelectCandidatesStep } from './steps/select-candidates.step';
import { OptimizeRouteStep } from './steps/optimize-route.step';
import { GenerateScheduleStep } from './steps/generate-schedule.step';
import { PlacesModule } from '../places/places.module';
import { AiPlacesFallbackService } from './services/ai-places-fallback.service';
import { RegionModule } from '../../shared/region/region.module';

@Module({
  imports: [PlacesModule, RegionModule],
  providers: [
    AiService,
    ParseInputStep,
    ExtractIntentStep,
    AiPlacesFallbackService,
    SearchPlacesStep,
    SelectCandidatesStep,
    OptimizeRouteStep,
    GenerateScheduleStep,
  ],
  exports: [AiService],
})
export class AiModule {}
