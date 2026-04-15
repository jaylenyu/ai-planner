import { ParseInputStep } from './parse-input.step';
import { PipelineContext } from '../interfaces/pipeline-result.interface';
import { RegionService } from '../../../shared/region/region.service';

function makeCtx(rawInput: string): PipelineContext {
  return { rawInput, mode: 'date' } as PipelineContext;
}

function makeStep(): { step: ParseInputStep; mockCreate: jest.Mock } {
  // resolveBest를 직접 mock — 새 아키텍처의 핵심 interface
  const regionService = {
    resolveBest: jest.fn((text: string) => {
      const TABLE: Record<string, string> = {
        강남: '강남',
        부산: '부산',
        해운대: '해운대',
        성수동: '성수동',
        이태원: '이태원',
        제주: '제주',
        연남동: '연남동',
      };
      for (const [alias, result] of Object.entries(TABLE)) {
        if (text.includes(alias)) return result;
      }
      return null;
    }),
  } as unknown as RegionService;

  const config = {
    get: jest.fn((key: string) =>
      key === 'OPENROUTER_API_KEY' ? 'test-key' : undefined,
    ),
  };

  const step = new ParseInputStep(config as any, regionService);

  const mockCreate = jest.fn();
  (step as any).openai = {
    chat: { completions: { create: mockCreate } },
  };

  return { step, mockCreate };
}

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

function gptFail() {
  return Promise.reject(new Error('API 오류'));
}

function gptEmpty() {
  return Promise.resolve({
    choices: [{ message: { content: '' }, finish_reason: 'stop' }],
  });
}

describe('ParseInputStep — resolveLocation', () => {
  it('rawInput에 지역이 있으면 trie scan이 우선한다', async () => {
    const { step, mockCreate } = makeStep();
    // GPT가 다른 지역을 반환해도 trie scan 결과가 이긴다
    mockCreate.mockReturnValue(gptOk('진주'));
    const ctx = makeCtx('강남에서 저녁 먹고 싶어');

    await step.execute(ctx);

    expect(ctx.parsed!.location).toBe('강남');
    expect(ctx.locationCandidates![0].source).toBe('trie');
  });

  it('trie miss 시 GPT location이 rawInput에 있으면 validated로 사용한다', async () => {
    const { step, mockCreate } = makeStep();
    mockCreate.mockReturnValue(gptOk('용리단길'));
    const ctx = makeCtx('용리단길 맛집 추천해줘');
    // resolveBest가 null 반환 (registry에 없는 신조어)
    (step as any).regionService.resolveBest = jest.fn().mockReturnValue(null);

    await step.execute(ctx);

    // GPT가 제시하고 rawInput에도 있으므로 unrecognized로 채택
    expect(ctx.parsed!.location).toBe('용리단길');
    expect(ctx.unrecognizedLocationToken).toBe('용리단길');
  });

  it('GPT location이 rawInput에 없으면 환각으로 버리고 fallback', async () => {
    const { step, mockCreate } = makeStep();
    mockCreate.mockReturnValue(gptOk('진주'));
    const ctx = makeCtx('강남에서 맛집 추천');
    // trie miss 강제
    (step as any).regionService.resolveBest = jest.fn().mockReturnValue(null);

    await step.execute(ctx);

    // "진주"는 rawInput에 없으므로 환각으로 드롭 → fallback
    expect(ctx.parsed!.location).toBe('서울');
    expect(ctx.locationCandidates![0].source).toBe('fallback');
  });

  it('GPT 호출 실패 시 trie scan으로 location을 추출한다', async () => {
    const { step, mockCreate } = makeStep();
    mockCreate.mockReturnValue(gptFail());
    const ctx = makeCtx('해운대 맛집 여행');

    await step.execute(ctx);

    expect(ctx.parsed!.location).toBe('해운대');
    expect(ctx.locationCandidates![0].source).toBe('trie');
  });

  it('GPT 빈 응답 시 trie scan으로 location을 추출한다', async () => {
    const { step, mockCreate } = makeStep();
    mockCreate.mockReturnValue(gptEmpty());
    const ctx = makeCtx('이태원에서 저녁 먹고 싶어');

    await step.execute(ctx);

    expect(ctx.parsed!.location).toBe('이태원');
  });

  it('trie miss + GPT 실패 시 서울로 fallback', async () => {
    const { step, mockCreate } = makeStep();
    mockCreate.mockReturnValue(gptFail());
    const ctx = makeCtx('당일치기 여행 추천해줘');
    (step as any).regionService.resolveBest = jest.fn().mockReturnValue(null);

    await step.execute(ctx);

    expect(ctx.parsed!.location).toBe('서울');
    expect(ctx.locationCandidates![0].source).toBe('fallback');
  });

  it('locationCandidates는 항상 1개 이상 채워진다', async () => {
    const { step, mockCreate } = makeStep();
    mockCreate.mockReturnValue(gptOk('제주'));
    const ctx = makeCtx('제주도 여행 일정');

    await step.execute(ctx);

    expect(ctx.locationCandidates).toBeDefined();
    expect(ctx.locationCandidates!.length).toBeGreaterThan(0);
  });

  it('GPT가 빈 location을 반환하면 trie scan이 동작한다', async () => {
    const { step, mockCreate } = makeStep();
    mockCreate.mockReturnValue(gptOk(''));
    const ctx = makeCtx('부산 해운대 여행');

    await step.execute(ctx);

    expect(['부산', '해운대']).toContain(ctx.parsed!.location);
  });
});
