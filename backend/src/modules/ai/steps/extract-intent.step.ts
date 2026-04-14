import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PipelineContext } from '../interfaces/pipeline-result.interface';
import { ActivityIntent } from '../interfaces/intent.interface';
import { PlacesService } from '../../places/places.service';

const LOCATION_COORDS: Record<string, { lat: number; lng: number }> = {
  // 서울 주요 지역
  강남역: { lat: 37.4979, lng: 127.0276 },
  강남: { lat: 37.4979, lng: 127.0276 },
  홍대입구: { lat: 37.5573, lng: 126.9241 },
  홍대: { lat: 37.5573, lng: 126.9241 },
  연남동: { lat: 37.5605, lng: 126.9237 },
  망리단길: { lat: 37.5573, lng: 126.9241 },
  이태원: { lat: 37.5344, lng: 126.9949 },
  해방촌: { lat: 37.5401, lng: 126.9887 },
  경리단길: { lat: 37.5344, lng: 126.9949 },
  명동: { lat: 37.5636, lng: 126.9827 },
  여의도: { lat: 37.5219, lng: 126.9245 },
  한강: { lat: 37.5175, lng: 126.9332 },
  신촌: { lat: 37.5551, lng: 126.9368 },
  건대입구: { lat: 37.5403, lng: 127.0694 },
  건대: { lat: 37.5403, lng: 127.0694 },
  성수동: { lat: 37.5447, lng: 127.0557 },
  성수: { lat: 37.5447, lng: 127.0557 },
  뚝섬: { lat: 37.5471, lng: 127.0458 },
  잠실: { lat: 37.5133, lng: 127.1 },
  종로: { lat: 37.5703, lng: 126.9916 },
  익선동: { lat: 37.5751, lng: 126.9991 },
  북촌: { lat: 37.5824, lng: 126.9827 },
  인사동: { lat: 37.5743, lng: 126.9855 },
  압구정: { lat: 37.527, lng: 127.0288 },
  청담: { lat: 37.5232, lng: 127.0465 },
  신사동: { lat: 37.5176, lng: 127.0208 },
  가로수길: { lat: 37.5195, lng: 127.0225 },
  합정: { lat: 37.5497, lng: 126.9137 },
  망원: { lat: 37.5557, lng: 126.9025 },
  마포: { lat: 37.5538, lng: 126.9491 },
  용산: { lat: 37.5326, lng: 126.9904 },
  동대문: { lat: 37.5714, lng: 127.0097 },
  서울: { lat: 37.5665, lng: 126.978 },
  // 지방 도시
  부산: { lat: 35.1796, lng: 129.0756 },
  해운대: { lat: 35.1587, lng: 129.1604 },
  광안리: { lat: 35.1531, lng: 129.1187 },
  제주: { lat: 33.4996, lng: 126.5312 },
  제주도: { lat: 33.4996, lng: 126.5312 },
  전주: { lat: 35.8242, lng: 127.1479 },
  대구: { lat: 35.8714, lng: 128.6014 },
  광주: { lat: 35.1595, lng: 126.8526 },
  수원: { lat: 37.2636, lng: 127.0286 },
  인천: { lat: 37.4563, lng: 126.7052 },
  대전: { lat: 36.3504, lng: 127.3845 },
  춘천: { lat: 37.8813, lng: 127.7298 },
  강릉: { lat: 37.7519, lng: 128.8761 },
};

/** 지역명이 아닌 일반 명사들 (필터링용) */
const LOCATION_STOP_WORDS = new Set([
  '여행', '일정', '데이트', '코스', '추천', '음식', '먹을', '해줘',
  '뭐해', '뭐하지', '뭐할', '가자', '갈래', '해보자', '봅시다',
  '살펴봐', '추천해', '점심', '저녁', '브런치', '맛집', '카페',
  '영화', '볼링', '쇼핑', '노래방', '방탈출', '클라이밍',
  '전시', '박물관', '뮤지컬', '산책', '공원', '한강',
]);

const ACTIVITY_QUERY_MAP: Record<string, { query: string; type: string }> = {
  // 음식
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
  // 카페
  카페: { query: '카페 디저트', type: 'cafe' },
  커피: { query: '카페 커피숍', type: 'cafe' },
  디저트: { query: '디저트 카페 케이크', type: 'cafe' },
  // 액티비티
  영화: { query: 'CGV 롯데시네마 메가박스 영화관', type: 'activity' },
  볼링: { query: '볼링장', type: 'activity' },
  쇼핑: { query: '쇼핑몰 백화점', type: 'activity' },
  노래방: { query: '노래방 코인노래방', type: 'activity' },
  방탈출: { query: '방탈출카페 방탈출', type: 'activity' },
  클라이밍: { query: '클라이밍센터 볼더링', type: 'activity' },
  // 문화
  전시: { query: '갤러리 전시관 미술관', type: 'attraction' },
  박물관: { query: '박물관', type: 'attraction' },
  뮤지컬: { query: '뮤지컬 공연장 연극', type: 'attraction' },
  // 휴식
  산책: { query: '공원 산책로', type: 'rest' },
  공원: { query: '공원', type: 'rest' },
  한강: { query: '한강공원 한강변', type: 'rest' },
};

const TIME_MAP: Record<string, { start: string; end: string }> = {
  morning: { start: '09:00', end: '13:00' },
  afternoon: { start: '13:00', end: '18:00' },
  evening: { start: '18:00', end: '23:00' },
  'full-day': { start: '10:00', end: '20:00' },
};

@Injectable()
export class ExtractIntentStep {
  private readonly logger = new Logger(ExtractIntentStep.name);

  constructor(private readonly placesService: PlacesService) {}

  async execute(ctx: PipelineContext): Promise<void> {
    const parsed = ctx.parsed!;

    // 위치 → 좌표 (Naver 지오코딩 검증 포함)
    const { coords, resolvedLocation } =
      await this.resolveCoordsWithValidation(
        parsed.location,
        ctx.rawInput,
      );

    // parsed.location을 resolvedLocation으로 업데이트
    // (SearchPlacesStep에서 사용될 location 쿼리 기준이 됨)
    if (resolvedLocation !== parsed.location) {
      this.logger.log(
        `location 업데이트: "${parsed.location}" → "${resolvedLocation}"`,
      );
      parsed.location = resolvedLocation;
    }

    // 활동 → Naver 검색어
    const activities: ActivityIntent[] = parsed.activities
      .map((act) => this.resolveActivity(act, parsed.location))
      .filter((a): a is ActivityIntent => a !== null);

    if (activities.length === 0) {
      throw new BadRequestException('인식 가능한 활동이 없습니다.');
    }

    // 모드별 활동 순서 보장
    const ordered = this.orderByMode(activities, ctx.mode);

    // 모드별 최소 장소 수 미달 시 기본 활동으로 채우기
    // trip: 최소 4개, date: 최소 3개
    const MODE_MIN: Record<string, number> = { trip: 4, date: 3 };
    const MODE_FILLERS: Record<string, string[]> = {
      trip: ['맛집', '카페', '산책', '전시'],
      date: ['카페', '산책', '맛집'],
    };
    const minCount = MODE_MIN[ctx.mode] ?? 3;
    const fillers = MODE_FILLERS[ctx.mode] ?? [];
    const existingTypes = new Set(ordered.map((a) => a.type));
    for (const filler of fillers) {
      if (ordered.length >= minCount) break;
      const resolved = this.resolveActivity(filler, parsed.location);
      if (resolved && !existingTypes.has(resolved.type)) {
        ordered.push(resolved);
        existingTypes.add(resolved.type);
        this.logger.log(`[자동 추가] ${filler} (${resolved.type})`);
      }
    }

    const times = TIME_MAP[parsed.timeOfDay] ?? TIME_MAP['evening'];

    ctx.intent = {
      location: resolvedLocation,
      lat: coords.lat,
      lng: coords.lng,
      mode: ctx.mode,
      activities: ordered,
      startTime: times.start,
      endTime: times.end,
    };

    this.logger.log(
      `의도 추출 완료: ${parsed.location} / ${ordered.map((a) => a.type).join(' → ')}`,
    );
  }

  private async resolveCoordsWithValidation(
    initialLocation: string,
    rawInput: string,
  ): Promise<{
    coords: { lat: number; lng: number };
    resolvedLocation: string;
  }> {
    // Step 1: 정확한 매칭 또는 부분 매칭이 있으면 그것을 우선 사용 (초기 location)
    if (LOCATION_COORDS[initialLocation]) {
      return {
        coords: LOCATION_COORDS[initialLocation],
        resolvedLocation: initialLocation,
      };
    }
    for (const [key, coords] of Object.entries(LOCATION_COORDS)) {
      if (
        initialLocation.includes(key) ||
        key.includes(initialLocation)
      ) {
        return { coords, resolvedLocation: initialLocation };
      }
    }

    // Step 2: 동적 지오코딩 시도 (GPT가 추출한 location에 대해)
    // geocodeCity는 시청/군청/구청/터미널/역 순으로 시도해 행정 랜드마크 기반 좌표 반환
    const resolved = await this.placesService.geocodeCity(initialLocation);
    if (resolved) {
      this.logger.log(
        `동적 좌표 해석: ${initialLocation} → ${resolved.lat},${resolved.lng}`,
      );
      return { coords: resolved, resolvedLocation: initialLocation };
    }

    // Step 3: rawInput에서 한글 2~6자 단어 추출 후 지오코딩 시도
    const candidates = rawInput.match(/[가-힣]{2,6}/g) ?? [];
    for (const candidate of candidates) {
      // stop word 필터링
      if (LOCATION_STOP_WORDS.has(candidate)) continue;

      const geoResult = await this.placesService.geocodeCity(candidate);
      if (geoResult) {
        this.logger.warn(
          `location 재해석: "${initialLocation}" → "${candidate}" (${geoResult.lat},${geoResult.lng})`,
        );
        return { coords: geoResult, resolvedLocation: candidate };
      }
    }

    // Step 4: 모든 시도 실패 시 서울 fallback
    this.logger.warn(`좌표 해석 실패, 서울로 fallback: ${initialLocation}`);
    return {
      coords: LOCATION_COORDS['서울'],
      resolvedLocation: '서울',
    };
  }

  private async resolveCoords(
    location: string,
  ): Promise<{ lat: number; lng: number }> {
    // 정확한 매칭
    if (LOCATION_COORDS[location]) return LOCATION_COORDS[location];
    // 부분 매칭
    for (const [key, coords] of Object.entries(LOCATION_COORDS)) {
      if (location.includes(key) || key.includes(location)) return coords;
    }

    const resolved = await this.placesService.geocodeLocation(location);
    if (resolved) {
      this.logger.log(
        `동적 좌표 해석: ${location} → ${resolved.lat},${resolved.lng}`,
      );
      return resolved;
    }

    this.logger.warn(`좌표 해석 실패, 서울로 fallback: ${location}`);
    return LOCATION_COORDS['서울'];
  }

  private resolveActivity(
    activity: string,
    location: string,
  ): ActivityIntent | null {
    // 정확한 매칭
    if (ACTIVITY_QUERY_MAP[activity]) {
      const { query, type } = ACTIVITY_QUERY_MAP[activity];
      return { type, naverQuery: `${location} ${query}` };
    }
    // 부분 매칭
    for (const [key, val] of Object.entries(ACTIVITY_QUERY_MAP)) {
      if (activity.includes(key) || key.includes(activity)) {
        return { type: val.type, naverQuery: `${location} ${val.query}` };
      }
    }
    // 알 수 없는 활동은 맛집으로 fallback
    return { type: 'food', naverQuery: `${location} ${activity} 맛집` };
  }

  private orderByMode(
    activities: ActivityIntent[],
    mode: 'date' | 'trip',
  ): ActivityIntent[] {
    if (mode === 'date') {
      // date: food → activity → cafe 순서 선호
      const typeOrder = ['food', 'activity', 'cafe', 'attraction', 'rest'];
      return [...activities].sort(
        (a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type),
      );
    }
    // trip: activity → food → rest 순서
    const typeOrder = ['activity', 'attraction', 'food', 'cafe', 'rest'];
    return [...activities].sort(
      (a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type),
    );
  }
}
