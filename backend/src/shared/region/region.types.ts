export interface RegionRecord {
  code: string;
  name: string;
  shortName: string;
  type: 'sido' | 'sigungu' | 'dong' | 'landmark';
  sido?: string;
  sigungu?: string;
  dong?: string;
  aliases: string[];
  lat?: number;
  lng?: number;
  /** 지하철역 landmark: 기본주소에서 파싱한 시군구 (e.g. "성동") */
  parentRegion?: string;
  /** 지하철역 landmark: 원본 기본주소 */
  address?: string;
}

export interface RegionDataset {
  regions: RegionRecord[];
}
