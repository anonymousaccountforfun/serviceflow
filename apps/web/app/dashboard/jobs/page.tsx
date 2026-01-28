'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Filter } from 'lucide-react';
import { api } from '../../../lib/api';
import type { Job } from '../../../lib/types';
import { invalidateOnJobCreate, StaleTime } from '../../../lib/query-invalidation';
import {
  JobCard,
  JobsListSkeleton,
  JobsEmptyState,
  CreateJobModal,
} from './components';

export default function JobsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', statusFilter, page],
    queryFn: () => api.getJobs({ status: statusFilter || undefined, page }),
    staleTime: StaleTime.STANDARD,
  });

  const jobs = data?.data || [];
  const meta = data?.meta;

  const handleJobCreated = () => {
    invalidateOnJobCreate(queryClient);
  };

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

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-semibold transition-colors min-h-[44px]"
        >
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
        <JobsListSkeleton />
      ) : jobs.length === 0 ? (
        <JobsEmptyState hasFilter={!!statusFilter} onCreateClick={() => setShowCreateModal(true)} />
      ) : (
        <>
          <div className="space-y-3">
            {(jobs as Job[]).map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>

          {/* Pagination */}
          {meta && (meta.totalPages ?? 1) > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * (meta.perPage ?? 20) + 1} to {Math.min(page * (meta.perPage ?? 20), meta.total ?? 0)} of {meta.total ?? 0}
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
                  disabled={page >= (meta.totalPages ?? 1)}
                  className="px-4 py-2.5 text-sm font-semibold text-white bg-surface rounded-lg hover:bg-surface-light disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Job Modal */}
      <CreateJobModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleJobCreated}
      />
    </div>
  );
}
