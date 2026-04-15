import { PlaceResult, OrderedPlace } from './place.interface';
import { IntentPayload, ParsedInput } from './intent.interface';

export interface ScheduleItem {
  order: number;
  name: string;
  lat: number;
  lng: number;
  type: string;
  time: string;
  address: string;
  distanceFromPrev?: number;
}

export interface PipelineContext {
  rawInput: string;
  mode: 'date' | 'trip';
  /** 요청 단위 랜덤 함수 (미지정 시 Math.random 사용) */
  randomFn?: () => number;
  parsed?: ParsedInput;
  intent?: IntentPayload;
  locationCandidates?: LocationCandidateLog[];
  /** registry miss였지만 winner가 된 raw 토큰. extract-intent에서 geocode 확인 후 alias 학습에 사용. */
  unrecognizedLocationToken?: string;
  rawPlaces?: Record<string, PlaceResult[]>;
  candidates?: Record<string, PlaceResult[]>;
  orderedPlaces?: OrderedPlace[];
  scheduleItems?: ScheduleItem[];
  polyline?: [number, number][];
  summary?: string;
  unsupportedHints?: string[];
}

export interface LocationCandidateLog {
  value: string;
  source: string;
  score: number;
  raw: string;
}

export interface PipelineResult {
  summary: string;
  items: ScheduleItem[];
  polyline: [number, number][];
  totalDurationMin: number;
  unsupportedHints: string[];
}
