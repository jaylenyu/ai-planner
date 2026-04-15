export interface PlaceResult {
  name: string;
  lat: number;
  lng: number;
  category: string;
  address: string;
  link?: string;
  source?: 'naver' | 'kakao' | 'ai';
  score?: number;
}

export interface OrderedPlace extends PlaceResult {
  order: number;
  type: string;
  distanceFromPrev: number;
  travelMinutes: number;
}
