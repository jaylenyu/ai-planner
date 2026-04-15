import { SelectCandidatesStep } from './select-candidates.step';
import { PipelineContext } from '../interfaces/pipeline-result.interface';

function makeCtx(randomFn: () => number): PipelineContext {
  return {
    rawInput: '테스트',
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
          slotQuery: '한식',
          naverQuery: '홍대 한식 맛집',
          required: true,
        },
      ],
      startTime: '10:00',
      endTime: '20:00',
    },
    rawPlaces: {
      'slot-0': [
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

    expect(ctxLow.candidates?.['slot-0']?.[0].name).not.toBe(
      ctxHigh.candidates?.['slot-0']?.[0].name,
    );
  });

  it('food preference와 이름이 일치하는 후보를 우선 선택한다', () => {
    const step = new SelectCandidatesStep();
    const ctx = {
      rawInput: '테스트',
      mode: 'date',
      randomFn: () => 0,
      parsed: {
        location: '연남동',
        activities: ['양식'],
        timeOfDay: 'full-day',
        preferences: ['피자'],
      },
      intent: {
        location: '연남동',
        searchLocation: '연남동',
        lat: 37.5512,
        lng: 126.9255,
        mode: 'date',
        activities: [
          {
            slotId: 'slot-0',
            type: 'food',
            slotQuery: '피자',
            naverQuery: '연남동 피자 레스토랑',
            required: true,
          },
        ],
        startTime: '10:00',
        endTime: '20:00',
      },
      rawPlaces: {
        'slot-0': [
          {
            name: '이삭토스트 연남점',
            lat: 37.5513,
            lng: 126.9256,
            category: '토스트',
            address: '서울',
            source: 'naver',
          },
          {
            name: '피자스쿨 연남점',
            lat: 37.5513,
            lng: 126.9256,
            category: '피자',
            address: '서울',
            source: 'naver',
          },
        ],
      },
    } as unknown as PipelineContext;

    step.execute(ctx);

    expect(ctx.candidates?.['slot-0']?.[0].name).toBe('피자스쿨 연남점');
  });

  it('food 후보에서는 카페성 장소를 우선 제외한다', () => {
    const step = new SelectCandidatesStep();
    const ctx = {
      rawInput: '테스트',
      mode: 'date',
      randomFn: () => 0,
      parsed: {
        location: '양평',
        activities: ['맛집'],
        timeOfDay: 'full-day',
        preferences: ['해장국'],
      },
      intent: {
        location: '양평',
        searchLocation: '양평',
        lat: 37.55,
        lng: 127.1,
        mode: 'date',
        activities: [
          {
            slotId: 'slot-0',
            type: 'food',
            slotQuery: '해장국',
            naverQuery: '양평 해장국',
            required: true,
          },
        ],
        startTime: '10:00',
        endTime: '20:00',
      },
      rawPlaces: {
        'slot-0': [
          {
            name: '구벼울',
            lat: 37.5501,
            lng: 127.1001,
            category: '카페',
            address: '경기 양평',
            source: 'naver',
          },
          {
            name: '양평해장국',
            lat: 37.5502,
            lng: 127.1002,
            category: '해장국',
            address: '경기 양평',
            source: 'naver',
          },
        ],
      },
    } as unknown as PipelineContext;

    step.execute(ctx);

    expect(ctx.candidates?.['slot-0']?.[0].name).toBe('양평해장국');
  });

  it('넓은 지역에서는 더 큰 반경으로 자동 완화한다', () => {
    const step = new SelectCandidatesStep();
    const ctx = {
      rawInput: '테스트',
      mode: 'date',
      randomFn: () => 0,
      parsed: {
        location: '양평',
        activities: ['맛집', '카페', '산책'],
        timeOfDay: 'full-day',
        preferences: [],
      },
      intent: {
        location: '양평',
        searchLocation: '양평',
        lat: 37.55,
        lng: 127.1,
        mode: 'date',
        activities: [
          {
            slotId: 'slot-0',
            type: 'food',
            slotQuery: '해장국',
            naverQuery: '양평 해장국',
            required: true,
          },
          {
            slotId: 'slot-1',
            type: 'cafe',
            slotQuery: '카페',
            naverQuery: '양평 카페',
            required: true,
          },
          {
            slotId: 'slot-2',
            type: 'rest',
            slotQuery: '산책',
            naverQuery: '양평 산책',
            required: true,
          },
        ],
        startTime: '10:00',
        endTime: '20:00',
      },
      rawPlaces: {
        'slot-0': [
          {
            name: '양평해장국',
            lat: 37.55,
            lng: 127.1,
            category: '해장국',
            address: '경기 양평',
            source: 'naver',
          },
        ],
        'slot-1': [
          {
            name: '멀리있는카페',
            lat: 37.55,
            lng: 127.19,
            category: '카페',
            address: '경기 양평',
            source: 'naver',
          },
        ],
        'slot-2': [
          {
            name: '양평산책로',
            lat: 37.55,
            lng: 126.99,
            category: '공원',
            address: '경기 양평',
            source: 'naver',
          },
        ],
      },
    } as unknown as PipelineContext;

    step.execute(ctx);

    expect(ctx.candidates?.['slot-1']?.[0].name).toBe('멀리있는카페');
    expect(ctx.candidates?.['slot-2']?.[0].name).toBe('양평산책로');
  });

  it('unique 스타일에서는 체인 카페를 감점한다', () => {
    const step = new SelectCandidatesStep();
    const ctx = {
      rawInput: '테스트',
      mode: 'date',
      randomFn: () => 0,
      parsed: {
        location: '성수동',
        activities: ['카페'],
        timeOfDay: 'full-day',
        preferences: [],
        chainPenalty: true,
      },
      intent: {
        location: '성수동',
        searchLocation: '성수동',
        lat: 37.544,
        lng: 127.055,
        mode: 'date',
        activities: [
          {
            slotId: 'slot-0',
            type: 'cafe',
            slotQuery: '카페',
            naverQuery: '성수동 카페',
            required: true,
          },
        ],
        startTime: '10:00',
        endTime: '20:00',
      },
      rawPlaces: {
        'slot-0': [
          {
            name: '스타벅스 성수점',
            lat: 37.5441,
            lng: 127.0551,
            category: '카페',
            address: '서울 성수동',
            source: 'naver',
          },
          {
            name: '로컬카페 성수',
            lat: 37.5442,
            lng: 127.0552,
            category: '카페',
            address: '서울 성수동',
            source: 'naver',
          },
        ],
      },
    } as unknown as PipelineContext;

    step.execute(ctx);

    expect(ctx.candidates?.['slot-0']?.[0].name).toBe('로컬카페 성수');
  });
});
