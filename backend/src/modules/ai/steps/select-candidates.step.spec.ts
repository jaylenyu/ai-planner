import { SelectCandidatesStep } from './select-candidates.step';
import { PipelineContext } from '../interfaces/pipeline-result.interface';

function makeCtx(randomFn: () => number): PipelineContext {
  return {
    rawInput: '테스트',
    mode: 'date',
    randomFn,
    intent: {
      location: '홍대',
      lat: 37.5512,
      lng: 126.9255,
      mode: 'date',
      activities: [{ type: 'food', naverQuery: '홍대 한식 맛집' }],
      startTime: '10:00',
      endTime: '20:00',
    },
    rawPlaces: {
      food: [
        {
          name: 'A식당',
          lat: 37.5513,
          lng: 126.9256,
          category: '한식',
          address: '서울',
          source: 'naver',
        },
        {
          name: 'B식당',
          lat: 37.5511,
          lng: 126.9254,
          category: '한식',
          address: '서울',
          source: 'kakao',
        },
        {
          name: 'C식당',
          lat: 37.5514,
          lng: 126.9257,
          category: '한식',
          address: '서울',
          source: 'naver',
        },
      ],
    },
  };
}

describe('SelectCandidatesStep', () => {
  it('같은 후보군에서도 randomFn 값에 따라 선택 결과가 달라진다', () => {
    const step = new SelectCandidatesStep();
    const ctxLow = makeCtx(() => 0);
    const ctxHigh = makeCtx(() => 0.99);

    step.execute(ctxLow);
    step.execute(ctxHigh);

    expect(ctxLow.candidates?.food?.[0].name).not.toBe(
      ctxHigh.candidates?.food?.[0].name,
    );
  });
});
