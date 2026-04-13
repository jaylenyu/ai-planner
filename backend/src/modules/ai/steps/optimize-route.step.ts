import { Injectable, Logger } from '@nestjs/common';
import { PipelineContext } from '../interfaces/pipeline-result.interface';
import { OrderedPlace } from '../interfaces/place.interface';

export function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
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

    // 활동 순서(intent.activities)에서 type별 후보 매핑 (같은 type은 인덱스 기반으로 다른 장소 할당)
    const typeIndex: Record<string, number> = {};
    const places = intent.activities
      .map((activity) => {
        const list = candidates[activity.type];
        if (!list?.length) return null;
        const idx = typeIndex[activity.type] ?? 0;
        typeIndex[activity.type] = idx + 1;
        const place = list[idx];
        if (!place) return null;
        return { ...place, type: activity.type };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

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
        if (d < minDist) {
          minDist = d;
          minIdx = i;
        }
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

    // 2-opt 개선으로 전체 이동거리 최소화 시도
    const improved = this.twoOpt(ordered, intent.lat, intent.lng);
    ctx.orderedPlaces = improved;
    this.logger.log(
      `경로 최적화 완료: ${improved.map((p) => p.name).join(' → ')}`,
    );
  }

  private totalDistance(
    places: OrderedPlace[],
    startLat: number,
    startLng: number,
  ): number {
    if (places.length === 0) return 0;
    let distance = haversine(startLat, startLng, places[0].lat, places[0].lng);
    for (let i = 0; i < places.length - 1; i += 1) {
      distance += haversine(
        places[i].lat,
        places[i].lng,
        places[i + 1].lat,
        places[i + 1].lng,
      );
    }
    return distance;
  }

  private twoOpt(
    places: OrderedPlace[],
    startLat: number,
    startLng: number,
  ): OrderedPlace[] {
    if (places.length < 3) return places;
    let best = [...places];
    let improved = true;

    while (improved) {
      improved = false;
      for (let i = 0; i < best.length - 1; i += 1) {
        for (let k = i + 1; k < best.length; k += 1) {
          const newRoute = this.twoOptSwap(best, i, k);
          if (
            this.totalDistance(newRoute, startLat, startLng) <
            this.totalDistance(best, startLat, startLng)
          ) {
            best = newRoute;
            improved = true;
          }
        }
      }
    }

    // order, distanceFromPrev, travelMinutes 재계산
    let prevLat = startLat;
    let prevLng = startLng;
    return best.map((place, idx) => {
      const dist = haversine(prevLat, prevLng, place.lat, place.lng);
      prevLat = place.lat;
      prevLng = place.lng;
      return {
        ...place,
        order: idx + 1,
        distanceFromPrev: dist,
        travelMinutes: Math.ceil((dist / 5) * 60),
      };
    });
  }

  private twoOptSwap(
    route: OrderedPlace[],
    i: number,
    k: number,
  ): OrderedPlace[] {
    const start = route.slice(0, i);
    const middle = route.slice(i, k + 1).reverse();
    const end = route.slice(k + 1);
    return [...start, ...middle, ...end];
  }
}
