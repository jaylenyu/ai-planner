'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { PrimaryButton } from '@/components/custom/primary-button';
import type { PlanMemo } from '@/lib/types';

interface PlanMemoThreadProps {
  memos: PlanMemo[];
  currentUserId?: string | null;
  onCreate: (content: string) => Promise<void> | void;
  onDelete: (memoId: string) => Promise<void> | void;
}

export function PlanMemoThread({
  memos,
  currentUserId,
  onCreate,
  onDelete,
}: PlanMemoThreadProps) {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {memos.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-5 text-sm text-stone-500">
            아직 메모가 없습니다.
          </div>
        ) : (
          memos.map((memo) => (
            <div
              key={memo.id}
              className="rounded-2xl border border-stone-200 bg-white px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-stone-900">
                    {memo.author.nickname}
                  </p>
                  <p className="mt-0.5 text-xs text-stone-400">
                    {new Date(memo.createdAt).toLocaleString('ko-KR')}
                  </p>
                </div>
                {memo.author.id === currentUserId && (
                  <button
                    type="button"
                    onClick={() => void onDelete(memo.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    aria-label="메모 삭제"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="mt-2 text-sm leading-6 text-stone-700">
                {memo.content}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="space-y-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder="메모를 남겨보세요"
          className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm"
        />
        <PrimaryButton
          type="button"
          variant="brand"
          size="sm"
          loading={saving}
          disabled={!content.trim()}
          onClick={async () => {
            const next = content.trim();
            if (!next) return;
            setSaving(true);
            try {
              await onCreate(next);
              setContent('');
            } finally {
              setSaving(false);
            }
          }}
        >
          메모 추가
        </PrimaryButton>
      </div>
    </div>
  );
}
