'use client';

import { QueryClient } from '@tanstack/react-query';

export const queryKeys = {
  categories: ['categories'] as const,
  workspaceMine: ['workspace-mine'] as const,
  notificationsUnread: ['notifications', 'unread'] as const,
  subscriptionStatus: ['subscription-status'] as const,
  plans: (categoryId?: string, scope?: 'personal' | 'shared') =>
    ['plans', { categoryId: categoryId ?? null, scope: scope ?? null }] as const,
  plan: (id: string) => ['plan', id] as const,
};

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 30 * 1000,
        gcTime: 30 * 60 * 1000,
      },
    },
  });
}
