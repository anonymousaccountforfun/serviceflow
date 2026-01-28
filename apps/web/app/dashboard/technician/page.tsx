'use client';

/**
 * Technician Day View
 *
 * Mobile-optimized view for technicians showing today's jobs,
 * clock in/out, and quick actions.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO, isToday } from 'date-fns';
import {
  Clock,
  MapPin,
  Phone,
  Navigation,
  ChevronRight,
  CheckCircle,
  PlayCircle,
  AlertCircle,
  Calendar,
  Timer,
  Briefcase,
} from 'lucide-react';
import { useNetworkStatus } from '../../../hooks/useNetworkStatus';
import { NetworkStatusBadge } from '../../../components/ui/network-status';
import { cacheJobs, getTodaysJobs, StoredJob } from '../../../lib/offline';

interface Job {
  id: string;
  title: string;
  status: string;
  scheduledAt: string | null;
  description: string | null;
  estimatedValue: number | null;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
    address: {
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
    } | null;
  };
}

interface DayViewData {
  date: string;
  jobs: Job[];
  stats: {
    totalJobs: number;
    completedJobs: number;
    estimatedHours: number;
  };
  currentJobId?: string;
  nextJobId?: string;
}

interface ClockStatus {
  date: string;
  isClockedIn: boolean;
  clockInAt: string | null;
  clockOutAt: string | null;
  hoursWorkedSoFar?: number;
}

export default function TechnicianDayView() {
  const router = useRouter();
  const { isOnline } = useNetworkStatus();
  const [data, setData] = useState<DayViewData | null>(null);
  const [clockStatus, setClockStatus] = useState<ClockStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [clockLoading, setClockLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        if (isOnline) {
          // Fetch from API
          const [dayRes, statusRes] = await Promise.all([
            fetch('/api/technician/day'),
            fetch('/api/technician/status'),
          ]);

          if (dayRes.ok) {
            const dayData = await dayRes.json();
            setData(dayData.data);

            // Cache jobs for offline use
            const storedJobs: StoredJob[] = dayData.data.jobs.map((job: Job) => ({
              id: job.id,
              customerId: job.customer.id,
              customerName: `${job.customer.firstName} ${job.customer.lastName}`,
              address: job.customer.address
                ? `${job.customer.address.street || ''}, ${job.customer.address.city || ''}`
                : '',
              scheduledAt: job.scheduledAt || '',
              status: job.status,
              priority: 'normal',
              type: 'service',
              description: job.description,
              notes: [],
              cachedAt: Date.now(),
            }));
            await cacheJobs(storedJobs);
          }

          if (statusRes.ok) {
            const statusData = await statusRes.json();
            setClockStatus(statusData.data);
          }
        } else {
          // Load from offline cache
          const cachedJobs = await getTodaysJobs();
          if (cachedJobs.length > 0) {
            setData({
              date: new Date().toISOString().split('T')[0],
              jobs: cachedJobs.map((job) => ({
                id: job.id,
                title: job.description || 'Service Call',
                status: job.status,
                scheduledAt: job.scheduledAt,
                description: job.description,
                estimatedValue: null,
                customer: {
                  id: job.customerId,
                  firstName: job.customerName.split(' ')[0] || '',
                  lastName: job.customerName.split(' ').slice(1).join(' ') || '',
                  phone: '',
                  email: null,
                  address: null,
                },
              })),
              stats: {
                totalJobs: cachedJobs.length,
                completedJobs: cachedJobs.filter((j) => j.status === 'completed').length,
                estimatedHours: cachedJobs.length * 1.5,
              },
            });
          }
        }
      } catch (err) {
        console.error('Error fetching technician data:', err);
        setError('Failed to load today\'s schedule');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [isOnline]);

  // Clock in/out handler
  async function handleClockToggle() {
    if (!clockStatus || clockLoading || !isOnline) return;

    setClockLoading(true);
    try {
      const endpoint = clockStatus.isClockedIn
        ? '/api/technician/clock-out'
        : '/api/technician/clock-in';

      const res = await fetch(endpoint, { method: 'POST' });
      if (res.ok) {
        const statusRes = await fetch('/api/technician/status');
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setClockStatus(statusData.data);
        }
      }
    } catch (err) {
      console.error('Clock toggle failed:', err);
    } finally {
      setClockLoading(false);
    }
  }

  // Format time for display
  function formatTime(dateStr: string | null): string {
    if (!dateStr) return '--:--';
    return format(parseISO(dateStr), 'h:mm a');
  }

  // Get status color and icon
  function getStatusInfo(status: string): { color: string; icon: JSX.Element } {
    switch (status) {
      case 'completed':
        return { color: 'text-green-600 bg-green-50', icon: <CheckCircle className="w-4 h-4" /> };
      case 'in_progress':
        return { color: 'text-blue-600 bg-blue-50', icon: <PlayCircle className="w-4 h-4" /> };
      case 'scheduled':
      case 'confirmed':
        return { color: 'text-gray-600 bg-gray-50', icon: <Clock className="w-4 h-4" /> };
      default:
        return { color: 'text-amber-600 bg-amber-50', icon: <AlertCircle className="w-4 h-4" /> };
    }
  }

  // Open navigation to address
  function openNavigation(address: Job['customer']['address']) {
    if (!address) return;
    const query = encodeURIComponent(
      `${address.street || ''}, ${address.city || ''}, ${address.state || ''} ${address.zip || ''}`
    );
    window.open(`https://maps.google.com/maps?q=${query}`, '_blank');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-gray-900 font-medium">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Today</h1>
          <p className="text-gray-400 text-sm">
            {format(new Date(), 'EEEE, MMMM d')}
          </p>
        </div>
        <NetworkStatusBadge />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-navy-800 rounded-xl p-4 text-center">
          <Briefcase className="w-5 h-5 text-blue-400 mx-auto mb-1" />
          <div className="text-2xl font-bold text-white">{data?.stats.totalJobs || 0}</div>
          <div className="text-xs text-gray-400">Jobs</div>
        </div>
        <div className="bg-navy-800 rounded-xl p-4 text-center">
          <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-1" />
          <div className="text-2xl font-bold text-white">{data?.stats.completedJobs || 0}</div>
          <div className="text-xs text-gray-400">Done</div>
        </div>
        <div className="bg-navy-800 rounded-xl p-4 text-center">
          <Timer className="w-5 h-5 text-amber-400 mx-auto mb-1" />
          <div className="text-2xl font-bold text-white">{data?.stats.estimatedHours || 0}</div>
          <div className="text-xs text-gray-400">Hours</div>
        </div>
      </div>

      {/* Clock In/Out Card */}
      <div className="bg-navy-800 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">
              {clockStatus?.isClockedIn ? 'Clocked in at' : 'Not clocked in'}
            </p>
            <p className="text-white font-semibold text-lg">
              {clockStatus?.isClockedIn
                ? formatTime(clockStatus.clockInAt)
                : '--:--'}
            </p>
            {clockStatus?.hoursWorkedSoFar !== undefined && (
              <p className="text-gray-400 text-sm">
                {clockStatus.hoursWorkedSoFar.toFixed(1)} hours worked
              </p>
            )}
          </div>
          <button
            onClick={handleClockToggle}
            disabled={clockLoading || !isOnline}
            className={`px-6 py-3 rounded-xl font-medium transition-colors ${
              clockStatus?.isClockedIn
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            } disabled:opacity-50`}
          >
            {clockLoading
              ? '...'
              : clockStatus?.isClockedIn
              ? 'Clock Out'
              : 'Clock In'}
          </button>
        </div>
      </div>

      {/* Jobs List */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white mb-3">Schedule</h2>

        {!data?.jobs.length ? (
          <div className="bg-navy-800 rounded-xl p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No jobs scheduled for today</p>
          </div>
        ) : (
          data.jobs.map((job) => {
            const statusInfo = getStatusInfo(job.status);
            const isCurrentJob = job.id === data.currentJobId;

            return (
              <div
                key={job.id}
                className={`bg-navy-800 rounded-xl p-4 ${
                  isCurrentJob ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                {/* Time and Status */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-white font-medium">
                      {job.scheduledAt ? formatTime(job.scheduledAt) : 'Unscheduled'}
                    </span>
                    {isCurrentJob && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-blue-600 text-white rounded-full">
                        Next
                      </span>
                    )}
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                    {statusInfo.icon}
                    <span className="capitalize">{job.status.replace('_', ' ')}</span>
                  </div>
                </div>

                {/* Customer Name */}
                <h3 className="text-white font-semibold mb-1">
                  {job.customer.firstName} {job.customer.lastName}
                </h3>

                {/* Address */}
                {job.customer.address && (
                  <div className="flex items-start gap-2 text-gray-400 text-sm mb-3">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>
                      {job.customer.address.street}
                      {job.customer.address.city && `, ${job.customer.address.city}`}
                    </span>
                  </div>
                )}

                {/* Description */}
                {job.description && (
                  <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                    {job.description}
                  </p>
                )}

                {/* Quick Status Actions */}
                {job.status === 'scheduled' || job.status === 'confirmed' ? (
                  <button
                    onClick={async () => {
                      if (!isOnline) return;
                      const res = await fetch(`/api/appointments?jobId=${job.id}`);
                      if (res.ok) {
                        const { data } = await res.json();
                        if (data?.[0]?.id) {
                          await fetch(`/api/appointments/${data[0].id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'in_progress' }),
                          });
                          window.location.reload();
                        }
                      }
                    }}
                    disabled={!isOnline}
                    className="w-full mb-3 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-xl text-white font-semibold transition-colors"
                  >
                    <PlayCircle className="w-5 h-5" />
                    Start Job
                  </button>
                ) : job.status === 'in_progress' ? (
                  <button
                    onClick={() => router.push(`/dashboard/jobs/${job.id}/complete`)}
                    className="w-full mb-3 flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 hover:bg-orange-600 rounded-xl text-white font-semibold transition-colors"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Complete Job
                  </button>
                ) : null}

                {/* Actions */}
                <div className="flex gap-2">
                  {job.customer.phone && (
                    <a
                      href={`tel:${job.customer.phone}`}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-navy-700 hover:bg-navy-600 rounded-lg text-white text-sm transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                      Call
                    </a>
                  )}
                  {job.customer.address && (
                    <button
                      onClick={() => openNavigation(job.customer.address)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-navy-700 hover:bg-navy-600 rounded-lg text-white text-sm transition-colors"
                    >
                      <Navigation className="w-4 h-4" />
                      Navigate
                    </button>
                  )}
                  <button
                    onClick={() => router.push(`/dashboard/jobs/${job.id}`)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm transition-colors"
                  >
                    Details
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
