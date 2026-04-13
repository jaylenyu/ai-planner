import { Injectable, Logger } from '@nestjs/common';
import { PipelineContext } from '../interfaces/pipeline-result.interface';

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

@Injectable()
export class SelectCandidatesStep {
  private readonly logger = new Logger(SelectCandidatesStep.name);

  execute(ctx: PipelineContext): void {
    const intent = ctx.intent!;
    const rawPlaces = ctx.rawPlaces!;
    ctx.candidates = {};

    for (const [type, places] of Object.entries(rawPlaces)) {
      if (!places.length) continue;

      const RADIUS_KM = 3;
      const filtered = places.filter((p) => {
        const dist = haversine(intent.lat, intent.lng, p.lat, p.lng);
        return dist <= RADIUS_KM;
      });

      if (filtered.length === 0) {
        this.logger.warn(
          `[${type}] 반경 ${RADIUS_KM}km 내 후보 없음 — 활동 제외`,
        );
        continue; // 반경 밖이면 candidates에 추가하지 않음
      }

      // 기준점에서 거리 오름차순 정렬 → 가장 가까운 곳 선택
      const sorted = [...filtered].sort(
        (a, b) =>
          haversine(intent.lat, intent.lng, a.lat, a.lng) -
          haversine(intent.lat, intent.lng, b.lat, b.lng),
      );

      // 이미 선택된 장소명과 중복되지 않는 첫 번째 후보 선택
      const usedNames = new Set(Object.values(ctx.candidates).map((p) => p.name));
      const pick = sorted.find((p) => !usedNames.has(p.name));
      if (!pick) {
        this.logger.warn(`[${type}] 중복 제외 후 후보 없음 — 활동 제외`);
        continue;
      }

      ctx.candidates[type] = pick;
      const dist = haversine(intent.lat, intent.lng, pick.lat, pick.lng);
      this.logger.log(`[${type}] 선택: ${pick.name} (${dist.toFixed(2)}km)`);
    }
  }
}
