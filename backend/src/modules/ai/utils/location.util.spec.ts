import { normalizeLocation, stripLocationParticles } from './location.util';

describe('normalizeLocation — 파싱된 지명 정규화', () => {
  it('따옴표·공백만 제거, 조사 제거 없음', () => {
    expect(normalizeLocation('서울')).toBe('서울');
    expect(normalizeLocation('"부산"')).toBe('부산');
    expect(normalizeLocation('  강릉  ')).toBe('강릉');
  });

  it('빈 값은 서울 반환', () => {
    expect(normalizeLocation('')).toBe('서울');
    expect(normalizeLocation('  ')).toBe('서울');
  });

  it('조사가 붙어 있어도 지명을 자르지 않음 (LLM이 이미 제거)', () => {
    // extract-intent 입력은 LLM이 파싱한 결과이므로 "에서" 등이 오더라도
    // 지명 일부를 잘라내지 않는다.
    expect(normalizeLocation('청도')).toBe('청도');
    expect(normalizeLocation('전라도')).toBe('전라도');
    expect(normalizeLocation('경기도')).toBe('경기도');
  });

  it('"도"/"은"/"이"/"가" 로 끝나는 지명 보호', () => {
    expect(normalizeLocation('청도')).toBe('청도');
    expect(normalizeLocation('완도')).toBe('완도');
    expect(normalizeLocation('진도')).toBe('진도');
    expect(normalizeLocation('거제도')).toBe('거제도');
    expect(normalizeLocation('울릉도')).toBe('울릉도');
    expect(normalizeLocation('전라도')).toBe('전라도');
    expect(normalizeLocation('경상도')).toBe('경상도');
    expect(normalizeLocation('보은')).toBe('보은');
    expect(normalizeLocation('삼가')).toBe('삼가');
  });
});

describe('stripLocationParticles — 날 텍스트 조사 제거', () => {
  it('위치격 조사 제거', () => {
    expect(stripLocationParticles('상주에서')).toBe('상주');
    expect(stripLocationParticles('당진에')).toBe('당진');
    expect(stripLocationParticles('부산으로')).toBe('부산');
    expect(stripLocationParticles('서울로')).toBe('서울');
    expect(stripLocationParticles('청주부터')).toBe('청주');
    expect(stripLocationParticles('인천까지')).toBe('인천');
  });

  it('겹조사·구두점 제거', () => {
    expect(stripLocationParticles('상주에서요')).toBe('상주');
    expect(stripLocationParticles('문경에서요?!')).toBe('문경');
    expect(stripLocationParticles('강릉쯤')).toBe('강릉');
    expect(stripLocationParticles('수원근처')).toBe('수원');
  });

  it('"도"/"은" 포함 지명은 에서 붙은 형태에서도 올바르게 처리', () => {
    expect(stripLocationParticles('청도에서')).toBe('청도');
    expect(stripLocationParticles('전라도에서')).toBe('전라도');
    expect(stripLocationParticles('보은에서')).toBe('보은');
    expect(stripLocationParticles('삼가에서')).toBe('삼가');
  });
});
