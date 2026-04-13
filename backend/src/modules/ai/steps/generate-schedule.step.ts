import { Injectable, Logger } from '@nestjs/common';
import {
  PipelineContext,
  ScheduleItem,
} from '../interfaces/pipeline-result.interface';

const DWELL_MINUTES: Record<string, number> = {
  food: 90,
  cafe: 45,
  activity: 90,
  attraction: 90,
  rest: 30,
};

const TYPE_LABELS: Record<string, string> = {
  food: '식사',
  cafe: '카페',
  activity: '액티비티',
  attraction: '관광',
  rest: '휴식',
};

function parseTime(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function formatTime(totalMin: number): string {
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

@Injectable()
export class GenerateScheduleStep {
  private readonly logger = new Logger(GenerateScheduleStep.name);

  execute(ctx: PipelineContext): void {
    const intent = ctx.intent!;
    const places = ctx.orderedPlaces!;

    let currentMin = parseTime(intent.startTime);
    const items: ScheduleItem[] = [];

    for (const place of places) {
      // 첫 번째 장소는 이동 시간 없음, 이후는 이전 이동 시간 포함
      if (items.length > 0) {
        currentMin += place.travelMinutes + 10; // buffer 10분
      }

      const dwell = DWELL_MINUTES[place.type] ?? 60;
      const startStr = formatTime(currentMin);
      const endStr = formatTime(currentMin + dwell);

      items.push({
        order: place.order,
        name: place.name,
        lat: place.lat,
        lng: place.lng,
        type: place.type,
        time: `${startStr} - ${endStr}`,
        address: place.address,
        distanceFromPrev: place.distanceFromPrev,
      });

      currentMin += dwell;
    }

    ctx.scheduleItems = items;
    ctx.polyline = places.map((p) => [p.lat, p.lng] as [number, number]);

    // 요약 생성
    const typeList = items.map((i) => TYPE_LABELS[i.type] ?? i.type).join(', ');
    ctx.summary = `${intent.location} ${intent.mode === 'date' ? '데이트' : '당일치기'} — ${typeList}`;

    const totalMin = currentMin - parseTime(intent.startTime);
    this.logger.log(`일정 생성 완료: ${items.length}개 장소, 총 ${totalMin}분`);
  }
}
