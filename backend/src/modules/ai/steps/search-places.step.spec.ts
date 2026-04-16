import { SearchPlacesStep } from './search-places.step';
import { PipelineContext } from '../interfaces/pipeline-result.interface';

describe('SearchPlacesStep', () => {
  it('generic food slot에서는 메뉴 preference 기반 쿼리를 함께 검색한다', async () => {
    const placesService = {
      searchNearby: jest.fn().mockResolvedValue([
        {
          name: '테스트식당',
          lat: 37.55,
          lng: 126.93,
          category: 'food',
          address: '서울',
          source: 'naver',
        },
      ]),
      searchNearbyKakao: jest.fn().mockResolvedValue([]),
    };
    const step = new SearchPlacesStep(placesService as never);
    const ctx: PipelineContext = {
      rawInput: '연남동에서 피자먹고싶어',
      mode: 'date',
      parsed: {
        location: '연남동',
        activities: ['양식', '카페'],
        timeOfDay: 'full-day',
        preferences: ['피자'],
      },
      intent: {
        location: '연남동',
        searchLocation: '연남동',
        lat: 37.55,
        lng: 126.93,
        mode: 'date',
        activities: [
          {
            slotId: 'slot-0',
            type: 'food',
            slotQuery: '양식',
            naverQuery: '연남동 양식 레스토랑 스테이크',
            required: true,
          },
        ],
        startTime: '10:00',
        endTime: '20:00',
      },
    };

    await step.execute(ctx);

    const searchedQueries = placesService.searchNearby.mock.calls.map(
      (call: unknown[]) => call[0],
    );
    expect(searchedQueries).toContain('연남동 양식 레스토랑 스테이크');
    expect(searchedQueries).toContain('연남동 피자');
    expect(searchedQueries).toContain('연남동 피자 맛집');
    expect(ctx.rawPlaces?.['slot-0']).toBeDefined();
  });

  it('2-food flow에서는 slotId별로 다른 쿼리를 독립 검색한다', async () => {
    const placesService = {
      searchNearby: jest.fn().mockResolvedValue([
        {
          name: '테스트장소',
          lat: 37.51,
          lng: 126.77,
          category: 'food',
          address: '경기 부천',
          source: 'naver',
        },
      ]),
      searchNearbyKakao: jest.fn().mockResolvedValue([]),
    };
    const step = new SearchPlacesStep(placesService as never);
    const ctx: PipelineContext = {
      rawInput:
        '오늘 부천에서 맛집갔다가 이쁜 카페가고싶어. 저녁은 이자카야를 가고싶고, 저녁먹고 근처 산책했으면 좋겠어',
      mode: 'date',
      parsed: {
        location: '부천',
        activities: ['맛집', '카페', '저녁', '산책'],
        timeOfDay: 'full-day',
        preferences: ['이자카야'],
      },
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
            naverQuery: '부천 맛집 레스토랑',
            anchorMinutes: 720,
            orderLocked: true,
            required: true,
          },
          {
            slotId: 'slot-1',
            type: 'cafe',
            slotQuery: '카페',
            naverQuery: '부천 카페 디저트',
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
    };

    await step.execute(ctx);

    const searchedQueries = placesService.searchNearby.mock.calls.map(
      (call: unknown[]) => call[0],
    );
    expect(searchedQueries).toContain('부천 맛집 레스토랑');
    expect(searchedQueries).toContain('부천 이자카야');
    expect(
      searchedQueries.filter((query: string) => query === '부천 이자카야')
        .length,
    ).toBe(1);
    expect(ctx.rawPlaces?.['slot-0']).toBeDefined();
    expect(ctx.rawPlaces?.['slot-2']).toBeDefined();
  });

  it('영화 슬롯에서는 영화관 체인 쿼리를 함께 검색한다', async () => {
    const placesService = {
      searchNearby: jest.fn().mockResolvedValue([
        {
          name: 'CGV 홍대',
          lat: 37.55,
          lng: 126.93,
          category: '영화관',
          address: '서울',
          source: 'naver',
        },
      ]),
      searchNearbyKakao: jest.fn().mockResolvedValue([]),
    };
    const step = new SearchPlacesStep(placesService as never);
    const ctx: PipelineContext = {
      rawInput: '홍대에서 영화 보고 싶어',
      mode: 'date',
      parsed: {
        location: '홍대',
        activities: ['영화'],
        timeOfDay: 'full-day',
        preferences: [],
      },
      intent: {
        location: '홍대',
        searchLocation: '홍대',
        lat: 37.55,
        lng: 126.93,
        mode: 'date',
        activities: [
          {
            slotId: 'slot-0',
            type: 'activity',
            slotQuery: '영화',
            naverQuery: '홍대 CGV 롯데시네마 메가박스 영화관',
            required: true,
          },
        ],
        startTime: '10:00',
        endTime: '20:00',
      },
    };

    await step.execute(ctx);

    const searchedQueries = placesService.searchNearby.mock.calls.map(
      (call: unknown[]) => call[0],
    );
    expect(searchedQueries).toEqual(
      expect.arrayContaining([
        '홍대 CGV 롯데시네마 메가박스 영화관',
        '홍대 영화관',
        '홍대 CGV',
        '홍대 메가박스',
        '홍대 롯데시네마',
      ]),
    );
    expect(
      placesService.searchNearby.mock.calls.every(
        (call: unknown[]) => call[2] === 8,
      ),
    ).toBe(true);
    expect(
      placesService.searchNearbyKakao.mock.calls.every(
        (call: unknown[]) => call[3] === 8,
      ),
    ).toBe(true);
  });
});
