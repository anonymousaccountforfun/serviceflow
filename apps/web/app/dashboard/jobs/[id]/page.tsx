'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  AlertTriangle,
  Edit3,
  Save,
  X,
  Loader2,
  ExternalLink,
  CheckCircle2,
  Briefcase
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { api } from '../../../../lib/api';

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  lead: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Lead' },
  quoted: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Quoted' },
  scheduled: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Scheduled' },
  in_progress: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'In Progress' },
  completed: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Completed' },
  canceled: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Canceled' },
  on_hold: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'On Hold' },
};

const priorityConfig: Record<string, { bg: string; text: string }> = {
  low: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
  normal: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  high: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  emergency: { bg: 'bg-red-500/20', text: 'text-red-400' },
};

const statuses = [
  { value: 'lead', label: 'Lead' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'canceled', label: 'Canceled' },
  { value: 'on_hold', label: 'On Hold' },
];

function formatAddress(customer: any) {
  if (!customer) return '';
  const parts = [
    customer.address,
    customer.city,
    customer.state,
    customer.zip,
  ].filter(Boolean);
  return parts.join(', ');
}

function getGoogleMapsUrl(customer: any) {
  const address = formatAddress(customer);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const jobId = params.id as string;

  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedEstimatedValue, setEditedEstimatedValue] = useState('');
  const [editedActualValue, setEditedActualValue] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => api.getJob(jobId),
    enabled: !!jobId,
  });

  const job = data?.data;

  const updateMutation = useMutation({
    mutationFn: (updates: any) => api.updateJob(jobId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setIsEditing(false);
    },
  });

  const startEditing = () => {
    if (job) {
      setEditedTitle(job.title || '');
      setEditedDescription(job.description || '');
      setEditedEstimatedValue(job.estimatedValue ? (job.estimatedValue / 100).toString() : '');
      setEditedActualValue(job.actualValue ? (job.actualValue / 100).toString() : '');
      setIsEditing(true);
    }
  };

  const saveChanges = () => {
    updateMutation.mutate({
      title: editedTitle,
      description: editedDescription,
      estimatedValue: editedEstimatedValue ? Math.round(parseFloat(editedEstimatedValue) * 100) : null,
      actualValue: editedActualValue ? Math.round(parseFloat(editedActualValue) * 100) : null,
    });
  };

  const updateStatus = (newStatus: string) => {
    updateMutation.mutate({ status: newStatus });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-surface rounded w-32 animate-pulse" />
        <div className="bg-surface rounded-lg p-6 animate-pulse">
          <div className="h-8 bg-navy-700 rounded w-64 mb-4" />
          <div className="h-4 bg-navy-700 rounded w-full mb-2" />
          <div className="h-4 bg-navy-700 rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard/jobs"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Jobs
        </Link>
        <div className="bg-surface rounded-lg p-12 text-center">
          <div className="w-16 h-16 rounded-xl bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Job Not Found</h3>
          <p className="text-gray-500">This job may have been deleted or you don't have access to it.</p>
        </div>
      </div>
    );
  }

  const status = statusConfig[job.status] || statusConfig.lead;
  const priority = priorityConfig[job.priority] || priorityConfig.normal;
  const isEmergency = job.priority === 'emergency';
  const customer = job.customer;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/jobs"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Jobs
        </Link>
        {!isEditing ? (
          <button
            onClick={startEditing}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface text-white rounded-lg hover:bg-surface-light transition-colors min-h-[44px]"
          >
            <Edit3 className="w-4 h-4" />
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface text-white rounded-lg hover:bg-surface-light transition-colors min-h-[44px]"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={saveChanges}
              disabled={updateMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Job Details - Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Info Card */}
          <div className={`bg-surface rounded-lg p-6 ${isEmergency ? 'border-l-4 border-red-500' : ''}`}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                {isEditing ? (
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="w-full text-2xl font-bold bg-navy-800 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-white">{job.title}</h1>
                    {isEmergency && <AlertTriangle className="w-6 h-6 text-red-500" />}
                  </div>
                )}
              </div>
              <span className={`px-3 py-1.5 text-sm font-semibold uppercase tracking-wide rounded ${status.bg} ${status.text}`}>
                {status.label}
              </span>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <span className={`px-2.5 py-1 text-xs font-semibold uppercase rounded ${priority.bg} ${priority.text}`}>
                {job.priority}
              </span>
              <span className="px-2.5 py-1 text-xs font-semibold uppercase rounded bg-navy-700 text-gray-400">
                {job.type}
              </span>
              {job.scheduledAt && (
                <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>{format(new Date(job.scheduledAt), 'MMM d, yyyy h:mm a')}</span>
                </div>
              )}
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Description</h3>
              {isEditing ? (
                <textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  rows={4}
                  className="w-full bg-navy-800 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500 resize-none"
                />
              ) : (
                <p className="text-gray-300">{job.description || 'No description provided.'}</p>
              )}
            </div>

            {/* Value Section */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Estimated Value</h3>
                {isEditing ? (
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="number"
                      value={editedEstimatedValue}
                      onChange={(e) => setEditedEstimatedValue(e.target.value)}
                      step="0.01"
                      min="0"
                      className="w-full pl-10 pr-4 py-2 bg-navy-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-white">
                    {job.estimatedValue ? `$${(job.estimatedValue / 100).toLocaleString()}` : '—'}
                  </p>
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Actual Value</h3>
                {isEditing ? (
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="number"
                      value={editedActualValue}
                      onChange={(e) => setEditedActualValue(e.target.value)}
                      step="0.01"
                      min="0"
                      className="w-full pl-10 pr-4 py-2 bg-navy-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-green-500">
                    {job.actualValue ? `$${(job.actualValue / 100).toLocaleString()}` : '—'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Status Change Section */}
          <div className="bg-surface rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Update Status</h3>
            <div className="flex flex-wrap gap-2">
              {statuses.map((s) => (
                <button
                  key={s.value}
                  onClick={() => updateStatus(s.value)}
                  disabled={updateMutation.isPending || job.status === s.value}
                  className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-all min-h-[44px] ${
                    job.status === s.value
                      ? 'bg-orange-500 text-white'
                      : 'bg-navy-800 text-gray-400 hover:bg-navy-700 hover:text-white'
                  } disabled:opacity-50`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          {job.status !== 'completed' && job.status !== 'canceled' && (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => updateStatus('completed')}
                disabled={updateMutation.isPending}
                className="flex items-center justify-center gap-2 px-5 py-4 bg-green-500/20 text-green-500 rounded-lg font-semibold hover:bg-green-500/30 transition-colors min-h-[56px]"
              >
                <CheckCircle2 className="w-5 h-5" />
                Mark Complete
              </button>
              <button
                onClick={() => updateStatus('canceled')}
                disabled={updateMutation.isPending}
                className="flex items-center justify-center gap-2 px-5 py-4 bg-red-500/20 text-red-500 rounded-lg font-semibold hover:bg-red-500/30 transition-colors min-h-[56px]"
              >
                <X className="w-5 h-5" />
                Cancel Job
              </button>
            </div>
          )}
        </div>

        {/* Customer Info - Right Column */}
        <div className="space-y-6">
          {customer ? (
            <div className="bg-surface rounded-lg p-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Customer</h3>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl font-bold text-orange-500">
                    {customer.firstName?.[0]}{customer.lastName?.[0]}
                  </span>
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">
                    {customer.firstName} {customer.lastName}
                  </p>
                  <Link
                    href={`/dashboard/customers/${customer.id}`}
                    className="text-sm text-orange-500 hover:text-orange-400"
                  >
                    View Profile
                  </Link>
                </div>
              </div>

              <div className="space-y-4">
                {/* Phone - Click to Call */}
                {customer.phone && (
                  <a
                    href={`tel:${customer.phone}`}
                    className="flex items-center gap-3 p-3 bg-navy-800 rounded-lg hover:bg-navy-700 transition-colors min-h-[56px]"
                  >
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <Phone className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{customer.phone}</p>
                      <p className="text-xs text-gray-500">Tap to call</p>
                    </div>
                  </a>
                )}

                {/* Address - Click to Navigate */}
                {formatAddress(customer) && (
                  <a
                    href={getGoogleMapsUrl(customer)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-navy-800 rounded-lg hover:bg-navy-700 transition-colors min-h-[56px]"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{formatAddress(customer)}</p>
                      <p className="text-xs text-gray-500">Tap to navigate</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-500" />
                  </a>
                )}

                {/* Email */}
                {customer.email && (
                  <a
                    href={`mailto:${customer.email}`}
                    className="flex items-center gap-3 p-3 bg-navy-800 rounded-lg hover:bg-navy-700 transition-colors min-h-[56px]"
                  >
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-purple-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{customer.email}</p>
                      <p className="text-xs text-gray-500">Tap to email</p>
                    </div>
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-surface rounded-lg p-6 text-center">
              <div className="w-12 h-12 rounded-lg bg-navy-800 flex items-center justify-center mx-auto mb-3">
                <User className="w-6 h-6 text-gray-500" />
              </div>
              <p className="text-gray-500">No customer assigned</p>
            </div>
          )}

          {/* Assigned Tech */}
          {job.assignedTo && (
            <div className="bg-surface rounded-lg p-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Assigned To</h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <span className="font-semibold text-blue-500">
                    {job.assignedTo.firstName?.[0]}{job.assignedTo.lastName?.[0]}
                  </span>
                </div>
                <div>
                  <p className="text-white font-medium">{job.assignedTo.firstName} {job.assignedTo.lastName}</p>
                  <p className="text-sm text-gray-500">{job.assignedTo.role || 'Technician'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="bg-surface rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Timeline</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span className="text-white">{format(new Date(job.createdAt), 'MMM d, yyyy')}</span>
              </div>
              {job.scheduledAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Scheduled</span>
                  <span className="text-white">{format(new Date(job.scheduledAt), 'MMM d, yyyy')}</span>
                </div>
              )}
              {job.completedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Completed</span>
                  <span className="text-white">{format(new Date(job.completedAt), 'MMM d, yyyy')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
