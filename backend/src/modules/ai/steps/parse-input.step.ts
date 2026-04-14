import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import { PipelineContext } from '../interfaces/pipeline-result.interface';
import { ParsedInput } from '../interfaces/intent.interface';

// 알려진 지역명 (폴백용)
const KNOWN_LOCATIONS = [
  '강남','홍대','이태원','명동','여의도','신촌','건대','성수동','잠실','종로',
  '인사동','압구정','청담','합정','망원','용산','동대문','서울',
  '부산','해운대','광안리','제주','전주','대구','광주','수원','인천','대전',
  '춘천','강릉','속초','경주','여수','통영','울산','청주',
];

const LOCATION_ALIAS: Record<string, string> = {
  연남동: '홍대', 망리단길: '홍대', 익선동: '종로',
  해방촌: '이태원', 경리단길: '이태원', 성수: '성수동', 뚝섬: '성수동',
};

/** 사용자 입력에서 지역명을 간단히 추출 (GPT 폴백용) */
function extractLocationFallback(input: string): string {
  for (const [alias, canonical] of Object.entries(LOCATION_ALIAS)) {
    if (input.includes(alias)) return canonical;
  }
  for (const loc of KNOWN_LOCATIONS) {
    if (input.includes(loc)) return loc;
  }
  // 행정구역 접미사 패턴 (예: 청도군, 보령시, 당진시)
  const adminMatch = input.match(/[가-힣]{2,6}(?:군|시|구|읍|면)/);
  if (adminMatch) return adminMatch[0];
  // "X 여행", "X 일정", "X 데이트" 패턴 (예: 당진 여행, 보령 일정)
  const tripMatch = input.match(/([가-힣]{2,6})(?:에서)?\s*(?:여행|일정|데이트|코스)/);
  if (tripMatch) return tripMatch[1];
  // "에서" 앞 단어 (예: 당진에서, 무주에서)
  const locationMatch = input.match(/([가-힣]{2,6})에서/);
  if (locationMatch) return locationMatch[1];
  return '서울';
}

// 폴백용 활동 키워드 (ACTIVITY_QUERY_MAP 키 기준, 우선순위 순)
const ACTIVITY_KEYWORDS = [
  '점심', '저녁', '브런치', '맛집', '한식', '일식', '중식', '양식', '고기',
  '해산물', '치킨', '파스타', '피자', '술',
  '카페', '커피', '디저트',
  '영화', '볼링', '쇼핑', '노래방', '방탈출', '클라이밍',
  '전시', '박물관', '뮤지컬',
  '산책', '공원', '한강',
];

/** 사용자 입력에서 활동 키워드를 직접 스캔 (GPT 폴백용) */
function extractActivitiesFallback(input: string, mode: 'date' | 'trip'): string[] {
  const found = ACTIVITY_KEYWORDS.filter(k => input.includes(k));
  if (found.length >= 2) return found.slice(0, 4);
  return mode === 'date' ? ['맛집', '카페'] : ['맛집', '산책'];
}

@Injectable()
export class ParseInputStep {
  private readonly logger = new Logger(ParseInputStep.name);
  private readonly openai: OpenAI;

  constructor(private readonly config: ConfigService) {
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
    // 짧은 프롬프트로 토큰 절약
    const systemPrompt = `여행/데이트 요청을 JSON으로 변환. 반드시 아래 형식만 출력:
{"location":"지역명","activities":["활동1","활동2"],"timeOfDay":"morning|afternoon|evening|full-day","preferences":[]}

location: 입력에서 지역명을 그대로 추출. 연남동→홍대, 익선동→종로, 해방촌/경리단길→이태원, 성수/뚝섬→성수동. 그 외 지역은 입력 그대로(부산, 양양, 청도군, 제주 등). 지역명이 없으면 "서울".
activities 2~4개 (목록에서만): 한식 일식 중식 양식 고기 해산물 치킨 브런치 맛집 저녁 점심 카페 디저트 영화 볼링 쇼핑 노래방 방탈출 클라이밍 전시 박물관 뮤지컬 산책 공원 한강
매핑: 오마카세/초밥→일식, 삼겹살/갈비→고기, 치맥→치킨, 바/이자카야→저녁, 카페투어→카페, 야경→산책, 미술관/갤러리→전시
timeOfDay: 아침/오전→morning, 점심/낮→afternoon, 저녁/밤→evening, 그외→full-day`;

    let parsed: ParsedInput | null = null;

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
          this.logger.warn(`JSON 블록 없음 (원본: ${content.slice(0, 80)}) — 폴백 사용`);
        } else {
          const candidate = JSON.parse(jsonMatch[0]) as ParsedInput;
          if (candidate.location && candidate.activities?.length) {
            parsed = candidate;
            // GPT가 "서울"을 반환했는데 입력에 서울이 없으면 폴백으로 교정
            if (parsed.location === '서울' && !ctx.rawInput.includes('서울')) {
              const fallbackLoc = extractLocationFallback(ctx.rawInput);
              if (fallbackLoc !== '서울') {
                this.logger.warn(`GPT location 교정: "서울" → "${fallbackLoc}"`);
                parsed.location = fallbackLoc;
              }
            }
          }
        }
      }
    } catch (err) {
      this.logger.warn(`GPT 호출 실패: ${(err as Error).message} — 폴백 사용`);
    }

    // GPT 실패 시 키워드 기반 폴백
    if (!parsed) {
      const location = extractLocationFallback(ctx.rawInput);
      const activities = extractActivitiesFallback(ctx.rawInput, ctx.mode);
      const timeOfDay = ctx.rawInput.match(/저녁|밤|야간/)
        ? 'evening'
        : ctx.rawInput.match(/아침|오전|브런치/)
        ? 'morning'
        : ctx.rawInput.match(/점심|낮|오후/)
        ? 'afternoon'
        : 'full-day';

      parsed = { location, activities, timeOfDay, preferences: [] };
      this.logger.warn(`폴백 파싱 결과: ${JSON.stringify(parsed)}`);
    }

    ctx.parsed = parsed;
    this.logger.log(`파싱 완료: ${JSON.stringify(parsed)}`);
  }
}
