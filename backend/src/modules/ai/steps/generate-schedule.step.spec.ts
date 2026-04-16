import { GenerateScheduleStep } from './generate-schedule.step';
import { PipelineContext } from '../interfaces/pipeline-result.interface';

describe('GenerateScheduleStep', () => {
  it('점심/저녁 앵커를 10분 단위로 soft pin한다', () => {
    const step = new GenerateScheduleStep();
    const ctx: PipelineContext = {
      rawInput: '부천 흐름 일정',
      mode: 'date',
      intent: {
        location: '부천',
        searchLocation: '부천',
        lat: 37.5,
        lng: 126.8,
        mode: 'date',
        activities: [],
        startTime: '10:00',
        endTime: '20:00',
      },
      orderedPlaces: [
        {
          slotId: 'slot-0',
          order: 1,
          name: '점심식당',
          lat: 37.5001,
          lng: 126.8001,
          category: '한식',
          address: '경기 부천',
          type: 'food',
          distanceFromPrev: 0.4,
          travelMinutes: 10,
          anchorMinutes: 720,
          required: true,
        },
        {
          slotId: 'slot-1',
          order: 2,
          name: '예쁜카페',
          lat: 37.5002,
          lng: 126.8002,
          category: '카페',
          address: '경기 부천',
          type: 'cafe',
          distanceFromPrev: 0.4,
          travelMinutes: 10,
          required: true,
        },
        {
          slotId: 'slot-2',
          order: 3,
          name: '저녁이자카야',
          lat: 37.5003,
          lng: 126.8003,
          category: '이자카야',
          address: '경기 부천',
          type: 'food',
          distanceFromPrev: 0.4,
          travelMinutes: 10,
          anchorMinutes: 1080,
          required: true,
        },
      ],
    };

    step.execute(ctx);

    expect(ctx.scheduleItems?.[0].time.startsWith('12:00')).toBe(true);
    expect(ctx.scheduleItems?.[2].time.startsWith('18:00')).toBe(true);
  });

  it('endByMinutes가 있으면 optional filler부터 제거한다', () => {
    const step = new GenerateScheduleStep();
    const ctx: PipelineContext = {
      rawInput: '짧은 일정',
      mode: 'date',
      parsed: {
        location: '홍대',
        activities: ['맛집', '카페', '산책'],
        timeOfDay: 'full-day',
        preferences: [],
        softConstraints: {
          endByMinutes: 690,
        },
      },
      intent: {
        location: '홍대',
        searchLocation: '홍대',
        lat: 37.55,
        lng: 126.92,
        mode: 'date',
        activities: [],
        startTime: '10:00',
        endTime: '20:00',
      },
      orderedPlaces: [
        {
          slotId: 'slot-0',
          order: 1,
          name: '점심식당',
          lat: 37.5501,
          lng: 126.9201,
          category: '한식',
          address: '서울',
          type: 'food',
          distanceFromPrev: 0.5,
          travelMinutes: 10,
          required: true,
        },
        {
          slotId: 'slot-1',
          order: 2,
          name: '카페',
          lat: 37.5502,
          lng: 126.9202,
          category: '카페',
          address: '서울',
          type: 'cafe',
          distanceFromPrev: 0.5,
          travelMinutes: 10,
          required: false,
        },
        {
          slotId: 'slot-2',
          order: 3,
          name: '산책로',
          lat: 37.5503,
          lng: 126.9203,
          category: '공원',
          address: '서울',
          type: 'rest',
          distanceFromPrev: 0.5,
          travelMinutes: 10,
          required: false,
        },
      ],
    };

    step.execute(ctx);

    expect(ctx.scheduleItems?.map((item) => item.name)).toEqual(['점심식당']);
    expect(ctx.unsupportedHints ?? []).toEqual([]);
  });

  it('durationCap과 앵커가 충돌하면 unsupportedHint를 남긴다', () => {
    const step = new GenerateScheduleStep();
    const ctx: PipelineContext = {
      rawInput: '3시간 안에 끝나는 일정',
      mode: 'date',
      parsed: {
        location: '부천',
        activities: ['맛집', '저녁'],
        timeOfDay: 'full-day',
        preferences: [],
        softConstraints: {
          durationCapMinutes: 180,
        },
      },
      intent: {
        location: '부천',
        searchLocation: '부천',
        lat: 37.5,
        lng: 126.8,
        mode: 'date',
        activities: [],
        startTime: '10:00',
        endTime: '20:00',
      },
      orderedPlaces: [
        {
          slotId: 'slot-0',
          order: 1,
          name: '점심식당',
          lat: 37.5001,
          lng: 126.8001,
          category: '한식',
          address: '경기 부천',
          type: 'food',
          distanceFromPrev: 0.4,
          travelMinutes: 10,
          anchorMinutes: 720,
          required: true,
        },
        {
          slotId: 'slot-1',
          order: 2,
          name: '저녁이자카야',
          lat: 37.5002,
          lng: 126.8002,
          category: '이자카야',
          address: '경기 부천',
          type: 'food',
          distanceFromPrev: 0.4,
          travelMinutes: 10,
          anchorMinutes: 1080,
          required: true,
        },
      ],
    };

    step.execute(ctx);

    expect(ctx.unsupportedHints).toContain(
      '180분 이내 요청이 시간 앵커와 충돌해 반영되지 않았습니다.',
    );
  });
});
