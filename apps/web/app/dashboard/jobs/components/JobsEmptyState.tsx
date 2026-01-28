'use client';

import { Briefcase } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

interface JobsEmptyStateProps {
  hasFilter: boolean;
  onCreateClick: () => void;
}

export function JobsEmptyState({ hasFilter, onCreateClick }: JobsEmptyStateProps) {
  if (hasFilter) {
    return (
      <EmptyState
        icon={Briefcase}
        title="No jobs match this filter"
        description="Try selecting a different status filter to see more jobs."
      />
    );
  }

  return (
    <EmptyState
      icon={Briefcase}
      title="No jobs yet"
      description="When customers call, jobs appear here automatically. You can also create jobs manually."
      action={{ label: "Create Job", onClick: onCreateClick }}
    />
  );
}
