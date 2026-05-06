'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { Dialog } from '@/components/custom/dialog';

function formatPayload(payload: Record<string, unknown>) {
  if (typeof payload.summary === 'string' && payload.summary) return payload.summary;
  if (typeof payload.itemName === 'string' && payload.itemName) return payload.itemName;
  if (typeof payload.workspaceName === 'string' && payload.workspaceName) {
    return payload.workspaceName;
  }
  if (typeof payload.userEmail === 'string' && payload.userEmail) return payload.userEmail;
  return '새 알림';
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { items, unreadCount, markRead, markAllRead } = useNotifications();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative rounded-full border border-stone-200 bg-white p-2 text-stone-600 transition-colors hover:border-orange-200 hover:text-orange-600"
        aria-label="알림"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="알림"
        description="커플 플랜과 일정 변경사항"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-stone-500">
              읽지 않은 알림 {unreadCount}건
            </p>
            {items.length > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-sm font-medium text-orange-600"
              >
                모두 읽음
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-6 text-center text-sm text-stone-500">
              새 알림이 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void markRead(item.id)}
                  className="block w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-left transition-colors hover:border-orange-200"
                >
                  <p className="text-sm font-semibold text-stone-900">{item.type}</p>
                  <p className="mt-1 text-sm text-stone-600">
                    {formatPayload(item.payload)}
                  </p>
                  <p className="mt-2 text-xs text-stone-400">
                    {new Date(item.createdAt).toLocaleString('ko-KR')}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </Dialog>
    </>
  );
}
