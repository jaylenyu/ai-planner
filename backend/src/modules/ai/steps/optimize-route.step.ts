import { Injectable, Logger } from '@nestjs/common';
import { PipelineContext } from '../interfaces/pipeline-result.interface';
import { OrderedPlace } from '../interfaces/place.interface';

export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Injectable()
export class OptimizeRouteStep {
  private readonly logger = new Logger(OptimizeRouteStep.name);

  execute(ctx: PipelineContext): void {
    const intent = ctx.intent!;
    const candidates = ctx.candidates!;

    // 활동 순서(intent.activities)에서 type별 후보 매핑
    const places = intent.activities
      .map((activity) => {
        const place = candidates[activity.type];
        if (!place) return null;
        return { ...place, type: activity.type };
      })
      .filter((p): p is (typeof candidates)[string] & { type: string } => p !== null);

    if (places.length === 0) {
      ctx.orderedPlaces = [];
      return;
    }

    // Nearest Neighbor (시작점: intent 위치)
    const unvisited = [...places];
    const ordered: OrderedPlace[] = [];
    let currentLat = intent.lat;
    let currentLng = intent.lng;

    while (unvisited.length > 0) {
      let minDist = Infinity;
      let minIdx = 0;

      unvisited.forEach((p, i) => {
        const d = haversine(currentLat, currentLng, p.lat, p.lng);
        if (d < minDist) { minDist = d; minIdx = i; }
      });

      const next = unvisited.splice(minIdx, 1)[0];
      const travelMinutes = Math.ceil((minDist / 5) * 60); // 도보 5km/h

      ordered.push({
        ...next,
        order: ordered.length + 1,
        distanceFromPrev: minDist,
        travelMinutes,
      });

      currentLat = next.lat;
      currentLng = next.lng;
    }

    ctx.orderedPlaces = ordered;
    this.logger.log(`경로 최적화 완료: ${ordered.map((p) => p.name).join(' → ')}`);
  }
}
