import { RegionService } from './region.service';

/**
 * 실제 regions.json을 로드해서 실행하는 통합 스타일 단위 테스트.
 * onModuleInit()을 수동으로 호출해 레지스트리를 초기화한다.
 */
describe('RegionService — scanAll / resolveBest', () => {
  let service: RegionService;

  beforeAll(() => {
    service = new RegionService();
    service.onModuleInit();
  });

  // ─── resolveBest ───────────────────────────────────────────────

  describe('resolveBest', () => {
    it('"성수동 카페 투어" → 동 해상도 성수동 반환 (성동 아님)', () => {
      expect(service.resolveBest('성수동 카페 투어')).toBe('성수동');
    });

    it('"강남에서 저녁" → 강남 (sigungu)', () => {
      expect(service.resolveBest('강남에서 저녁')).toBe('강남');
    });

    it('"상주 여행" → 상주 (sigungu)', () => {
      expect(service.resolveBest('상주 여행')).toBe('상주');
    });

    it('"연남동 맛집" → 연남동 (dong, 마포 아님)', () => {
      expect(service.resolveBest('연남동 맛집')).toBe('연남동');
    });

    it('"이태원에서 술 한잔" → 이태원', () => {
      expect(service.resolveBest('이태원에서 술 한잔')).toBe('이태원');
    });

    it('"홍대 데이트 코스" → 홍대', () => {
      expect(service.resolveBest('홍대 데이트 코스')).toBe('홍대');
    });

    it('"해운대 바다 여행" → 해운대', () => {
      expect(service.resolveBest('해운대 바다 여행')).toBe('해운대');
    });

    it('"제주도 여행 일정" → 제주', () => {
      const result = service.resolveBest('제주도 여행 일정');
      expect(result).toBe('제주');
    });

    it('지역명 없는 입력 → null 반환', () => {
      expect(service.resolveBest('당일치기 여행 추천해줘')).toBeNull();
    });

    it('빈 문자열 → null 반환', () => {
      expect(service.resolveBest('')).toBeNull();
    });

    it('dong이 sigungu보다 우선 ("성수동" vs "성동" 동시 포함 시)', () => {
      const result = service.resolveBest('성수동 성동구 카페');
      expect(result).toBe('성수동');
    });

    it('"뚝섬역 근처" → landmark "뚝섬" 반환 (landmark > dong 우선)', () => {
      const result = service.resolveBest('뚝섬역 근처 카페');
      expect(result).toBe('뚝섬');
    });

    it('"강남역에서 저녁" → landmark "강남" 반환', () => {
      const result = service.resolveBest('강남역에서 저녁');
      expect(result).toBe('강남');
    });

    it('"홍대입구역 데이트" → landmark "홍대입구" 반환', () => {
      const result = service.resolveBest('홍대입구역 데이트');
      expect(result).toBe('홍대입구');
    });

    it('landmark 레코드에 좌표가 있다', () => {
      const match = service.scanAll('강남역').find(m => m.region.type === 'landmark');
      expect(match?.region.lat).toBeDefined();
      expect(match?.region.lng).toBeDefined();
    });
  });

  // ─── scanAll ──────────────────────────────────────────────────

  describe('scanAll', () => {
    it('"강남에서 저녁 데이트"에서 강남 매칭', () => {
      const matches = service.scanAll('강남에서 저녁 데이트');
      const tokens = matches.map((m) => m.token);
      expect(tokens).toContain('강남');
    });

    it('동일 region code는 중복 수집되지 않는다', () => {
      // "성수동"과 "성수"는 같은 region code를 가질 수 있음
      const matches = service.scanAll('성수동 성수 카페');
      const codes = matches.map((m) => m.region.code);
      const uniqueCodes = new Set(codes);
      expect(codes.length).toBe(uniqueCodes.size);
    });

    it('조사가 붙은 "상주에서"에서 상주 추출', () => {
      const matches = service.scanAll('상주에서 맛있는 여행');
      const tokens = matches.map((m) => m.token);
      expect(tokens).toContain('상주');
    });
  });

  // ─── 기존 메서드 회귀 ─────────────────────────────────────────

  describe('normalize (regression)', () => {
    it('홍대 alias → normalize 결과 non-null', () => {
      // 홍대는 CUSTOM_ALIAS_BY_FULL 등록 alias → sigungu 수준 값 반환
      expect(service.normalize('홍대')).not.toBeNull();
    });

    it('해운대 → normalize 결과 non-null', () => {
      expect(service.normalize('해운대')).not.toBeNull();
    });

    it('없는 지역 → null', () => {
      expect(service.normalize('없는지역이름xyz')).toBeNull();
    });
  });
});
