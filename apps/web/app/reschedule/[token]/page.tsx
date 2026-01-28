'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Building2,
  User,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface AppointmentData {
  appointment: {
    id: string;
    currentTime: string;
    duration: number;
    jobTitle: string;
    jobType: string | null;
  };
  business: {
    name: string;
  };
  technician: string | null;
  customer: {
    firstName: string;
  };
  availableSlots: Array<{
    date: string;
    slots: string[];
  }>;
  expiresAt: string;
}

function TimeSlotButton({
  time,
  isSelected,
  onSelect,
}: {
  time: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const formatted = format(parseISO(time), 'h:mm a');

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
        isSelected
          ? 'bg-accent text-white ring-2 ring-accent ring-offset-2 ring-offset-background'
          : 'bg-surface hover:bg-surface/80 text-white border border-white/10 hover:border-accent/50'
      }`}
    >
      {formatted}
    </button>
  );
}

function DateSection({
  date,
  slots,
  selectedSlot,
  onSelectSlot,
}: {
  date: string;
  slots: string[];
  selectedSlot: string | null;
  onSelectSlot: (slot: string) => void;
}) {
  const dateObj = parseISO(date);
  const dayName = format(dateObj, 'EEEE');
  const dateStr = format(dateObj, 'MMMM d');

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-accent" />
        <span className="font-medium text-white">{dayName}</span>
        <span className="text-gray-400">{dateStr}</span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {slots.map((slot) => (
          <TimeSlotButton
            key={slot}
            time={slot}
            isSelected={selectedSlot === slot}
            onSelect={() => onSelectSlot(slot)}
          />
        ))}
      </div>
    </div>
  );
}

function CurrentAppointment({
  data,
  onBack,
}: {
  data: AppointmentData;
  onBack?: () => void;
}) {
  const currentTime = parseISO(data.appointment.currentTime);

  return (
    <div className="bg-surface rounded-xl p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent/20 rounded-lg">
            <Building2 className="w-5 h-5 text-accent" />
          </div>
          <div>
            <p className="text-white font-medium">{data.business.name}</p>
            <p className="text-sm text-gray-500">{data.appointment.jobTitle}</p>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-white/10">
        <p className="text-sm text-gray-500 mb-2">Current Appointment</p>
        <div className="flex items-center gap-2 text-white">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span>{format(currentTime, 'EEEE, MMMM d, yyyy')}</span>
        </div>
        <div className="flex items-center gap-2 text-white mt-1">
          <Clock className="w-4 h-4 text-gray-400" />
          <span>{format(currentTime, 'h:mm a')}</span>
          <span className="text-gray-500">({data.appointment.duration} min)</span>
        </div>
      </div>

      {data.technician && (
        <div className="flex items-center gap-2 text-gray-400">
          <User className="w-4 h-4" />
          <span>{data.technician}</span>
        </div>
      )}
    </div>
  );
}

function RescheduleSuccess({
  data,
  newTime,
}: {
  data: AppointmentData;
  newTime: string;
}) {
  const newTimeDate = parseISO(newTime);

  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
        <CheckCircle className="w-10 h-10 text-green-400" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Appointment Rescheduled!
        </h1>
        <p className="text-gray-400">
          Your appointment has been successfully rescheduled. You'll receive a
          confirmation text shortly.
        </p>
      </div>
      <div className="bg-surface rounded-xl p-6 text-left">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-accent/20 rounded-lg">
            <Building2 className="w-5 h-5 text-accent" />
          </div>
          <div>
            <p className="text-white font-medium">{data.business.name}</p>
            <p className="text-sm text-gray-500">{data.appointment.jobTitle}</p>
          </div>
        </div>
        <div className="pt-4 border-t border-white/10 space-y-2">
          <p className="text-sm text-gray-500">New Appointment Time</p>
          <div className="flex items-center gap-2 text-white">
            <Calendar className="w-4 h-4 text-green-400" />
            <span className="font-medium">
              {format(newTimeDate, 'EEEE, MMMM d, yyyy')}
            </span>
          </div>
          <div className="flex items-center gap-2 text-white">
            <Clock className="w-4 h-4 text-green-400" />
            <span className="font-medium">{format(newTimeDate, 'h:mm a')}</span>
          </div>
        </div>
        {data.technician && (
          <div className="flex items-center gap-2 text-gray-400 mt-4">
            <User className="w-4 h-4" />
            <span>{data.technician} will see you then!</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ExpiredLink() {
  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 mx-auto bg-amber-500/20 rounded-full flex items-center justify-center">
        <Clock className="w-10 h-10 text-amber-400" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Link Expired</h1>
        <p className="text-gray-400">
          This reschedule link has expired. Please contact the business directly
          to reschedule your appointment.
        </p>
      </div>
    </div>
  );
}

function AlreadyUsed() {
  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center">
        <CheckCircle className="w-10 h-10 text-blue-400" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Already Rescheduled</h1>
        <p className="text-gray-400">
          This reschedule link has already been used. If you need to make another
          change, please contact the business directly.
        </p>
      </div>
    </div>
  );
}

export default function ReschedulePage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<AppointmentData | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [confirmedTime, setConfirmedTime] = useState<string | null>(null);

  // Fetch reschedule data
  useEffect(() => {
    async function fetchData() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
        const response = await fetch(`${apiUrl}/api/reschedule/${token}`);
        const result = await response.json();

        if (!response.ok) {
          setErrorCode(result.error?.code || 'UNKNOWN');
          throw new Error(result.error?.message || 'Failed to load reschedule options');
        }

        setData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reschedule options');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [token]);

  const handleSubmit = async () => {
    if (!selectedSlot) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/api/reschedule/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newTime: selectedSlot }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to reschedule');
      }

      setConfirmedTime(selectedSlot);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reschedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-4" />
          <p className="text-gray-400">Loading reschedule options...</p>
        </div>
      </div>
    );
  }

  // Handle specific error states
  if (errorCode === 'EXPIRED') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <ExpiredLink />
        </div>
      </div>
    );
  }

  if (errorCode === 'USED') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <AlreadyUsed />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">
            Reschedule Link Not Found
          </h1>
          <p className="text-gray-400">
            {error || 'This link may be invalid or has expired.'}
          </p>
        </div>
      </div>
    );
  }

  if (success && confirmedTime) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <RescheduleSuccess data={data} newTime={confirmedTime} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">
            Reschedule Appointment
          </h1>
          <p className="text-gray-400">
            Hi {data.customer.firstName}! Select a new time that works better for you.
          </p>
        </div>

        <div className="space-y-6">
          <CurrentAppointment data={data} />

          <div className="bg-surface rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-accent" />
              Select New Time
            </h2>

            {data.availableSlots.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-4" />
                <p className="text-gray-400">
                  No available time slots in the next week. Please contact{' '}
                  {data.business.name} directly to reschedule.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {data.availableSlots.map((day) => (
                  <DateSection
                    key={day.date}
                    date={day.date}
                    slots={day.slots}
                    selectedSlot={selectedSlot}
                    onSelectSlot={setSelectedSlot}
                  />
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {data.availableSlots.length > 0 && (
            <button
              onClick={handleSubmit}
              disabled={!selectedSlot || isSubmitting}
              className="w-full py-4 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Rescheduling...
                </>
              ) : (
                <>
                  Confirm New Time
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          )}

          <p className="text-xs text-gray-500 text-center">
            This link expires on{' '}
            {format(parseISO(data.expiresAt), "MMMM d 'at' h:mm a")}
          </p>
        </div>
      </div>
    </div>
  );
}
