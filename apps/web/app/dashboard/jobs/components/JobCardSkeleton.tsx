'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function JobCardSkeleton() {
  return (
    <div className="bg-surface rounded-lg p-4">
      {/* Header row: Title + Status badge */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Skeleton className="h-5 w-48" />
          </div>
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-20 rounded" />
          <Skeleton className="h-4 w-4" />
        </div>
      </div>

      {/* Meta row: Customer, Priority, Type */}
      <div className="flex items-center gap-4 mt-4">
        <div className="flex items-center gap-2">
          <Skeleton variant="circular" className="h-4 w-4" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-5 w-14 rounded" />
        <Skeleton className="h-5 w-16 rounded" />
      </div>

      {/* Footer row: Schedule, Assignment, Value */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Skeleton variant="circular" className="h-4 w-4" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex items-center gap-1.5">
            <Skeleton variant="circular" className="h-4 w-4" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
    </div>
  );
}

export function JobsListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <JobCardSkeleton key={index} />
      ))}
    </div>
  );
}
