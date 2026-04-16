'use client';

import { AppCard } from '../ui/app-card';
import { PlanItem, TYPE_ICONS, TYPE_LABELS } from '../../lib/types';
import { MapPin } from 'lucide-react';

interface ScheduleListProps {
  items: PlanItem[];
  summary: string;
  totalDurationMin: number;
  onOpenPlace?: (item: PlanItem) => void;
}

const TYPE_COLORS: Record<string, { text: string; dot: string; badge: string }> = {
  food:       { text: 'text-red-600',    dot: 'bg-red-500',    badge: 'bg-red-50 border-red-100 text-red-600' },
  cafe:       { text: 'text-amber-600',  dot: 'bg-amber-500',  badge: 'bg-amber-50 border-amber-100 text-amber-600' },
  activity:   { text: 'text-violet-600', dot: 'bg-violet-500', badge: 'bg-violet-50 border-violet-100 text-violet-600' },
  attraction: { text: 'text-cyan-600',   dot: 'bg-cyan-500',   badge: 'bg-cyan-50 border-cyan-100 text-cyan-600' },
  rest:       { text: 'text-emerald-600',dot: 'bg-emerald-500',badge: 'bg-emerald-50 border-emerald-100 text-emerald-600' },
};

const DEFAULT_COLOR = { text: 'text-stone-600', dot: 'bg-stone-400', badge: 'bg-stone-50 border-stone-100 text-stone-600' };

function formatDistanceKm(distanceKm: number): string {
  return `${distanceKm.toFixed(1)}km`;
}

export function ScheduleList({
  items,
  summary,
  totalDurationMin,
  onOpenPlace,
}: ScheduleListProps) {
  const hours = Math.floor(totalDurationMin / 60);
  const minutes = totalDurationMin % 60;

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* Summary card */}
      <AppCard variant="brand-tint" padding="md">
        <p className="text-sm font-semibold leading-relaxed" style={{ color: 'var(--text-primary)' }}>
          {summary}
        </p>
        <div className="flex items-center gap-2 mt-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-white/80 px-3 py-1 text-xs font-medium text-orange-600">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            총 {hours > 0 ? `${hours}시간 ` : ''}{minutes > 0 ? `${minutes}분` : ''}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-white/80 px-3 py-1 text-xs font-medium text-violet-600">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {items.length}개 장소
          </span>
        </div>
      </AppCard>

      {/* Timeline */}
      <ol className="flex flex-col gap-0 stagger-children">
        {items.map((item, idx) => {
          const color = TYPE_COLORS[item.type] ?? DEFAULT_COLOR;
          return (
            <li key={item.order} className="flex gap-4">
              {/* Timeline column */}
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${color.dot} text-sm font-bold text-white ring-2 ring-white shadow-sm`}
                  aria-hidden="true"
                >
                  {item.order}
                </div>
                {idx < items.length - 1 && (
                  <div className="timeline-line" />
                )}
              </div>

              {/* Place info card — white with left accent bar */}
              <div className="flex-1 app-card p-4 mb-3 relative overflow-hidden hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5">
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${color.dot}`}
                     style={{ borderRadius: 'var(--radius-lg) 0 0 var(--radius-lg)' }}
                     aria-hidden="true" />
                <div className="pl-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg" aria-hidden="true">{TYPE_ICONS[item.type] ?? '📍'}</span>
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{item.name}</span>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${color.badge}`}>
                      {TYPE_LABELS[item.type] ?? item.type}
                    </span>
                    {onOpenPlace && (
                      <button
                        type="button"
                        onClick={() => onOpenPlace(item)}
                        className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2.5 py-0.5 text-xs font-medium text-stone-600 transition-colors hover:border-orange-200 hover:text-orange-600"
                      >
                        <MapPin className="h-3 w-3" />
                        지도 보기
                      </button>
                    )}
                  </div>
                  <div className="mt-2 flex flex-col gap-0.5">
                    <p className={`text-sm font-medium ${color.text}`}>{item.time}</p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{item.address}</p>
                    {item.distanceFromPrev !== undefined && item.distanceFromPrev > 0 && (
                      <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        이전 장소에서 {formatDistanceKm(item.distanceFromPrev)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
