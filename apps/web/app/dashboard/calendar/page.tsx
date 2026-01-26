'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  User,
  Phone,
  Plus,
  X,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { format, addDays, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import Link from 'next/link';
import { toast } from 'sonner';
import { api } from '../../../lib/api';

type ViewMode = 'day' | 'week';

const statusColors: Record<string, { bg: string; border: string; text: string }> = {
  scheduled: { bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-400' },
  confirmed: { bg: 'bg-green-500/20', border: 'border-green-500/30', text: 'text-green-400' },
  in_progress: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', text: 'text-yellow-400' },
  completed: { bg: 'bg-gray-500/20', border: 'border-gray-500/30', text: 'text-gray-400' },
  canceled: { bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-400' },
  rescheduled: { bg: 'bg-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-400' },
};

function CreateAppointmentModal({
  isOpen,
  onClose,
  onSuccess,
  selectedDate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedDate: Date;
}) {
  const [jobId, setJobId] = useState('');
  const [jobSearch, setJobSearch] = useState('');
  const [scheduledAt, setScheduledAt] = useState(format(selectedDate, "yyyy-MM-dd'T'09:00"));
  const [duration, setDuration] = useState('60');
  const [notes, setNotes] = useState('');
  const [showJobDropdown, setShowJobDropdown] = useState(false);

  const { data: jobsData } = useQuery({
    queryKey: ['jobs', 'search', jobSearch],
    queryFn: () => api.getJobs({ status: 'scheduled', limit: 10 }),
    enabled: true,
  });

  const jobs = jobsData?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createAppointment(data),
    onSuccess: () => {
      toast.success('Event saved');
      onSuccess();
      resetForm();
      onClose();
    },
    onError: (err: Error) => {
      toast.error('Failed to save event');
    },
  });

  const resetForm = () => {
    setJobId('');
    setJobSearch('');
    setScheduledAt(format(selectedDate, "yyyy-MM-dd'T'09:00"));
    setDuration('60');
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobId) return;

    try {
      const start = new Date(scheduledAt);
      const end = new Date(start.getTime() + parseInt(duration) * 60000);

      createMutation.mutate({
        jobId,
        scheduledAt: start.toISOString(),
        scheduledEndAt: end.toISOString(),
        notes: notes.trim() || undefined,
      });
    } catch (error) {
      toast.error('Failed to save event');
    }
  };

  const selectJob = (job: any) => {
    setJobId(job.id);
    setJobSearch(job.title);
    setShowJobDropdown(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-navy-900 rounded-xl shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Schedule Appointment</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Job Selection */}
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-400 mb-2">
              Job <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={jobSearch}
              onChange={(e) => {
                setJobSearch(e.target.value);
                setShowJobDropdown(true);
                if (!e.target.value) setJobId('');
              }}
              onFocus={() => setShowJobDropdown(true)}
              placeholder="Search jobs..."
              className="w-full px-4 py-3 bg-navy-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 min-h-[44px]"
            />
            {showJobDropdown && jobs.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-navy-800 border border-white/10 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {jobs.map((job: any) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => selectJob(job)}
                    className="w-full px-4 py-3 text-left hover:bg-navy-700 transition-colors min-h-[44px]"
                  >
                    <p className="text-white font-medium">{job.title}</p>
                    <p className="text-sm text-gray-500">
                      {job.customer?.firstName} {job.customer?.lastName}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date/Time */}
          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-2">
              Date & Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-4 py-3 bg-navy-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500 min-h-[44px]"
              required
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-2">Duration</label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-4 py-3 bg-navy-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500 min-h-[44px]"
            >
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="90">1.5 hours</option>
              <option value="120">2 hours</option>
              <option value="180">3 hours</option>
              <option value="240">4 hours</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={3}
              className="w-full px-4 py-3 bg-navy-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={createMutation.isPending}
              className="flex-1 px-5 py-3 bg-navy-800 text-white rounded-lg font-semibold hover:bg-navy-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!jobId || createMutation.isPending}
              className="flex-1 px-5 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex items-center justify-center gap-2"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Schedule
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AppointmentCard({ appointment }: { appointment: any }) {
  const startTime = format(new Date(appointment.scheduledAt), 'h:mm a');
  const endTime = appointment.scheduledEndAt
    ? format(new Date(appointment.scheduledEndAt), 'h:mm a')
    : '';

  const colors = statusColors[appointment.status] || statusColors.scheduled;
  const address = appointment.customer?.address
    ? `${appointment.customer.address}, ${appointment.customer.city || ''}`
    : '';
  const mapsUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : '';

  return (
    <Link
      href={`/dashboard/jobs/${appointment.job?.id}`}
      className={`block p-3 rounded-lg border ${colors.bg} ${colors.border} mb-2 hover:brightness-110 transition-all`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm truncate">{appointment.job?.title}</p>
          <p className={`text-xs mt-1 flex items-center gap-1 ${colors.text}`}>
            <Clock className="w-3 h-3" />
            {startTime}{endTime && ` - ${endTime}`}
          </p>
        </div>
        <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>
          {appointment.status}
        </span>
      </div>

      <div className="mt-2 space-y-1 text-xs">
        <p className="flex items-center gap-1 text-gray-300">
          <User className="w-3 h-3" />
          {appointment.customer?.firstName} {appointment.customer?.lastName}
        </p>
        {appointment.customer?.phone && (
          <a
            href={`tel:${appointment.customer.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-green-400 hover:text-green-300"
          >
            <Phone className="w-3 h-3" />
            {appointment.customer.phone}
          </a>
        )}
        {address && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
          >
            <MapPin className="w-3 h-3" />
            <span className="truncate">{address}</span>
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </a>
        )}
      </div>

      {appointment.assignedTo && (
        <p className="text-xs mt-2 pt-2 border-t border-white/10 text-gray-400">
          Tech: {appointment.assignedTo.firstName} {appointment.assignedTo.lastName}
        </p>
      )}
    </Link>
  );
}

function DayView({ date, onAddClick }: { date: Date; onAddClick: () => void }) {
  const dateStr = format(date, 'yyyy-MM-dd');

  const { data, isLoading } = useQuery({
    queryKey: ['calendar', 'day', dateStr],
    queryFn: () => api.getCalendarDay(dateStr),
  });

  const appointments = data?.data || [];
  const timeSlots = Array.from({ length: 13 }, (_, i) => i + 7);

  return (
    <div className="bg-surface rounded-xl border border-white/10 overflow-hidden">
      <div className="grid grid-cols-[80px_1fr] divide-x divide-white/10">
        {/* Time column */}
        <div className="bg-navy-800">
          {timeSlots.map((hour) => (
            <div key={hour} className="h-20 border-b border-white/5 px-2 py-1">
              <span className="text-xs text-gray-500">
                {hour > 12 ? hour - 12 : hour}:00 {hour >= 12 ? 'PM' : 'AM'}
              </span>
            </div>
          ))}
        </div>

        {/* Appointments column */}
        <div className="relative min-h-[1040px]">
          {/* Add button */}
          <button
            onClick={onAddClick}
            className="absolute top-2 right-2 p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center z-10"
          >
            <Plus className="w-5 h-5" />
          </button>

          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : appointments.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
              <Clock className="w-12 h-12 mb-2 opacity-50" />
              <p>No appointments scheduled</p>
              <button
                onClick={onAddClick}
                className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
              >
                Add Appointment
              </button>
            </div>
          ) : (
            <div className="p-3 pt-14">
              {appointments.map((apt: any) => (
                <AppointmentCard key={apt.id} appointment={apt} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WeekView({ startDate, onAddClick }: { startDate: Date; onAddClick: () => void }) {
  const weekStart = startOfWeek(startDate, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const dateStr = format(weekStart, 'yyyy-MM-dd');

  const { data, isLoading } = useQuery({
    queryKey: ['calendar', 'week', dateStr],
    queryFn: () => api.getCalendarWeek(dateStr),
  });

  const byDay: Record<string, any[]> = data?.data || {};

  return (
    <div className="bg-surface rounded-xl border border-white/10 overflow-hidden">
      {/* Add button */}
      <div className="p-3 border-b border-white/10 flex justify-end">
        <button
          onClick={onAddClick}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors min-h-[44px]"
        >
          <Plus className="w-5 h-5" />
          Add Appointment
        </button>
      </div>

      <div className="grid grid-cols-7 divide-x divide-white/10">
        {days.map((day) => {
          const dayKey = format(day, 'yyyy-MM-dd');
          const appointments = byDay[dayKey] || [];
          const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

          return (
            <div key={dayKey} className="min-h-[400px]">
              {/* Day header */}
              <div className={`p-3 border-b border-white/10 text-center ${isToday ? 'bg-orange-500/20' : 'bg-navy-800'}`}>
                <p className="text-xs text-gray-500 uppercase">{format(day, 'EEE')}</p>
                <p className={`text-lg font-bold ${isToday ? 'text-orange-500' : 'text-white'}`}>
                  {format(day, 'd')}
                </p>
              </div>

              {/* Day appointments */}
              <div className="p-2 space-y-2">
                {isLoading ? (
                  <div className="h-20 bg-navy-800 animate-pulse rounded" />
                ) : appointments.length === 0 ? (
                  <p className="text-xs text-gray-600 text-center py-4">No appointments</p>
                ) : (
                  appointments.map((apt: any) => {
                    const colors = statusColors[apt.status] || statusColors.scheduled;
                    return (
                      <Link
                        key={apt.id}
                        href={`/dashboard/jobs/${apt.job?.id}`}
                        className={`block p-2 ${colors.bg} border ${colors.border} rounded text-xs hover:brightness-110 transition-all`}
                      >
                        <p className="font-semibold text-white truncate">{apt.job?.title}</p>
                        <p className={colors.text}>
                          {format(new Date(apt.scheduledAt), 'h:mm a')}
                        </p>
                        <p className="text-gray-400 truncate">
                          {apt.customer?.firstName} {apt.customer?.lastName}
                        </p>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const navigatePrev = () => {
    if (viewMode === 'day') {
      setCurrentDate(addDays(currentDate, -1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };

  const navigateNext = () => {
    if (viewMode === 'day') {
      setCurrentDate(addDays(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleAppointmentCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['calendar'] });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Calendar</h1>
          <p className="text-gray-500 mt-1">Manage your appointments and schedule</p>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex bg-surface rounded-lg p-1">
            <button
              onClick={() => setViewMode('day')}
              className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors min-h-[44px] ${
                viewMode === 'day' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors min-h-[44px] ${
                viewMode === 'week' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Week
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={navigatePrev}
            className="p-2.5 hover:bg-surface rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </button>
          <button
            onClick={navigateNext}
            className="p-2.5 hover:bg-surface rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          <button
            onClick={goToToday}
            className="px-4 py-2.5 text-sm font-semibold text-white bg-surface hover:bg-surface-light rounded-lg transition-colors min-h-[44px]"
          >
            Today
          </button>
        </div>

        <h2 className="text-lg font-bold text-white">
          {viewMode === 'day'
            ? format(currentDate, 'EEEE, MMMM d, yyyy')
            : format(startOfWeek(currentDate), 'MMMM d') + ' - ' + format(addDays(startOfWeek(currentDate), 6), 'MMMM d, yyyy')
          }
        </h2>
      </div>

      {/* Calendar View */}
      {viewMode === 'day' ? (
        <DayView date={currentDate} onAddClick={() => setShowCreateModal(true)} />
      ) : (
        <WeekView startDate={currentDate} onAddClick={() => setShowCreateModal(true)} />
      )}

      {/* Create Appointment Modal */}
      <CreateAppointmentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleAppointmentCreated}
        selectedDate={currentDate}
      />
    </div>
  );
}
