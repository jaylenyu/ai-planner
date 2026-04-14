export interface RegionRecord {
  code: string;
  name: string;
  shortName: string;
  type: 'sido' | 'sigungu' | 'dong';
  sido?: string;
  sigungu?: string;
  dong?: string;
  aliases: string[];
}

export interface RegionDataset {
  regions: RegionRecord[];
}
