'use client';

import { PlanItem, TYPE_ICONS, TYPE_LABELS } from '../../lib/types';

interface ScheduleListProps {
  items: PlanItem[];
  summary: string;
  totalDurationMin: number;
}

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  food: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', dot: 'bg-red-500' },
  cafe: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', dot: 'bg-amber-500' },
  activity: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200', dot: 'bg-violet-500' },
  attraction: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200', dot: 'bg-cyan-500' },
  rest: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', dot: 'bg-emerald-500' },
};

const DEFAULT_COLOR = { bg: 'bg-stone-50', text: 'text-stone-600', border: 'border-stone-200', dot: 'bg-stone-500' };

export function ScheduleList({ items, summary, totalDurationMin }: ScheduleListProps) {
  const hours = Math.floor(totalDurationMin / 60);
  const minutes = totalDurationMin % 60;

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* Summary card */}
      <div className="rounded-2xl bg-gradient-to-br from-orange-50 via-pink-50 to-violet-50 border border-orange-100 px-5 py-4">
        <p className="text-sm font-semibold text-stone-800 leading-relaxed">{summary}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-orange-200 px-3 py-1 text-xs font-medium text-orange-600">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            총 {hours > 0 ? `${hours}시간 ` : ''}{minutes > 0 ? `${minutes}분` : ''}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-violet-200 px-3 py-1 text-xs font-medium text-violet-600">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {items.length}개 장소
          </span>
        </div>
      </div>

      {/* Timeline */}
      <ol className="flex flex-col gap-0 stagger-children">
        {items.map((item, idx) => {
          const color = TYPE_COLORS[item.type] ?? DEFAULT_COLOR;
          return (
            <li key={item.order} className="flex gap-4">
              {/* Timeline column */}
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${color.dot} text-sm font-bold text-white shadow-sm`}
                >
                  {item.order}
                </div>
                {idx < items.length - 1 && (
                  <div className="w-0.5 flex-1 bg-gradient-to-b from-stone-200 to-stone-100 my-1 min-h-[16px]" />
                )}
              </div>

              {/* Place info card */}
              <div
                className={`flex-1 rounded-xl border ${color.border} ${color.bg} p-4 mb-3 transition-all duration-200 hover:shadow-sm`}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg">{TYPE_ICONS[item.type] ?? '📍'}</span>
                  <span className="font-semibold text-stone-800">{item.name}</span>
                  <span
                    className={`rounded-full ${color.bg} border ${color.border} px-2.5 py-0.5 text-xs font-medium ${color.text}`}
                  >
                    {TYPE_LABELS[item.type] ?? item.type}
                  </span>
                </div>
                <div className="mt-2 flex flex-col gap-0.5">
                  <p className={`text-sm font-medium ${color.text}`}>{item.time}</p>
                  <p className="text-xs text-stone-400">{item.address}</p>
                  {item.distanceFromPrev !== undefined && item.distanceFromPrev > 0 && (
                    <p className="text-xs text-stone-400 flex items-center gap-1 mt-0.5">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      이전 장소에서 {(item.distanceFromPrev * 1000).toFixed(0)}m
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
