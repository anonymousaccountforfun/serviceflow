'use client';

import { clsx } from 'clsx';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: EmptyStateAction;
  className?: string;
}

/**
 * Reusable empty state component for displaying when no data is available.
 *
 * @example
 * <EmptyState
 *   icon={Briefcase}
 *   title="No jobs yet"
 *   description="When customers call, jobs appear here automatically."
 *   action={{ label: "Create Job", href: "/dashboard/jobs/new" }}
 * />
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const ActionButton = () => {
    if (!action) return null;

    const buttonClasses = clsx(
      'inline-flex items-center justify-center gap-2',
      'px-5 py-3 min-h-[44px]',
      'bg-orange-500 text-white rounded-lg font-semibold',
      'hover:bg-orange-600 transition-colors',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50'
    );

    if (action.href) {
      return (
        <Link href={action.href} className={buttonClasses}>
          {action.label}
        </Link>
      );
    }

    return (
      <button onClick={action.onClick} className={buttonClasses}>
        {action.label}
      </button>
    );
  };

  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center',
        'bg-surface rounded-lg p-12 text-center',
        className
      )}
    >
      {/* Icon container */}
      <div className="w-16 h-16 rounded-xl bg-navy-800 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-500" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-white mb-2">
        {title}
      </h3>

      {/* Description */}
      <p className="text-gray-500 mb-6 max-w-sm">
        {description}
      </p>

      {/* Optional action button */}
      <ActionButton />
    </div>
  );
}

export type { EmptyStateProps, EmptyStateAction };
