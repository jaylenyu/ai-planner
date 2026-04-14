import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import { PipelineContext } from '../interfaces/pipeline-result.interface';
import { ParsedInput } from '../interfaces/intent.interface';
import { LOCATION_STOP_WORDS, stripLocationParticles } from '../utils/location.util';
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

/** 사용자 입력에서 활동 키워드를 직접 스캔 (GPT 폴백용) */
function extractActivitiesFallback(
  input: string,
  mode: 'date' | 'trip',
): string[] {
  const found = ACTIVITY_KEYWORDS.filter((k) => input.includes(k));
  if (found.length >= 2) return found.slice(0, 4);
  return mode === 'date' ? ['맛집', '카페'] : ['맛집', '산책'];
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
          this.logger.warn(
            `JSON 블록 없음 (원본: ${content.slice(0, 80)}) — 폴백 사용`,
          );
        } else {
          const candidate = JSON.parse(jsonMatch[0]) as ParsedInput;
          if (candidate.location && candidate.activities?.length) {
            parsed = candidate;
            const normalized = this.normalizeCandidate(parsed.location);
            if (normalized) {
              parsed.location = normalized;
            }
            if (!normalized) {
              const fallbackLoc = this.extractLocationFallback(ctx.rawInput);
              this.logger.warn(
                `GPT location 교정: "${parsed.location}" → "${fallbackLoc}"`,
              );
              parsed.location = fallbackLoc;
            }
          }
        }
      }
    } catch (err) {
      this.logger.warn(`GPT 호출 실패: ${(err as Error).message} — 폴백 사용`);
    }

    // GPT 실패 시 키워드 기반 폴백
    if (!parsed) {
      const location = this.extractLocationFallback(ctx.rawInput);
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

    const normalized = this.normalizeCandidate(parsed.location);
    if (normalized) {
      parsed.location = normalized;
    } else {
      parsed.location = this.extractLocationFallback(ctx.rawInput);
    }
    ctx.parsed = parsed;
    this.logger.log(`파싱 완료: ${JSON.stringify(parsed)}`);
  }

  private normalizeCandidate(candidate?: string): string | null {
    if (!candidate) return null;
    const stripped = stripLocationParticles(candidate);
    if (!stripped || LOCATION_STOP_WORDS.has(stripped)) return null;
    return this.regionService.normalize(stripped);
  }

  private extractLocationFallback(input: string): string {
    const text = input ?? '';
    const candidateHits = this.regionService.extractCandidates(text);
    if (candidateHits.length > 0) {
      return candidateHits[0];
    }

    const patterns = [
      /([가-힣]{2,6})에서\s*(?:여행|일정|데이트|코스|먹|놀|점심|저녁|맛집|카페)/,
      /([가-힣]{2,6})\s+(?:여행|일정|데이트|코스)/,
      /([가-힣]{2,6})에서/,
      /([가-힣]{2,6})(?:군|시|구|읍|면)/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        const normalized = this.normalizeCandidate(match[1]);
        if (normalized) return normalized;
      }
    }

    const stripped = stripLocationParticles(text);
    const normalized = this.normalizeCandidate(stripped);
    if (normalized) return normalized;

    return this.regionService.normalize('서울') ?? '서울';
  }
}
