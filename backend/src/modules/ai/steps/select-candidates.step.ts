import { Injectable, Logger } from '@nestjs/common';
import { PipelineContext } from '../interfaces/pipeline-result.interface';
import { PlaceResult } from '../interfaces/place.interface';

const CHAIN_PATTERN =
  /(스타벅스|이디야|투썸|빽다방|커피빈|메가커피|탐앤탐스|할리스)/;

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
  preferences: string[],
  options: { chainPenalty: boolean; compactRoute: boolean },
): number {
  const base = place.source === 'naver' || place.source === 'kakao' ? 1 : 0.85;
  const divisor = options.compactRoute
    ? mode === 'date'
      ? 2
      : 3
    : mode === 'date'
      ? 4
      : 6;
  const distancePenalty = distanceKm / divisor;
  const linkBonus = place.link ? 0.02 : 0;
  const preferenceBonus = preferences.reduce((bonus, keyword) => {
    const normalized = keyword.replace(/\s+/g, '').toLowerCase();
    const name = place.name.replace(/\s+/g, '').toLowerCase();
    const category = place.category.replace(/\s+/g, '').toLowerCase();
    const address = place.address.replace(/\s+/g, '').toLowerCase();

    if (!normalized) return bonus;
    if (name.includes(normalized)) return bonus + 0.8;
    if (category.includes(normalized)) return bonus + 0.45;
    if (address.includes(normalized)) return bonus + 0.2;
    return bonus;
  }, 0);
  const chainPenalty =
    options.chainPenalty && CHAIN_PATTERN.test(place.name) ? 0.5 : 0;

  return base + linkBonus + preferenceBonus - distancePenalty - chainPenalty;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase();
}

function joinedPlaceText(place: PlaceResult): string {
  return normalizeText(`${place.name} ${place.category} ${place.address}`);
}

function isCafeLike(place: PlaceResult): boolean {
  const text = joinedPlaceText(place);
  return [
    '카페',
    '커피',
    '디저트',
    '베이커리',
    '빵집',
    '케이크',
    '아이스크림',
    '주스',
    '스무디',
    '티',
    '라떼',
    '에이드',
  ].some((keyword) => text.includes(keyword));
}

function isFoodLike(place: PlaceResult): boolean {
  const text = joinedPlaceText(place);
  return [
    '식당',
    '맛집',
    '한식',
    '중식',
    '일식',
    '양식',
    '고기',
    '해장국',
    '국밥',
    '감자탕',
    '설렁탕',
    '탕',
    '찌개',
    '전골',
    '파스타',
    '피자',
    '치킨',
    '버거',
    '스테이크',
    '초밥',
    '회',
    '스시',
    '라멘',
    '분식',
    '곱창',
    '막창',
    '갈비',
    '삼겹살',
    '백반',
    '한정식',
    '국수',
    '이자카야',
    '술집',
    '와인바',
    '펍',
  ].some((keyword) => text.includes(keyword));
}

function estimateSpreadKm(places: PlaceResult[]): number {
  if (places.length < 2) return 0;

  let minLat = places[0].lat;
  let maxLat = places[0].lat;
  let minLng = places[0].lng;
  let maxLng = places[0].lng;

  for (const place of places) {
    minLat = Math.min(minLat, place.lat);
    maxLat = Math.max(maxLat, place.lat);
    minLng = Math.min(minLng, place.lng);
    maxLng = Math.max(maxLng, place.lng);
  }

  return haversine(minLat, minLng, maxLat, maxLng);
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
    const preferences = ctx.parsed?.preferences ?? [];
    const compactRoute = ctx.parsed?.softConstraints?.compactRoute ?? false;
    const chainPenalty = ctx.parsed?.chainPenalty ?? false;
    const locked = intent.activities.some((activity) => activity.orderLocked);
    ctx.candidates = {};

    const allPlaces = Object.values(rawPlaces).flat();
    let baseCenterLat = intent.lat;
    let baseCenterLng = intent.lng;
    if (allPlaces.length >= 3) {
      const meanLat =
        allPlaces.reduce((sum, place) => sum + place.lat, 0) / allPlaces.length;
      const meanLng =
        allPlaces.reduce((sum, place) => sum + place.lng, 0) / allPlaces.length;
      const withDist = allPlaces
        .map((place) => ({
          place,
          distance: haversine(meanLat, meanLng, place.lat, place.lng),
        }))
        .sort((a, b) => a.distance - b.distance);
      const keep = Math.max(3, Math.floor(withDist.length * 0.8));
      const trimmed = withDist.slice(0, keep).map((entry) => entry.place);
      const tLat =
        trimmed.reduce((sum, place) => sum + place.lat, 0) / trimmed.length;
      const tLng =
        trimmed.reduce((sum, place) => sum + place.lng, 0) / trimmed.length;
      const driftKm = haversine(intent.lat, intent.lng, tLat, tLng);
      const threshold = intent.mode === 'date' ? 3 : 5;
      if (driftKm > threshold) {
        this.logger.warn(
          `유효 중심 보정: intent(${intent.lat.toFixed(4)},${intent.lng.toFixed(
            4,
          )}) → centroid(${tLat.toFixed(4)},${tLng.toFixed(4)}) (drift ${driftKm.toFixed(
            2,
          )}km)`,
        );
        baseCenterLat = tLat;
        baseCenterLng = tLng;
      }
    }

    const spreadKm = estimateSpreadKm(allPlaces);
    const wideRegion = spreadKm > 12;
    const radiusSteps = wideRegion
      ? intent.mode === 'date'
        ? [5, 10, 20]
        : [5, 10, 20, 30]
      : intent.mode === 'date'
        ? [3, 5]
        : [3, 5, 10];

    if (wideRegion) {
      this.logger.log(
        `넓은 지역 감지: spread ${spreadKm.toFixed(2)}km, radius ${radiusSteps.join('→')}km`,
      );
    }

    const usedNames = new Set<string>();
    let currentCenterLat = baseCenterLat;
    let currentCenterLng = baseCenterLng;
    const dynamicCenter = locked || compactRoute;

    for (const activity of intent.activities) {
      const places = rawPlaces[activity.slotId] ?? [];
      if (places.length === 0) continue;

      const centerLat = dynamicCenter ? currentCenterLat : baseCenterLat;
      const centerLng = dynamicCenter ? currentCenterLng : baseCenterLng;

      let filtered: PlaceResult[] = [];
      let usedRadius = radiusSteps[0];
      for (const radius of radiusSteps) {
        filtered = places.filter(
          (place) =>
            haversine(centerLat, centerLng, place.lat, place.lng) <= radius,
        );
        usedRadius = radius;
        if (filtered.length > 0) break;
      }

      if (filtered.length === 0) {
        const nearest = [...places].sort(
          (a, b) =>
            haversine(centerLat, centerLng, a.lat, a.lng) -
            haversine(centerLat, centerLng, b.lat, b.lng),
        )[0];
        if (!nearest) {
          this.logger.warn(
            `[${activity.slotId}] 반경 ${usedRadius}km 내 후보 없음 — 활동 제외`,
          );
          continue;
        }
        filtered = [nearest];
        this.logger.warn(
          `[${activity.slotId}] 반경 ${usedRadius}km 내 후보 없음 — 가장 가까운 후보로 대체: ${nearest.name}`,
        );
      }

      if (usedRadius > 3) {
        this.logger.warn(
          `[${activity.slotId}] 반경 ${usedRadius}km로 확장하여 후보 검색`,
        );
      }

      const typeSpecific = filtered.filter((place) => {
        if (activity.type === 'food') {
          return !isCafeLike(place) || isFoodLike(place);
        }
        if (activity.type === 'cafe') {
          return !isFoodLike(place) || isCafeLike(place);
        }
        return true;
      });
      if (typeSpecific.length > 0) filtered = typeSpecific;

      const scored = filtered.map((place) => {
        const distance = haversine(centerLat, centerLng, place.lat, place.lng);
        const score = scoreCandidate(
          place,
          distance,
          intent.mode,
          preferences,
          {
            chainPenalty,
            compactRoute,
          },
        );
        return { place, distance, score };
      });

      const pool = [...scored].sort(
        (a, b) => b.score - a.score || a.distance - b.distance,
      );
      let picked: PlaceResult | undefined;
      while (pool.length > 0) {
        const topScore = pool[0].score;
        const tied = pool.filter(
          (entry) => Math.abs(entry.score - topScore) < 1e-6,
        );
        const choicePool = tied.length > 1 ? tied : [pool[0]];
        const idx = Math.floor(this.rand(ctx) * choicePool.length);
        const entry = choicePool[idx] ?? choicePool[0];
        const removeIdx = pool.findIndex(
          (candidate) => candidate.place.name === entry.place.name,
        );
        if (removeIdx >= 0) pool.splice(removeIdx, 1);
        if (usedNames.has(entry.place.name)) continue;
        entry.place.score = entry.score;
        picked = entry.place;
        break;
      }

      if (!picked) {
        this.logger.warn(
          `[${activity.slotId}] 중복 제외 후 후보 없음 — 활동 제외`,
        );
        continue;
      }

      ctx.candidates[activity.slotId] = [picked];
      usedNames.add(picked.name);

      const dist = haversine(centerLat, centerLng, picked.lat, picked.lng);
      const score =
        picked.score !== undefined
          ? picked.score
          : scoreCandidate(picked, dist, intent.mode, preferences, {
              chainPenalty,
              compactRoute,
            });
      this.logger.log(
        `[${activity.slotId}] 선택: ${picked.name} (${dist.toFixed(
          2,
        )}km, score ${score.toFixed(2)}, source=${picked.source ?? 'mix'})`,
      );

      if (dynamicCenter) {
        currentCenterLat = picked.lat;
        currentCenterLng = picked.lng;
      }
    }
  }
}
