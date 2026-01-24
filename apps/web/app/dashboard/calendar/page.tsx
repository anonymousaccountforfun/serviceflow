'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  User,
  Phone
} from 'lucide-react';
import { format, addDays, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { api } from '../../../lib/api';

type ViewMode = 'day' | 'week';

function AppointmentCard({ appointment }: { appointment: any }) {
  const startTime = format(new Date(appointment.scheduledAt), 'h:mm a');
  const endTime = format(new Date(appointment.scheduledEndAt), 'h:mm a');

  const statusColors: Record<string, string> = {
    scheduled: 'bg-blue-100 border-blue-300 text-blue-800',
    confirmed: 'bg-green-100 border-green-300 text-green-800',
    in_progress: 'bg-yellow-100 border-yellow-300 text-yellow-800',
    completed: 'bg-gray-100 border-gray-300 text-gray-600',
    canceled: 'bg-red-100 border-red-300 text-red-800',
    rescheduled: 'bg-purple-100 border-purple-300 text-purple-800',
  };

  const colorClass = statusColors[appointment.status] || statusColors.scheduled;

  return (
    <div className={`p-3 rounded-lg border ${colorClass} mb-2`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{appointment.job?.title}</p>
          <p className="text-xs mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {startTime} - {endTime}
          </p>
        </div>
        <span className="text-xs font-medium capitalize px-2 py-0.5 rounded bg-white/50">
          {appointment.status}
        </span>
      </div>

      <div className="mt-2 space-y-1 text-xs">
        <p className="flex items-center gap-1">
          <User className="w-3 h-3" />
          {appointment.customer?.firstName} {appointment.customer?.lastName}
        </p>
        {appointment.customer?.phone && (
          <p className="flex items-center gap-1">
            <Phone className="w-3 h-3" />
            {appointment.customer.phone}
          </p>
        )}
        {appointment.customer?.address && (
          <p className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {appointment.customer.address.street}, {appointment.customer.address.city}
          </p>
        )}
      </div>

      {appointment.assignedTo && (
        <p className="text-xs mt-2 pt-2 border-t border-current/20">
          Tech: {appointment.assignedTo.firstName} {appointment.assignedTo.lastName}
        </p>
      )}
    </div>
  );
}

function DayView({ date }: { date: Date }) {
  const dateStr = format(date, 'yyyy-MM-dd');

  const { data, isLoading } = useQuery({
    queryKey: ['calendar', 'day', dateStr],
    queryFn: () => api.getCalendarDay(dateStr),
  });

  const appointments = data?.data?.appointments || [];

  // Generate time slots from 7am to 7pm
  const timeSlots = Array.from({ length: 13 }, (_, i) => i + 7);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="grid grid-cols-[80px_1fr] divide-x divide-gray-200">
        {/* Time column */}
        <div className="bg-gray-50">
          {timeSlots.map((hour) => (
            <div key={hour} className="h-20 border-b border-gray-200 px-2 py-1">
              <span className="text-xs text-gray-500">
                {hour > 12 ? hour - 12 : hour}:00 {hour >= 12 ? 'PM' : 'AM'}
              </span>
            </div>
          ))}
        </div>

        {/* Appointments column */}
        <div className="relative min-h-[1040px]">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
            </div>
          ) : appointments.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              No appointments scheduled
            </div>
          ) : (
            <div className="p-2">
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

function WeekView({ startDate }: { startDate: Date }) {
  const weekStart = startOfWeek(startDate, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const dateStr = format(weekStart, 'yyyy-MM-dd');

  const { data, isLoading } = useQuery({
    queryKey: ['calendar', 'week', dateStr],
    queryFn: () => api.getCalendarWeek(dateStr),
  });

  const byDay = data?.data?.byDay || {};

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="grid grid-cols-7 divide-x divide-gray-200">
        {days.map((day) => {
          const dayKey = format(day, 'yyyy-MM-dd');
          const appointments = byDay[dayKey] || [];
          const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

          return (
            <div key={dayKey} className="min-h-[400px]">
              {/* Day header */}
              <div className={`p-3 border-b border-gray-200 text-center ${isToday ? 'bg-brand-50' : 'bg-gray-50'}`}>
                <p className="text-xs text-gray-500 uppercase">{format(day, 'EEE')}</p>
                <p className={`text-lg font-semibold ${isToday ? 'text-brand-600' : 'text-gray-900'}`}>
                  {format(day, 'd')}
                </p>
              </div>

              {/* Day appointments */}
              <div className="p-2 space-y-2">
                {isLoading ? (
                  <div className="h-20 bg-gray-100 animate-pulse rounded" />
                ) : appointments.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No appointments</p>
                ) : (
                  appointments.map((apt: any) => (
                    <div
                      key={apt.id}
                      className="p-2 bg-brand-50 border border-brand-200 rounded text-xs"
                    >
                      <p className="font-medium text-brand-800 truncate">{apt.job?.title}</p>
                      <p className="text-brand-600">
                        {format(new Date(apt.scheduledAt), 'h:mm a')}
                      </p>
                      <p className="text-brand-700 truncate">
                        {apt.customer?.firstName} {apt.customer?.lastName}
                      </p>
                    </div>
                  ))
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-500 mt-1">Manage your appointments and schedule</p>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'day' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'week' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
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
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={navigateNext}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Today
          </button>
        </div>

        <h2 className="text-lg font-semibold text-gray-900">
          {viewMode === 'day'
            ? format(currentDate, 'EEEE, MMMM d, yyyy')
            : format(startOfWeek(currentDate), 'MMMM d') + ' - ' + format(addDays(startOfWeek(currentDate), 6), 'MMMM d, yyyy')
          }
        </h2>
      </div>

      {/* Calendar View */}
      {viewMode === 'day' ? (
        <DayView date={currentDate} />
      ) : (
        <WeekView startDate={currentDate} />
      )}
    </div>
  );
}
