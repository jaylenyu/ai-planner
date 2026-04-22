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
  role?: 'USER' | 'ADMIN';
  adminReadOnly?: boolean;
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

export interface AdminKpis {
  totalUsers: number;
  activeSubscriptions: number;
  mrr: number;
  plansToday: number;
  monthlyAwsCost: number;
  unresolvedSentryCount: number;
}

export interface AdminSummaryResponse {
  kpis: AdminKpis;
  recentFailures: Array<{
    id: string;
    orderId: string;
    amount: number;
    method: string;
    status: string;
    failReason: string | null;
    createdAt: string;
    user: UserSummary;
    subscription: {
      id: string;
      status: string;
      planCode: string;
    };
  }>;
  recentUsers: Array<{
    id: string;
    email: string;
    role: 'USER' | 'ADMIN';
    emailVerified: boolean;
    lastLoginAt: string | null;
    createdAt: string;
  }>;
}

export interface AdminUserListResponse {
  items: Array<{
    id: string;
    email: string;
    role: 'USER' | 'ADMIN';
    emailVerified: boolean;
    isSuspended: boolean;
    googleId: string | null;
    kakaoId: string | null;
    naverId: string | null;
    lastLoginAt: string | null;
    createdAt: string;
    subscription?: {
      status: string;
      planCode: string;
      currentPeriodEnd: string | null;
      graceEndsAt: string | null;
      cancelledAt: string | null;
    } | null;
    _count: {
      plans: number;
      payments: number;
      notifications: number;
    };
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminUserDetail {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  isSuspended: boolean;
  emailVerified: boolean;
  googleId: string | null;
  kakaoId: string | null;
  naverId: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  subscription: {
    id: string;
    status: string;
    planCode: string;
    currentPeriodEnd: string | null;
    graceEndsAt: string | null;
    cancelledAt: string | null;
    payments: Array<{
      id: string;
      orderId: string;
      amount: number;
      method: string;
      status: string;
      failReason: string | null;
      createdAt: string;
    }>;
  } | null;
  payments: Array<{
    id: string;
    orderId: string;
    amount: number;
    method: string;
    status: string;
    failReason: string | null;
    createdAt: string;
  }>;
  plans: PlanSummary[];
  ownedWorkspaces: Array<{
    id: string;
    name: string;
    ownerId: string;
    createdAt: string;
    updatedAt: string;
    members: Array<{
      id: string;
      role: string;
      user: UserSummary;
    }>;
    invites: WorkspaceInvite[];
    plans: PlanSummary[];
  }>;
  workspaceMembership: {
    id: string;
    role: string;
    workspace: {
      id: string;
      name: string;
      owner: UserSummary;
      members: Array<{
        id: string;
        role: string;
        user: UserSummary;
      }>;
    };
  } | null;
}

export interface AdminBillingResponse {
  statusCounts: Record<string, number>;
  subscriptions: Array<{
    id: string;
    userId: string;
    planCode: string;
    status: string;
    currentPeriodEnd: string | null;
    graceEndsAt: string | null;
    cancelledAt: string | null;
    createdAt: string;
    updatedAt: string;
    user: UserSummary;
  }>;
  payments: Array<{
    id: string;
    userId: string;
    subscriptionId: string;
    orderId: string;
    paymentKey: string | null;
    amount: number;
    method: string;
    status: string;
    requestedAt: string;
    confirmedAt: string | null;
    failReason: string | null;
    createdAt: string;
    user: UserSummary;
  }>;
  failedPayments: Array<{
    id: string;
    orderId: string;
    amount: number;
    method: string;
    status: string;
    failReason: string | null;
    createdAt: string;
    user: UserSummary;
  }>;
}

export interface AdminPlansResponse {
  timeline: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  suspiciousUsers: Array<{
    userId: string;
    count: number;
    user: UserSummary;
  }>;
  workspaces: Array<{
    id: string;
    name: string;
    ownerId: string;
    createdAt: string;
    updatedAt: string;
    owner: UserSummary;
    _count: {
      members: number;
      plans: number;
      invites: number;
    };
  }>;
  plans: Array<PlanSummary & {
    user: UserSummary;
    workspace: {
      id: string;
      name: string;
      ownerId: string;
      createdAt: string;
      updatedAt: string;
      owner: UserSummary;
      _count: {
        members: number;
      };
    } | null;
  }>;
}

export interface AdminPlanListResponse {
  items: Array<AdminPlansResponse['plans'][number]>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminWorkspaceListResponse {
  items: Array<AdminPlansResponse['workspaces'][number]>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminApiUsageResponse {
  totalsByDay: Record<string, { count: number; cost: number }>;
  topUsers: Array<{
    userId: string;
    _sum: { cost: number | null };
    _count: { _all: number };
  }>;
}

export interface AdminCostResponse {
  configured: boolean;
  available: boolean;
  source: 'cost-explorer' | 'fallback';
  currency: string;
  total: number;
  monthly: number;
  deltaPct: number;
  byService: Record<string, number>;
  points: Array<{ date: string; cost: number }>;
  error?: string;
}

export interface AdminSentryResponse {
  configured: boolean;
  available: boolean;
  error?: string;
  totalCount: number;
  issues: Array<{
    id: string;
    title: string;
    count: number;
    firstSeen: string;
    lastSeen: string;
    permalink: string;
  }>;
}

export interface AdminLogsResponse {
  configured: boolean;
  available: boolean;
  source: 'cloudwatch' | 'fallback';
  container: 'backend' | 'frontend';
  search: string;
  error?: string;
  lines: Array<{
    timestamp: string;
    level: 'INFO' | 'WARN' | 'ERROR';
    message: string;
    raw?: unknown;
  }>;
}

export interface AdminUserUpdateResponse {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  isSuspended: boolean;
}

export type PlanMode = 'date' | 'trip';
export type UserRole = 'USER' | 'ADMIN';

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
