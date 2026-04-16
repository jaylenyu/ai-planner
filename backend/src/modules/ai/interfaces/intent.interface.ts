export type ActivityType = 'food' | 'cafe' | 'activity' | 'attraction' | 'rest';

export type ThemeTag =
  | 'seaside'
  | 'nature'
  | 'photo'
  | 'nightView'
  | 'shopping';

export type StylePreset =
  | 'romantic'
  | 'safeDate'
  | 'healing'
  | 'active'
  | 'familyFriendly'
  | 'unique';

export type FillerStrategy =
  | 'default'
  | 'food-heavy'
  | 'cafe-heavy'
  | 'active'
  | 'calm';

export interface SoftConstraints {
  indoorOnly?: boolean;
  endByMinutes?: number;
  durationCapMinutes?: number;
  anchorArea?: string;
  compactRoute?: boolean;
}

export interface RequestedCounts {
  food?: number;
  cafe?: number;
  activity?: number;
  attraction?: number;
  rest?: number;
}

export interface ActivitySlot {
  slotId: string;
  keyword: string;
  type: ActivityType;
  slotQuery: string;
  subtype?: string;
  anchorMinutes?: number;
  orderLocked?: boolean;
  required?: boolean;
}

export interface ParsedInput {
  location: string;
  activities: string[];
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'full-day';
  preferences: string[];
  flow?: ActivitySlot[];
  themes?: ThemeTag[];
  stylePresets?: StylePreset[];
  softConstraints?: SoftConstraints;
  requestedCounts?: RequestedCounts;
  fillerStrategy?: FillerStrategy;
  chainPenalty?: boolean;
  unsupportedHints?: string[];
}

export interface ActivityIntent {
  slotId: string;
  type: ActivityType;
  naverQuery: string;
  slotQuery?: string;
  subtype?: string;
  anchorMinutes?: number;
  orderLocked?: boolean;
  required?: boolean;
}

export interface IntentPayload {
  location: string;
  searchLocation: string;
  lat: number;
  lng: number;
  mode: 'date' | 'trip';
  activities: ActivityIntent[];
  startTime: string;
  endTime: string;
}
