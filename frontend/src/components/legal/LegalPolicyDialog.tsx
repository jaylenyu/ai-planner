'use client';

import { Dialog } from '@/components/ui/dialog';
import { PrivacyContent } from './PrivacyContent';
import { TermsContent } from './TermsContent';

interface LegalPolicyDialogProps {
  open: boolean;
  type: 'terms' | 'privacy' | null;
  onOpenChange: (open: boolean) => void;
}

export function LegalPolicyDialog({
  open,
  type,
  onOpenChange,
}: LegalPolicyDialogProps) {
  const title =
    type === 'terms' ? '이용약관' : type === 'privacy' ? '개인정보 처리방침' : '';

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description="모바일에서도 읽기 쉽게 전체 문서를 다이얼로그에서 확인할 수 있습니다."
      containerClassName="max-w-5xl px-0 py-0 sm:px-4 sm:py-6"
      panelClassName="h-[100dvh] rounded-none border-0 sm:h-[min(88dvh,920px)] sm:rounded-3xl sm:border sm:border-stone-200"
      bodyClassName="h-[calc(100dvh-88px)] overflow-y-auto px-4 py-4 sm:h-[calc(min(88dvh,920px)-88px)] sm:px-6 sm:py-5"
    >
      {type === 'terms' ? (
        <TermsContent embedded />
      ) : type === 'privacy' ? (
        <PrivacyContent embedded />
      ) : null}
    </Dialog>
  );
}
