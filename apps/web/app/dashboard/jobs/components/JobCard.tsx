'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import {
  AlertTriangle,
  ChevronRight,
  User,
  Calendar,
  Clock,
  DollarSign,
} from 'lucide-react';
import type { Job } from '../../../../lib/types';

export const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  lead: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Lead' },
  quoted: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Quoted' },
  scheduled: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Scheduled' },
  in_progress: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'In Progress' },
  completed: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Completed' },
  canceled: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Canceled' },
  on_hold: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'On Hold' },
};

export const priorityConfig: Record<string, { bg: string; text: string; border: string }> = {
  low: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30' },
  normal: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  emergency: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
};

export function JobCard({ job }: { job: Job }) {
  const status = statusConfig[job.status] || statusConfig.lead;
  const priority = priorityConfig[job.priority] || priorityConfig.normal;
  const isEmergency = job.priority === 'emergency';

  return (
    <Link
      href={`/dashboard/jobs/${job.id}`}
      className={`block bg-surface rounded-lg p-4 hover:bg-surface-light transition-all min-h-[44px] ${
        isEmergency ? 'border-l-4 border-red-500' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-white truncate">{job.title}</h3>
            {isEmergency && (
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
            )}
          </div>
          <p className="text-sm text-gray-500 line-clamp-1">{job.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 text-xs font-semibold uppercase tracking-wide rounded ${status.bg} ${status.text}`}>
            {status.label}
          </span>
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </div>
      </div>

      <div className="flex items-center gap-4 mt-4 text-sm">
        <div className="flex items-center gap-2 text-gray-400">
          <User className="w-4 h-4" />
          <span>{job.customer?.firstName} {job.customer?.lastName}</span>
        </div>
        <span className={`px-2 py-0.5 text-xs font-medium uppercase rounded ${priority.bg} ${priority.text}`}>
          {job.priority}
        </span>
        <span className="px-2 py-0.5 text-xs font-medium uppercase rounded bg-navy-700 text-gray-400">
          {job.type}
        </span>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
        <div className="flex items-center gap-4 text-sm">
          {job.scheduledAt && (
            <div className="flex items-center gap-1.5 text-gray-400">
              <Calendar className="w-4 h-4" />
              <span>{format(new Date(job.scheduledAt), 'MMM d, h:mm a')}</span>
            </div>
          )}
          {job.assignedTo && (
            <div className="flex items-center gap-1.5 text-gray-400">
              <Clock className="w-4 h-4" />
              <span>{job.assignedTo.firstName}</span>
            </div>
          )}
        </div>
        {(job.estimatedValue || job.actualValue) && (
          <div className="flex items-center gap-1 font-bold text-green-500">
            <DollarSign className="w-4 h-4" />
            <span>{((job.actualValue ?? job.estimatedValue ?? 0) / 100).toLocaleString()}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
