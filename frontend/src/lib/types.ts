export interface PlanItem {
  id?: string;
  order: number;
  name: string;
  lat: number;
  lng: number;
  type: 'food' | 'activity' | 'cafe' | 'rest' | 'attraction';
  time: string;
  address: string;
  link?: string;
  source?: 'naver' | 'kakao' | 'ai';
  distanceFromPrev?: number;
}

export interface PlanResult {
  planId: string;
  summary: string;
  items: PlanItem[];
  polyline: [number, number][];
  totalDurationMin: number;
  unsupportedHints: string[];
  workspace?: {
    id: string;
    name: string;
  } | null;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
}

export type SubscriptionStatus = 'inactive' | 'active' | 'grace' | 'expired' | 'cancelled';
export type PaymentMethod = 'CARD' | 'TOSSPAY' | 'KAKAOPAY' | 'NAVERPAY';

export interface SubscriptionSummary {
  id: string;
  userId: string;
  planCode: string;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  graceEndsAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionStatusResponse {
  subscription: SubscriptionSummary;
  hasAccess: boolean;
  monthlyAmount: number;
}

export interface PaymentPrepareResponse extends SubscriptionStatusResponse {
  orderId: string;
  customerKey: string;
  orderName: string;
  payment: {
    id: string;
    amount: number;
    status: 'READY' | 'DONE' | 'FAILED' | 'CANCELED';
    method: PaymentMethod | string;
  };
}

export interface UserSummary {
  id: string;
  email: string;
}

export interface CategorySummary {
  id: string;
  name: string;
  color: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkspaceInvite {
  id: string;
  email: string;
  token: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: UserSummary;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  ownerId: string;
  createdAt?: string;
  updatedAt?: string;
  members: WorkspaceMember[];
  invites: WorkspaceInvite[];
}

export interface WorkspaceMineResponse {
  workspace: WorkspaceSummary | null;
  role?: string;
}

export interface PlanMemo {
  id: string;
  content: string;
  createdAt: string;
  author: UserSummary;
}

export interface PlanSummary {
  id: string;
  rawInput: string;
  mode: string;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
  category?: CategorySummary | null;
  workspace?: {
    id: string;
    name: string;
  } | null;
  user?: UserSummary;
  items: PlanItem[];
  memos?: PlanMemo[];
}

export interface NotificationItem {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  read: boolean;
  createdAt: string;
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
