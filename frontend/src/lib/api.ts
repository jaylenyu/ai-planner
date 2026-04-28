import { useAuthStore } from "../stores/authStore";
import type {
  CategorySummary,
  AdminApiUsageResponse,
  AdminBillingResponse,
  AdminCostResponse,
  AdminLogsResponse,
  AdminPlanListResponse,
  AdminPlansResponse,
  AdminSentryResponse,
  AdminWorkspaceListResponse,
  AdminSummaryResponse,
  AdminUserDetail,
  AdminUserListResponse,
  AdminUserUpdateResponse,
  NotificationItem,
  PaymentPrepareResponse,
  PlanMemo,
  PlanSummary,
  SubscriptionStatusResponse,
  WorkspaceMineResponse,
} from "./types";

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const normalizedApiUrl = rawApiUrl.replace(/\/+$/, "");
const absoluteApiBaseUrl = normalizedApiUrl.endsWith("/api")
  ? normalizedApiUrl
  : `${normalizedApiUrl}/api`;
const browserApiBaseUrl = '/api';

export const API_BASE_URL =
  typeof window === 'undefined' ? absoluteApiBaseUrl : browserApiBaseUrl;

export class ApiError extends Error {
  status: number;
  payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

type AuthAdapter = {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  setTokens: (access: string, refresh: string) => void;
  setAccessToken?: (access: string) => void;
  clearTokens: () => void;
};

async function tryRefresh(auth: AuthAdapter): Promise<boolean> {
  const refreshToken = auth.getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      auth.clearTokens();
      return false;
    }

    const data = await res.json();
    auth.setTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    auth.clearTokens();
    return false;
  }
}

async function requestRaw<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = "요청 실패";
    let payload: unknown;
    if (text) {
      try {
        const parsed = JSON.parse(text) as { message?: string };
        payload = parsed;
        if (parsed?.message) message = parsed.message;
      } catch {
        message = text;
      }
    }
    throw new ApiError(message, res.status, payload);
  }

  if (res.status === 204 || res.status === 205) {
    return undefined as T;
  }

  const text = await res.text();
  if (!text) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}

async function requestAppRaw<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const res = await fetch(path, { ...options, headers });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let message = '요청 실패';
    let payload: unknown;
    if (text) {
      try {
        const parsed = JSON.parse(text) as { message?: string };
        payload = parsed;
        if (parsed?.message) message = parsed.message;
      } catch {
        message = text;
      }
    }
    throw new ApiError(message, res.status, payload);
  }

  if (res.status === 204 || res.status === 205) {
    return undefined as T;
  }

  const text = await res.text();
  if (!text) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}

async function requestWithAuth<T>(
  auth: AuthAdapter,
  loginPath: string,
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const token = auth.getAccessToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh(auth);
    if (refreshed) {
      return requestWithAuth<T>(auth, loginPath, path, options, false);
    }
    auth.clearTokens();
    if (typeof window !== 'undefined') {
      window.location.href = loginPath;
    }
    throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let message = '요청 실패';
    let payload: unknown;
    if (text) {
      try {
        const parsed = JSON.parse(text) as { message?: string };
        payload = parsed;
        if (parsed?.message) message = parsed.message;
      } catch {
        message = text;
      }
    }
    throw new ApiError(message, res.status, payload);
  }

  if (res.status === 204 || res.status === 205) {
    return undefined as T;
  }

  const text = await res.text();
  if (!text) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}

export const api = {
  post: <T>(path: string, body: unknown) =>
    requestWithAuth<T>(
      {
        getAccessToken: () => useAuthStore.getState().accessToken,
        getRefreshToken: () => useAuthStore.getState().refreshToken,
        setTokens: (access, refresh) => useAuthStore.getState().setTokens(access, refresh),
        setAccessToken: (access) => useAuthStore.getState().setAccessToken(access),
        clearTokens: () => useAuthStore.getState().clearTokens(),
      },
      '/login',
      path,
      { method: 'POST', body: JSON.stringify(body) },
    ),
  get: <T>(path: string) =>
    requestWithAuth<T>(
      {
        getAccessToken: () => useAuthStore.getState().accessToken,
        getRefreshToken: () => useAuthStore.getState().refreshToken,
        setTokens: (access, refresh) => useAuthStore.getState().setTokens(access, refresh),
        setAccessToken: (access) => useAuthStore.getState().setAccessToken(access),
        clearTokens: () => useAuthStore.getState().clearTokens(),
      },
      '/login',
      path,
    ),
  patch: <T>(path: string, body: unknown) =>
    requestWithAuth<T>(
      {
        getAccessToken: () => useAuthStore.getState().accessToken,
        getRefreshToken: () => useAuthStore.getState().refreshToken,
        setTokens: (access, refresh) => useAuthStore.getState().setTokens(access, refresh),
        setAccessToken: (access) => useAuthStore.getState().setAccessToken(access),
        clearTokens: () => useAuthStore.getState().clearTokens(),
      },
      '/login',
      path,
      { method: 'PATCH', body: JSON.stringify(body) },
    ),
  delete: <T>(path: string, body?: unknown) =>
    requestWithAuth<T>(
      {
        getAccessToken: () => useAuthStore.getState().accessToken,
        getRefreshToken: () => useAuthStore.getState().refreshToken,
        setTokens: (access, refresh) => useAuthStore.getState().setTokens(access, refresh),
        setAccessToken: (access) => useAuthStore.getState().setAccessToken(access),
        clearTokens: () => useAuthStore.getState().clearTokens(),
      },
      '/login',
      path,
      {
        method: "DELETE",
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      },
    ),
};

export const planApi = {
  list: (categoryId?: string, scope?: "personal" | "shared") => {
    const params = new URLSearchParams();
    if (categoryId) params.set("categoryId", categoryId);
    if (scope) params.set("scope", scope);
    const query = params.toString();
    return api.get<PlanSummary[]>(
      query ? `/plan/list?${query}` : "/plan/list",
    );
  },
  get: (id: string) => api.get<PlanSummary>(`/plan/${id}`),
  update: (id: string, body: unknown) =>
    api.patch<PlanSummary>(`/plan/${id}`, body),
  delete: (id: string) => api.delete<{ deleted: boolean }>(`/plan/${id}`),
  addItem: (id: string, body: unknown) =>
    api.post<PlanSummary>(`/plan/${id}/items`, body),
  updateItem: (id: string, itemId: string, body: unknown) =>
    api.patch<PlanSummary>(`/plan/${id}/items/${itemId}`, body),
  deleteItem: (id: string, itemId: string, body: unknown) =>
    api.delete<PlanSummary>(`/plan/${id}/items/${itemId}`, body),
  listMemos: (id: string) => api.get<PlanMemo[]>(`/plan/${id}/memos`),
  createMemo: (id: string, body: unknown) =>
    api.post<PlanMemo>(`/plan/${id}/memos`, body),
  deleteMemo: (id: string, memoId: string) =>
    api.delete<{ deleted: boolean }>(`/plan/${id}/memos/${memoId}`),
};

export const workspaceApi = {
  mine: () => api.get<WorkspaceMineResponse>("/workspace/mine"),
  create: (body: unknown) => api.post<WorkspaceMineResponse>("/workspace", body),
  invite: (id: string, body: unknown) =>
    api.post<{
      invite: {
        id: string;
        email: string;
        token: string;
        status: string;
        expiresAt: string;
        createdAt: string;
      };
      inviteUrl: string;
    }>(`/workspace/${id}/invite`, body),
  join: (token: string) => api.post<WorkspaceMineResponse>(`/workspace/join/${token}`, {}),
  dissolve: (id: string) => api.delete<{ deleted: boolean }>(`/workspace/${id}`),
};

export const notificationApi = {
  unread: () => api.get<NotificationItem[]>("/notification/unread"),
  markRead: (id: string) => api.patch<{ updated: boolean }>(`/notification/${id}/read`, {}),
  markAllRead: () => api.patch<{ updated: boolean }>("/notification/read-all", {}),
};

export const categoryApi = {
  list: () => api.get<CategorySummary[]>("/category/list"),
  create: (body: unknown) => api.post<CategorySummary>("/category", body),
  update: (id: string, body: unknown) =>
    api.patch<CategorySummary>(`/category/${id}`, body),
  delete: (id: string) => api.delete<{ deleted: boolean }>(`/category/${id}`),
};

export const billingApi = {
  prepare: () => api.post<PaymentPrepareResponse>("/payment/prepare", {}),
  confirm: (body: { paymentKey: string; orderId: string; amount: number }) =>
    api.post<SubscriptionStatusResponse>("/payment/confirm", body),
  status: () => api.get<SubscriptionStatusResponse>("/subscription/status"),
  cancel: () => api.delete<void>("/subscription/cancel"),
  resubscribe: () => api.post<void>("/payment/resubscribe", {}),
};

export const authApi = {
  checkEmail: (email: string) =>
    requestRaw<{ available: boolean; message: string }>("/auth/email/check", {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  requestEmailCode: (email: string, captchaToken: string) =>
    requestRaw<{ message: string }>("/auth/email/request-code", {
      method: 'POST',
      body: JSON.stringify({ email, captchaToken }),
    }),

  verifyEmailCode: (email: string, code: string) =>
    requestRaw<{ verified: boolean }>("/auth/email/verify-code", {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),

  register: (
    email: string,
    password: string,
    agreedTerms: boolean,
    agreedPrivacy: boolean,
  ) =>
    requestRaw<{ access_token: string; refresh_token: string }>(
      "/auth/register",
      {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          agreedTerms,
          agreedPrivacy,
        }),
      },
    ),

  login: (email: string, password: string) =>
    requestRaw<{ access_token: string; refresh_token: string }>("/auth/login", {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  loginAdmin: (email: string, password: string) =>
    requestAppRaw<{
      ok: true;
      user: {
        userId: string;
        email: string;
        role: 'ADMIN';
        adminReadOnly: boolean;
      };
    }>('/api/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logoutAdmin: () =>
    requestAppRaw<{ ok: true }>('/api/admin/auth/logout', {
      method: 'POST',
    }),
};

export interface MeResponse {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
  hasPassword: boolean;
  providers: { google: boolean; kakao: boolean; naver: boolean };
  inAppNotificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
}

export async function getMe(): Promise<MeResponse> {
  return api.get<MeResponse>('/auth/me');
}

export async function updateSettings(data: {
  inAppNotificationsEnabled?: boolean;
  emailNotificationsEnabled?: boolean;
}): Promise<void> {
  return api.patch<void>('/auth/settings', data);
}

export async function changePassword(data: {
  currentPassword?: string;
  newPassword: string;
  verifyToken?: string;
}): Promise<{ access_token: string; refresh_token: string }> {
  return api.patch<{ access_token: string; refresh_token: string }>('/auth/password', data);
}

export async function requestPasswordSetup(): Promise<void> {
  return api.post<void>('/auth/password/setup-request', {});
}

export async function verifyPasswordSetup(code: string): Promise<{ verifyToken: string }> {
  return api.post<{ verifyToken: string }>('/auth/password/setup-verify', { code });
}

export async function requestOAuthLinkToken(provider: 'google' | 'kakao' | 'naver'): Promise<void> {
  return api.post<void>(`/auth/oauth/${provider}/link-token`, {});
}

export async function unlinkOAuth(provider: 'google' | 'kakao' | 'naver'): Promise<void> {
  return api.delete<void>(`/auth/oauth/${provider}`);
}

export async function logoutAll(): Promise<void> {
  return api.post<void>('/auth/logout-all', {});
}

export async function deleteMe(data: { password?: string; verifyToken?: string }): Promise<void> {
  return api.delete<void>('/auth/me', data);
}

export const adminApi = {
  summary: () =>
    requestAppRaw<AdminSummaryResponse>('/api/admin/summary'),
  users: (query: Record<string, string | number | boolean | undefined>) => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      params.set(key, String(value));
    });
    const search = params.toString();
    return requestAppRaw<AdminUserListResponse>(
      search ? `/api/admin/users?${search}` : '/api/admin/users',
    );
  },
  user: (id: string) =>
    requestAppRaw<AdminUserDetail>(`/api/admin/users/${id}`),
  updateRole: (id: string, role: 'USER' | 'ADMIN') =>
    requestAppRaw<AdminUserUpdateResponse>(
      `/api/admin/users/${id}/role`,
      { method: 'PATCH', body: JSON.stringify({ role }) },
    ),
  suspendUser: (id: string, suspended: boolean) =>
    requestAppRaw<AdminUserUpdateResponse>(
      `/api/admin/users/${id}/suspend`,
      { method: 'PATCH', body: JSON.stringify({ suspended }) },
    ),
  billing: () =>
    requestAppRaw<AdminBillingResponse>('/api/admin/billing'),
  plans: () =>
    requestAppRaw<AdminPlansResponse>('/api/admin/plans'),
  plansList: (page: number, limit = 10) =>
    requestAppRaw<AdminPlanListResponse>(`/api/admin/plans/list?page=${page}&limit=${limit}`),
  workspacesList: (page: number, limit = 10) =>
    requestAppRaw<AdminWorkspaceListResponse>(`/api/admin/plans/workspaces?page=${page}&limit=${limit}`),
  logs: (container: 'backend' | 'frontend', search?: string) => {
    const params = new URLSearchParams({ container });
    if (search) params.set('search', search);
    return requestAppRaw<AdminLogsResponse>(
      `/api/admin/ops/logs?${params.toString()}`,
    );
  },
  cost: (refresh = false) =>
    requestAppRaw<AdminCostResponse>(
      `/api/admin/ops/cost${refresh ? '?refresh=1' : ''}`,
    ),
  sentry: () =>
    requestAppRaw<AdminSentryResponse>('/api/admin/ops/sentry'),
  apiUsage: () =>
    requestAppRaw<AdminApiUsageResponse>('/api/admin/ops/api-usage'),
};
