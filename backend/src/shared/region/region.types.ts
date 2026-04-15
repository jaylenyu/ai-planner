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
}

export interface RegionDataset {
  regions: RegionRecord[];
}
