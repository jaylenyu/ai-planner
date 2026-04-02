export interface ParsedInput {
  location: string;
  activities: string[];
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'full-day';
  preferences: string[];
}

export interface ActivityIntent {
  type: string;
  naverQuery: string;
}

export interface IntentPayload {
  location: string;
  lat: number;
  lng: number;
  mode: 'date' | 'trip';
  activities: ActivityIntent[];
  startTime: string;
  endTime: string;
}
