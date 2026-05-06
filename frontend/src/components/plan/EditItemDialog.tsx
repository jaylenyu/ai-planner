'use client';

import { useEffect, useState } from 'react';
import { Dialog } from '@/components/custom/dialog';
import { PrimaryButton } from '@/components/custom/primary-button';
import type { PlanItem } from '@/lib/types';

interface EditItemDialogProps {
  open: boolean;
  item: PlanItem | null;
  onOpenChange: (open: boolean) => void;
  onSave: (next: Partial<PlanItem>) => Promise<void> | void;
}

export function EditItemDialog({
  open,
  item,
  onOpenChange,
  onSave,
}: EditItemDialogProps) {
  const [form, setForm] = useState({
    name: '',
    type: 'activity' as PlanItem['type'],
    time: '',
    address: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item) return;
    setForm({
      name: item.name,
      type: item.type,
      time: item.time,
      address: item.address,
    });
  }, [item]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="장소 수정"
      description="이름, 유형, 시간, 주소를 수정할 수 있습니다."
    >
      <div className="space-y-4">
        <input
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="장소 이름"
          className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
        />
        <select
          value={form.type}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              type: e.target.value as PlanItem['type'],
            }))
          }
          className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
        >
          <option value="food">식사</option>
          <option value="cafe">카페</option>
          <option value="activity">액티비티</option>
          <option value="attraction">관광</option>
          <option value="rest">휴식</option>
        </select>
        <input
          value={form.time}
          onChange={(e) => setForm((prev) => ({ ...prev, time: e.target.value }))}
          placeholder="12:00 - 13:30"
          className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
        />
        <input
          value={form.address}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, address: e.target.value }))
          }
          placeholder="주소"
          className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
        />
        <PrimaryButton
          type="button"
          variant="brand"
          className="w-full"
          loading={saving}
          onClick={async () => {
            if (!item) return;
            setSaving(true);
            try {
              await onSave(form);
              onOpenChange(false);
            } finally {
              setSaving(false);
            }
          }}
        >
          저장
        </PrimaryButton>
      </div>
    </Dialog>
  );
}
