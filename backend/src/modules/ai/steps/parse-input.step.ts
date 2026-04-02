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
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Itinerary Planner',
      },
    });
  }

  async execute(ctx: PipelineContext): Promise<void> {
    const systemPrompt = `사용자의 여행/데이트 요청을 분석하여 JSON으로 변환하세요.
반드시 다음 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "location": "장소명 (예: 강남역, 홍대입구, 이태원)",
  "activities": ["활동1", "활동2", "활동3"],
  "timeOfDay": "morning 또는 afternoon 또는 evening 또는 full-day",
  "preferences": ["선호도1", "선호도2"]
}

activities는 다음 중에서 선택하세요: 파스타, 한식, 일식, 중식, 고기, 술, 카페, 영화, 볼링, 쇼핑, 산책, 전시, 공원
timeOfDay: morning=오전, afternoon=오후, evening=저녁, full-day=하루종일`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: ctx.rawInput },
        ],
        max_tokens: 300,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('OpenAI 응답이 비어있습니다.');

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
