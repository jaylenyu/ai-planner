import { Injectable, Logger } from '@nestjs/common';
import { PipelineContext } from '../interfaces/pipeline-result.interface';
import { PlaceResult } from '../interfaces/place.interface';

function haversine(
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

function scoreCandidate(
  place: PlaceResult,
  distanceKm: number,
  mode: 'date' | 'trip',
): number {
  const base =
    place.source === 'naver' ? 1 : place.source === 'ai' ? 0.92 : 0.85;
  const distancePenalty = distanceKm / (mode === 'date' ? 4 : 6);
  const linkBonus = place.link ? 0.02 : 0;
  return base + linkBonus - distancePenalty;
}

@Injectable()
export class SelectCandidatesStep {
  private readonly logger = new Logger(SelectCandidatesStep.name);

  execute(ctx: PipelineContext): void {
    const intent = ctx.intent!;
    const rawPlaces = ctx.rawPlaces!;
    ctx.candidates = {};

    // type별 필요 개수 계산 (food가 2개 activities면 2개 선택)
    const typeCounts: Record<string, number> = {};
    for (const a of intent.activities) {
      typeCounts[a.type] = (typeCounts[a.type] ?? 0) + 1;
    }

    // 전체 중복 방지용 이름 집합
    const usedNames = new Set<string>();

    for (const [type, places] of Object.entries(rawPlaces)) {
      if (!places.length) continue;

      const needed = typeCounts[type] ?? 1;

      // 반경 확장: date는 짧은 동선 유지(3→5km), trip은 넓게(3→5→10km)
      const RADIUS_STEPS = intent.mode === 'date' ? [3, 5] : [3, 5, 10];
      let filtered: PlaceResult[] = [];
      let usedRadius = RADIUS_STEPS[0];
      for (const radius of RADIUS_STEPS) {
        filtered = places.filter(
          (p) => haversine(intent.lat, intent.lng, p.lat, p.lng) <= radius,
        );
        usedRadius = radius;
        if (filtered.length > 0) break;
      }

      if (filtered.length === 0) {
        this.logger.warn(
          `[${type}] 반경 ${usedRadius}km 내 후보 없음 — 활동 제외`,
        );
        continue;
      }
      if (usedRadius > 3) {
        this.logger.warn(`[${type}] 반경 ${usedRadius}km로 확장하여 후보 검색`);
      }

      const scored = filtered
        .map((place) => {
          const distance = haversine(
            intent.lat,
            intent.lng,
            place.lat,
            place.lng,
          );
          const score = scoreCandidate(place, distance, intent.mode);
          return { place, distance, score };
        })
        .sort((a, b) => b.score - a.score || a.distance - b.distance);

      const picks: PlaceResult[] = [];
      for (const entry of scored) {
        if (picks.length >= needed) break;
        if (!usedNames.has(entry.place.name)) {
          entry.place.score = entry.score;
          picks.push(entry.place);
          usedNames.add(entry.place.name);
        }
      }

      if (picks.length === 0) {
        this.logger.warn(`[${type}] 중복 제외 후 후보 없음 — 활동 제외`);
        continue;
      }

      ctx.candidates[type] = picks;
      picks.forEach((pick) => {
        const dist = haversine(intent.lat, intent.lng, pick.lat, pick.lng);
        const score = pick.score ?? scoreCandidate(pick, dist, intent.mode);
        this.logger.log(
          `[${type}] 선택: ${pick.name} (${dist.toFixed(2)}km, score ${score.toFixed(
            2,
          )}, source=${pick.source ?? 'mix'})`,
        );
      });
    }
  }
}
