import { SearchPlacesStep } from './search-places.step';
import { PipelineContext } from '../interfaces/pipeline-result.interface';

describe('SearchPlacesStep', () => {
  it('food activity에서 메뉴 preference 기반 쿼리를 함께 검색한다', async () => {
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
    const step = new SearchPlacesStep(placesService as any);
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
        lat: 37.55,
        lng: 126.93,
        mode: 'date',
        activities: [{ type: 'food', naverQuery: '연남동 양식 레스토랑 스테이크' }],
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
  });
});
