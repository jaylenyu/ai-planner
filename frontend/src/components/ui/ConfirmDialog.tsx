'use client';

import { PrimaryButton } from '@/components/ui/primary-button';
import { Dialog } from '@/components/ui/dialog';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '확인',
  cancelLabel = '취소',
  destructive = false,
  loading = false,
  onOpenChange,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <div className="flex justify-end gap-2">
        <PrimaryButton
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onOpenChange(false)}
        >
          {cancelLabel}
        </PrimaryButton>
        <PrimaryButton
          type="button"
          variant={destructive ? 'brand' : 'brand'}
          size="sm"
          loading={loading}
          onClick={async () => {
            await onConfirm();
          }}
          className={destructive ? 'bg-red-500 hover:bg-red-600 border-red-500' : undefined}
        >
          {confirmLabel}
        </PrimaryButton>
      </div>
    </Dialog>
  );
}
