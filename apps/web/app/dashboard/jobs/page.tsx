'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Filter,
  X,
  Search,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { toast } from 'sonner';
import { api } from '../../../lib/api';
import type { Job, Customer, CreateJobInput, JobType, JobPriority } from '../../../lib/types';
import { rules, validateForm, hasErrors, type ValidationErrors } from '../../../lib/validation';
import { FormField, TextInput, TextArea } from '../../../components/ui/FormField';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

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

const jobTypes = [
  { value: 'repair', label: 'Repair' },
  { value: 'installation', label: 'Installation' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'estimate', label: 'Estimate' },
  { value: 'other', label: 'Other' },
];

const priorities = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'emergency', label: 'Emergency' },
];

// Validation schema for job form
const jobValidationSchema = {
  title: [rules.required('Job title is required'), rules.minLength(3, 'Title must be at least 3 characters')],
  customerId: [rules.required('Please select a customer')],
  estimatedValue: [rules.positiveNumber('Please enter a valid amount')],
};

function CreateJobModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<JobType>('repair');
  const [priority, setPriority] = useState<JobPriority>('normal');
  const [customerId, setCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const { data: customersData } = useQuery({
    queryKey: ['customers', 'search', customerSearch],
    queryFn: () => api.getCustomers({ search: customerSearch }),
    enabled: customerSearch.length > 0,
  });

  const customers = customersData?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: CreateJobInput) => api.createJob(data),
    onSuccess: () => {
      toast.success('Job created successfully');
      onSuccess();
      resetForm();
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create job');
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setType('repair');
    setPriority('normal');
    setCustomerId('');
    setCustomerSearch('');
    setScheduledAt('');
    setEstimatedValue('');
    setTouched({});
    setValidationErrors({});
  };

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const validateAllFields = () => {
    const values = { title, customerId, estimatedValue };
    const errors = validateForm(values, jobValidationSchema);
    setValidationErrors(errors);
    setTouched({ title: true, customerId: true, estimatedValue: true });
    return !hasErrors(errors);
  };

  // Check if form is currently valid (for disabling submit button)
  const isFormValid = () => {
    const values = { title, customerId, estimatedValue };
    const errors = validateForm(values, jobValidationSchema);
    return !hasErrors(errors);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateAllFields()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    createMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      type,
      priority,
      customerId,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      estimatedValue: estimatedValue ? Math.round(parseFloat(estimatedValue) * 100) : undefined,
      status: 'lead',
    });
  };

  const selectCustomer = (customer: Customer) => {
    setCustomerId(customer.id);
    setCustomerSearch(`${customer.firstName} ${customer.lastName}`);
    setShowCustomerDropdown(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-navy-900 rounded-xl shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">New Job</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Title */}
          <FormField
            label="Job Title"
            required
            error={validationErrors.title}
            touched={touched.title}
          >
            <TextInput
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => markTouched('title')}
              placeholder="e.g., Fix leaking faucet"
              error={validationErrors.title}
              touched={touched.title}
            />
          </FormField>

          {/* Customer Search */}
          <FormField
            label="Customer"
            required
            error={validationErrors.customerId}
            touched={touched.customerId}
          >
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                    if (!e.target.value) setCustomerId('');
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  onBlur={() => markTouched('customerId')}
                  placeholder="Search customers..."
                  className={`w-full pl-10 pr-4 py-3 bg-navy-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none min-h-[44px] transition-colors ${
                    validationErrors.customerId && touched.customerId
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-white/10 focus:border-orange-500'
                  }`}
                  aria-invalid={validationErrors.customerId && touched.customerId ? 'true' : 'false'}
                />
              </div>
              {/* Customer Dropdown */}
              {showCustomerDropdown && customerSearch && customers.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-navy-800 border border-white/10 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {(customers as Customer[]).map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => selectCustomer(customer)}
                      className="w-full px-4 py-3 text-left hover:bg-navy-700 transition-colors flex items-center gap-3 min-h-[44px]"
                    >
                      <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-orange-500">
                          {customer.firstName?.[0]}{customer.lastName?.[0]}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-medium">{customer.firstName} {customer.lastName}</p>
                        <p className="text-sm text-gray-500">{customer.phone}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </FormField>

          {/* Type and Priority Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2">
                Job Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as JobType)}
                className="w-full px-4 py-3 bg-navy-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500 min-h-[44px]"
              >
                {jobTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as JobPriority)}
                className="w-full px-4 py-3 bg-navy-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500 min-h-[44px]"
              >
                {priorities.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Scheduled Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-2">
              Schedule For (Optional)
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-4 py-3 bg-navy-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500 min-h-[44px]"
            />
          </div>

          {/* Estimated Value */}
          <FormField
            label="Estimated Value (Optional)"
            error={validationErrors.estimatedValue}
            touched={touched.estimatedValue}
          >
            <TextInput
              type="number"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value)}
              onBlur={() => markTouched('estimatedValue')}
              placeholder="0.00"
              step="0.01"
              min="0"
              icon={<DollarSign className="w-5 h-5" />}
              error={validationErrors.estimatedValue}
              touched={touched.estimatedValue}
            />
          </FormField>

          {/* Description */}
          <FormField label="Description">
            <TextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the job..."
              rows={3}
            />
          </FormField>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-5 py-3 bg-navy-800 text-white rounded-lg font-semibold hover:bg-navy-700 transition-colors min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || !isFormValid()}
              className="flex-1 px-5 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex items-center justify-center gap-2"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Create Job
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function JobCard({ job }: { job: Job }) {
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

function JobsEmptyState({ hasFilter, onCreateClick }: { hasFilter: boolean; onCreateClick: () => void }) {
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

/**
 * Skeleton component for a single job card matching the JobCard layout
 */
function JobCardSkeleton() {
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

/**
 * Loading skeleton for the jobs list
 * Renders multiple JobCardSkeleton components to match the list structure
 */
function JobsListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <JobCardSkeleton key={index} />
      ))}
    </div>
  );
}

export default function JobsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', statusFilter, page],
    queryFn: () => api.getJobs({ status: statusFilter || undefined, page }),
    // Cache for 30 seconds - job list doesn't change frequently
    staleTime: 30 * 1000,
  });

  const jobs = data?.data || [];
  const meta = data?.meta;

  const handleJobCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
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
