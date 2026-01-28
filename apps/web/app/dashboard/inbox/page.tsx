'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { api } from '../../../lib/api';
import type { Conversation } from '../../../lib/types';
import { EmptyState } from '@/components/ui/empty-state';
import { useWebSocket } from './hooks/useWebSocket';
import {
  ConnectionStatusBanner,
  ConversationList,
  MessageThread,
} from './components';

export default function InboxPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const queryClient = useQueryClient();

  // WebSocket connection for real-time updates
  const wsUrl = typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/ws/inbox`
    : 'ws://localhost:3000/api/ws/inbox';
  const { status: connectionStatus, reconnect } = useWebSocket(wsUrl);

  const { data, isLoading } = useQuery({
    queryKey: ['conversations', statusFilter],
    queryFn: () => api.getConversations({ status: statusFilter || undefined }),
    staleTime: 10 * 1000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.updateConversationStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation', selectedId] });
    },
    onError: (err: Error) => {
      console.error('Failed to update status:', err.message);
    },
  });

  const conversations: Conversation[] = data?.data || [];

  const handleStatusChange = (status: string) => {
    if (selectedId) {
      updateStatusMutation.mutate({ id: selectedId, status });
    }
  };

  const handleSelectConversation = (id: string) => {
    setSelectedId(id);
    setMobileShowThread(true);
  };

  const handleBack = () => {
    setMobileShowThread(false);
  };

  return (
    <div className="space-y-6">
      {/* Connection Status Banner */}
      <ConnectionStatusBanner status={connectionStatus} onReconnect={reconnect} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Inbox</h1>
          <p className="text-gray-500 mt-1">Manage customer conversations</p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
          {['', 'open', 'pending', 'resolved'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap min-h-[44px] ${
                statusFilter === status
                  ? 'bg-orange-500 text-white'
                  : 'bg-surface text-gray-400 hover:bg-surface-light hover:text-white'
              }`}
            >
              {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation list and thread */}
      <div className="bg-surface rounded-xl border border-white/10 overflow-hidden">
        <div className="h-[calc(100vh-220px)] min-h-[500px]">
          {/* Mobile View */}
          <div className="lg:hidden h-full">
            {mobileShowThread && selectedId ? (
              <MessageThread
                conversationId={selectedId}
                onStatusChange={handleStatusChange}
                onBack={handleBack}
                showBackButton={true}
              />
            ) : (
              <div className="h-full overflow-y-auto">
                <ConversationList
                  conversations={conversations}
                  selectedId={selectedId}
                  onSelect={handleSelectConversation}
                  isLoading={isLoading}
                />
              </div>
            )}
          </div>

          {/* Desktop View */}
          <div className="hidden lg:grid lg:grid-cols-3 h-full">
            {/* Conversation list */}
            <div className="border-r border-white/10 overflow-y-auto">
              <ConversationList
                conversations={conversations}
                selectedId={selectedId}
                onSelect={setSelectedId}
                isLoading={isLoading}
              />
            </div>

            {/* Message thread */}
            <div className="col-span-2">
              {selectedId ? (
                <MessageThread
                  conversationId={selectedId}
                  onStatusChange={handleStatusChange}
                  onBack={handleBack}
                  showBackButton={false}
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-navy-900">
                  <EmptyState
                    icon={MessageSquare}
                    title="Select a conversation"
                    description="Choose a conversation from the list to view messages."
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
