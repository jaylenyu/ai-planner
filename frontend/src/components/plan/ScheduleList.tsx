'use client';

import { PlanItem, TYPE_ICONS, TYPE_LABELS } from '../../lib/types';

interface ScheduleListProps {
  items: PlanItem[];
  summary: string;
  totalDurationMin: number;
}

export function ScheduleList({ items, summary, totalDurationMin }: ScheduleListProps) {
  const hours = Math.floor(totalDurationMin / 60);
  const minutes = totalDurationMin % 60;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-indigo-50 px-4 py-3">
        <p className="text-sm font-semibold text-indigo-700">{summary}</p>
        <p className="text-xs text-indigo-500 mt-0.5">
          총 {hours > 0 ? `${hours}시간 ` : ''}{minutes > 0 ? `${minutes}분` : ''}
        </p>
      </div>

      <ol className="flex flex-col gap-0">
        {items.map((item, idx) => (
          <li key={item.order} className="flex gap-3">
            {/* 타임라인 선 */}
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                {item.order}
              </div>
              {idx < items.length - 1 && (
                <div className="w-0.5 flex-1 bg-indigo-200 my-1" />
              )}
            </div>

            {/* 장소 정보 */}
            <div className={`pb-4 ${idx < items.length - 1 ? '' : ''}`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{TYPE_ICONS[item.type] ?? '📍'}</span>
                <span className="font-semibold text-zinc-800">{item.name}</span>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                  {TYPE_LABELS[item.type] ?? item.type}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-indigo-600 font-medium">{item.time}</p>
              <p className="text-xs text-zinc-400">{item.address}</p>
              {item.distanceFromPrev !== undefined && item.distanceFromPrev > 0 && (
                <p className="text-xs text-zinc-400">
                  이전 장소에서 {(item.distanceFromPrev * 1000).toFixed(0)}m
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
