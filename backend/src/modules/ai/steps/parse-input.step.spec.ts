import { ParseInputStep } from './parse-input.step';
import { PipelineContext } from '../interfaces/pipeline-result.interface';
import { RegionService } from '../../../shared/region/region.service';

// 테스트용 소형 region 레지스트리
const MOCK_REGIONS: Record<string, string> = {
  서울: '서울',
  강남: '강남',
  홍대: '홍대',
  연남동: '홍대', // alias → canonical
  부산: '부산',
  해운대: '해운대',
  성수동: '성수동',
  이태원: '이태원',
  제주: '제주',
};

function makeCtx(rawInput: string): PipelineContext {
  return { rawInput, mode: 'date' } as PipelineContext;
}

function makeStep(): {
  step: ParseInputStep;
  mockCreate: jest.Mock;
} {
  const regionService = {
    normalize: jest.fn((input: string) => MOCK_REGIONS[input] ?? null),
    extractCandidates: jest.fn((text: string) => {
      const found: string[] = [];
      const seen = new Set<string>();
      for (const [alias, canonical] of Object.entries(MOCK_REGIONS)) {
        if (text.includes(alias) && !seen.has(canonical)) {
          seen.add(canonical);
          found.push(canonical);
        }
      }
      return found;
    }),
  } as unknown as RegionService;

  const config = {
    get: jest.fn((key: string) =>
      key === 'OPENROUTER_API_KEY' ? 'test-key' : undefined,
    ),
  };

  const aliasLearning = {
    logUnrecognized: jest.fn().mockResolvedValue(undefined),
  } as any;

  const step = new ParseInputStep(config as any, regionService, aliasLearning);

  // OpenAI 인스턴스의 create를 mock으로 교체
  const mockCreate = jest.fn();
  (step as any).openai = {
    chat: { completions: { create: mockCreate } },
  };

  return { step, mockCreate };
}

// GPT 성공 응답 헬퍼
function gptOk(location: string, activities = ['맛집', '카페']) {
  return Promise.resolve({
    choices: [
      {
        message: {
          content: JSON.stringify({
            location,
            activities,
            timeOfDay: 'full-day',
            preferences: [],
          }),
        },
        finish_reason: 'stop',
      },
    ],
  });
}

// GPT 실패 헬퍼
function gptFail() {
  return Promise.reject(new Error('API 오류'));
}

// GPT 빈 응답 헬퍼
function gptEmpty() {
  return Promise.resolve({
    choices: [{ message: { content: '' }, finish_reason: 'stop' }],
  });
}

describe('ParseInputStep — resolveLocation', () => {
  it('GPT가 유효한 지역을 반환하면 그 값을 사용한다', async () => {
    const { step, mockCreate } = makeStep();
    mockCreate.mockReturnValue(gptOk('강남'));
    const ctx = makeCtx('강남 근처 데이트 코스 추천해줘');

    await step.execute(ctx);

    expect(ctx.parsed!.location).toBe('강남');
  });

  it('alias는 canonical 이름으로 정규화된다 (연남동 → 홍대)', async () => {
    const { step, mockCreate } = makeStep();
    mockCreate.mockReturnValue(gptOk('연남동'));
    const ctx = makeCtx('연남동 카페 투어');

    await step.execute(ctx);

    expect(ctx.parsed!.location).toBe('홍대');
  });

  it('GPT가 stop-word를 지역으로 반환하면 text-scan으로 넘어간다', async () => {
    const { step, mockCreate } = makeStep();
    // GPT가 '당일치기'를 지역으로 반환 → normalize 결과 null
    mockCreate.mockReturnValue(gptOk('당일치기'));
    const ctx = makeCtx('부산 당일치기 여행');

    await step.execute(ctx);

    // text-scan이 '부산'을 잡아야 함
    expect(ctx.parsed!.location).toBe('부산');
  });

  it('GPT 호출 실패 시 text-scan으로 location을 추출한다', async () => {
    const { step, mockCreate } = makeStep();
    mockCreate.mockReturnValue(gptFail());
    const ctx = makeCtx('해운대 맛집 여행');

    await step.execute(ctx);

    expect(ctx.parsed!.location).toBe('해운대');
  });

  it('GPT 빈 응답 시 text-scan으로 location을 추출한다', async () => {
    const { step, mockCreate } = makeStep();
    mockCreate.mockReturnValue(gptEmpty());
    const ctx = makeCtx('이태원에서 저녁 먹고 싶어');

    await step.execute(ctx);

    expect(ctx.parsed!.location).toBe('이태원');
  });

  it('GPT 실패 + 텍스트에 지역 없으면 서울로 fallback', async () => {
    const { step, mockCreate } = makeStep();
    mockCreate.mockReturnValue(gptFail());
    const ctx = makeCtx('당일치기 여행 추천해줘');

    await step.execute(ctx);

    expect(ctx.parsed!.location).toBe('서울');
  });

  it('GPT 성공 시 locationCandidates 로그에 gpt source가 포함된다', async () => {
    const { step, mockCreate } = makeStep();
    mockCreate.mockReturnValue(gptOk('제주'));
    const ctx = makeCtx('제주도 여행 일정');

    await step.execute(ctx);

    const gptCandidate = ctx.locationCandidates?.find(
      (c) => c.source === 'gpt',
    );
    expect(gptCandidate).toBeDefined();
    // 기본 weight 0.95, 2글자 페널티(-0.1) 적용 가능하므로 0.8 이상으로 검증
    expect(gptCandidate!.score).toBeGreaterThanOrEqual(0.8);
  });

  it('GPT 실패 시 locationCandidates에 gpt source가 없다', async () => {
    const { step, mockCreate } = makeStep();
    mockCreate.mockReturnValue(gptFail());
    const ctx = makeCtx('서울 강남 데이트');

    await step.execute(ctx);

    const gptCandidate = ctx.locationCandidates?.find(
      (c) => c.source === 'gpt',
    );
    expect(gptCandidate).toBeUndefined();
  });

  it('locationCandidates는 점수 내림차순으로 정렬된다', async () => {
    const { step, mockCreate } = makeStep();
    mockCreate.mockReturnValue(gptOk('서울'));
    const ctx = makeCtx('서울 강남 데이트');

    await step.execute(ctx);

    const scores = ctx.locationCandidates?.map((c) => c.score) ?? [];
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
    }
  });

  it('GPT가 빈 location을 반환하면 text-scan을 사용한다', async () => {
    const { step, mockCreate } = makeStep();
    mockCreate.mockReturnValue(gptOk(''));
    const ctx = makeCtx('부산 해운대 여행');

    await step.execute(ctx);

    expect(['부산', '해운대']).toContain(ctx.parsed!.location);
  });
});
