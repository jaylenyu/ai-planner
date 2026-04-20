import { useAuthStore } from "../stores/authStore";
import type {
  CategorySummary,
  NotificationItem,
  PaymentPrepareResponse,
  PlanMemo,
  PlanSummary,
  SubscriptionStatusResponse,
  WorkspaceMineResponse,
} from "./types";

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const normalizedApiUrl = rawApiUrl.replace(/\/+$/, "");
export const API_BASE_URL = normalizedApiUrl.endsWith("/api")
  ? normalizedApiUrl
  : `${normalizedApiUrl}/api`;

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

async function tryRefresh(): Promise<boolean> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      useAuthStore.getState().clearTokens();
      return false;
    }

    const data = await res.json();
    useAuthStore.getState().setTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    useAuthStore.getState().clearTokens();
    return false;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request<T>(path, options, false);
    }
    useAuthStore.getState().clearTokens();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("인증이 만료되었습니다. 다시 로그인해주세요.");
  }

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

export const api = {
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  get: <T>(path: string) => request<T>(path),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "DELETE",
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
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
};

export const authApi = {
  checkEmail: (email: string) =>
    api.post<{ available: boolean; message: string }>("/auth/email/check", {
      email,
    }),

  requestEmailCode: (email: string, captchaToken: string) =>
    api.post<{ message: string }>("/auth/email/request-code", {
      email,
      captchaToken,
    }),

  verifyEmailCode: (email: string, code: string) =>
    api.post<{ verified: boolean }>("/auth/email/verify-code", { email, code }),

  register: (
    email: string,
    password: string,
    agreedTerms: boolean,
    agreedPrivacy: boolean,
  ) =>
    api.post<{ access_token: string; refresh_token: string }>(
      "/auth/register",
      {
        email,
        password,
        agreedTerms,
        agreedPrivacy,
      },
    ),

  login: (email: string, password: string) =>
    api.post<{ access_token: string; refresh_token: string }>("/auth/login", {
      email,
      password,
    }),
};
