'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Briefcase,
  Search,
  Plus,
  Clock,
  DollarSign,
  User,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { api } from '../../../lib/api';

const statusColors: Record<string, { bg: string; text: string }> = {
  lead: { bg: 'bg-gray-100', text: 'text-gray-700' },
  quoted: { bg: 'bg-blue-100', text: 'text-blue-700' },
  scheduled: { bg: 'bg-purple-100', text: 'text-purple-700' },
  in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  completed: { bg: 'bg-green-100', text: 'text-green-700' },
  canceled: { bg: 'bg-red-100', text: 'text-red-700' },
  on_hold: { bg: 'bg-orange-100', text: 'text-orange-700' },
};

const priorityColors: Record<string, { bg: string; text: string }> = {
  low: { bg: 'bg-gray-100', text: 'text-gray-600' },
  normal: { bg: 'bg-blue-100', text: 'text-blue-600' },
  high: { bg: 'bg-orange-100', text: 'text-orange-600' },
  emergency: { bg: 'bg-red-100', text: 'text-red-600' },
};

function JobCard({ job }: { job: any }) {
  const status = statusColors[job.status] || statusColors.lead;
  const priority = priorityColors[job.priority] || priorityColors.normal;

  return (
    <Link
      href={`/dashboard/jobs/${job.id}`}
      className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate">{job.title}</h3>
            {job.priority === 'emergency' && (
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{job.description}</p>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded ${status.bg} ${status.text} flex-shrink-0 ml-2`}>
          {job.status.replace('_', ' ')}
        </span>
      </div>

      <div className="flex items-center gap-4 mt-4 text-sm">
        <div className="flex items-center gap-1 text-gray-500">
          <User className="w-4 h-4" />
          {job.customer?.firstName} {job.customer?.lastName}
        </div>
        <span className={`px-2 py-0.5 text-xs font-medium rounded ${priority.bg} ${priority.text}`}>
          {job.priority}
        </span>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
          {job.type}
        </span>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-4 text-sm">
          {job.scheduledAt && (
            <div className="flex items-center gap-1 text-gray-500">
              <Calendar className="w-4 h-4" />
              {format(new Date(job.scheduledAt), 'MMM d, h:mm a')}
            </div>
          )}
          {job.assignedTo && (
            <div className="flex items-center gap-1 text-gray-500">
              <Clock className="w-4 h-4" />
              {job.assignedTo.firstName}
            </div>
          )}
        </div>
        {(job.estimatedValue || job.actualValue) && (
          <div className="flex items-center gap-1 font-medium text-green-600">
            <DollarSign className="w-4 h-4" />
            {((job.actualValue || job.estimatedValue) / 100).toLocaleString()}
          </div>
        )}
      </div>
    </Link>
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

  const statuses = ['', 'lead', 'quoted', 'scheduled', 'in_progress', 'completed', 'canceled'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="text-gray-500 mt-1">Track and manage your jobs</p>
        </div>

        <button className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium">
          <Plus className="w-4 h-4" />
          New Job
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {statuses.map((status) => (
          <button
            key={status}
            onClick={() => {
              setStatusFilter(status);
              setPage(1);
            }}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              statusFilter === status
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status ? status.replace('_', ' ') : 'All'}
          </button>
        ))}
      </div>

      {/* Jobs list */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-48 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-64 mb-4" />
              <div className="flex gap-4">
                <div className="h-4 bg-gray-200 rounded w-24" />
                <div className="h-4 bg-gray-200 rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No jobs found</h3>
          <p className="text-gray-500 mt-1">
            {statusFilter ? 'Try a different status filter' : 'Create your first job to get started'}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {jobs.map((job: any) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * meta.perPage + 1} to {Math.min(page * meta.perPage, meta.total)} of {meta.total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= meta.totalPages}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
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
