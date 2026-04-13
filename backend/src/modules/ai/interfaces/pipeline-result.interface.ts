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
  parsed?: ParsedInput;
  intent?: IntentPayload;
  rawPlaces?: Record<string, PlaceResult[]>;
  candidates?: Record<string, PlaceResult[]>;
  orderedPlaces?: OrderedPlace[];
  scheduleItems?: ScheduleItem[];
  polyline?: [number, number][];
  summary?: string;
}

export interface PipelineResult {
  summary: string;
  items: ScheduleItem[];
  polyline: [number, number][];
  totalDurationMin: number;
}
