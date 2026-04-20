'use client';

import { create } from 'zustand';

const ACCESS_TOKEN_KEY = 'ai_planner_token';
const REFRESH_TOKEN_KEY = 'ai_planner_refresh';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function setCookie(name: string, value: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0`;
}

function writeTokens(access: string, refresh: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  setCookie(ACCESS_TOKEN_KEY, access);
  setCookie(REFRESH_TOKEN_KEY, refresh);
}

function writeAccessToken(access: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  setCookie(ACCESS_TOKEN_KEY, access);
}

function wipeTokens() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  deleteCookie(ACCESS_TOKEN_KEY);
  deleteCookie(REFRESH_TOKEN_KEY);
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  hydrated: boolean;
  hydrateFromStorage: () => void;
  setTokens: (access: string, refresh: string) => void;
  setAccessToken: (access: string) => void;
  clearTokens: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  hydrated: false,

  hydrateFromStorage: () => {
    if (typeof window === 'undefined') return;
    const access = localStorage.getItem(ACCESS_TOKEN_KEY);
    const refresh = localStorage.getItem(REFRESH_TOKEN_KEY);
    set({
      accessToken: access,
      refreshToken: refresh,
      hydrated: true,
    });
  },

  setTokens: (access, refresh) => {
    writeTokens(access, refresh);
    set({ accessToken: access, refreshToken: refresh });
  },

  setAccessToken: (access) => {
    writeAccessToken(access);
    set({ accessToken: access });
  },

  clearTokens: () => {
    wipeTokens();
    set({ accessToken: null, refreshToken: null });
  },
}));

export const selectIsLoggedIn = (s: AuthState) => !!s.accessToken;
export const selectHydrated = (s: AuthState) => s.hydrated;

if (typeof window !== 'undefined') {
  useAuthStore.getState().hydrateFromStorage();
}
