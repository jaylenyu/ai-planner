export interface PlanItem {
  order: number;
  name: string;
  lat: number;
  lng: number;
  type: 'food' | 'activity' | 'cafe' | 'rest' | 'attraction';
  time: string;
  address: string;
  distanceFromPrev?: number;
}

export interface PlanResult {
  planId: string;
  summary: string;
  items: PlanItem[];
  polyline: [number, number][];
  totalDurationMin: number;
}

export interface AuthResponse {
  access_token: string;
}

export type PlanMode = 'date' | 'trip';

export const TYPE_ICONS: Record<string, string> = {
  food: '🍽',
  cafe: '☕',
  activity: '🎬',
  attraction: '🏛',
  rest: '🌿',
};

export const TYPE_LABELS: Record<string, string> = {
  food: '식사',
  cafe: '카페',
  activity: '액티비티',
  attraction: '관광',
  rest: '휴식',
};
