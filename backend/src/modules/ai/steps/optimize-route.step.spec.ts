import { OptimizeRouteStep } from './optimize-route.step';
import { PipelineContext } from '../interfaces/pipeline-result.interface';

describe('OptimizeRouteStep', () => {
  it('흐름 모드에서는 slot 순서를 그대로 유지한다', () => {
    const step = new OptimizeRouteStep();
    const ctx: PipelineContext = {
      rawInput: '부천 흐름 일정',
      mode: 'date',
      intent: {
        location: '부천',
        searchLocation: '부천',
        lat: 37.5,
        lng: 126.8,
        mode: 'date',
        activities: [
          {
            slotId: 'slot-0',
            type: 'food',
            slotQuery: '맛집',
            naverQuery: '부천 맛집',
            anchorMinutes: 720,
            orderLocked: true,
            required: true,
          },
          {
            slotId: 'slot-1',
            type: 'cafe',
            slotQuery: '카페',
            naverQuery: '부천 카페',
            orderLocked: true,
            required: true,
          },
          {
            slotId: 'slot-2',
            type: 'food',
            slotQuery: '이자카야',
            naverQuery: '부천 이자카야',
            anchorMinutes: 1080,
            orderLocked: true,
            required: true,
          },
        ],
        startTime: '10:00',
        endTime: '20:00',
      },
      candidates: {
        'slot-0': [
          {
            name: '점심식당',
            lat: 37.5001,
            lng: 126.8001,
            category: '한식',
            address: '경기 부천',
            source: 'naver',
          },
        ],
        'slot-1': [
          {
            name: '예쁜카페',
            lat: 37.5002,
            lng: 126.8002,
            category: '카페',
            address: '경기 부천',
            source: 'naver',
          },
        ],
        'slot-2': [
          {
            name: '저녁이자카야',
            lat: 37.5003,
            lng: 126.8003,
            category: '이자카야',
            address: '경기 부천',
            source: 'naver',
          },
        ],
      },
    };

    step.execute(ctx);

    expect((ctx.orderedPlaces ?? []).map((place) => place.name)).toEqual([
      '점심식당',
      '예쁜카페',
      '저녁이자카야',
    ]);
    expect(ctx.orderedPlaces?.[2].anchorMinutes).toBe(1080);
  });

  it('non-flow 경로 최적화에서는 randomFn을 사용한다', () => {
    const step = new OptimizeRouteStep();
    const randomFn = jest.fn(() => 0.42);
    const ctx: PipelineContext = {
      rawInput: '홍대 하루 일정',
      mode: 'date',
      randomFn,
      intent: {
        location: '홍대',
        searchLocation: '홍대',
        lat: 37.5512,
        lng: 126.9255,
        mode: 'date',
        activities: [
          {
            slotId: 'slot-0',
            type: 'food',
            slotQuery: '맛집',
            naverQuery: '홍대 맛집',
            required: true,
          },
          {
            slotId: 'slot-1',
            type: 'cafe',
            slotQuery: '카페',
            naverQuery: '홍대 카페',
            required: true,
          },
          {
            slotId: 'slot-2',
            type: 'activity',
            slotQuery: '쇼핑',
            naverQuery: '홍대 쇼핑',
            required: true,
          },
          {
            slotId: 'slot-3',
            type: 'rest',
            slotQuery: '산책',
            naverQuery: '홍대 산책',
            required: true,
          },
        ],
        startTime: '10:00',
        endTime: '20:00',
      },
      candidates: {
        'slot-0': [
          {
            name: 'F',
            lat: 37.552,
            lng: 126.926,
            category: 'food',
            address: '서울',
            source: 'naver',
          },
        ],
        'slot-1': [
          {
            name: 'C',
            lat: 37.553,
            lng: 126.927,
            category: 'cafe',
            address: '서울',
            source: 'kakao',
          },
        ],
        'slot-2': [
          {
            name: 'A',
            lat: 37.549,
            lng: 126.923,
            category: 'activity',
            address: '서울',
            source: 'naver',
          },
        ],
        'slot-3': [
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

  it('slot별 여러 후보 중 전체 동선이 좋은 조합을 선택한다', () => {
    const step = new OptimizeRouteStep();
    const ctx: PipelineContext = {
      rawInput: '서울 일정',
      mode: 'date',
      randomFn: () => 0,
      intent: {
        location: '서울',
        searchLocation: '서울',
        lat: 37.5,
        lng: 127,
        mode: 'date',
        activities: [
          {
            slotId: 'slot-0',
            type: 'food',
            slotQuery: '맛집',
            naverQuery: '서울 맛집',
            required: true,
          },
          {
            slotId: 'slot-1',
            type: 'cafe',
            slotQuery: '카페',
            naverQuery: '서울 카페',
            required: true,
          },
        ],
        startTime: '10:00',
        endTime: '20:00',
      },
      candidates: {
        'slot-0': [
          {
            name: '점수높지만먼식당',
            lat: 38.1,
            lng: 127.7,
            category: 'food',
            address: '강원',
            source: 'naver',
            score: 5,
          },
          {
            name: '가까운식당',
            lat: 37.5005,
            lng: 127.0005,
            category: 'food',
            address: '서울',
            source: 'kakao',
            score: 1,
          },
        ],
        'slot-1': [
          {
            name: '가까운카페',
            lat: 37.501,
            lng: 127.001,
            category: 'cafe',
            address: '서울',
            source: 'naver',
            score: 1,
          },
        ],
      },
    };

    step.execute(ctx);

    expect(ctx.orderedPlaces?.map((place) => place.name)).toContain(
      '가까운식당',
    );
    expect(ctx.orderedPlaces?.map((place) => place.name)).not.toContain(
      '점수높지만먼식당',
    );
  });

  it('중복 후보만 있는 slot도 건너뛰지 않고 대체 조합을 우선한다', () => {
    const step = new OptimizeRouteStep();
    const ctx: PipelineContext = {
      rawInput: '서울 흐름 일정',
      mode: 'date',
      randomFn: () => 0,
      intent: {
        location: '서울',
        searchLocation: '서울',
        lat: 37.5,
        lng: 127,
        mode: 'date',
        activities: [
          {
            slotId: 'slot-0',
            type: 'food',
            slotQuery: '맛집',
            naverQuery: '서울 맛집',
            orderLocked: true,
            required: true,
          },
          {
            slotId: 'slot-1',
            type: 'activity',
            slotQuery: '전시',
            naverQuery: '서울 전시',
            orderLocked: true,
            required: true,
          },
          {
            slotId: 'slot-2',
            type: 'cafe',
            slotQuery: '카페',
            naverQuery: '서울 카페',
            orderLocked: true,
            required: true,
          },
        ],
        startTime: '10:00',
        endTime: '20:00',
      },
      candidates: {
        'slot-0': [
          {
            name: '공유장소',
            lat: 37.5,
            lng: 127,
            category: 'food',
            address: '서울',
            source: 'naver',
            score: 5,
          },
          {
            name: '대체식당',
            lat: 37.5001,
            lng: 127.0001,
            category: 'food',
            address: '서울',
            source: 'kakao',
            score: 4,
          },
        ],
        'slot-1': [
          {
            name: '공유장소',
            lat: 37.5,
            lng: 127,
            category: 'activity',
            address: '서울',
            source: 'naver',
            score: 1,
          },
        ],
        'slot-2': [
          {
            name: '카페',
            lat: 37.5002,
            lng: 127.0002,
            category: 'cafe',
            address: '서울',
            source: 'naver',
            score: 1,
          },
        ],
      },
    };

    step.execute(ctx);

    expect(ctx.orderedPlaces?.map((place) => place.name)).toEqual([
      '대체식당',
      '공유장소',
      '카페',
    ]);
  });
});
