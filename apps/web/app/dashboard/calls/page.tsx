'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Play,
  Clock,
  Bot,
  FileText,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

// Call type from shared types
interface Call {
  id: string;
  conversationId: string;
  organizationId: string;
  customerId?: string;
  direction: 'inbound' | 'outbound';
  status: 'ringing' | 'in_progress' | 'completed' | 'busy' | 'no_answer' | 'failed' | 'voicemail';
  from: string;
  to: string;
  duration?: number;
  recordingUrl?: string;
  transcriptUrl?: string;
  transcript?: string;
  summary?: string;
  aiHandled: boolean;
  twilioSid: string;
  vapiCallId?: string;
  startedAt: string;
  endedAt?: string;
  createdAt: string;
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

function CallStatusBadge({ status }: { status: Call['status'] }) {
  const statusConfig: Record<Call['status'], { bg: string; text: string; label: string }> = {
    ringing: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Ringing' },
    in_progress: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'In Progress' },
    completed: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Completed' },
    busy: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Busy' },
    no_answer: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'No Answer' },
    failed: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Failed' },
    voicemail: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Voicemail' },
  };

  const config = statusConfig[status] || statusConfig.completed;

  return (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

function CallDirectionIcon({ direction, status }: { direction: Call['direction']; status: Call['status'] }) {
  const isMissed = status === 'no_answer' || status === 'busy' || status === 'failed';

  if (isMissed) {
    return (
      <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
        <PhoneMissed className="w-5 h-5 text-red-500" />
      </div>
    );
  }

  if (direction === 'inbound') {
    return (
      <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
        <PhoneIncoming className="w-5 h-5 text-green-500" />
      </div>
    );
  }

  return (
    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
      <PhoneOutgoing className="w-5 h-5 text-blue-500" />
    </div>
  );
}

function CallCard({ call }: { call: Call }) {
  const [showTranscript, setShowTranscript] = useState(false);

  const callerName = call.customer
    ? `${call.customer.firstName} ${call.customer.lastName}`
    : formatPhoneNumber(call.direction === 'inbound' ? call.from : call.to);

  const phoneNumber = call.direction === 'inbound' ? call.from : call.to;

  return (
    <div className="bg-surface rounded-lg p-4 hover:bg-surface-light transition-colors">
      <div className="flex items-start gap-4">
        <CallDirectionIcon direction={call.direction} status={call.status} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {call.customer ? (
              <Link
                href={`/dashboard/customers/${call.customer.id}`}
                className="font-semibold text-white hover:text-orange-500 transition-colors"
              >
                {callerName}
              </Link>
            ) : (
              <span className="font-semibold text-white">{callerName}</span>
            )}
            <CallStatusBadge status={call.status} />
            {call.aiHandled && (
              <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded bg-accent/20 text-accent">
                <Bot className="w-3 h-3" />
                AI
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" />
              {formatPhoneNumber(phoneNumber)}
            </span>
            {call.duration && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatDuration(call.duration)}
              </span>
            )}
            <span>{formatDistanceToNow(new Date(call.createdAt), { addSuffix: true })}</span>
          </div>

          {call.summary && (
            <p className="mt-2 text-sm text-gray-400 line-clamp-2">{call.summary}</p>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-3">
            {call.recordingUrl && (
              <a
                href={call.recordingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-navy-800 rounded-lg hover:bg-navy-700 transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                Play Recording
              </a>
            )}
            {call.transcript && (
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-navy-800 rounded-lg hover:bg-navy-700 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                {showTranscript ? 'Hide Transcript' : 'View Transcript'}
              </button>
            )}
          </div>
        </div>

        <div className="text-right text-sm text-gray-500 flex-shrink-0 hidden sm:block">
          <p>{format(new Date(call.createdAt), 'MMM d, yyyy')}</p>
          <p>{format(new Date(call.createdAt), 'h:mm a')}</p>
        </div>
      </div>

      {/* Transcript panel */}
      {showTranscript && call.transcript && (
        <div className="mt-4 p-4 bg-navy-800 rounded-lg border-l-4 border-accent">
          <p className="text-sm font-semibold text-white mb-2">Call Transcript</p>
          <p className="text-sm text-gray-300 whitespace-pre-wrap">{call.transcript}</p>
        </div>
      )}
    </div>
  );
}

function CallsListSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-surface rounded-lg p-4">
          <div className="flex items-start gap-4">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-20 rounded" />
              </div>
              <div className="flex items-center gap-4 mt-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="hidden sm:block">
              <Skeleton className="h-4 w-20 mb-1" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CallsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['calls', statusFilter, page],
    queryFn: () => api.getCalls({ status: statusFilter || undefined, page }),
    staleTime: 30 * 1000,
  });

  const calls: Call[] = data?.data || [];
  const meta = data?.meta;

  const statusFilters = [
    { value: '', label: 'All Calls' },
    { value: 'completed', label: 'Answered' },
    { value: 'no_answer', label: 'Missed' },
    { value: 'voicemail', label: 'Voicemail' },
  ];

  // Calculate stats
  const answeredCount = calls.filter(c => c.status === 'completed').length;
  const missedCount = calls.filter(c => ['no_answer', 'busy', 'failed'].includes(c.status)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Call History</h1>
          <p className="text-gray-500 mt-1">View and manage incoming and outgoing calls</p>
        </div>

        {!isLoading && calls.length > 0 && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <PhoneIncoming className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-white">{answeredCount}</p>
                <p className="text-xs text-gray-500">Answered</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <PhoneMissed className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-white">{missedCount}</p>
                <p className="text-xs text-gray-500">Missed</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {statusFilters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => {
              setStatusFilter(filter.value);
              setPage(1);
            }}
            className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap min-h-[44px] ${
              statusFilter === filter.value
                ? 'bg-orange-500 text-white'
                : 'bg-surface text-gray-400 hover:bg-surface-light hover:text-white'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Calls list */}
      {isLoading ? (
        <CallsListSkeleton />
      ) : calls.length === 0 ? (
        <EmptyState
          icon={Phone}
          title="No calls yet"
          description="Calls will appear here when your AI receptionist answers. Make sure your phone number is set up."
          action={{ label: 'Set Up Phone', href: '/dashboard/settings/phone' }}
        />
      ) : (
        <>
          <div className="space-y-3">
            {calls.map((call) => (
              <CallCard key={call.id} call={call} />
            ))}
          </div>

          {/* Pagination */}
          {meta && (meta.totalPages ?? 1) > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * (meta.perPage ?? 20) + 1} to{' '}
                {Math.min(page * (meta.perPage ?? 20), meta.total ?? 0)} of {meta.total ?? 0}
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
    </div>
  );
}
