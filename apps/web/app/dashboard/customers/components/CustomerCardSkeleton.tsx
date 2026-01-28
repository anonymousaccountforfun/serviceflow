'use client';

import { Skeleton, SkeletonAvatar } from '@/components/ui/skeleton';

export function CustomerCardSkeleton() {
  return (
    <div className="bg-surface rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <SkeletonAvatar size="lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-3 w-3" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-3 w-3" />
              <Skeleton className="h-3 w-36" />
            </div>
          </div>
        </div>
        <Skeleton className="h-5 w-5" />
      </div>

      <div className="flex items-start gap-1.5 mt-3 pt-3 border-t border-white/5">
        <Skeleton className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
        <Skeleton className="h-3 w-48" />
      </div>

      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5">
        <Skeleton className="h-5 w-16 rounded" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  );
}

export function CustomersListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <CustomerCardSkeleton key={index} />
      ))}
    </div>
  );
}
