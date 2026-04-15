import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PipelineContext } from '../interfaces/pipeline-result.interface';
import {
  ActivityIntent,
  ActivitySlot,
  ActivityType,
  ParsedInput,
  RequestedCounts,
  ThemeTag,
} from '../interfaces/intent.interface';
import { PlacesService } from '../../places/places.service';
import { LOCATION_STOP_WORDS, normalizeLocation } from '../utils/location.util';
import { RegionService } from '../../../shared/region/region.service';
import { AliasLearningService } from '../../../shared/region/alias-learning.service';

// 최종 fallback 전용 — geocode가 모두 실패한 경우에만 사용
const SEOUL_FALLBACK_COORDS = { lat: 37.5665, lng: 126.978 };

const ACTIVITY_QUERY_MAP: Record<
  string,
  { query: string; type: ActivityType }
> = {
  파스타: { query: '파스타 이탈리안 레스토랑', type: 'food' },
  양식: { query: '양식 레스토랑 스테이크', type: 'food' },
  한식: { query: '한식 맛집', type: 'food' },
  일식: { query: '일식 스시 라멘', type: 'food' },
  중식: { query: '중식 중국집', type: 'food' },
  고기: { query: '고기집 삼겹살 갈비', type: 'food' },
  해산물: { query: '해산물 횟집 조개구이', type: 'food' },
  치킨: { query: '치킨 맥주 치맥', type: 'food' },
  피자: { query: '피자 레스토랑', type: 'food' },
  술: { query: '분위기 좋은 바 이자카야', type: 'food' },
  맛집: { query: '맛집 레스토랑', type: 'food' },
  저녁: { query: '저녁식사 레스토랑', type: 'food' },
  점심: { query: '점심 맛집', type: 'food' },
  브런치: { query: '브런치 카페', type: 'food' },
  카페: { query: '카페 디저트', type: 'cafe' },
  커피: { query: '카페 커피숍', type: 'cafe' },
  디저트: { query: '디저트 카페 케이크', type: 'cafe' },
  영화: { query: 'CGV 롯데시네마 메가박스 영화관', type: 'activity' },
  볼링: { query: '볼링장', type: 'activity' },
  쇼핑: { query: '쇼핑몰 백화점', type: 'activity' },
  노래방: { query: '노래방 코인노래방', type: 'activity' },
  방탈출: { query: '방탈출카페 방탈출', type: 'activity' },
  클라이밍: { query: '클라이밍센터 볼더링', type: 'activity' },
  전시: { query: '갤러리 전시관 미술관', type: 'attraction' },
  박물관: { query: '박물관', type: 'attraction' },
  뮤지컬: { query: '뮤지컬 공연장 연극', type: 'attraction' },
  산책: { query: '공원 산책로', type: 'rest' },
  공원: { query: '공원', type: 'rest' },
  한강: { query: '한강공원 한강변', type: 'rest' },
  바다: { query: '해변 바다', type: 'rest' },
  해변: { query: '해변 바다', type: 'rest' },
  야경: { query: '야경 전망대', type: 'rest' },
};

const CAFE_PREFERENCE_BLOCKLIST = new Set([
  '카페',
  '커피',
  '아메리카노',
  '에스프레소',
  '라떼',
  '밀크티',
  '버블티',
  '스무디',
  '주스',
  '에이드',
  '티',
  '차',
]);

const TIME_MAP: Record<string, { start: string; end: string }> = {
  morning: { start: '09:00', end: '13:00' },
  afternoon: { start: '13:00', end: '18:00' },
  evening: { start: '18:00', end: '23:00' },
  'full-day': { start: '10:00', end: '20:00' },
};

const TYPE_FALLBACK_LABELS: Record<ActivityType, string> = {
  food: '맛집',
  cafe: '카페',
  activity: '쇼핑',
  attraction: '전시',
  rest: '산책',
};

const THEME_QUERY_BOOSTS: Record<
  ThemeTag,
  { boost: string; applicableTypes: ActivityType[] }
> = {
  seaside: {
    boost: '바다 오션뷰',
    applicableTypes: ['food', 'cafe', 'rest'],
  },
  nature: {
    boost: '자연 전망',
    applicableTypes: ['cafe', 'rest', 'attraction'],
  },
  photo: {
    boost: '뷰 포토',
    applicableTypes: ['cafe', 'attraction', 'rest'],
  },
  nightView: {
    boost: '야경 전망',
    applicableTypes: ['rest', 'cafe', 'attraction'],
  },
  shopping: {
    boost: '쇼핑몰 백화점',
    applicableTypes: ['activity'],
  },
};

function makeSlotId(index: number): string {
  return `slot-${index}`;
}

@Injectable()
export class ExtractIntentStep {
  private readonly logger = new Logger(ExtractIntentStep.name);

  constructor(
    private readonly placesService: PlacesService,
    private readonly regionService: RegionService,
    private readonly aliasLearning: AliasLearningService,
  ) {}

  async execute(ctx: PipelineContext): Promise<void> {
    ctx.parsed!.location = normalizeLocation(ctx.parsed!.location);

    const parsed = ctx.parsed!;

    const registryRegion = this.regionService.getRegion(parsed.location);
    if (
      registryRegion &&
      registryRegion.type !== 'dong' &&
      registryRegion.type !== 'landmark'
    ) {
      parsed.location = registryRegion.shortName;
    }

    const baseResolved = await this.resolveCoordsWithValidation(
      parsed.location,
      ctx.rawInput,
    );
    const resolvedLocation = normalizeLocation(baseResolved.resolvedLocation);

    if (ctx.unrecognizedLocationToken && resolvedLocation !== '서울') {
      void this.aliasLearning.logUnrecognized(
        [ctx.unrecognizedLocationToken],
        resolvedLocation,
      );
    }

    if (resolvedLocation !== parsed.location) {
      this.logger.log(
        `location 업데이트: "${parsed.location}" → "${resolvedLocation}"`,
      );
      parsed.location = resolvedLocation;
    }

    let searchLocation = resolvedLocation;
    let coords = baseResolved.coords;
    const anchorArea = parsed.softConstraints?.anchorArea;
    if (anchorArea && anchorArea !== resolvedLocation) {
      const anchorResolved = await this.resolveCoordsWithValidation(
        anchorArea,
        ctx.rawInput,
      );
      searchLocation = normalizeLocation(anchorResolved.resolvedLocation);
      coords = anchorResolved.coords;
      this.logger.log(
        `검색 앵커 적용: ${resolvedLocation} → ${searchLocation}`,
      );
    }

    const themes = parsed.themes ?? [];
    const flow = parsed.flow;
    let ordered: ActivityIntent[];

    if (flow && flow.length >= 2) {
      ordered = flow.reduce<ActivityIntent[]>((acc, slot) => {
        const resolved = this.resolveFlowSlot(
          slot,
          searchLocation,
          parsed.preferences,
          themes,
        );
        if (resolved) acc.push(resolved);
        return acc;
      }, []);

      ordered = this.applyRequestedCounts(
        ordered,
        parsed.requestedCounts,
        searchLocation,
        parsed.preferences,
        themes,
        true,
      );

      if (ordered.length === 0) {
        throw new BadRequestException('인식 가능한 활동이 없습니다.');
      }
      this.logger.log(
        `흐름 모드: ${ordered.map((a) => `${a.slotId}:${a.type}${a.anchorMinutes != null ? `@${a.anchorMinutes}` : ''}`).join(' → ')}`,
      );
    } else {
      let activities: ActivityIntent[] = parsed.activities
        .map((activity, idx) =>
          this.resolveLabeledActivity(
            activity,
            searchLocation,
            parsed.preferences,
            themes,
            makeSlotId(idx),
            true,
          ),
        )
        .filter((a): a is ActivityIntent => a !== null);

      activities = this.applyRequestedCounts(
        activities,
        parsed.requestedCounts,
        searchLocation,
        parsed.preferences,
        themes,
        false,
      );

      if (activities.length === 0) {
        throw new BadRequestException('인식 가능한 활동이 없습니다.');
      }

      ordered = this.orderByMode(activities, ctx.mode);
    }

    ordered = this.applyFillers(
      ordered,
      parsed,
      searchLocation,
      ctx.mode,
      themes,
    );

    const times = TIME_MAP[parsed.timeOfDay] ?? TIME_MAP['evening'];

    ctx.intent = {
      location: resolvedLocation,
      searchLocation,
      lat: coords.lat,
      lng: coords.lng,
      mode: ctx.mode,
      activities: ordered,
      startTime: times.start,
      endTime: times.end,
    };

    this.logger.log(
      `의도 추출 완료: ${parsed.location} / ${ordered.map((a) => `${a.slotId}:${a.type}`).join(' → ')}`,
    );
  }

  private async resolveCoordsWithValidation(
    initialLocation: string,
    rawInput: string,
  ): Promise<{
    coords: { lat: number; lng: number };
    resolvedLocation: string;
  }> {
    const regionRecord = this.regionService.getRegion(initialLocation);
    if (regionRecord?.lat && regionRecord?.lng) {
      this.logger.log(
        `regions.json 좌표 사용: ${initialLocation} (${regionRecord.lat.toFixed(4)},${regionRecord.lng.toFixed(4)})`,
      );
      return {
        coords: { lat: regionRecord.lat, lng: regionRecord.lng },
        resolvedLocation: initialLocation,
      };
    }

    const resolved = await this.placesService.geocodeCity(initialLocation);
    if (resolved) {
      this.logger.log(
        `동적 좌표 해석: ${initialLocation} → ${resolved.lat},${resolved.lng}`,
      );
      return { coords: resolved, resolvedLocation: initialLocation };
    }

    const candidates = rawInput.match(/[가-힣]{2,6}/g) ?? [];
    for (const candidate of candidates) {
      if (LOCATION_STOP_WORDS.has(candidate)) continue;

      const normalized = this.regionService.normalize(candidate);
      if (!normalized) continue;

      const geoResult = await this.placesService.geocodeCity(normalized);
      if (geoResult) {
        this.logger.warn(
          `location 재해석: "${initialLocation}" → "${normalized}" (${geoResult.lat},${geoResult.lng})`,
        );
        return { coords: geoResult, resolvedLocation: normalized };
      }
    }

    this.logger.warn(`좌표 해석 실패, 서울로 fallback: ${initialLocation}`);
    return {
      coords: SEOUL_FALLBACK_COORDS,
      resolvedLocation: '서울',
    };
  }

  private applyRequestedCounts(
    activities: ActivityIntent[],
    requestedCounts: RequestedCounts | undefined,
    location: string,
    preferences: string[],
    themes: ThemeTag[],
    orderLocked: boolean,
  ): ActivityIntent[] {
    if (!requestedCounts) return activities;

    const next = [...activities];
    const counts: Partial<Record<ActivityType, number>> = {};
    for (const activity of next) {
      counts[activity.type] = (counts[activity.type] ?? 0) + 1;
    }

    for (const [type, requested] of Object.entries(requestedCounts) as Array<
      [ActivityType, number]
    >) {
      const current = counts[type] ?? 0;
      for (let index = current; index < requested; index += 1) {
        next.push(
          this.createTypeIntent(
            type,
            location,
            preferences,
            themes,
            makeSlotId(next.length),
            true,
            orderLocked,
          ),
        );
      }
    }

    return next;
  }

  private applyFillers(
    ordered: ActivityIntent[],
    parsed: ParsedInput,
    location: string,
    mode: 'date' | 'trip',
    themes: ThemeTag[],
  ): ActivityIntent[] {
    const MODE_MIN: Record<string, number> = { trip: 4, date: 3 };
    const fillerLabels = this.resolveFillers(parsed, mode);
    const minCount = MODE_MIN[mode] ?? 3;
    const existingTypes = new Set(ordered.map((a) => a.type));

    for (const filler of fillerLabels) {
      if (ordered.length >= minCount) break;
      const resolved = this.resolveLabeledActivity(
        filler,
        location,
        parsed.preferences,
        themes,
        makeSlotId(ordered.length),
        false,
      );
      if (!resolved) continue;
      if (resolved.type === 'rest' && parsed.softConstraints?.indoorOnly) {
        continue;
      }
      if (!existingTypes.has(resolved.type)) {
        ordered.push(resolved);
        existingTypes.add(resolved.type);
        this.logger.log(`[자동 추가] ${filler} (${resolved.type})`);
      }
    }

    return ordered;
  }

  private resolveFillers(parsed: ParsedInput, mode: 'date' | 'trip'): string[] {
    const shoppingPreferred = parsed.themes?.includes('shopping') ?? false;
    const nightViewPreferred = parsed.themes?.includes('nightView') ?? false;
    const indoorOnly = parsed.softConstraints?.indoorOnly ?? false;

    let fillers: string[];
    switch (parsed.fillerStrategy) {
      case 'food-heavy':
        fillers = ['맛집', '카페', '맛집', '산책'];
        break;
      case 'cafe-heavy':
        fillers = ['카페', '맛집', '산책', '전시'];
        break;
      case 'active':
        fillers = ['쇼핑', '맛집', '카페', '볼링'];
        break;
      case 'calm':
        fillers = ['카페', '전시', '산책', '맛집'];
        break;
      default:
        fillers =
          mode === 'trip'
            ? ['맛집', '카페', '산책', '전시']
            : ['카페', '산책', '맛집'];
        break;
    }

    if (shoppingPreferred && !fillers.includes('쇼핑')) {
      fillers.unshift('쇼핑');
    }
    if (nightViewPreferred && !fillers.includes('야경')) {
      fillers.push('야경');
    }
    if (indoorOnly) {
      fillers = fillers.filter(
        (label) => !['산책', '공원', '한강', '바다', '야경'].includes(label),
      );
      if (!fillers.includes('전시')) fillers.push('전시');
      if (!fillers.includes('영화')) fillers.push('영화');
    }
    return fillers;
  }

  private resolveFlowSlot(
    slot: ActivitySlot,
    location: string,
    preferences: string[],
    themes: ThemeTag[],
  ): ActivityIntent | null {
    const resolved = this.resolveActivity(
      slot.slotQuery,
      location,
      preferences,
      slot.type,
      true,
    );
    if (!resolved) return null;
    return {
      ...resolved,
      slotId: slot.slotId,
      slotQuery: slot.slotQuery,
      anchorMinutes: slot.anchorMinutes,
      orderLocked: true,
      required: true,
      naverQuery: this.applyThemeBoosts(resolved.naverQuery, slot.type, themes),
    };
  }

  private createTypeIntent(
    type: ActivityType,
    location: string,
    preferences: string[],
    themes: ThemeTag[],
    slotId: string,
    required: boolean,
    orderLocked: boolean,
  ): ActivityIntent {
    const label = TYPE_FALLBACK_LABELS[type];
    const resolved = this.resolveActivity(
      label,
      location,
      preferences,
      type,
      false,
    );
    if (!resolved) {
      throw new BadRequestException(`기본 활동 생성 실패: ${type}`);
    }
    return {
      ...resolved,
      slotId,
      slotQuery: label,
      required,
      orderLocked,
      naverQuery: this.applyThemeBoosts(resolved.naverQuery, type, themes),
    };
  }

  private resolveLabeledActivity(
    activity: string,
    location: string,
    preferences: string[],
    themes: ThemeTag[],
    slotId: string,
    required: boolean,
  ): ActivityIntent | null {
    const resolved = this.resolveActivity(activity, location, preferences);
    if (!resolved) return null;
    return {
      ...resolved,
      slotId,
      slotQuery: activity,
      required,
      orderLocked: false,
      naverQuery: this.applyThemeBoosts(
        resolved.naverQuery,
        resolved.type,
        themes,
      ),
    };
  }

  private applyThemeBoosts(
    query: string,
    type: ActivityType,
    themes: ThemeTag[],
  ): string {
    if (themes.length === 0) return query;

    const boosts = themes
      .map((theme) => THEME_QUERY_BOOSTS[theme])
      .filter((entry) => entry && entry.applicableTypes.includes(type))
      .map((entry) => entry.boost);

    if (boosts.length === 0) return query;

    const dedupedBoosts = boosts.filter(
      (boost, index) => boosts.indexOf(boost) === index,
    );
    return `${query} ${dedupedBoosts.join(' ')}`.trim();
  }

  private resolveActivity(
    activity: string,
    location: string,
    preferences: string[],
    typeHint?: ActivityType,
    explicitSlotQuery = false,
  ): Pick<ActivityIntent, 'type' | 'naverQuery'> | null {
    const preferredFoodQuery =
      explicitSlotQuery || typeHint === 'food'
        ? null
        : this.resolvePreferredFoodQuery(preferences);

    if (ACTIVITY_QUERY_MAP[activity]) {
      const { query, type } = ACTIVITY_QUERY_MAP[activity];
      return {
        type,
        naverQuery:
          type === 'food' && preferredFoodQuery
            ? `${location} ${preferredFoodQuery}`
            : `${location} ${query}`,
      };
    }

    for (const [key, val] of Object.entries(ACTIVITY_QUERY_MAP)) {
      if (activity.includes(key) || key.includes(activity)) {
        return {
          type: typeHint ?? val.type,
          naverQuery:
            (typeHint ?? val.type) === 'food' && preferredFoodQuery
              ? `${location} ${preferredFoodQuery}`
              : `${location} ${val.query}`,
        };
      }
    }

    if (typeHint) {
      if (typeHint === 'food') {
        return { type: 'food', naverQuery: `${location} ${activity}`.trim() };
      }
      return {
        type: typeHint,
        naverQuery: `${location} ${activity}`.trim(),
      };
    }

    return {
      type: 'food',
      naverQuery: `${location} ${preferredFoodQuery ?? activity} 맛집`,
    };
  }

  private resolvePreferredFoodQuery(preferences: string[]): string | null {
    for (const preference of preferences) {
      const exact = ACTIVITY_QUERY_MAP[preference];
      if (exact?.type === 'food') {
        return exact.query;
      }

      for (const [key, value] of Object.entries(ACTIVITY_QUERY_MAP)) {
        if (value.type !== 'food') continue;
        if (preference.includes(key) || key.includes(preference)) {
          return value.query;
        }
      }

      const normalized = preference.replace(/\s+/g, '').trim();
      if (normalized && !CAFE_PREFERENCE_BLOCKLIST.has(normalized)) {
        return normalized;
      }
    }

    return null;
  }

  private orderByMode(
    activities: ActivityIntent[],
    mode: 'date' | 'trip',
  ): ActivityIntent[] {
    if (mode === 'date') {
      const typeOrder: ActivityType[] = [
        'food',
        'activity',
        'cafe',
        'attraction',
        'rest',
      ];
      return [...activities].sort(
        (a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type),
      );
    }

    const typeOrder: ActivityType[] = [
      'activity',
      'attraction',
      'food',
      'cafe',
      'rest',
    ];
    return [...activities].sort(
      (a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type),
    );
  }
}
