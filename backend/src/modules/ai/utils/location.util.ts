const TRAILING_PARTICLE_REGEX =
  /(?:에서|에|으로|로|부터|까지|은|는|이|가|도|만|씩|마저|조차|이라도|라도|이나|나|뿐|밖에|께서|께|와|과|랑|하고|쯤|정도|근처|주변|부근|일대|쪽|요)$/;
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

export function stripLocationParticles(loc: string): string {
  if (!loc) return '';
  let normalized = loc.replace(/["'“”]/g, '').trim();
  let prev = '';
  while (prev !== normalized && normalized.length) {
    prev = normalized;
    normalized = normalized.replace(TRAILING_PARTICLE_REGEX, '');
    normalized = normalized.replace(TRAILING_PUNCT_REGEX, '');
  }
  return normalized.trim();
}

export function normalizeLocation(loc: string): string {
  if (!loc) return '서울';
  const normalized = stripLocationParticles(loc);
  return normalized.length === 0 ? '서울' : normalized;
}
