const TRAILING_PARTICLE_REGEX =
  /(?:에서|에|으로|로|부터|까지|은|는|이|가|도|만|씩|마저|조차|이라도|라도|이나|나|뿐|밖에|께서|께|와|과|랑|하고|쯤|정도|근처|주변|부근|일대|쪽|요)$/;
const TRAILING_PUNCT_REGEX = /[.,!?\s]+$/;

export const KNOWN_LOCATIONS = [
  '강남',
  '홍대',
  '이태원',
  '명동',
  '여의도',
  '신촌',
  '건대',
  '성수동',
  '잠실',
  '종로',
  '인사동',
  '압구정',
  '청담',
  '합정',
  '망원',
  '용산',
  '동대문',
  '서울',
  '부산',
  '해운대',
  '광안리',
  '제주',
  '전주',
  '대구',
  '광주',
  '수원',
  '인천',
  '대전',
  '춘천',
  '강릉',
  '속초',
  '경주',
  '여수',
  '통영',
  '울산',
  '청주',
];

export const LOCATION_ALIAS: Record<string, string> = {
  연남동: '홍대',
  망리단길: '홍대',
  익선동: '종로',
  해방촌: '이태원',
  경리단길: '이태원',
  성수: '성수동',
  뚝섬: '성수동',
};

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
  let normalized = stripLocationParticles(loc);
  if (normalized.length === 0) return '서울';
  if (LOCATION_ALIAS[normalized]) {
    normalized = LOCATION_ALIAS[normalized];
  }
  return normalized;
}
