'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../lib/api';
import type { NotificationItem } from '../lib/types';
import { queryKeys } from '../lib/query';

export function useNotifications() {
  const queryClient = useQueryClient();
  const query = useQuery<NotificationItem[]>({
    queryKey: queryKeys.notificationsUnread,
    queryFn: async () => {
      try {
        return await notificationApi.unread();
      } catch {
        return [];
      }
    },
    staleTime: 0,
    refetchInterval: 15000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notificationsUnread });
      const previous = queryClient.getQueryData<NotificationItem[]>(queryKeys.notificationsUnread) ?? [];
      queryClient.setQueryData<NotificationItem[]>(
        queryKeys.notificationsUnread,
        previous.filter((item) => item.id !== id),
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.notificationsUnread, context.previous);
      }
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notificationsUnread });
      const previous = queryClient.getQueryData<NotificationItem[]>(queryKeys.notificationsUnread) ?? [];
      queryClient.setQueryData<NotificationItem[]>(queryKeys.notificationsUnread, []);
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.notificationsUnread, context.previous);
      }
    },
  });

  return {
    items: query.data ?? [],
    loading: query.isLoading,
    unreadCount: (query.data ?? []).length,
    refetch: query.refetch,
    markRead: async (id: string) => {
      await markReadMutation.mutateAsync(id);
    },
    markAllRead: async () => {
      await markAllReadMutation.mutateAsync();
    },
  };
}
