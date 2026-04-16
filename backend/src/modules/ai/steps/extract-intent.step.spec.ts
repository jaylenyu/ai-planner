import { ExtractIntentStep } from './extract-intent.step';
import { PipelineContext } from '../interfaces/pipeline-result.interface';
import { PlacesService } from '../../places/places.service';
import { RegionService } from '../../../shared/region/region.service';
import { AliasLearningService } from '../../../shared/region/alias-learning.service';

function makeStep() {
  const placesService: {
    geocodeCity: jest.Mock;
  } = {
    geocodeCity: jest.fn(),
  };
  const regionService: {
    getRegion: jest.Mock;
    normalize: jest.Mock;
  } = {
    getRegion: jest.fn((name: string) => ({
      type: 'dong',
      shortName: name,
      lat: 37.5665,
      lng: 126.978,
    })),
    normalize: jest.fn(),
  };
  const aliasLearning = {
    logUnrecognized: jest.fn(),
  };

  const step = new ExtractIntentStep(
    placesService as unknown as PlacesService,
    regionService as unknown as RegionService,
    aliasLearning as unknown as AliasLearningService,
  );

  return { step, placesService, regionService, aliasLearning };
}

describe('ExtractIntentStep', () => {
  it('food preference가 있으면 food naverQuery에 우선 반영한다', async () => {
    const { step } = makeStep();

    const ctx = {
      rawInput: '연남동에서 피자먹고싶어',
      mode: 'date',
      parsed: {
        location: '연남동',
        activities: ['양식'],
        timeOfDay: 'full-day',
        preferences: ['피자'],
      },
    } as PipelineContext;

    await step.execute(ctx);

    expect(ctx.intent?.activities[0].naverQuery).toBe('연남동 피자 레스토랑');
    expect(ctx.intent?.activities[0].slotId).toBe('slot-0');
  });

  it('해장국 같은 메뉴 선호는 그대로 food 검색어에 반영한다', async () => {
    const { step } = makeStep();

    const ctx = {
      rawInput: '양평에서 해장국과 카페',
      mode: 'date',
      parsed: {
        location: '양평',
        activities: ['맛집', '카페'],
        timeOfDay: 'full-day',
        preferences: ['해장국'],
      },
    } as PipelineContext;

    await step.execute(ctx);

    expect(ctx.intent?.activities[0].naverQuery).toBe('양평 해장국');
  });

  it('flow가 있으면 slotQuery별로 점심/저녁 food를 분리한다', async () => {
    const { step } = makeStep();

    const ctx = {
      rawInput:
        '오늘 부천에서 맛집갔다가 이쁜 카페가고싶어. 저녁은 이자카야를 가고싶고, 저녁먹고 근처 산책했으면 좋겠어',
      mode: 'date',
      parsed: {
        location: '부천',
        activities: ['맛집', '카페', '저녁', '산책'],
        timeOfDay: 'full-day',
        preferences: ['이자카야'],
        flow: [
          {
            slotId: 'slot-0',
            keyword: '맛집',
            type: 'food',
            slotQuery: '맛집',
            anchorMinutes: 720,
            orderLocked: true,
            required: true,
          },
          {
            slotId: 'slot-1',
            keyword: '카페',
            type: 'cafe',
            slotQuery: '카페',
            orderLocked: true,
            required: true,
          },
          {
            slotId: 'slot-2',
            keyword: '이자카야',
            type: 'food',
            slotQuery: '이자카야',
            anchorMinutes: 1080,
            orderLocked: true,
            required: true,
          },
        ],
      },
    } as PipelineContext;

    await step.execute(ctx);

    expect(ctx.intent?.activities.map((activity) => activity.slotId)).toEqual([
      'slot-0',
      'slot-1',
      'slot-2',
    ]);
    expect(ctx.intent?.activities[0].naverQuery).toBe('부천 맛집 레스토랑');
    expect(ctx.intent?.activities[2].naverQuery).toBe('부천 이자카야');
    expect(
      ctx.intent?.activities.every((activity) => activity.orderLocked),
    ).toBe(true);
  });

  it('영화 활동은 subtype=movie로 정규화한다', async () => {
    const { step } = makeStep();

    const ctx = {
      rawInput: '홍대에서 영화 보고 싶어',
      mode: 'date',
      parsed: {
        location: '홍대',
        activities: ['영화'],
        timeOfDay: 'full-day',
        preferences: [],
      },
    } as PipelineContext;

    await step.execute(ctx);

    expect(ctx.intent?.activities[0].type).toBe('activity');
    expect(ctx.intent?.activities[0].subtype).toBe('movie');
    expect(ctx.intent?.activities[0].naverQuery).toContain('영화관');
  });

  it('anchorArea가 있으면 location은 유지하고 searchLocation만 바꾼다', async () => {
    const { step, placesService, regionService } = makeStep();
    placesService.geocodeCity.mockImplementation((name: string) => {
      if (name === '서울')
        return Promise.resolve({ lat: 37.5665, lng: 126.978 });
      if (name === '해운대')
        return Promise.resolve({ lat: 35.1587, lng: 129.1604 });
      return Promise.resolve(null);
    });
    regionService.getRegion = jest.fn((name: string) =>
      name === '서울' ? { type: 'city', shortName: '서울' } : undefined,
    );

    const ctx = {
      rawInput: '부산에서 하루 여행인데 해운대 근처로만 동선 최소화해서 짜줘',
      mode: 'trip',
      parsed: {
        location: '서울',
        activities: ['맛집', '카페'],
        timeOfDay: 'full-day',
        preferences: [],
        softConstraints: {
          anchorArea: '해운대',
          compactRoute: true,
        },
      },
    } as PipelineContext;

    await step.execute(ctx);

    expect(ctx.intent?.location).toBe('서울');
    expect(ctx.intent?.searchLocation).toBe('해운대');
  });
});
