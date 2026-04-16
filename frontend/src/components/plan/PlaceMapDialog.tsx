'use client';

import { useMemo } from 'react';
import { ExternalLink, MapPin, Copy } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { PlanItem, TYPE_ICONS } from '@/lib/types';
import { PrimaryButton } from '@/components/ui/primary-button';

interface PlaceMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: PlanItem | null;
}

function buildNaverSearchUrl(item: PlanItem): string {
  const query = `${item.name} ${item.address}`.trim();
  return `https://map.naver.com/v5/search/${encodeURIComponent(query)}`;
}

export function PlaceMapDialog({ open, onOpenChange, item }: PlaceMapDialogProps) {
  const searchUrl = useMemo(() => {
    if (!item) return '';
    return item.link || buildNaverSearchUrl(item);
  }, [item]);

  const handleCopy = async () => {
    if (!searchUrl) return;
    await navigator.clipboard.writeText(searchUrl);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={item?.name ?? '장소 보기'}
      description="네이버 지도 검색으로 바로 확인할 수 있습니다."
    >
      {item ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden="true">
                {TYPE_ICONS[item.type] ?? '📍'}
              </span>
              <div>
                <p className="font-semibold text-stone-900">{item.name}</p>
                <p className="text-sm text-stone-500">{item.time}</p>
              </div>
            </div>
            <div className="mt-3 flex items-start gap-2 text-sm text-stone-600">
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-500" />
              <span>{item.address || '주소 정보 없음'}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
            <p className="text-sm font-semibold text-orange-700">네이버 지도 검색 링크</p>
            <p className="mt-1 break-all text-sm text-orange-700/80">{searchUrl}</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <PrimaryButton asChild variant="brand" size="md" className="w-full">
              <a href={searchUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                네이버 지도 열기
              </a>
            </PrimaryButton>
            <PrimaryButton
              type="button"
              variant="outline"
              size="md"
              className="w-full"
              onClick={() => void handleCopy()}
            >
              <Copy className="h-4 w-4" />
              링크 복사
            </PrimaryButton>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
