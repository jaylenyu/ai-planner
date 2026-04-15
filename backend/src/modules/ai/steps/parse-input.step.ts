import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import {
  PipelineContext,
  LocationCandidateLog,
} from '../interfaces/pipeline-result.interface';
import { ParsedInput } from '../interfaces/intent.interface';
import { stripLocationParticles } from '../utils/location.util';
import { RegionService } from '../../../shared/region/region.service';

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

  async execute(ctx: PipelineContext): Promise<void> {
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
          const candidate = JSON.parse(jsonMatch[0]) as ParsedInput;
          if (candidate.location && candidate.activities?.length) {
            candidate.preferences = Array.isArray(candidate.preferences)
              ? candidate.preferences.filter(
                  (p): p is string =>
                    typeof p === 'string' && p.trim().length > 0,
                )
              : [];
            parsed = candidate;
            gptLocation = candidate.location;
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

    parsed.location = this.resolveLocation(ctx, gptLocation);
    ctx.parsed = parsed;
    this.logger.log(`파싱 완료: ${JSON.stringify(parsed)}`);
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
