export interface DiversityHistory {
  placeCounts: Record<string, number>;
  chainCounts: Record<string, number>;
}

const CHAIN_BRANDS = [
  '스타벅스',
  '이디야',
  '투썸',
  '빽다방',
  '커피빈',
  '메가커피',
  '탐앤탐스',
  '할리스',
] as const;

export function normalizePlaceKey(name: string): string {
  return name.replace(/\s+/g, '').toLowerCase();
}

export function getChainBrand(name: string): string | undefined {
  const normalized = normalizePlaceKey(name);
  return CHAIN_BRANDS.find((brand) =>
    normalized.includes(normalizePlaceKey(brand)),
  );
}

export function createEmptyDiversityHistory(): DiversityHistory {
  return { placeCounts: {}, chainCounts: {} };
}
