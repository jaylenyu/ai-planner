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
  const base = place.source === 'naver' || place.source === 'kakao' ? 1 : 0.85;
  const distancePenalty = distanceKm / (mode === 'date' ? 4 : 6);
  const linkBonus = place.link ? 0.02 : 0;
  return base + linkBonus - distancePenalty;
}

@Injectable()
export class SelectCandidatesStep {
  private readonly logger = new Logger(SelectCandidatesStep.name);

  private rand(ctx: PipelineContext): number {
    return ctx.randomFn ? ctx.randomFn() : Math.random();
  }

  execute(ctx: PipelineContext): void {
    const intent = ctx.intent!;
    const rawPlaces = ctx.rawPlaces!;
    ctx.candidates = {};

    // 유효 중심 계산: rawPlaces의 중심(centroid)을 구해 초기 geocode 오차를 보정
    const allPlaces = Object.values(rawPlaces).flat();
    let centerLat = intent.lat;
    let centerLng = intent.lng;
    if (allPlaces.length >= 3) {
      // 1) 1차 중심
      const meanLat =
        allPlaces.reduce((s, p) => s + p.lat, 0) / allPlaces.length;
      const meanLng =
        allPlaces.reduce((s, p) => s + p.lng, 0) / allPlaces.length;
      // 2) 중심으로부터의 거리 계산 후 중앙 80%만 사용해 재평균(간단한 트림)
      const withDist = allPlaces
        .map((p) => ({ p, d: haversine(meanLat, meanLng, p.lat, p.lng) }))
        .sort((a, b) => a.d - b.d);
      const keep = Math.max(3, Math.floor(withDist.length * 0.8));
      const trimmed = withDist.slice(0, keep).map((x) => x.p);
      const tLat = trimmed.reduce((s, p) => s + p.lat, 0) / trimmed.length;
      const tLng = trimmed.reduce((s, p) => s + p.lng, 0) / trimmed.length;
      const driftKm = haversine(intent.lat, intent.lng, tLat, tLng);
      const threshold = intent.mode === 'date' ? 3 : 5; // date는 3km, trip은 5km 허용
      if (driftKm > threshold) {
        this.logger.warn(
          `유효 중심 보정: intent(${intent.lat.toFixed(4)},${intent.lng.toFixed(
            4,
          )}) → centroid(${tLat.toFixed(4)},${tLng.toFixed(4)}) (drift ${driftKm.toFixed(
            2,
          )}km)`,
        );
        centerLat = tLat;
        centerLng = tLng;
      }
    }

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
          (p) => haversine(centerLat, centerLng, p.lat, p.lng) <= radius,
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

      const scored = filtered.map((place) => {
        const distance = haversine(centerLat, centerLng, place.lat, place.lng);
        const score = scoreCandidate(place, distance, intent.mode);
        return { place, distance, score };
      });

      const picks: PlaceResult[] = [];
      const pool = [...scored];
      while (pool.length > 0 && picks.length < needed) {
        const idx = Math.floor(this.rand(ctx) * pool.length);
        const [entry] = pool.splice(idx, 1);
        if (usedNames.has(entry.place.name)) continue;
        entry.place.score = entry.score;
        picks.push(entry.place);
        usedNames.add(entry.place.name);
      }

      if (picks.length === 0) {
        this.logger.warn(`[${type}] 중복 제외 후 후보 없음 — 활동 제외`);
        continue;
      }

      ctx.candidates[type] = picks;
      picks.forEach((pick) => {
        const dist = haversine(centerLat, centerLng, pick.lat, pick.lng);
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
