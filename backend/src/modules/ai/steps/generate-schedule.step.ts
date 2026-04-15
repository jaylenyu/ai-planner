import { Injectable, Logger } from '@nestjs/common';
import {
  PipelineContext,
  ScheduleItem,
} from '../interfaces/pipeline-result.interface';
import { OrderedPlace } from '../interfaces/place.interface';

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

function roundUpToTen(minutes: number): number {
  return Math.ceil(minutes / 10) * 10;
}

function addHint(target: string[], message: string): void {
  if (!target.includes(message)) target.push(message);
}

@Injectable()
export class GenerateScheduleStep {
  private readonly logger = new Logger(GenerateScheduleStep.name);

  execute(ctx: PipelineContext): void {
    const intent = ctx.intent!;
    let places = [...(ctx.orderedPlaces ?? [])];
    const softConstraints = ctx.parsed?.softConstraints;
    ctx.unsupportedHints = [...(ctx.unsupportedHints ?? [])];

    if (places.length === 0) {
      ctx.scheduleItems = [];
      ctx.polyline = [];
      ctx.summary = `${intent.location} ${intent.mode === 'date' ? '데이트' : '당일치기'} — 일정 없음`;
      this.logger.warn('일정 생성 대상 장소가 없습니다.');
      return;
    }

    const startMin = parseTime(intent.startTime);
    let durationLimitEnd =
      softConstraints?.durationCapMinutes != null
        ? startMin + softConstraints.durationCapMinutes
        : null;

    const activeDurationLimit = durationLimitEnd;
    if (
      activeDurationLimit != null &&
      places.some(
        (place) =>
          place.required &&
          place.anchorMinutes != null &&
          place.anchorMinutes > activeDurationLimit,
      )
    ) {
      addHint(
        ctx.unsupportedHints,
        `${softConstraints?.durationCapMinutes}분 이내 요청이 시간 앵커와 충돌해 반영되지 않았습니다.`,
      );
      durationLimitEnd = null;
    }

    let build = this.buildSchedule(places, intent.startTime);
    const endTargets = [
      softConstraints?.endByMinutes ?? null,
      durationLimitEnd,
    ].filter((value): value is number => value != null);
    const enforcedEnd = endTargets.length > 0 ? Math.min(...endTargets) : null;

    if (enforcedEnd != null) {
      while (build.endMin > enforcedEnd) {
        const droppableIndex = this.findLastDroppableIndex(places);
        if (droppableIndex < 0) break;
        places = places.filter((_, index) => index !== droppableIndex);
        build = this.buildSchedule(places, intent.startTime);
      }

      if (
        softConstraints?.endByMinutes != null &&
        build.endMin > softConstraints.endByMinutes
      ) {
        addHint(
          ctx.unsupportedHints,
          `${formatTime(softConstraints.endByMinutes)} 전 종료 요청이 반영되지 않았습니다.`,
        );
      }

      if (durationLimitEnd != null && build.endMin > durationLimitEnd) {
        addHint(
          ctx.unsupportedHints,
          `${softConstraints?.durationCapMinutes}분 이내 요청이 반영되지 않았습니다.`,
        );
      }
    }

    ctx.scheduleItems = build.items;
    ctx.polyline = places.map(
      (place) => [place.lat, place.lng] as [number, number],
    );

    const typeList = build.items
      .map((item) => TYPE_LABELS[item.type] ?? item.type)
      .join(', ');
    ctx.summary = `${intent.location} ${intent.mode === 'date' ? '데이트' : '당일치기'} — ${typeList}`;

    const totalMin = build.endMin - parseTime(intent.startTime);
    this.logger.log(
      `일정 생성 완료: ${build.items.length}개 장소, 총 ${totalMin}분`,
    );
  }

  private findLastDroppableIndex(places: OrderedPlace[]): number {
    for (let index = places.length - 1; index >= 0; index -= 1) {
      if (!places[index].required) return index;
    }
    return -1;
  }

  private buildSchedule(
    places: OrderedPlace[],
    startTime: string,
  ): { items: ScheduleItem[]; endMin: number } {
    let currentMin = parseTime(startTime);
    const items: ScheduleItem[] = [];
    let lastFoodEndMin = -1;
    const FOOD_GAP_MIN = 240;

    for (const place of places) {
      currentMin = roundUpToTen(currentMin);

      if (items.length > 0) {
        currentMin += place.travelMinutes + 10;
        currentMin = roundUpToTen(currentMin);
      }

      if (place.anchorMinutes != null) {
        currentMin = Math.max(currentMin, roundUpToTen(place.anchorMinutes));
        if (currentMin - place.anchorMinutes > 40) {
          this.logger.warn(
            `[${place.slotId}] 시간 앵커 미스: ${place.name} ${formatTime(place.anchorMinutes)} → ${formatTime(currentMin)}`,
          );
        }
      } else if (place.type === 'food' && lastFoodEndMin >= 0) {
        const minStart = lastFoodEndMin + FOOD_GAP_MIN;
        if (currentMin < minStart) {
          currentMin = roundUpToTen(minStart);
        }
      }

      const dwell = DWELL_MINUTES[place.type] ?? 60;
      const startStr = formatTime(currentMin);
      const endMin = roundUpToTen(currentMin + dwell);
      const endStr = formatTime(endMin);

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

      currentMin = endMin;
      if (place.type === 'food') lastFoodEndMin = currentMin;
    }

    return { items, endMin: currentMin };
  }
}
