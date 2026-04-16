import { ConfigService } from '@nestjs/config';
import { ParseInputStep } from './parse-input.step';
import { PipelineContext } from '../interfaces/pipeline-result.interface';
import { RegionService } from '../../../shared/region/region.service';

type StepPrivates = {
  openai: { chat: { completions: { create: jest.Mock } } };
  regionService: { resolveBest: jest.Mock };
};

function makeCtx(rawInput: string): PipelineContext {
  return { rawInput, mode: 'date' } as PipelineContext;
}

function makeStep(): {
  step: ParseInputStep;
  stepP: StepPrivates;
  mockCreate: jest.Mock;
} {
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
  } as unknown as ConfigService;

  const step = new ParseInputStep(config, regionService);

  const mockCreate = jest.fn();
  const stepP = step as unknown as StepPrivates;
  stepP.openai = {
    chat: { completions: { create: mockCreate } },
  };

  return { step, stepP, mockCreate };
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
    const { step, stepP, mockCreate } = makeStep();
    mockCreate.mockReturnValue(gptOk('용리단길'));
    const ctx = makeCtx('용리단길 맛집 추천해줘');
    // resolveBest가 null 반환 (registry에 없는 신조어)
    stepP.regionService.resolveBest = jest.fn().mockReturnValue(null);

    await step.execute(ctx);

    // GPT가 제시하고 rawInput에도 있으므로 unrecognized로 채택
    expect(ctx.parsed!.location).toBe('용리단길');
    expect(ctx.unrecognizedLocationToken).toBe('용리단길');
  });

  it('GPT location이 rawInput에 없으면 환각으로 버리고 fallback', async () => {
    const { step, stepP, mockCreate } = makeStep();
    mockCreate.mockReturnValue(gptOk('진주'));
    const ctx = makeCtx('강남에서 맛집 추천');
    // trie miss 강제
    stepP.regionService.resolveBest = jest.fn().mockReturnValue(null);

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
    const { step, stepP, mockCreate } = makeStep();
    mockCreate.mockReturnValue(gptFail());
    const ctx = makeCtx('당일치기 여행 추천해줘');
    stepP.regionService.resolveBest = jest.fn().mockReturnValue(null);

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

  it('원문에 시간 흐름이 있으면 flow 슬롯이 순서대로 채워진다', async () => {
    const { step, mockCreate } = makeStep();
    mockCreate.mockReturnValue(
      Promise.resolve({
        choices: [
          {
            message: {
              content: JSON.stringify({
                location: '부천',
                activities: ['맛집', '카페', '저녁', '산책'],
                timeOfDay: 'full-day',
                preferences: [],
              }),
            },
            finish_reason: 'stop',
          },
        ],
      }),
    );
    const ctx = makeCtx(
      '오늘 부천에서 맛집갔다가 이쁜 카페가고싶어. 저녁은 이자카야를 가고싶고, 저녁먹고 근처 산책했으면 좋겠어',
    );

    await step.execute(ctx);

    const flow = ctx.parsed?.flow;
    expect(flow).toBeDefined();
    expect(flow!.map((s) => s.type)).toEqual(['food', 'cafe', 'food', 'rest']);
    expect(flow!.map((s) => s.slotId)).toEqual([
      'slot-0',
      'slot-1',
      'slot-2',
      'slot-3',
    ]);
    expect(flow!.map((s) => s.slotQuery)).toEqual([
      '맛집',
      '카페',
      '이자카야',
      '산책',
    ]);

    expect(flow![0].anchorMinutes).toBe(720);
    expect(flow![2].anchorMinutes).toBe(1080);
    expect(flow![0].keyword).toBe('맛집');
  });

  it('시간 흐름이 없는 문장은 flow 미설정', async () => {
    const { step, mockCreate } = makeStep();
    mockCreate.mockReturnValue(gptOk('강남'));
    const ctx = makeCtx('강남에서 데이트 코스 추천해줘');

    await step.execute(ctx);

    expect(ctx.parsed?.flow).toBeUndefined();
  });

  it('원문 메뉴어는 preferences에 보강된다', async () => {
    const { step, mockCreate } = makeStep();
    mockCreate.mockReturnValue(
      Promise.resolve({
        choices: [
          {
            message: {
              content: JSON.stringify({
                location: '연남동',
                activities: ['양식', '카페'],
                timeOfDay: 'full-day',
                preferences: [],
              }),
            },
            finish_reason: 'stop',
          },
        ],
      }),
    );
    const ctx = makeCtx('연남동에서 피자먹고싶어');

    await step.execute(ctx);

    expect(ctx.parsed?.preferences).toContain('피자');
  });

  it('결정적 제약과 unsupportedHints를 함께 추출한다', async () => {
    const { step, mockCreate } = makeStep();
    mockCreate.mockReturnValue(gptOk('부산', ['맛집', '카페']));
    const ctx = makeCtx(
      '비 오는 날 부산에서 맛집 2곳이랑 카페 1곳, 해운대 근처로 동선 최소화해서 저녁 8시 전에 끝나게 해줘. 예산 5만원이야',
    );

    await step.execute(ctx);

    expect(ctx.parsed?.softConstraints).toMatchObject({
      indoorOnly: true,
      endByMinutes: 1200,
      anchorArea: '해운대',
      compactRoute: true,
    });
    expect(ctx.parsed?.requestedCounts).toEqual({ food: 2, cafe: 1 });
    expect(ctx.parsed?.unsupportedHints).toContain(
      '예산 제약은 아직 지원되지 않습니다.',
    );
    expect(ctx.unsupportedHints).toContain(
      '예산 제약은 아직 지원되지 않습니다.',
    );
  });

  it('테마와 스타일 preset을 결정적으로 보강한다', async () => {
    const { step, mockCreate } = makeStep();
    mockCreate.mockReturnValue(gptOk('부산', ['맛집', '카페']));
    const ctx = makeCtx(
      '부산에서 바다 보고 카페 가고 싶어. 감성적인 데이트 코스 추천해줘',
    );

    await step.execute(ctx);

    expect(ctx.parsed?.themes).toContain('seaside');
    expect(ctx.parsed?.stylePresets).toContain('romantic');
    expect(ctx.parsed?.fillerStrategy).toBe('cafe-heavy');
  });
});
