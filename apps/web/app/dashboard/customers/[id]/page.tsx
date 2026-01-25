'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  Briefcase,
  MessageSquare,
  AlertTriangle,
  ExternalLink,
  Clock,
  ChevronRight
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

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = params.id as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => api.getCustomer(customerId),
    enabled: !!customerId,
  });

  const { data: jobsData } = useQuery({
    queryKey: ['jobs', 'customer', customerId],
    queryFn: () => api.getJobs({ customerId }),
    enabled: !!customerId,
  });

  const customer = data?.data;
  const jobs = jobsData?.data || [];

  // Calculate lifetime value
  const lifetimeValue = jobs.reduce((sum: number, job: any) => {
    return sum + (job.actualValue || job.estimatedValue || 0);
  }, 0);

  const completedJobs = jobs.filter((job: any) => job.status === 'completed').length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-surface rounded w-32 animate-pulse" />
        <div className="bg-surface rounded-lg p-6 animate-pulse">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-navy-700 rounded-full" />
            <div>
              <div className="h-6 bg-navy-700 rounded w-48 mb-2" />
              <div className="h-4 bg-navy-700 rounded w-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard/customers"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Customers
        </Link>
        <div className="bg-surface rounded-lg p-12 text-center">
          <div className="w-16 h-16 rounded-xl bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Customer Not Found</h3>
          <p className="text-gray-500">This customer may have been deleted or you don't have access.</p>
        </div>
      </div>
    );
  }

  const address = formatAddress(customer);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Link
        href="/dashboard/customers"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors min-h-[44px]"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Customers
      </Link>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Info - Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Header Card */}
          <div className="bg-surface rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-orange-500">
                  {customer.firstName?.[0]}{customer.lastName?.[0]}
                </span>
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-white">
                  {customer.firstName} {customer.lastName}
                </h1>
                {customer.source && (
                  <span className="inline-block mt-2 px-2.5 py-1 text-xs font-semibold uppercase rounded bg-navy-700 text-gray-400">
                    Source: {customer.source}
                  </span>
                )}
                <p className="text-sm text-gray-500 mt-2">
                  Customer since {format(new Date(customer.createdAt), 'MMMM yyyy')}
                </p>
              </div>
            </div>
          </div>

          {/* Contact Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Phone */}
            {customer.phone && (
              <a
                href={`tel:${customer.phone}`}
                className="flex items-center gap-3 p-4 bg-surface rounded-lg hover:bg-surface-light transition-colors min-h-[72px]"
              >
                <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Phone className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-white font-semibold">{customer.phone}</p>
                  <p className="text-xs text-gray-500">Tap to call</p>
                </div>
              </a>
            )}

            {/* Email */}
            {customer.email && (
              <a
                href={`mailto:${customer.email}`}
                className="flex items-center gap-3 p-4 bg-surface rounded-lg hover:bg-surface-light transition-colors min-h-[72px]"
              >
                <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-purple-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold truncate">{customer.email}</p>
                  <p className="text-xs text-gray-500">Tap to email</p>
                </div>
              </a>
            )}

            {/* Address */}
            {address && (
              <a
                href={getGoogleMapsUrl(customer)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-surface rounded-lg hover:bg-surface-light transition-colors min-h-[72px]"
              >
                <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">{customer.city || 'Get Directions'}</p>
                  <p className="text-xs text-gray-500">Tap to navigate</p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-500" />
              </a>
            )}
          </div>

          {/* Full Address */}
          {address && (
            <div className="bg-surface rounded-lg p-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Address</h3>
              <p className="text-white">{customer.address}</p>
              <p className="text-gray-400">
                {[customer.city, customer.state, customer.zip].filter(Boolean).join(', ')}
              </p>
            </div>
          )}

          {/* Job History */}
          <div className="bg-surface rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Job History</h3>
              <span className="text-sm text-gray-500">{jobs.length} jobs</span>
            </div>

            {jobs.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-lg bg-navy-800 flex items-center justify-center mx-auto mb-3">
                  <Briefcase className="w-6 h-6 text-gray-500" />
                </div>
                <p className="text-gray-500">No jobs yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.slice(0, 5).map((job: any) => {
                  const status = statusConfig[job.status] || statusConfig.lead;
                  return (
                    <Link
                      key={job.id}
                      href={`/dashboard/jobs/${job.id}`}
                      className="flex items-center justify-between p-4 bg-navy-800 rounded-lg hover:bg-navy-700 transition-colors min-h-[72px]"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{job.title}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`px-2 py-0.5 text-xs font-semibold uppercase rounded ${status.bg} ${status.text}`}>
                            {status.label}
                          </span>
                          {job.scheduledAt && (
                            <span className="text-xs text-gray-500">
                              {format(new Date(job.scheduledAt), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {(job.actualValue || job.estimatedValue) && (
                          <span className="text-green-500 font-semibold">
                            ${((job.actualValue || job.estimatedValue) / 100).toLocaleString()}
                          </span>
                        )}
                        <ChevronRight className="w-5 h-5 text-gray-500" />
                      </div>
                    </Link>
                  );
                })}
                {jobs.length > 5 && (
                  <p className="text-center text-sm text-gray-500 pt-2">
                    + {jobs.length - 5} more jobs
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stats - Right Column */}
        <div className="space-y-6">
          {/* Lifetime Value */}
          <div className="bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-green-400 uppercase tracking-wide">
                Lifetime Value
              </span>
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-4xl font-bold text-white">
              ${(lifetimeValue / 100).toLocaleString()}
            </p>
          </div>

          {/* Quick Stats */}
          <div className="bg-surface rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-blue-500" />
                </div>
                <span className="text-gray-400">Total Jobs</span>
              </div>
              <span className="text-2xl font-bold text-white">{jobs.length}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-green-500" />
                </div>
                <span className="text-gray-400">Completed</span>
              </div>
              <span className="text-2xl font-bold text-white">{completedJobs}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-500" />
                </div>
                <span className="text-gray-400">Active</span>
              </div>
              <span className="text-2xl font-bold text-white">
                {jobs.filter((j: any) => !['completed', 'canceled'].includes(j.status)).length}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-3">
            <Link
              href={`/dashboard/jobs?customerId=${customerId}`}
              className="flex items-center justify-center gap-2 w-full px-5 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors min-h-[48px]"
            >
              <Briefcase className="w-5 h-5" />
              New Job for Customer
            </Link>
            <Link
              href={`/dashboard/inbox?customerId=${customerId}`}
              className="flex items-center justify-center gap-2 w-full px-5 py-3 bg-surface text-white rounded-lg font-semibold hover:bg-surface-light transition-colors min-h-[48px]"
            >
              <MessageSquare className="w-5 h-5" />
              Message Customer
            </Link>
          </div>

          {/* Notes Section */}
          <div className="bg-surface rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Notes</h3>
            {customer.notes ? (
              <p className="text-gray-300 whitespace-pre-wrap">{customer.notes}</p>
            ) : (
              <p className="text-gray-500 italic">No notes yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
