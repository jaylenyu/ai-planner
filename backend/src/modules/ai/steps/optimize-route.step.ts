import { Injectable, Logger } from '@nestjs/common';
import { PipelineContext } from '../interfaces/pipeline-result.interface';
import { OrderedPlace } from '../interfaces/place.interface';
import { normalizePlaceKey } from '../utils/place-diversity.util';
import { haversine } from '../../../shared/utils/haversine';

type RoutePlace = Omit<
  OrderedPlace,
  'order' | 'distanceFromPrev' | 'travelMinutes'
>;

type CandidateGroup = {
  slotId: string;
  places: RoutePlace[];
};

type BeamState = {
  places: RoutePlace[];
  keys: Set<string>;
  score: number;
};

type EvaluatedRoute = {
  route: OrderedPlace[];
  distance: number;
  finalScore: number;
};

const BEAM_WIDTH = 64;
const DUPLICATE_PLACE_PENALTY = 4;

function roundUpToTen(minutes: number): number {
  return Math.ceil(minutes / 10) * 10;
}

@Injectable()
export class OptimizeRouteStep {
  private readonly logger = new Logger(OptimizeRouteStep.name);
  private distanceMemo = new Map<string, number>();

  private rand(ctx: PipelineContext): number {
    return ctx.randomFn ? ctx.randomFn() : Math.random();
  }

  execute(ctx: PipelineContext): void {
    this.distanceMemo = new Map<string, number>();
    const intent = ctx.intent!;
    const candidates = ctx.candidates!;

    const groups = intent.activities
      .map((activity): CandidateGroup => {
        const list = candidates[activity.slotId] ?? [];
        return {
          slotId: activity.slotId,
          places: list.map((place) => ({
            ...place,
            slotId: activity.slotId,
            type: activity.type,
            anchorMinutes: activity.anchorMinutes,
            required: activity.required,
          })),
        };
      })
      .filter((group) => group.places.length > 0);

    const distancePenaltyDivisor = intent.mode === 'date' ? 2.5 : 4;
    const combinations = this.buildCandidateCombinations(
      groups,
      intent.lat,
      intent.lng,
      distancePenaltyDivisor,
    );
    if (combinations.length === 0) {
      ctx.orderedPlaces = [];
      return;
    }

    const locked = intent.activities.some((a) => a.orderLocked === true);
    const selectionRoll = this.rand(ctx);
    const ranked = combinations
      .map((sequence) => {
        const route = locked
          ? this.makeOrdered(sequence, intent.lat, intent.lng)
          : this.optimizeSequence(sequence, intent.lat, intent.lng);
        const distance = this.totalDistance(route, intent.lat, intent.lng);
        const candidateScore = sequence.reduce(
          (sum, place) => sum + (place.score ?? 0),
          0,
        );
        return {
          route,
          distance,
          finalScore:
            candidateScore -
            this.duplicatePlacePenalty(sequence) -
            distance / distancePenaltyDivisor,
        };
      })
      .sort((a, b) => b.finalScore - a.finalScore || a.distance - b.distance);

    const winner = this.pickWeightedTopRoute(ranked, selectionRoll);
    ctx.orderedPlaces = winner.route;

    const routeNames = winner.route.map((p) => p.name).join(' → ');
    this.logger.log(
      `${locked ? '흐름 후보 조합' : '경로 후보 조합'} 최적화 완료: ${routeNames} (distance ${winner.distance.toFixed(2)}km, score ${winner.finalScore.toFixed(2)})`,
    );
  }

  private buildCandidateCombinations(
    groups: CandidateGroup[],
    startLat: number,
    startLng: number,
    distancePenaltyDivisor: number,
  ): RoutePlace[][] {
    let beams: BeamState[] = [{ places: [], keys: new Set(), score: 0 }];

    for (const group of groups) {
      const next: BeamState[] = [];
      for (const beam of beams) {
        let addedUniqueCandidate = false;
        const pushCandidate = (place: RoutePlace, duplicatePenalty = 0) => {
          const key = normalizePlaceKey(place.name);
          const prev = beam.places[beam.places.length - 1];
          const prevLat = prev?.lat ?? startLat;
          const prevLng = prev?.lng ?? startLng;
          const distancePenalty =
            this.distance(prevLat, prevLng, place.lat, place.lng) /
            distancePenaltyDivisor;
          next.push({
            places: [...beam.places, place],
            keys: new Set([...beam.keys, key]),
            score:
              beam.score +
              (place.score ?? 0) -
              distancePenalty -
              duplicatePenalty,
          });
        };

        for (const place of group.places) {
          const key = normalizePlaceKey(place.name);
          if (beam.keys.has(key)) continue;
          addedUniqueCandidate = true;
          pushCandidate(place);
        }

        if (!addedUniqueCandidate && beam.places.length > 0) {
          for (const place of group.places) {
            pushCandidate(place, DUPLICATE_PLACE_PENALTY);
          }
        }
      }

      beams = next.sort((a, b) => b.score - a.score).slice(0, BEAM_WIDTH);
      if (beams.length === 0) break;
    }

    return beams.map((beam) => beam.places).filter((places) => places.length);
  }

  private duplicatePlacePenalty(places: RoutePlace[]): number {
    const seen = new Set<string>();
    let duplicateCount = 0;

    for (const place of places) {
      const key = normalizePlaceKey(place.name);
      if (seen.has(key)) {
        duplicateCount += 1;
      } else {
        seen.add(key);
      }
    }

    return duplicateCount * DUPLICATE_PLACE_PENALTY;
  }

  private pickWeightedTopRoute(
    ranked: EvaluatedRoute[],
    selectionRoll: number,
  ): EvaluatedRoute {
    if (ranked.length === 0) {
      return { route: [], distance: 0, finalScore: 0 };
    }
    if (ranked.length === 1) return ranked[0];

    const bestScore = ranked[0].finalScore;
    const top = ranked.filter(
      (entry, index) => index < 5 || bestScore - entry.finalScore <= 0.75,
    );
    const weighted = top.map((entry) => ({
      entry,
      weight: Math.max(0.05, 1 + entry.finalScore - (bestScore - 0.75)),
    }));
    const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
    let cursor = selectionRoll * totalWeight;

    for (const item of weighted) {
      cursor -= item.weight;
      if (cursor <= 0) return item.entry;
    }

    return weighted[weighted.length - 1].entry;
  }

  private optimizeSequence(
    places: RoutePlace[],
    startLat: number,
    startLng: number,
  ): OrderedPlace[] {
    return this.twoOpt(
      this.nearestNeighbor(places, startLat, startLng),
      startLat,
      startLng,
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
        const d = this.distance(currentLat, currentLng, p.lat, p.lng);
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
      const dist = this.distance(prevLat, prevLng, place.lat, place.lng);
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

  private totalDistance(
    places: OrderedPlace[],
    startLat: number,
    startLng: number,
  ): number {
    if (places.length === 0) return 0;
    let distance = this.distance(
      startLat,
      startLng,
      places[0].lat,
      places[0].lng,
    );
    for (let i = 0; i < places.length - 1; i += 1) {
      distance += this.distance(
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
    let bestDistance = this.totalDistance(best, startLat, startLng);
    let improved = true;

    while (improved) {
      improved = false;
      for (let i = 0; i < best.length - 1; i += 1) {
        for (let k = i + 1; k < best.length; k += 1) {
          const newRoute = this.twoOptSwap(best, i, k);
          const newDistance = this.totalDistance(newRoute, startLat, startLng);
          if (newDistance < bestDistance) {
            best = newRoute;
            bestDistance = newDistance;
            improved = true;
          }
        }
      }
    }

    return this.makeOrdered(best, startLat, startLng);
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

  private distance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const a = `${lat1.toFixed(6)},${lng1.toFixed(6)}`;
    const b = `${lat2.toFixed(6)},${lng2.toFixed(6)}`;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    const cached = this.distanceMemo.get(key);
    if (cached !== undefined) return cached;
    const value = haversine(lat1, lng1, lat2, lng2);
    this.distanceMemo.set(key, value);
    return value;
  }
}
