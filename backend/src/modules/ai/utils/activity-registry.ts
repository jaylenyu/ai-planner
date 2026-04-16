import { ActivityType } from '../interfaces/intent.interface';
import { PlaceResult } from '../interfaces/place.interface';

export type ActivitySubtype =
  | 'movie'
  | 'bowling'
  | 'karaoke'
  | 'escapeRoom'
  | 'climbing'
  | 'shopping'
  | 'exhibition'
  | 'museum'
  | 'musical'
  | 'walk'
  | 'park'
  | 'riverfront'
  | 'seaside'
  | 'nightView';

export interface ActivityDefinition {
  subtype: ActivitySubtype;
  type: ActivityType;
  label: string;
  synonyms: string[];
  searchQueries: string[];
  fallbackQuery?: string;
  allowKeywords: string[];
  rejectKeywords: string[];
  preferredBrands?: string[];
  strictMatching: boolean;
}

const ACTIVITY_DEFINITIONS: Record<ActivitySubtype, ActivityDefinition> = {
  movie: {
    subtype: 'movie',
    type: 'activity',
    label: '영화',
    synonyms: ['영화', '영화관', '시네마', 'cgv', '메가박스', '롯데시네마'],
    searchQueries: [
      '영화관',
      'CGV',
      '메가박스',
      '롯데시네마',
      '시네마',
      '독립영화관',
    ],
    fallbackQuery: '영화관',
    allowKeywords: [
      '영화관',
      '영화',
      '시네마',
      'cgv',
      '메가박스',
      '롯데시네마',
    ],
    rejectKeywords: [
      '복싱',
      '헬스',
      '스튜디오',
      '오락실',
      '당구',
      '볼링',
      '카페',
      '노래방',
      '클라이밍',
      '방탈출',
    ],
    preferredBrands: ['cgv', '메가박스', '롯데시네마'],
    strictMatching: true,
  },
  bowling: {
    subtype: 'bowling',
    type: 'activity',
    label: '볼링',
    synonyms: ['볼링', '볼링장'],
    searchQueries: ['볼링장', '락볼링장', '볼링센터'],
    fallbackQuery: '볼링장',
    allowKeywords: ['볼링', '볼링장', '락볼링', '볼링센터'],
    rejectKeywords: ['당구', '스크린골프', '오락실', '카페', '노래방'],
    strictMatching: true,
  },
  karaoke: {
    subtype: 'karaoke',
    type: 'activity',
    label: '노래방',
    synonyms: ['노래방', '코인노래방', '가라오케'],
    searchQueries: ['노래방', '코인노래방', '가라오케'],
    fallbackQuery: '노래방',
    allowKeywords: ['노래방', '코인노래방', '가라오케'],
    rejectKeywords: ['볼링', '오락실', '카페', '클럽'],
    strictMatching: true,
  },
  escapeRoom: {
    subtype: 'escapeRoom',
    type: 'activity',
    label: '방탈출',
    synonyms: ['방탈출', '방탈출카페'],
    searchQueries: ['방탈출', '방탈출카페', 'escape room'],
    fallbackQuery: '방탈출',
    allowKeywords: ['방탈출', '탈출카페', 'escape'],
    rejectKeywords: ['보드게임', '오락실', '카페'],
    strictMatching: true,
  },
  climbing: {
    subtype: 'climbing',
    type: 'activity',
    label: '클라이밍',
    synonyms: ['클라이밍', '볼더링', '클라이밍센터', '클라이밍짐'],
    searchQueries: ['클라이밍센터', '볼더링', '클라이밍짐'],
    fallbackQuery: '클라이밍센터',
    allowKeywords: ['클라이밍', '볼더링', '클라이밍센터', '클라이밍짐'],
    rejectKeywords: ['헬스', '필라테스', '복싱', '요가'],
    strictMatching: true,
  },
  shopping: {
    subtype: 'shopping',
    type: 'activity',
    label: '쇼핑',
    synonyms: ['쇼핑', '쇼핑몰', '백화점', '아울렛'],
    searchQueries: ['쇼핑몰', '백화점', '아울렛', '복합쇼핑몰'],
    fallbackQuery: '쇼핑몰',
    allowKeywords: ['쇼핑몰', '백화점', '아울렛', '복합쇼핑몰', 'mall'],
    rejectKeywords: ['마트', '편의점', '카페', '볼링'],
    strictMatching: true,
  },
  exhibition: {
    subtype: 'exhibition',
    type: 'attraction',
    label: '전시',
    synonyms: ['전시', '전시회', '갤러리', '미술관'],
    searchQueries: ['전시관', '갤러리', '미술관', '전시회'],
    fallbackQuery: '전시관',
    allowKeywords: ['전시', '전시관', '갤러리', '미술관'],
    rejectKeywords: ['카페', '스튜디오', '공방', '사진관'],
    strictMatching: true,
  },
  museum: {
    subtype: 'museum',
    type: 'attraction',
    label: '박물관',
    synonyms: ['박물관', '뮤지엄'],
    searchQueries: ['박물관', '뮤지엄'],
    fallbackQuery: '박물관',
    allowKeywords: ['박물관', '뮤지엄'],
    rejectKeywords: ['미술관', '카페', '기념품'],
    strictMatching: true,
  },
  musical: {
    subtype: 'musical',
    type: 'attraction',
    label: '뮤지컬',
    synonyms: ['뮤지컬', '공연', '연극'],
    searchQueries: ['뮤지컬 공연장', '공연장', '연극'],
    fallbackQuery: '공연장',
    allowKeywords: ['뮤지컬', '공연장', '공연', '연극'],
    rejectKeywords: ['노래방', '영화관', '클럽'],
    strictMatching: true,
  },
  walk: {
    subtype: 'walk',
    type: 'rest',
    label: '산책',
    synonyms: ['산책', '산책로'],
    searchQueries: ['산책로', '공원 산책', '걷기 좋은 길'],
    fallbackQuery: '산책로',
    allowKeywords: ['산책', '산책로', '공원', '둘레길', '걷기', '길'],
    rejectKeywords: ['카페', '식당', '헬스'],
    strictMatching: true,
  },
  park: {
    subtype: 'park',
    type: 'rest',
    label: '공원',
    synonyms: ['공원'],
    searchQueries: ['공원', '도시공원'],
    fallbackQuery: '공원',
    allowKeywords: ['공원', '생태공원', '도시공원'],
    rejectKeywords: ['카페', '식당', '주차장'],
    strictMatching: true,
  },
  riverfront: {
    subtype: 'riverfront',
    type: 'rest',
    label: '한강',
    synonyms: ['한강', '강변'],
    searchQueries: ['한강공원', '강변 산책', '강변 공원'],
    fallbackQuery: '한강공원',
    allowKeywords: ['한강', '강변', '한강공원', '시민공원'],
    rejectKeywords: ['카페', '식당'],
    strictMatching: true,
  },
  seaside: {
    subtype: 'seaside',
    type: 'rest',
    label: '바다',
    synonyms: ['바다', '해변', '오션뷰'],
    searchQueries: ['해변', '바다', '해수욕장', '오션뷰'],
    fallbackQuery: '해변',
    allowKeywords: ['바다', '해변', '해수욕장', '오션뷰', '해안'],
    rejectKeywords: ['카페', '식당'],
    strictMatching: true,
  },
  nightView: {
    subtype: 'nightView',
    type: 'rest',
    label: '야경',
    synonyms: ['야경', '전망대'],
    searchQueries: ['야경', '전망대', '야경 명소'],
    fallbackQuery: '전망대',
    allowKeywords: ['야경', '전망대', '스카이', '타워', '루프탑'],
    rejectKeywords: ['카페', '식당'],
    strictMatching: true,
  },
};

function normalize(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase();
}

export function getActivityDefinition(
  subtype?: string,
): ActivityDefinition | undefined {
  if (!subtype) return undefined;
  return ACTIVITY_DEFINITIONS[subtype as ActivitySubtype];
}

export function resolveActivitySubtype(
  raw: string,
): ActivitySubtype | undefined {
  const normalized = normalize(raw);
  for (const def of Object.values(ACTIVITY_DEFINITIONS)) {
    if (
      def.synonyms.some((keyword) => {
        const key = normalize(keyword);
        return normalized.includes(key);
      })
    ) {
      return def.subtype;
    }
  }
  return undefined;
}

export function buildActivityQueries(
  location: string,
  subtype: ActivitySubtype,
  fallbackBase?: string,
): string[] {
  const def = ACTIVITY_DEFINITIONS[subtype];
  const base = fallbackBase?.trim();
  const queries = def.searchQueries.map((query) =>
    `${location} ${query}`.trim(),
  );
  if (base) queries.unshift(base);
  return [...new Set(queries)];
}

export function getActivitySearchDisplay(subtype?: string): number {
  if (!subtype) return 5;
  return 8;
}

export function isStrictActivitySubtype(subtype?: string): boolean {
  return getActivityDefinition(subtype)?.strictMatching ?? false;
}

export function matchesActivityPlace(
  place: PlaceResult,
  subtype?: string,
): boolean {
  const def = getActivityDefinition(subtype);
  if (!def) return true;
  const text = normalize(`${place.name} ${place.category} ${place.address}`);
  if (def.rejectKeywords.some((keyword) => text.includes(normalize(keyword)))) {
    return false;
  }
  return def.allowKeywords.some((keyword) => text.includes(normalize(keyword)));
}

export function getActivityBrandBonus(
  place: PlaceResult,
  subtype?: string,
): number {
  const def = getActivityDefinition(subtype);
  if (!def?.preferredBrands?.length) return 0;
  const text = normalize(`${place.name} ${place.category}`);
  return def.preferredBrands.some((brand) => text.includes(normalize(brand)))
    ? 0.35
    : 0;
}

export function getActivitySubtypeMatchBonus(
  place: PlaceResult,
  subtype?: string,
): number {
  if (!subtype) return 0;
  return matchesActivityPlace(place, subtype) ? 0.5 : -0.4;
}
