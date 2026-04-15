import { OptimizeRouteStep } from './optimize-route.step';
import { PipelineContext } from '../interfaces/pipeline-result.interface';

describe('OptimizeRouteStep', () => {
  it('multi-start 경로 최적화에서 randomFn을 사용한다', () => {
    const step = new OptimizeRouteStep();
    const randomFn = jest.fn(() => 0.42);
    const ctx: PipelineContext = {
      rawInput: '홍대 하루 일정',
      mode: 'date',
      randomFn,
      intent: {
        location: '홍대',
        lat: 37.5512,
        lng: 126.9255,
        mode: 'date',
        activities: [
          { type: 'food', naverQuery: '홍대 맛집' },
          { type: 'cafe', naverQuery: '홍대 카페' },
          { type: 'activity', naverQuery: '홍대 놀거리' },
          { type: 'rest', naverQuery: '홍대 산책' },
        ],
        startTime: '10:00',
        endTime: '20:00',
      },
      candidates: {
        food: [
          {
            name: 'F',
            lat: 37.552,
            lng: 126.926,
            category: 'food',
            address: '서울',
            source: 'naver',
          },
        ],
        cafe: [
          {
            name: 'C',
            lat: 37.553,
            lng: 126.927,
            category: 'cafe',
            address: '서울',
            source: 'kakao',
          },
        ],
        activity: [
          {
            name: 'A',
            lat: 37.549,
            lng: 126.923,
            category: 'activity',
            address: '서울',
            source: 'naver',
          },
        ],
        rest: [
          {
            name: 'R',
            lat: 37.55,
            lng: 126.928,
            category: 'rest',
            address: '서울',
            source: 'naver',
          },
        ],
      },
    };

    step.execute(ctx);

    expect(randomFn).toHaveBeenCalled();
    expect((ctx.orderedPlaces ?? []).length).toBe(4);
  });
});
