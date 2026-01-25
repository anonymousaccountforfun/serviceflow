'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Briefcase,
  Plus,
  Clock,
  DollarSign,
  User,
  Calendar,
  AlertTriangle,
  ChevronRight,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { api } from '../../../lib/api';

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  lead: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Lead' },
  quoted: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Quoted' },
  scheduled: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Scheduled' },
  in_progress: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'In Progress' },
  completed: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Completed' },
  canceled: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Canceled' },
  on_hold: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'On Hold' },
};

const priorityConfig: Record<string, { bg: string; text: string; border: string }> = {
  low: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30' },
  normal: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  emergency: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
};

function JobCard({ job }: { job: any }) {
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
            <span>{((job.actualValue || job.estimatedValue) / 100).toLocaleString()}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="bg-surface rounded-lg p-12 text-center">
      <div className="w-16 h-16 rounded-xl bg-navy-800 flex items-center justify-center mx-auto mb-4">
        <Briefcase className="w-8 h-8 text-gray-500" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">
        {hasFilter ? 'No jobs match this filter' : 'No jobs yet'}
      </h3>
      <p className="text-gray-500 mb-6 max-w-sm mx-auto">
        {hasFilter
          ? 'Try selecting a different status filter to see more jobs.'
          : 'Create your first job to start tracking your work and revenue.'}
      </p>
      {!hasFilter && (
        <button className="inline-flex items-center gap-2 px-5 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors min-h-[44px]">
          <Plus className="w-4 h-4" />
          Create First Job
        </button>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-surface rounded-lg p-4 animate-pulse">
          <div className="flex items-center justify-between mb-3">
            <div className="h-5 bg-navy-700 rounded w-48" />
            <div className="h-6 bg-navy-700 rounded w-20" />
          </div>
          <div className="h-4 bg-navy-700 rounded w-64 mb-4" />
          <div className="flex gap-4">
            <div className="h-4 bg-navy-700 rounded w-32" />
            <div className="h-4 bg-navy-700 rounded w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function JobsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', statusFilter, page],
    queryFn: () => api.getJobs({ status: statusFilter || undefined, page }),
  });

  const jobs = data?.data || [];
  const meta = data?.meta;

  const statuses = [
    { value: '', label: 'All' },
    { value: 'lead', label: 'Lead' },
    { value: 'quoted', label: 'Quoted' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'canceled', label: 'Canceled' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Jobs</h1>
          <p className="text-gray-500 mt-1">Track and manage your jobs</p>
        </div>

        <button className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-semibold transition-colors min-h-[44px]">
          <Plus className="w-5 h-5" />
          New Job
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
        {statuses.map((status) => (
          <button
            key={status.value}
            onClick={() => {
              setStatusFilter(status.value);
              setPage(1);
            }}
            className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-all whitespace-nowrap min-h-[44px] ${
              statusFilter === status.value
                ? 'bg-orange-500 text-white'
                : 'bg-surface text-gray-400 hover:bg-surface-light hover:text-white'
            }`}
          >
            {status.label}
          </button>
        ))}
      </div>

      {/* Jobs list */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : jobs.length === 0 ? (
        <EmptyState hasFilter={!!statusFilter} />
      ) : (
        <>
          <div className="space-y-3">
            {jobs.map((job: any) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * meta.perPage + 1} to {Math.min(page * meta.perPage, meta.total)} of {meta.total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-4 py-2.5 text-sm font-semibold text-white bg-surface rounded-lg hover:bg-surface-light disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= meta.totalPages}
                  className="px-4 py-2.5 text-sm font-semibold text-white bg-surface rounded-lg hover:bg-surface-light disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
