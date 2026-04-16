'use client';

import { useEffect, useState } from 'react';
import { notificationApi } from '../lib/api';
import type { NotificationItem } from '../lib/types';

export function useNotifications() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = async () => {
    setLoading(true);
    try {
      const next = await notificationApi.unread();
      setItems(next);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refetch();
    const id = window.setInterval(() => {
      void refetch();
    }, 30000);
    return () => window.clearInterval(id);
  }, []);

  const markRead = async (id: string) => {
    await notificationApi.markRead(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const markAllRead = async () => {
    await notificationApi.markAllRead();
    setItems([]);
  };

  return {
    items,
    loading,
    unreadCount: items.length,
    refetch,
    markRead,
    markAllRead,
  };
}
