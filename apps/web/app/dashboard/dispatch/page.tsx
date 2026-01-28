'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  User,
  Phone,
  Filter,
  Users,
  Loader2,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  format,
  addDays,
  subDays,
  startOfDay,
  endOfDay,
  parseISO,
  isSameDay,
} from 'date-fns';
import Link from 'next/link';
import { toast } from 'sonner';
import { api } from '../../../lib/api';

// Status colors for appointments
const statusColors: Record<string, { bg: string; border: string; text: string }> = {
  scheduled: { bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-400' },
  confirmed: { bg: 'bg-green-500/20', border: 'border-green-500/30', text: 'text-green-400' },
  in_progress: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', text: 'text-yellow-400' },
  completed: { bg: 'bg-gray-500/20', border: 'border-gray-500/30', text: 'text-gray-400' },
  canceled: { bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-400' },
  no_show: { bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-400' },
  rescheduled: { bg: 'bg-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-400' },
};

// Status icons
const statusIcons: Record<string, React.ReactNode> = {
  scheduled: <Clock className="w-3 h-3" />,
  confirmed: <CheckCircle className="w-3 h-3" />,
  in_progress: <Loader2 className="w-3 h-3 animate-spin" />,
  completed: <CheckCircle className="w-3 h-3" />,
  canceled: <XCircle className="w-3 h-3" />,
  no_show: <AlertCircle className="w-3 h-3" />,
};

interface Technician {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  avatarUrl: string | null;
  jobCount: number;
}

interface Appointment {
  id: string;
  scheduledAt: string;
  scheduledEndAt: string;
  status: string;
  assignedToId: string | null;
  job: {
    id: string;
    title: string;
    type: string;
    priority: string;
  } | null;
  customer: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
  } | null;
}

// Appointment card within a technician column
function DispatchAppointmentCard({
  appointment,
  onDragStart,
}: {
  appointment: Appointment;
  onDragStart?: (e: React.DragEvent, appointment: Appointment) => void;
}) {
  const startTime = format(parseISO(appointment.scheduledAt), 'h:mm a');
  const endTime = format(parseISO(appointment.scheduledEndAt), 'h:mm a');
  const colors = statusColors[appointment.status] || statusColors.scheduled;

  const customerName = appointment.customer
    ? `${appointment.customer.firstName || ''} ${appointment.customer.lastName || ''}`.trim()
    : 'Unknown';

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart?.(e, appointment)}
      className={`p-3 rounded-lg border ${colors.bg} ${colors.border} cursor-move hover:brightness-110 transition-all`}
    >
      {/* Time and status */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-medium text-white">
            {startTime} - {endTime}
          </span>
        </div>
        <span className={`text-xs font-semibold flex items-center gap-1 ${colors.text}`}>
          {statusIcons[appointment.status]}
          {appointment.status.replace('_', ' ')}
        </span>
      </div>

      {/* Job title */}
      <Link
        href={`/dashboard/jobs/${appointment.job?.id}`}
        className="block font-semibold text-white text-sm hover:text-orange-400 transition-colors truncate"
        onClick={(e) => e.stopPropagation()}
      >
        {appointment.job?.title || 'Untitled Job'}
      </Link>

      {/* Customer info */}
      <div className="mt-2 space-y-1 text-xs">
        <p className="flex items-center gap-1.5 text-gray-300">
          <User className="w-3 h-3" />
          {customerName}
        </p>
        {appointment.customer?.phone && (
          <a
            href={`tel:${appointment.customer.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 text-green-400 hover:text-green-300"
          >
            <Phone className="w-3 h-3" />
            {appointment.customer.phone}
          </a>
        )}
        {appointment.customer?.address && (
          <p className="flex items-center gap-1.5 text-gray-400 truncate">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            {appointment.customer.address}
            {appointment.customer.city && `, ${appointment.customer.city}`}
          </p>
        )}
      </div>

      {/* Priority badge */}
      {appointment.job?.priority === 'emergency' && (
        <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/30 text-red-400 text-xs font-semibold rounded">
          <AlertCircle className="w-3 h-3" />
          Emergency
        </div>
      )}
    </div>
  );
}

// Technician column in dispatch view
function TechnicianColumn({
  technician,
  appointments,
  onDrop,
  onDragOver,
  isDropTarget,
}: {
  technician: Technician;
  appointments: Appointment[];
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  isDropTarget: boolean;
}) {
  const name = technician.firstName
    ? `${technician.firstName} ${technician.lastName || ''}`.trim()
    : technician.email;

  const activeCount = appointments.filter(
    (a) => !['completed', 'canceled', 'no_show'].includes(a.status)
  ).length;

  return (
    <div
      className={`flex flex-col min-w-[280px] max-w-[320px] ${
        isDropTarget ? 'ring-2 ring-orange-500' : ''
      }`}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      {/* Technician header */}
      <div className="p-3 bg-navy-800 border-b border-white/10 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {technician.avatarUrl ? (
            <img
              src={technician.avatarUrl}
              alt={name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
              <User className="w-5 h-5 text-orange-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white truncate">{name}</p>
            <p className="text-xs text-gray-500">
              {activeCount} active • {appointments.length} total
            </p>
          </div>
        </div>
      </div>

      {/* Appointments list */}
      <div className="flex-1 p-3 space-y-3 bg-navy-900/50 overflow-y-auto min-h-[400px]">
        {appointments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No appointments</p>
          </div>
        ) : (
          appointments
            .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
            .map((apt) => (
              <DispatchAppointmentCard
                key={apt.id}
                appointment={apt}
                onDragStart={(e) => {
                  e.dataTransfer.setData('appointmentId', apt.id);
                  e.dataTransfer.setData('fromTechnicianId', technician.id);
                }}
              />
            ))
        )}
      </div>
    </div>
  );
}

// Unassigned column
function UnassignedColumn({
  appointments,
  onDrop,
  onDragOver,
  isDropTarget,
}: {
  appointments: Appointment[];
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  isDropTarget: boolean;
}) {
  return (
    <div
      className={`flex flex-col min-w-[280px] max-w-[320px] ${
        isDropTarget ? 'ring-2 ring-orange-500' : ''
      }`}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      {/* Header */}
      <div className="p-3 bg-amber-900/30 border-b border-amber-500/30 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-amber-400">Unassigned</p>
            <p className="text-xs text-amber-500/70">
              {appointments.length} need{appointments.length !== 1 ? '' : 's'} assignment
            </p>
          </div>
        </div>
      </div>

      {/* Appointments list */}
      <div className="flex-1 p-3 space-y-3 bg-amber-900/10 overflow-y-auto min-h-[400px]">
        {appointments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">All jobs assigned</p>
          </div>
        ) : (
          appointments
            .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
            .map((apt) => (
              <DispatchAppointmentCard
                key={apt.id}
                appointment={apt}
                onDragStart={(e) => {
                  e.dataTransfer.setData('appointmentId', apt.id);
                  e.dataTransfer.setData('fromTechnicianId', 'unassigned');
                }}
              />
            ))
        )}
      </div>
    </div>
  );
}

// Filter panel
function FilterPanel({
  filters,
  onFilterChange,
}: {
  filters: {
    status: string[];
    showCompleted: boolean;
  };
  onFilterChange: (filters: any) => void;
}) {
  const statuses = [
    { value: 'scheduled', label: 'Scheduled', color: 'blue' },
    { value: 'confirmed', label: 'Confirmed', color: 'green' },
    { value: 'in_progress', label: 'In Progress', color: 'yellow' },
    { value: 'rescheduled', label: 'Rescheduled', color: 'purple' },
  ];

  const toggleStatus = (status: string) => {
    const newStatuses = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status];
    onFilterChange({ ...filters, status: newStatuses });
  };

  return (
    <div className="bg-surface rounded-lg p-4 border border-white/10">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-semibold text-white">Filters</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {statuses.map((status) => (
          <button
            key={status.value}
            onClick={() => toggleStatus(status.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              filters.status.includes(status.value)
                ? `bg-${status.color}-500/30 text-${status.color}-400 border border-${status.color}-500/50`
                : 'bg-navy-800 text-gray-400 border border-white/10 hover:border-white/20'
            }`}
          >
            {status.label}
          </button>
        ))}

        <button
          onClick={() => onFilterChange({ ...filters, showCompleted: !filters.showCompleted })}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
            filters.showCompleted
              ? 'bg-gray-500/30 text-gray-400 border border-gray-500/50'
              : 'bg-navy-800 text-gray-500 border border-white/10 hover:border-white/20'
          }`}
        >
          {filters.showCompleted ? 'Hide' : 'Show'} Completed
        </button>
      </div>
    </div>
  );
}

export default function DispatchPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: ['scheduled', 'confirmed', 'in_progress', 'rescheduled'],
    showCompleted: false,
  });
  const queryClient = useQueryClient();

  const dateStr = format(currentDate, 'yyyy-MM-dd');

  // Fetch team members
  const { data: teamData, isLoading: teamLoading } = useQuery({
    queryKey: ['team'],
    queryFn: () => api.getTeam(),
  });

  // Fetch appointments for the day
  const { data: appointmentsData, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['dispatch', dateStr],
    queryFn: () =>
      api.getAppointments({
        startDate: startOfDay(currentDate).toISOString(),
        endDate: endOfDay(currentDate).toISOString(),
      }),
  });

  // Reassign appointment mutation
  const reassignMutation = useMutation({
    mutationFn: ({ appointmentId, technicianId }: { appointmentId: string; technicianId: string | null }) =>
      api.updateAppointment(appointmentId, { assignedToId: technicianId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatch'] });
      toast.success('Appointment reassigned');
    },
    onError: () => {
      toast.error('Failed to reassign appointment');
    },
  });

  const technicians: Technician[] = teamData?.data?.members?.filter(
    (m: any) => m.role === 'technician' || m.role === 'owner' || m.role === 'admin'
  ) || [];

  const allAppointments: Appointment[] = (appointmentsData?.data || []) as unknown as Appointment[];

  // Filter appointments
  const filteredAppointments = allAppointments.filter((apt) => {
    if (!filters.showCompleted && ['completed', 'canceled', 'no_show'].includes(apt.status)) {
      return false;
    }
    if (filters.status.length > 0 && !filters.status.includes(apt.status)) {
      // Always show completed if showCompleted is true
      if (!filters.showCompleted || !['completed', 'canceled', 'no_show'].includes(apt.status)) {
        return false;
      }
    }
    return true;
  });

  // Group appointments by technician
  const appointmentsByTechnician: Record<string, Appointment[]> = {};
  const unassignedAppointments: Appointment[] = [];

  filteredAppointments.forEach((apt) => {
    if (!apt.assignedToId) {
      unassignedAppointments.push(apt);
    } else {
      if (!appointmentsByTechnician[apt.assignedToId]) {
        appointmentsByTechnician[apt.assignedToId] = [];
      }
      appointmentsByTechnician[apt.assignedToId].push(apt);
    }
  });

  const handleDrop = useCallback(
    (technicianId: string | null) => (e: React.DragEvent) => {
      e.preventDefault();
      setDropTarget(null);

      const appointmentId = e.dataTransfer.getData('appointmentId');
      const fromTechnicianId = e.dataTransfer.getData('fromTechnicianId');

      if (!appointmentId) return;

      // Don't reassign if dropping on same technician
      if (fromTechnicianId === technicianId || (fromTechnicianId === 'unassigned' && !technicianId)) {
        return;
      }

      reassignMutation.mutate({ appointmentId, technicianId });
    },
    [reassignMutation]
  );

  const handleDragOver = useCallback(
    (technicianId: string | null) => (e: React.DragEvent) => {
      e.preventDefault();
      setDropTarget(technicianId || 'unassigned');
    },
    []
  );

  const navigatePrev = () => setCurrentDate(subDays(currentDate, 1));
  const navigateNext = () => setCurrentDate(addDays(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const isLoading = teamLoading || appointmentsLoading;
  const isToday = isSameDay(currentDate, new Date());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-orange-500" />
            Dispatch Board
          </h1>
          <p className="text-gray-500 mt-1">
            Assign and manage technician schedules
          </p>
        </div>

        {/* Date navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={navigatePrev}
            className="p-2.5 hover:bg-surface rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </button>
          <button
            onClick={goToToday}
            disabled={isToday}
            className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors min-h-[44px] ${
              isToday
                ? 'bg-orange-500 text-white'
                : 'bg-surface text-white hover:bg-surface-light'
            }`}
          >
            Today
          </button>
          <button
            onClick={navigateNext}
            className="p-2.5 hover:bg-surface rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          <span className="text-lg font-semibold text-white ml-2">
            {format(currentDate, 'EEEE, MMMM d, yyyy')}
          </span>
        </div>
      </div>

      {/* Filters */}
      <FilterPanel filters={filters} onFilterChange={setFilters} />

      {/* Dispatch board */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      ) : technicians.length === 0 ? (
        <div className="text-center py-20 bg-surface rounded-xl border border-white/10">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <h2 className="text-xl font-semibold text-white mb-2">No Technicians</h2>
          <p className="text-gray-500 mb-4">
            Add team members to start dispatching jobs
          </p>
          <Link
            href="/dashboard/settings/team"
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
          >
            <Users className="w-4 h-4" />
            Manage Team
          </Link>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-white/10 overflow-hidden">
          <div className="flex overflow-x-auto">
            {/* Unassigned column */}
            <UnassignedColumn
              appointments={unassignedAppointments}
              onDrop={handleDrop(null)}
              onDragOver={handleDragOver(null)}
              isDropTarget={dropTarget === 'unassigned'}
            />

            {/* Technician columns */}
            {technicians.map((tech) => (
              <TechnicianColumn
                key={tech.id}
                technician={tech}
                appointments={appointmentsByTechnician[tech.id] || []}
                onDrop={handleDrop(tech.id)}
                onDragOver={handleDragOver(tech.id)}
                isDropTarget={dropTarget === tech.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-surface rounded-xl p-4 border border-white/10">
          <p className="text-sm text-gray-500">Total Today</p>
          <p className="text-2xl font-bold text-white">{allAppointments.length}</p>
        </div>
        <div className="bg-surface rounded-xl p-4 border border-white/10">
          <p className="text-sm text-gray-500">Unassigned</p>
          <p className="text-2xl font-bold text-amber-400">{unassignedAppointments.length}</p>
        </div>
        <div className="bg-surface rounded-xl p-4 border border-white/10">
          <p className="text-sm text-gray-500">In Progress</p>
          <p className="text-2xl font-bold text-yellow-400">
            {allAppointments.filter((a) => a.status === 'in_progress').length}
          </p>
        </div>
        <div className="bg-surface rounded-xl p-4 border border-white/10">
          <p className="text-sm text-gray-500">Completed</p>
          <p className="text-2xl font-bold text-green-400">
            {allAppointments.filter((a) => a.status === 'completed').length}
          </p>
        </div>
      </div>
    </div>
  );
}
