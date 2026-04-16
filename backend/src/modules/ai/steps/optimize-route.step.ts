import { Injectable, Logger } from '@nestjs/common';
import { PipelineContext } from '../interfaces/pipeline-result.interface';
import { OrderedPlace } from '../interfaces/place.interface';
import { haversine } from '../../../shared/utils/haversine';

type RoutePlace = Omit<
  OrderedPlace,
  'order' | 'distanceFromPrev' | 'travelMinutes'
>;

function roundUpToTen(minutes: number): number {
  return Math.ceil(minutes / 10) * 10;
}

@Injectable()
export class OptimizeRouteStep {
  private readonly logger = new Logger(OptimizeRouteStep.name);

  private rand(ctx: PipelineContext): number {
    return ctx.randomFn ? ctx.randomFn() : Math.random();
  }

  execute(ctx: PipelineContext): void {
    const intent = ctx.intent!;
    const candidates = ctx.candidates!;

    const places = intent.activities
      .map((activity) => {
        const list = candidates[activity.slotId];
        if (!list?.length) return null;
        const place = list[0];
        if (!place) return null;
        return {
          ...place,
          slotId: activity.slotId,
          type: activity.type,
          anchorMinutes: activity.anchorMinutes,
          required: activity.required,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    if (places.length === 0) {
      ctx.orderedPlaces = [];
      return;
    }

    // 흐름 모드: 사용자 순서 보존, TSP 재정렬 금지
    const locked = intent.activities.some((a) => a.orderLocked === true);
    if (locked) {
      const ordered = this.makeOrdered(places, intent.lat, intent.lng);
      ctx.orderedPlaces = ordered;
      this.logger.log(
        `경로 최적화 생략(흐름 모드): ${ordered.map((p) => p.name).join(' → ')}`,
      );
      return;
    }

    const starts: OrderedPlace[][] = [];
    // 1) 결정론적 NN 1회
    starts.push(this.nearestNeighbor(places, intent.lat, intent.lng));
    // 2) 랜덤 초기해 다중 생성
    const randomTryCount = Math.min(12, Math.max(4, places.length * 3));
    for (let i = 0; i < randomTryCount; i += 1) {
      const shuffled = this.shuffle(places, () => this.rand(ctx));
      starts.push(this.makeOrdered(shuffled, intent.lat, intent.lng));
    }

    const optimized = starts.map((start) =>
      this.twoOpt(start, intent.lat, intent.lng),
    );
    const ranked = optimized
      .map((route) => ({
        route,
        dist: this.totalDistance(route, intent.lat, intent.lng),
      }))
      .sort((a, b) => a.dist - b.dist);
    const topCount = Math.min(3, ranked.length);
    const winner = ranked[Math.floor(this.rand(ctx) * topCount)].route;

    ctx.orderedPlaces = winner;
    this.logger.log(
      `경로 최적화 완료: ${winner.map((p) => p.name).join(' → ')}`,
    );
  }

  private nearestNeighbor(
    places: RoutePlace[],
    startLat: number,
    startLng: number,
  ): OrderedPlace[] {
    const unvisited = [...places];
    const ordered: OrderedPlace[] = [];
    let currentLat = startLat;
    let currentLng = startLng;

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
      ordered.push({
        ...next,
        order: ordered.length + 1,
        distanceFromPrev: minDist,
        travelMinutes: roundUpToTen(Math.ceil((minDist / 5) * 60)),
      });
      currentLat = next.lat;
      currentLng = next.lng;
    }
    return ordered;
  }

  private makeOrdered(
    sequence: RoutePlace[],
    startLat: number,
    startLng: number,
  ): OrderedPlace[] {
    let prevLat = startLat;
    let prevLng = startLng;
    return sequence.map((place, idx) => {
      const dist = haversine(prevLat, prevLng, place.lat, place.lng);
      prevLat = place.lat;
      prevLng = place.lng;
      return {
        ...place,
        order: idx + 1,
        distanceFromPrev: dist,
        travelMinutes: roundUpToTen(Math.ceil((dist / 5) * 60)),
      };
    });
  }

  private shuffle<T>(arr: T[], rand: () => number): T[] {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
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
        travelMinutes: roundUpToTen(Math.ceil((dist / 5) * 60)),
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
