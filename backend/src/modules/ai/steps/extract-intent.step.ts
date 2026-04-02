import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PipelineContext } from '../interfaces/pipeline-result.interface';
import { ActivityIntent, IntentPayload } from '../interfaces/intent.interface';

const LOCATION_COORDS: Record<string, { lat: number; lng: number }> = {
  '강남역': { lat: 37.4979, lng: 127.0276 },
  '강남': { lat: 37.4979, lng: 127.0276 },
  '홍대입구': { lat: 37.5573, lng: 126.9241 },
  '홍대': { lat: 37.5573, lng: 126.9241 },
  '이태원': { lat: 37.5344, lng: 126.9949 },
  '명동': { lat: 37.5636, lng: 126.9827 },
  '여의도': { lat: 37.5219, lng: 126.9245 },
  '신촌': { lat: 37.5551, lng: 126.9368 },
  '건대입구': { lat: 37.5403, lng: 127.0694 },
  '건대': { lat: 37.5403, lng: 127.0694 },
  '성수동': { lat: 37.5447, lng: 127.0557 },
  '성수': { lat: 37.5447, lng: 127.0557 },
  '잠실': { lat: 37.5133, lng: 127.1000 },
  '종로': { lat: 37.5703, lng: 126.9916 },
  '압구정': { lat: 37.5270, lng: 127.0288 },
  '신사동': { lat: 37.5176, lng: 127.0208 },
  '합정': { lat: 37.5497, lng: 126.9137 },
  '망원': { lat: 37.5557, lng: 126.9025 },
  '서울': { lat: 37.5665, lng: 126.9780 },
};

const ACTIVITY_QUERY_MAP: Record<string, { query: string; type: string }> = {
  '파스타': { query: '파스타 이탈리안 레스토랑', type: 'food' },
  '한식': { query: '한식 맛집', type: 'food' },
  '일식': { query: '일식 스시 라멘', type: 'food' },
  '중식': { query: '중식 중국집', type: 'food' },
  '고기': { query: '고기집 삼겹살 갈비', type: 'food' },
  '술': { query: '분위기 좋은 바 이자카야', type: 'food' },
  '맛집': { query: '맛집 레스토랑', type: 'food' },
  '저녁': { query: '저녁식사 레스토랑', type: 'food' },
  '점심': { query: '점심 맛집', type: 'food' },
  '브런치': { query: '브런치 카페', type: 'food' },
  '카페': { query: '카페 디저트', type: 'cafe' },
  '커피': { query: '카페 커피숍', type: 'cafe' },
  '디저트': { query: '디저트 카페 케이크', type: 'cafe' },
  '영화': { query: 'CGV 롯데시네마 메가박스 영화관', type: 'activity' },
  '볼링': { query: '볼링장', type: 'activity' },
  '쇼핑': { query: '쇼핑몰 백화점', type: 'activity' },
  '산책': { query: '공원 산책로', type: 'rest' },
  '공원': { query: '공원', type: 'rest' },
  '전시': { query: '갤러리 전시관 미술관', type: 'attraction' },
  '박물관': { query: '박물관', type: 'attraction' },
};

const TIME_MAP: Record<string, { start: string; end: string }> = {
  'morning': { start: '09:00', end: '13:00' },
  'afternoon': { start: '13:00', end: '18:00' },
  'evening': { start: '18:00', end: '23:00' },
  'full-day': { start: '10:00', end: '20:00' },
};

@Injectable()
export class ExtractIntentStep {
  private readonly logger = new Logger(ExtractIntentStep.name);

  execute(ctx: PipelineContext): void {
    const parsed = ctx.parsed!;

    // 위치 → 좌표
    const coords = this.resolveCoords(parsed.location);
    if (!coords) throw new BadRequestException(`지원하지 않는 지역입니다: ${parsed.location}`);

    // 활동 → Naver 검색어
    const activities: ActivityIntent[] = parsed.activities
      .map((act) => this.resolveActivity(act, parsed.location))
      .filter((a): a is ActivityIntent => a !== null);

    if (activities.length === 0) {
      throw new BadRequestException('인식 가능한 활동이 없습니다.');
    }

    // 모드별 활동 순서 보장
    const ordered = this.orderByMode(activities, ctx.mode);

    const times = TIME_MAP[parsed.timeOfDay] ?? TIME_MAP['evening'];

    ctx.intent = {
      location: parsed.location,
      lat: coords.lat,
      lng: coords.lng,
      mode: ctx.mode,
      activities: ordered,
      startTime: times.start,
      endTime: times.end,
    };

    this.logger.log(`의도 추출 완료: ${parsed.location} / ${ordered.map((a) => a.type).join(' → ')}`);
  }

  private resolveCoords(location: string): { lat: number; lng: number } | null {
    // 정확한 매칭
    if (LOCATION_COORDS[location]) return LOCATION_COORDS[location];
    // 부분 매칭
    for (const [key, coords] of Object.entries(LOCATION_COORDS)) {
      if (location.includes(key) || key.includes(location)) return coords;
    }
    // 기본값: 서울 중심
    return LOCATION_COORDS['서울'];
  }

  private resolveActivity(activity: string, location: string): ActivityIntent | null {
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

  private orderByMode(activities: ActivityIntent[], mode: 'date' | 'trip'): ActivityIntent[] {
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
