import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { GeneratePlanDto } from './dto/generate-plan.dto';

@Injectable()
export class PlanService {
  private readonly logger = new Logger(PlanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async list(userId: string) {
    return this.prisma.plan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { items: { orderBy: { order: 'asc' } } },
    });
  }

  async generate(userId: string, dto: GeneratePlanDto) {
    const result = await this.aiService.runPipeline(dto.rawInput, dto.mode);

    const plan = await this.prisma.plan.create({
      data: {
        userId,
        rawInput: dto.rawInput,
        mode: dto.mode,
        summary: result.summary,
        items: {
          create: result.items.map((item) => ({
            order: item.order,
            name: item.name,
            lat: item.lat,
            lng: item.lng,
            type: item.type,
            time: item.time,
          })),
        },
      },
      include: { items: { orderBy: { order: 'asc' } } },
    });

    this.logger.log(`플랜 저장 완료: ${plan.id}`);

    return {
      planId: plan.id,
      summary: result.summary,
      items: result.items,
      polyline: result.polyline,
      totalDurationMin: result.totalDurationMin,
      unsupportedHints: result.unsupportedHints,
    };
  }
}
