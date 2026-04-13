import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import { PipelineContext } from '../interfaces/pipeline-result.interface';
import { ParsedInput } from '../interfaces/intent.interface';

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
    const systemPrompt = `사용자의 여행/데이트/나들이 요청을 분석하여 JSON으로 변환하세요.
반드시 다음 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "location": "장소명",
  "activities": ["활동1", "활동2", "활동3"],
  "timeOfDay": "morning 또는 afternoon 또는 evening 또는 full-day",
  "preferences": ["선호도1"]
}

## 장소(location) 규칙
- 반드시 한국의 구체적인 지역명으로 변환 (역명 포함)
- "강남", "홍대", "이태원" 등 대표 지역명으로 정규화
- 지방도시: 부산, 제주, 전주, 대구, 광주, 수원, 인천 등 그대로 사용
- 세부 동네: 연남동→홍대, 망리단길→홍대, 익선동→종로, 해방촌→이태원, 경리단길→이태원, 성수→성수동, 뚝섬→성수동
- 위치 언급이 없으면 "서울" 사용

## 활동(activities) 규칙
반드시 아래 목록에서만 선택하고, 2~4개 추출:
음식류: 한식, 일식, 중식, 양식, 파스타, 고기, 해산물, 치킨, 피자, 브런치, 맛집, 저녁, 점심
카페류: 카페, 커피, 디저트
액티비티: 영화, 볼링, 쇼핑, 노래방, 방탈출, 클라이밍
문화: 전시, 박물관, 뮤지컬
휴식: 산책, 공원, 한강

## 자연어 → 활동 매핑 예시
- 오마카세, 스시, 초밥 → 일식
- 삼겹살, 갈비, 고기집 → 고기
- 치맥, 치킨 → 치킨
- 피자, 파스타, 이탈리안 → 파스타 (또는 양식)
- 해물, 조개, 횟집 → 해산물
- 커피숍, 카페투어 → 카페
- 디저트카페, 케이크 → 디저트
- 야경, 드라이브 → 산책
- 한강공원, 뚝섬유원지 → 한강
- 노래, 코인노래방 → 노래방
- 방탈출카페 → 방탈출
- 볼더링, 암벽 → 클라이밍
- 뮤지컬, 연극, 공연 → 뮤지컬
- 미술관, 갤러리 → 전시
- 박물관, 역사관 → 박물관

## 시간대(timeOfDay) 규칙
- morning: 아침, 오전, 브런치
- afternoon: 점심, 오후, 낮
- evening: 저녁, 밤, 야간, 야경
- full-day: 하루, 종일, 아침부터, 당일치기, 시간대 언급 없을 때

## 입력 예시
입력: "홍대에서 친구들이랑 하루 일정"
출력: {"location":"홍대","activities":["카페","맛집","쇼핑"],"timeOfDay":"full-day","preferences":["친구"]}

입력: "강남에서 저녁에 오마카세 먹고 바 가고 싶어"
출력: {"location":"강남","activities":["일식","술"],"timeOfDay":"evening","preferences":["고급"]}

입력: "성수동 카페투어하고 맛집"
출력: {"location":"성수동","activities":["카페","맛집"],"timeOfDay":"full-day","preferences":[]}

입력: "이태원에서 데이트 코스"
출력: {"location":"이태원","activities":["맛집","카페","산책"],"timeOfDay":"evening","preferences":["데이트"]}

입력: "한강에서 치맥"
출력: {"location":"여의도","activities":["한강","치킨"],"timeOfDay":"evening","preferences":[]}

입력: "부산 여행 하루 코스"
출력: {"location":"부산","activities":["맛집","전시","산책"],"timeOfDay":"full-day","preferences":["여행"]}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'openai/gpt-5-mini',
        response_format: { type: 'json_object' },
        temperature: 0.2,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: ctx.rawInput },
        ],
        max_tokens: 300,
      });

      const choice = response.choices[0];
      const content = choice?.message?.content;

      if (!content) {
        this.logger.error(
          `빈 응답: finish_reason=${choice?.finish_reason}, model=${response.model}, ` +
          `choices=${JSON.stringify(response.choices?.map((c) => ({ finish_reason: c.finish_reason, content: c.message?.content })))}`,
        );
        throw new Error('OpenAI 응답이 비어있습니다.');
      }

      const parsed = JSON.parse(content) as ParsedInput;
      if (!parsed.location || !parsed.activities?.length) {
        throw new Error('파싱 결과에 필수 필드가 없습니다.');
      }

      ctx.parsed = parsed;
      this.logger.log(`파싱 완료: ${JSON.stringify(parsed)}`);
    } catch (err) {
      if (err instanceof SyntaxError) {
        throw new BadRequestException('AI 응답 파싱 실패: JSON 형식 오류');
      }
      throw err;
    }
  }
}
