/**
 * TRAILING_PARTICLE_REGEX
 *
 * 날 텍스트(사용자 입력, LLM 원문)에서 지명 뒤에 붙은 조사를 제거하는 용도.
 * stripLocationParticles()에서만 사용하며, 반복 적용으로 겹조사를 처리한다.
 *
 * 의도적으로 제외한 패턴:
 *   '도'  — 청도·완도·진도 등 2음절 지명, 경기도·전라도 등 도(道) 명칭과 구분 불가
 *   '라도' — 전라도·경상도 등 도(道) 명칭의 접미사와 구분 불가
 *   '은'  — 보은(충북) 등 단음절 조사와 지명 끝이 겹침
 *   '는'  — 동일 이유
 *   '이'  — 우이(도), 거제이 등 지명 끝과 겹침
 *   '가'  — 삼가(합천) 등 지명 끝과 겹침
 *   '나'  — 지명 끝과 겹칠 수 있음
 *   '와','과','랑','하고' — 지명 끝과 겹칠 수 있음
 *
 * 안전하게 포함된 패턴:
 *   '에서','으로','로','부터','까지','에' — 위치격 조사, 지명 내부에 등장하지 않음
 *   '만','씩','마저','조차','이라도','이나','뿐','밖에','께서','께' — 고빈도 보조사
 *   '쯤','정도','근처','주변','부근','일대','쪽','요' — 부사/접미사
 */
const TRAILING_PARTICLE_REGEX =
  /(?:에서|으로|로|부터|까지|이라도|이나|마저|조차|밖에|께서|께|쯤|정도|근처|주변|부근|일대|쪽|만|씩|뿐|요|에)$/;
const TRAILING_PUNCT_REGEX = /[.,!?\s]+$/;

export const LOCATION_STOP_WORDS = new Set<string>([
  '여행',
  '일정',
  '데이트',
  '코스',
  '추천',
  '음식',
  '먹을',
  '해줘',
  '뭐해',
  '뭐하지',
  '뭐할',
  '가자',
  '갈래',
  '해보자',
  '봅시다',
  '살펴봐',
  '추천해',
  '점심',
  '저녁',
  '브런치',
  '맛집',
  '카페',
  '영화',
  '볼링',
  '쇼핑',
  '노래방',
  '방탈출',
  '클라이밍',
  '전시',
  '박물관',
  '뮤지컬',
  '산책',
  '공원',
  '한강',
  '당일치기',
]);

/**
 * 날 텍스트에서 지명 뒤 조사·구두점을 반복 제거한다.
 * parse-input 단계에서 LLM 원문 정제에 사용.
 */
export function stripLocationParticles(loc: string): string {
  if (!loc) return '';
  let normalized = loc.replace(/["'""]/g, '').trim();
  let prev = '';
  while (prev !== normalized && normalized.length) {
    prev = normalized;
    normalized = normalized.replace(TRAILING_PARTICLE_REGEX, '');
    normalized = normalized.replace(TRAILING_PUNCT_REGEX, '');
  }
  return normalized.trim();
}

/**
 * 이미 파싱된 지명을 정규화한다.
 * LLM이 이미 조사를 제거했으므로 따옴표·공백 제거만 수행한다.
 * 조사 제거를 여기서 다시 하면 보은→보, 삼가→삼 같은 오인식이 발생한다.
 */
export function normalizeLocation(loc: string): string {
  if (!loc) return '서울';
  const normalized = loc.replace(/["'""]/g, '').trim();
  return normalized.length === 0 ? '서울' : normalized;
}
