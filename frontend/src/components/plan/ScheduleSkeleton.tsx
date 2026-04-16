'use client';

function SkeletonBar({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md ${className}`}
      style={{ background: 'var(--border-light)' }}
    />
  );
}

export function ScheduleSkeleton() {
  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* Summary skeleton */}
      <div
        className="rounded-[var(--radius-lg)] p-5"
        style={{ background: 'var(--surface-sunken)' }}
      >
        <SkeletonBar className="h-4 w-3/4 mb-3" />
        <div className="flex items-center gap-2">
          <SkeletonBar className="h-6 w-24 rounded-full" />
          <SkeletonBar className="h-6 w-20 rounded-full" />
        </div>
      </div>

      {/* Timeline items skeleton */}
      <ol className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <li key={i} className="flex flex-col">
            <div
              className="rounded-[var(--radius-lg)] p-4 border"
              style={{ borderColor: 'var(--border-light)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <SkeletonBar className="h-6 w-6 rounded-full" />
                <SkeletonBar className="h-5 w-12 rounded-full" />
              </div>
              <SkeletonBar className="h-4 w-2/3 mb-2" />
              <SkeletonBar className="h-3 w-1/2 mb-1" />
              <SkeletonBar className="h-3 w-3/4" />
            </div>
            {i < 3 && (
              <div className="h-4 w-0.5 bg-gradient-to-b from-stone-200 to-transparent mx-auto my-1" />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
