import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import {
  PipelineContext,
  LocationCandidateLog,
} from '../interfaces/pipeline-result.interface';
import {
  ParsedInput,
  ActivitySlot,
  ActivityType,
  RequestedCounts,
  SoftConstraints,
  ThemeTag,
  StylePreset,
  FillerStrategy,
} from '../interfaces/intent.interface';
import { stripLocationParticles } from '../utils/location.util';
import { RegionService } from '../../../shared/region/region.service';
import { resolveActivitySubtype } from '../utils/activity-registry';

// 폴백용 활동 키워드 (ACTIVITY_QUERY_MAP 키 기준, 우선순위 순)
const ACTIVITY_KEYWORDS = [
  '점심',
  '저녁',
  '브런치',
  '맛집',
  '한식',
  '일식',
  '중식',
  '양식',
  '고기',
  '해산물',
  '치킨',
  '파스타',
  '피자',
  '술',
  '카페',
  '커피',
  '디저트',
  '영화',
  '볼링',
  '쇼핑',
  '노래방',
  '방탈출',
  '클라이밍',
  '전시',
  '박물관',
  '뮤지컬',
  '산책',
  '공원',
  '한강',
];

const MENU_PREFERENCE_KEYWORDS = [
  // 기존
  '피자',
  '파스타',
  '스테이크',
  '햄버거',
  '버거',
  '초밥',
  '스시',
  '라멘',
  '국밥',
  '족발',
  '보쌈',
  '삼겹살',
  '갈비',
  '치킨',
  '떡볶이',
  '마라탕',
  '샐러드',
  '브런치',
  '디저트',
  '케이크',

  // 한식 확장
  '비빔밥',
  '불고기',
  '냉면',
  '칼국수',
  '수제비',
  '김치찌개',
  '된장찌개',
  '순두부',
  '감자탕',
  '닭갈비',
  '찜닭',
  '곱창',
  '막창',
  '해장국',
  '쌈밥',
  '육회',
  '육회비빔밥',
  '간장게장',
  '양념게장',
  '생선구이',
  '제육볶음',
  '오징어볶음',
  '닭발',
  '곰탕',
  '설렁탕',
  '추어탕',
  '아구찜',
  '보리밥',
  '청국장',
  '돌솥비빔밥',
  '순대국',
  '순대',
  '내장탕',
  '닭곰탕',
  '갈비탕',
  '불닭',
  '백반',
  '한정식',
  '기사식당',

  // 중식
  '짜장면',
  '짬뽕',
  '탕수육',
  '마파두부',
  '훠궈',
  '양꼬치',
  '유린기',
  '깐풍기',
  '멘보샤',
  '마라샹궈',
  '딤섬',
  '춘권',
  '중화요리',
  '고추잡채',
  '양장피',
  '팔보채',
  '누룽지탕',
  '해물짬뽕',
  '중식당',

  // 일식 확장
  '돈카츠',
  '우동',
  '소바',
  '오마카세',
  '덮밥',
  '가츠동',
  '규동',
  '텐동',
  '장어덮밥',
  '사시미',
  '회',
  '이자카야',
  '야키토리',
  '타코야키',
  '오코노미야키',
  '일식집',
  '카레',
  '일본카레',

  // 양식/기타
  '리조또',
  '스테이크하우스',
  '바베큐',
  'BBQ',
  '핫도그',
  '샌드위치',
  '파니니',
  '타코',
  '부리또',
  '퀘사디아',
  '케밥',
  '파스타집',
  '브런치카페',
  '그릴',
  '스테이크집',
  '플래터',
  '뷔페',
  '샐러드바',
  '레스토랑',
  '패밀리레스토랑',

  // 동남아/아시아
  '쌀국수',
  '포',
  '반미',
  '팟타이',
  '똠얌꿍',
  '나시고랭',
  '카오팟',
  '분짜',
  '반쎄오',
  '커리',
  '인도커리',
  '탄두리치킨',
  '사모사',
  '난',
  '로티',
  '동남아음식',

  // 패스트푸드/간편식
  '분식',
  '김밥',
  '토스트',
  '와플',
  '팬케이크',
  '컵밥',
  '도시락',
  '편의점',
  '즉석식품',
  '길거리음식',
  '핫바',
  '어묵',
  '튀김',
  '순대',
  '포장마차',

  // 카페/음료
  '커피',
  '카페',
  '에스프레소',
  '라떼',
  '밀크티',
  '버블티',
  '스무디',
  '주스',
  '에이드',
  '아메리카노',
  '콜드브루',
  '디카페인',
  '티',
  '차',
  '카페라떼',
  '바닐라라떼',
  '카라멜마끼아또',
  '프라푸치노',

  // 디저트 확장
  '마카롱',
  '아이스크림',
  '빙수',
  '티라미수',
  '쿠키',
  '브라우니',
  '크로플',
  '크루아상',
  '도넛',
  '타르트',
  '푸딩',
  '젤라또',
  '수플레',
  '팬케이크',
  '케이크샵',
  '디저트카페',

  // 술/안주
  '맥주',
  '수제맥주',
  '와인',
  '칵테일',
  '하이볼',
  '이자카야',
  '포차',
  '안주',
  '술집',
  '소주',
  '막걸리',
  '와인바',
  '칵테일바',
  '루프탑',
  '펍',
  '호프',
  '바',
  '라운지',
  '클럽',

  // 상황/니즈 기반 키워드
  '혼밥',
  '혼술',
  '데이트',
  '분위기좋은',
  '가성비',
  '맛집',
  '조용한',
  '시끄러운',
  '24시간',
  '야식',
  '점심',
  '저녁',
  '포장',
  '배달',
  '예약',
  '웨이팅없는',
  '뷰좋은',
  '루프탑카페',
  '오션뷰',
  '한강뷰',
  '테라스',
];

type FlowTokenDef = {
  keyword: string;
  type: ActivityType;
  slotQuery: string;
  subtype?: string;
  anchorMinutes?: number;
  kind?: 'meal';
};

type FlowHit = FlowTokenDef & { idx: number };

const FLOW_WINDOW_CHARS = 18;
const DINNER_ALCOHOL_KEYWORDS = [
  '이자카야',
  '술집',
  '와인바',
  '펍',
  '하이볼',
  '포차',
  '칵테일',
  '맥주',
  '수제맥주',
  '와인',
];
const CAFE_FLOW_KEYWORDS = [
  '브런치카페',
  '카페',
  '커피',
  '디저트',
  '브런치 카페',
  '루프탑카페',
];
const OUTDOOR_FLOW_KEYWORDS = ['산책', '공원', '한강', '바다', '해변', '야경'];
const FOOD_SLOT_KEYWORDS = Array.from(
  new Set([
    '맛집',
    '한식',
    '일식',
    '중식',
    '양식',
    '고기',
    '해산물',
    '치킨',
    '파스타',
    '피자',
    '브런치',
    '점심',
    '저녁',
    '해장국',
    '국밥',
    '감자탕',
    '설렁탕',
    '삼겹살',
    '갈비',
    '초밥',
    '스시',
    '라멘',
    '햄버거',
    '버거',
    '스테이크',
    '돈카츠',
    '우동',
    '소바',
    '오마카세',
    '덮밥',
    '회',
    '쌀국수',
    ...DINNER_ALCOHOL_KEYWORDS,
  ]),
);
const FOOD_HEAVY_TRIGGERS = /맛집\s*위주|먹는\s*거\s*위주|먹방|식사\s*위주/;
const CAFE_HEAVY_TRIGGERS =
  /카페\s*위주|카페\s*좋은\s*데|카페\s*투어|감성\s*카페/;
const INDOOR_TRIGGERS = /실내|비\s*오는|비\s*내리|우천/;
const END_BY_PATTERN =
  /(?:(아침|오전|점심|오후|저녁|밤)\s*)?(\d{1,2})\s*시\s*(?:전|전에|까지)/;
const DURATION_CAP_PATTERN = /(\d{1,2})\s*시간\s*(?:안|내|이내)/;
const COUNT_PATTERN =
  /(맛집|식당|음식점|카페|액티비티|놀거리)\s*(\d+)\s*(?:곳|군데|개)/g;
const COMPACT_ROUTE_TRIGGERS =
  /동선\s*최소|가까운\s*동선|이동\s*최소|동선\s*효율|효율적/;
const ANCHOR_AREA_PATTERN = /([가-힣A-Za-z0-9]{2,12})\s*(?:근처|인근|주변|쪽)/;
const UNSUPPORTED_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern: /예산|\d+\s*만원|저렴|가성비/,
    message: '예산 제약은 아직 지원되지 않습니다.',
  },
  {
    pattern: /사람\s*(?:많|적|없)|혼잡|붐비/,
    message: '혼잡도/사람 수 조건은 아직 지원되지 않습니다.',
  },
  {
    pattern: /차\s*없|대중교통|렌터카|도보/,
    message: '대중교통/렌터카 이동 조건은 아직 지원되지 않습니다.',
  },
  {
    pattern: /\d+\s*박\s*\d+\s*일|첫날|둘째날|셋째날/,
    message: '다일차 일정은 아직 지원되지 않습니다.',
  },
  {
    pattern: /새벽|심야|밤새/,
    message: '새벽/심야 일정은 아직 지원되지 않습니다.',
  },
];
const THEME_DEFS: Array<{ theme: ThemeTag; pattern: RegExp }> = [
  { theme: 'seaside', pattern: /바다|해변|오션뷰/ },
  { theme: 'nature', pattern: /자연|풍경|숲|전망/ },
  { theme: 'photo', pattern: /사진\s*찍|포토|인생샷|뷰\s*좋/ },
  { theme: 'nightView', pattern: /야경|전망대/ },
  { theme: 'shopping', pattern: /쇼핑|백화점|쇼핑몰/ },
];
const STYLE_PRESET_DEFS: Array<{ preset: StylePreset; pattern: RegExp }> = [
  { preset: 'romantic', pattern: /기념일|분위기\s*좋|감성|로맨틱/ },
  { preset: 'safeDate', pattern: /첫\s*데이트|무난한|어색하지\s*않/ },
  { preset: 'healing', pattern: /힐링|조용한|쉬고\s*싶/ },
  {
    preset: 'active',
    pattern: /액티비티|스트레스\s*풀|활동적|놀고\s*싶|놀건데|놀\s*수\s*있게/,
  },
  { preset: 'familyFriendly', pattern: /부모님|가족/ },
  { preset: 'unique', pattern: /뻔하지\s*않|색다른|독특한/ },
];

function buildFlowTokenDefs(): FlowTokenDef[] {
  const defs: FlowTokenDef[] = [
    {
      keyword: '브런치카페',
      type: 'food',
      slotQuery: '브런치 카페',
      anchorMinutes: 660,
    },
    {
      keyword: '브런치 카페',
      type: 'food',
      slotQuery: '브런치 카페',
      anchorMinutes: 660,
    },
    {
      keyword: '브런치',
      type: 'food',
      slotQuery: '브런치 카페',
      anchorMinutes: 660,
      kind: 'meal',
    },
    {
      keyword: '점심',
      type: 'food',
      slotQuery: '점심 맛집',
      anchorMinutes: 720,
      kind: 'meal',
    },
    {
      keyword: '저녁',
      type: 'food',
      slotQuery: '저녁 맛집',
      anchorMinutes: 1080,
      kind: 'meal',
    },
  ];

  for (const keyword of FOOD_SLOT_KEYWORDS) {
    if (keyword === '점심' || keyword === '저녁' || keyword === '브런치')
      continue;
    const anchorMinutes = DINNER_ALCOHOL_KEYWORDS.includes(keyword)
      ? 1080
      : undefined;
    defs.push({
      keyword,
      type: 'food',
      slotQuery: keyword,
      anchorMinutes,
    });
  }

  for (const keyword of CAFE_FLOW_KEYWORDS) {
    defs.push({
      keyword,
      type: 'cafe',
      slotQuery:
        keyword.includes('브런치') || keyword.includes('카페')
          ? keyword.replace(/\s+/g, ' ').trim()
          : '카페',
    });
  }

  for (const keyword of [
    '영화',
    '볼링',
    '쇼핑',
    '노래방',
    '방탈출',
    '클라이밍',
  ]) {
    defs.push({
      keyword,
      type: 'activity',
      slotQuery: keyword,
      subtype: resolveActivitySubtype(keyword),
    });
  }

  for (const keyword of ['전시', '박물관', '뮤지컬']) {
    defs.push({
      keyword,
      type: 'attraction',
      slotQuery: keyword,
      subtype: resolveActivitySubtype(keyword),
    });
  }

  for (const keyword of OUTDOOR_FLOW_KEYWORDS) {
    defs.push({
      keyword,
      type: 'rest',
      slotQuery: keyword,
      subtype: resolveActivitySubtype(keyword),
    });
  }

  return defs;
}

const FLOW_TOKEN_DEFS = buildFlowTokenDefs();

function buildSlotId(index: number): string {
  return `slot-${index}`;
}

function formatMinutes(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const min = minutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function addHint(target: string[], message: string): void {
  if (!target.includes(message)) target.push(message);
}

function resolveClockMinutes(
  hourRaw: string,
  period?: string,
): number | undefined {
  const hour = Number(hourRaw);
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return undefined;
  if (period === '아침' || period === '오전') return hour * 60;
  if (period === '점심') return (hour === 12 ? 12 : hour + 12) * 60;
  if (period === '오후' || period === '저녁' || period === '밤') {
    const normalized = hour < 12 ? hour + 12 : hour;
    return normalized * 60;
  }
  return hour * 60;
}

function findAllKeywordHits(rawInput: string): FlowHit[] {
  const hits: FlowHit[] = [];
  for (const def of FLOW_TOKEN_DEFS) {
    let from = 0;
    while (from < rawInput.length) {
      const idx = rawInput.indexOf(def.keyword, from);
      if (idx < 0) break;
      hits.push({ ...def, idx });
      from = idx + def.keyword.length;
    }
  }

  hits.sort((a, b) => a.idx - b.idx || b.keyword.length - a.keyword.length);

  const filtered: FlowHit[] = [];
  for (const hit of hits) {
    const overlapped = filtered.some(
      (prev) => hit.idx >= prev.idx && hit.idx < prev.idx + prev.keyword.length,
    );
    if (!overlapped) filtered.push(hit);
  }
  return filtered;
}

function selectNearbyFoodHit(
  hits: FlowHit[],
  currentIdx: number,
): number | null {
  const current = hits[currentIdx];
  const candidates = hits
    .map((hit, idx) => ({ hit, idx }))
    .filter(({ idx, hit }) => {
      if (idx <= currentIdx) return false;
      if (hit.type !== 'food' || hit.kind === 'meal') return false;
      return hit.idx - current.idx <= FLOW_WINDOW_CHARS;
    });

  if (candidates.length === 0) return null;
  const specific = candidates.find(
    ({ hit }) =>
      !['맛집', '점심 맛집', '저녁 맛집', '브런치 카페'].includes(
        hit.slotQuery,
      ),
  );
  return (specific ?? candidates[0]).idx;
}

function pushSlot(
  slots: Array<ActivitySlot & { sourceIndex: number }>,
  slot: ActivitySlot & { sourceIndex: number },
): void {
  const prev = slots[slots.length - 1];
  if (!prev) {
    slots.push(slot);
    return;
  }

  const close = slot.sourceIndex - prev.sourceIndex <= FLOW_WINDOW_CHARS;
  const sameType = prev.type === slot.type;
  const sameAnchor = prev.anchorMinutes === slot.anchorMinutes;
  const sameQuery = prev.slotQuery === slot.slotQuery;
  const genericFood = ['맛집', '점심 맛집', '저녁 맛집'].includes(
    slot.slotQuery,
  );

  if (close && sameType && sameAnchor && (sameQuery || genericFood)) {
    return;
  }

  if (
    close &&
    sameType &&
    sameAnchor &&
    prev.type === 'food' &&
    ['맛집', '점심 맛집', '저녁 맛집'].includes(prev.slotQuery) &&
    prev.slotQuery !== slot.slotQuery
  ) {
    slots[slots.length - 1] = slot;
    return;
  }

  slots.push(slot);
}

function scanFlow(rawInput: string): ActivitySlot[] | null {
  const hits = findAllKeywordHits(rawInput);
  if (hits.length < 2) return null;

  const consumed = new Set<number>();
  const slots: Array<ActivitySlot & { sourceIndex: number }> = [];

  for (let i = 0; i < hits.length; i += 1) {
    if (consumed.has(i)) continue;
    const hit = hits[i];

    if (hit.kind === 'meal') {
      const nearbyFoodIdx = selectNearbyFoodHit(hits, i);
      const paired = nearbyFoodIdx != null ? hits[nearbyFoodIdx] : null;
      if (nearbyFoodIdx != null) consumed.add(nearbyFoodIdx);

      pushSlot(slots, {
        slotId: buildSlotId(slots.length),
        keyword: paired?.keyword ?? hit.keyword,
        type: 'food',
        slotQuery: paired?.slotQuery ?? hit.slotQuery,
        subtype: paired?.subtype ?? hit.subtype,
        anchorMinutes: hit.anchorMinutes,
        orderLocked: true,
        required: true,
        sourceIndex: hit.idx,
      });
      continue;
    }

    pushSlot(slots, {
      slotId: buildSlotId(slots.length),
      keyword: hit.keyword,
      type: hit.type,
      slotQuery: hit.slotQuery,
      subtype: hit.subtype,
      anchorMinutes: hit.anchorMinutes,
      orderLocked: true,
      required: true,
      sourceIndex: hit.idx,
    });
  }

  const normalized = slots.map(
    ({ sourceIndex: _sourceIndex, ...slot }) => slot,
  );
  if (normalized.length < 2) return null;

  const hasDinnerFood = normalized.some(
    (slot) => slot.type === 'food' && slot.anchorMinutes === 1080,
  );
  if (hasDinnerFood) {
    const firstFood = normalized.find(
      (slot) => slot.type === 'food' && slot.anchorMinutes == null,
    );
    if (firstFood) firstFood.anchorMinutes = 720;
  }

  return normalized.length >= 2 ? normalized : null;
}

function scanThemes(rawInput: string): ThemeTag[] {
  return THEME_DEFS.filter(({ pattern }) => pattern.test(rawInput)).map(
    ({ theme }) => theme,
  );
}

function scanStylePresets(rawInput: string): StylePreset[] {
  return STYLE_PRESET_DEFS.filter(({ pattern }) => pattern.test(rawInput)).map(
    ({ preset }) => preset,
  );
}

function scanRequestedCounts(rawInput: string): RequestedCounts | undefined {
  const counts: RequestedCounts = {};
  for (const match of rawInput.matchAll(COUNT_PATTERN)) {
    const label = match[1];
    const count = Number(match[2]);
    if (!Number.isFinite(count) || count <= 0) continue;
    if (label === '카페') counts.cafe = count;
    else if (label === '액티비티' || label === '놀거리')
      counts.activity = count;
    else counts.food = count;
  }
  return Object.keys(counts).length > 0 ? counts : undefined;
}

function scanSoftConstraints(rawInput: string): SoftConstraints | undefined {
  const constraints: SoftConstraints = {};

  if (INDOOR_TRIGGERS.test(rawInput)) constraints.indoorOnly = true;
  if (COMPACT_ROUTE_TRIGGERS.test(rawInput)) constraints.compactRoute = true;

  const endByMatch = rawInput.match(END_BY_PATTERN);
  if (endByMatch) {
    const minutes = resolveClockMinutes(endByMatch[2], endByMatch[1]);
    if (minutes !== undefined) constraints.endByMinutes = minutes;
  }

  const durationMatch = rawInput.match(DURATION_CAP_PATTERN);
  if (durationMatch) {
    const hours = Number(durationMatch[1]);
    if (Number.isFinite(hours) && hours > 0) {
      constraints.durationCapMinutes = hours * 60;
    }
  }

  const anchorAreaMatch = rawInput.match(ANCHOR_AREA_PATTERN);
  if (anchorAreaMatch?.[1]) {
    constraints.anchorArea = anchorAreaMatch[1].trim();
  }

  return Object.keys(constraints).length > 0 ? constraints : undefined;
}

function resolveFillerStrategy(
  rawInput: string,
  presets: StylePreset[],
): { fillerStrategy: FillerStrategy; chainPenalty: boolean } {
  if (FOOD_HEAVY_TRIGGERS.test(rawInput)) {
    return { fillerStrategy: 'food-heavy', chainPenalty: false };
  }
  if (CAFE_HEAVY_TRIGGERS.test(rawInput)) {
    return { fillerStrategy: 'cafe-heavy', chainPenalty: false };
  }

  let fillerStrategy: FillerStrategy = 'default';
  let chainPenalty = false;

  for (const preset of presets) {
    if (preset === 'romantic' || preset === 'safeDate')
      fillerStrategy = 'cafe-heavy';
    if (preset === 'healing' || preset === 'familyFriendly')
      fillerStrategy = 'calm';
    if (preset === 'active') fillerStrategy = 'active';
    if (preset === 'unique') chainPenalty = true;
    if (preset === 'safeDate' || preset === 'familyFriendly')
      chainPenalty = false;
  }

  return { fillerStrategy, chainPenalty };
}

/** 사용자 입력에서 활동 키워드를 직접 스캔 (GPT 폴백용) */
function extractActivitiesFallback(
  input: string,
  mode: 'date' | 'trip',
): string[] {
  const found = ACTIVITY_KEYWORDS.filter((k) => input.includes(k));
  if (found.length >= 2) return found.slice(0, 4);
  return mode === 'date' ? ['맛집', '카페'] : ['맛집', '산책'];
}

function extractPreferencesFallback(input: string): string[] {
  return MENU_PREFERENCE_KEYWORDS.filter((k) => input.includes(k)).slice(0, 3);
}

@Injectable()
export class ParseInputStep {
  private readonly logger = new Logger(ParseInputStep.name);
  private readonly openai: OpenAI;

  constructor(
    private readonly config: ConfigService,
    private readonly regionService: RegionService,
  ) {
    const apiKey = this.config.get<string>('OPENROUTER_API_KEY');
    if (!apiKey) throw new Error('OPENROUTER_API_KEY가 설정되지 않았습니다.');
    this.openai = new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://date-planner.us',
        'X-Title': 'AI Itinerary Planner',
      },
    });
  }

  private sanitizeInput(raw: string): string {
    // eslint-disable-next-line no-control-regex
    const controlChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
    return raw
      .replace(controlChars, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(
        /(?:system|assistant|user)\s*:/gi,
        (match) => match[0] + '\u200B' + match.slice(1),
      )
      .trim();
  }

  async execute(ctx: PipelineContext): Promise<void> {
    ctx.rawInput = this.sanitizeInput(ctx.rawInput);

    const systemPrompt = `여행/데이트 요청을 JSON으로 변환. 반드시 아래 형식만 출력:
{"location":"지역명","activities":["활동1","활동2"],"timeOfDay":"morning|afternoon|evening|full-day","preferences":[]}

location: 입력에서 지역명을 최대한 그대로 추출. 연남동/상수동/합정→홍대, 익선동/삼청동→종로, 해방촌/경리단길→이태원, 성수/뚝섬/성수동→성수동(절대로 "성수"로 축약하지 말 것). 그 외 지역은 입력 그대로(부산, 양양, 상주, 남해, 청도군, 제주 등 지방 도시 포함). 지역명이 없으면 "서울".
activities 2~4개 (목록에서만): 한식 일식 중식 양식 고기 해산물 치킨 브런치 맛집 저녁 점심 카페 디저트 영화 볼링 쇼핑 노래방 방탈출 클라이밍 전시 박물관 뮤지컬 산책 공원 한강
매핑: 오마카세/초밥→일식, 삼겹살/갈비→고기, 치맥→치킨, 바/이자카야→저녁, 카페투어→카페, 야경→산책, 미술관/갤러리→전시
timeOfDay: 아침/오전→morning, 점심/낮→afternoon, 저녁/밤→evening, 그외→full-day`;

    let parsed: ParsedInput | null = null;
    let gptLocation: string | null = null;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        temperature: 0.1,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: ctx.rawInput },
        ],
        max_tokens: 200,
      });

      const usage = response.usage as
        | { prompt_tokens: number; completion_tokens: number }
        | null
        | undefined;
      if (usage) {
        ctx.llmCost =
          (usage.prompt_tokens * 0.15 + usage.completion_tokens * 0.6) /
          1_000_000;
      }

      const choice = response.choices[0];
      const content = choice?.message?.content;

      if (!content) {
        this.logger.warn(
          `빈 응답 (finish_reason=${choice?.finish_reason}) — 폴백 사용`,
        );
      } else {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          this.logger.warn(
            `JSON 블록 없음 (원본: ${content.slice(0, 80)}) — 폴백 사용`,
          );
        } else {
          const raw = JSON.parse(jsonMatch[0]);
          const candidate = this.validateLlmOutput(raw);
          if (candidate) {
            parsed = candidate;
            gptLocation = candidate.location;
          } else {
            this.logger.warn(
              `LLM 응답 검증 실패 (원본: ${JSON.stringify(raw).slice(0, 120)}) — 폴백 사용`,
            );
          }
        }
      }
    } catch (err) {
      this.logger.warn(`GPT 호출 실패: ${(err as Error).message} — 폴백 사용`);
    }

    if (!parsed) {
      const activities = extractActivitiesFallback(ctx.rawInput, ctx.mode);
      const timeOfDay = ctx.rawInput.match(/저녁|밤|야간/)
        ? 'evening'
        : ctx.rawInput.match(/아침|오전|브런치/)
          ? 'morning'
          : ctx.rawInput.match(/점심|낮|오후/)
            ? 'afternoon'
            : 'full-day';
      const preferences = extractPreferencesFallback(ctx.rawInput);

      parsed = { location: '', activities, timeOfDay, preferences };
      this.logger.warn(`폴백 파싱 결과: ${JSON.stringify(parsed)}`);
    }

    parsed.preferences = [
      ...new Set([
        ...parsed.preferences,
        ...extractPreferencesFallback(ctx.rawInput),
      ]),
    ].slice(0, 3);

    const unsupportedHints: string[] = [];
    for (const { pattern, message } of UNSUPPORTED_PATTERNS) {
      if (pattern.test(ctx.rawInput)) addHint(unsupportedHints, message);
    }

    const softConstraints = scanSoftConstraints(ctx.rawInput);
    if (softConstraints?.anchorArea) {
      const resolvedAnchorArea = this.regionService.resolveBest(
        softConstraints.anchorArea,
      );
      if (resolvedAnchorArea) {
        softConstraints.anchorArea = resolvedAnchorArea;
      } else {
        delete softConstraints.anchorArea;
      }
    }
    const requestedCounts = scanRequestedCounts(ctx.rawInput);
    const themes = scanThemes(ctx.rawInput);
    const stylePresets = scanStylePresets(ctx.rawInput);
    const { fillerStrategy, chainPenalty } = resolveFillerStrategy(
      ctx.rawInput,
      stylePresets,
    );

    const flow = scanFlow(ctx.rawInput);
    if (flow) {
      parsed.flow = flow;
      this.logger.log(
        `흐름 감지: ${flow
          .map(
            (s) =>
              `${s.slotId}(${s.slotQuery}${s.anchorMinutes != null ? `@${formatMinutes(s.anchorMinutes)}` : ''})`,
          )
          .join(' → ')}`,
      );
    }

    parsed.themes = themes.length > 0 ? themes : undefined;
    parsed.stylePresets = stylePresets.length > 0 ? stylePresets : undefined;
    parsed.softConstraints = softConstraints;
    parsed.requestedCounts = requestedCounts;
    parsed.fillerStrategy = fillerStrategy;
    parsed.chainPenalty = chainPenalty;
    parsed.unsupportedHints =
      unsupportedHints.length > 0 ? unsupportedHints : undefined;

    parsed.location = this.resolveLocation(ctx, gptLocation);
    ctx.parsed = parsed;
    ctx.unsupportedHints = [...(parsed.unsupportedHints ?? [])];
    this.logger.log(`파싱 완료: ${JSON.stringify(parsed)}`);
  }

  private validateLlmOutput(raw: unknown): ParsedInput | null {
    if (typeof raw !== 'object' || raw === null) return null;
    const obj = raw as Record<string, unknown>;

    const location =
      typeof obj.location === 'string' ? obj.location.trim() : '';
    if (!location || location.length > 30) return null;

    const validTimeOfDay = ['morning', 'afternoon', 'evening', 'full-day'];
    const timeOfDay = validTimeOfDay.includes(obj.timeOfDay as string)
      ? (obj.timeOfDay as ParsedInput['timeOfDay'])
      : 'full-day';

    if (!Array.isArray(obj.activities)) return null;
    const activities = obj.activities
      .filter((a): a is string => typeof a === 'string' && a.trim().length > 0)
      .map((a) => a.trim())
      .slice(0, 6);
    if (activities.length === 0) return null;

    const preferences = Array.isArray(obj.preferences)
      ? obj.preferences
          .filter(
            (p): p is string => typeof p === 'string' && p.trim().length > 0,
          )
          .map((p) => p.trim())
          .slice(0, 5)
      : [];

    return { location, activities, timeOfDay, preferences };
  }

  /**
   * location 해석 우선순위:
   * 1. Deterministic trie scan (regionService.resolveBest) — 95%+ 케이스
   * 2. GPT location 검증 (rawInput 포함 여부 + resolveBest 재정규화)
   * 3. 서울 fallback
   */
  private resolveLocation(
    ctx: PipelineContext,
    gptLocation: string | null,
  ): string {
    const log = (
      value: string,
      source: string,
      score: number,
    ): LocationCandidateLog => ({ value, source, score, raw: value });

    // Step 1: 결정적 스캔 — registry 기반 최장 매칭
    const best = this.regionService.resolveBest(ctx.rawInput);
    if (best) {
      ctx.locationCandidates = [log(best, 'trie', 1.0)];
      return best;
    }

    // Step 2: GPT location 검증
    if (gptLocation) {
      const stripped = stripLocationParticles(gptLocation) || gptLocation;
      const appearsInInput =
        ctx.rawInput.includes(gptLocation) || ctx.rawInput.includes(stripped);

      if (appearsInInput) {
        // GPT 출력을 registry로 재정규화 (환각 차단)
        const normalized = this.regionService.resolveBest(gptLocation);
        if (normalized) {
          ctx.locationCandidates = [log(normalized, 'gpt:validated', 0.9)];
          return normalized;
        }
        // Registry miss: alias-learning 파이프라인에 토큰 전달
        ctx.unrecognizedLocationToken = stripped;
        ctx.locationCandidates = [log(stripped, 'gpt:unrecognized', 0.5)];
        return stripped;
      }

      this.logger.warn(`GPT location "${gptLocation}" 이 rawInput에 없어 무시`);
    }

    // Step 3: 서울 fallback
    ctx.locationCandidates = [log('서울', 'fallback', 0.3)];
    return '서울';
  }
}
