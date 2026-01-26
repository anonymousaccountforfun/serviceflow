'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { Conversation, Message } from '../../../lib/types';
import {
  MessageSquare,
  Send,
  Phone,
  User,
  CheckCircle,
  Archive,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { api } from '../../../lib/api';
import { SkeletonRow, SkeletonText, SkeletonAvatar, Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Inbox } from 'lucide-react';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

function useWebSocket(url: string) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const wasConnectedRef = useRef(false);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setStatus('connecting');

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setStatus('connected');
        reconnectAttemptsRef.current = 0;
        if (wasConnectedRef.current) {
          toast.success('Reconnected');
        }
        wasConnectedRef.current = true;
      };

      ws.onclose = () => {
        setStatus('disconnected');
        wsRef.current = null;

        if (wasConnectedRef.current) {
          toast.error('Connection lost. Trying to reconnect...');
        }

        // Auto-reconnect with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      ws.onerror = () => {
        // Error handling is done in onclose
      };

      wsRef.current = ws;
    } catch {
      setStatus('disconnected');
    }
  }, [url]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    disconnect();
    connect();
  }, [connect, disconnect]);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return { status, reconnect };
}

function ConnectionStatusBanner({ status, onReconnect }: { status: ConnectionStatus; onReconnect: () => void }) {
  const statusConfig = {
    connected: {
      dotColor: 'bg-green-500',
      text: 'Connected',
      textColor: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
      icon: Wifi,
    },
    disconnected: {
      dotColor: 'bg-red-500',
      text: 'Disconnected',
      textColor: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
      icon: WifiOff,
    },
    connecting: {
      dotColor: 'bg-yellow-500',
      text: 'Connecting...',
      textColor: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20',
      icon: Wifi,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={`flex items-center justify-between px-4 py-2 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
      <div className="flex items-center gap-2">
        <span className={`relative flex h-2.5 w-2.5`}>
          <span className={`${status === 'connecting' ? 'animate-ping' : ''} absolute inline-flex h-full w-full rounded-full ${config.dotColor} opacity-75`}></span>
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${config.dotColor}`}></span>
        </span>
        <Icon className={`w-4 h-4 ${config.textColor}`} />
        <span className={`text-sm font-medium ${config.textColor}`}>{config.text}</span>
      </div>
      {status === 'disconnected' && (
        <button
          onClick={onReconnect}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reconnect
        </button>
      )}
    </div>
  );
}

function ConversationList({
  conversations,
  selectedId,
  onSelect,
  isLoading,
}: {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-4">
            <div className="flex items-start gap-3">
              <SkeletonAvatar size="md" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-3 w-3/4" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-3 w-8" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <EmptyState
          icon={Inbox}
          title="No messages yet"
          description="Customer texts and messages will appear here."
        />
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/5">
      {conversations.map((conv) => {
        const lastMessage = conv.messages?.[0];
        const isSelected = conv.id === selectedId;

        return (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`w-full p-4 text-left hover:bg-surface-light transition-colors min-h-[80px] ${
              isSelected ? 'bg-surface-light border-l-2 border-orange-500' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-orange-500">
                  {conv.customer?.firstName?.[0]}{conv.customer?.lastName?.[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-white truncate">
                    {conv.customer?.firstName} {conv.customer?.lastName}
                  </p>
                  <span className="text-xs text-gray-500">
                    {conv.lastMessageAt && formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-gray-400 truncate mt-0.5">
                  {lastMessage?.content || 'No messages'}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    conv.status === 'open' ? 'bg-green-500/20 text-green-400' :
                    conv.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    conv.status === 'resolved' ? 'bg-gray-500/20 text-gray-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {conv.status}
                  </span>
                  {conv.channel === 'sms' && (
                    <span className="text-xs text-gray-500">SMS</span>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function MessageThread({
  conversationId,
  onStatusChange,
  onBack,
  showBackButton,
}: {
  conversationId: string;
  onStatusChange: (status: string) => void;
  onBack: () => void;
  showBackButton: boolean;
}) {
  const [newMessage, setNewMessage] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => api.getConversation(conversationId),
    enabled: !!conversationId,
    // Cache for 5 seconds - active conversations should be fresh
    staleTime: 5 * 1000,
  });

  const [sendError, setSendError] = useState<string | null>(null);

  const sendMutation = useMutation({
    mutationFn: (content: string) => api.sendMessage(conversationId, content),
    onSuccess: () => {
      setSendError(null);
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (err: Error) => {
      setSendError(err.message || 'Failed to send message');
    },
  });

  const conversation = data?.data as Conversation | undefined;
  const messages: Message[] = conversation?.messages || [];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      sendMutation.mutate(newMessage.trim());
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-navy-900">
        {/* Skeleton Header */}
        <div className="p-4 border-b border-white/10 bg-surface">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {showBackButton && (
                <Skeleton className="h-11 w-11 rounded-lg" />
              )}
              <SkeletonAvatar size="md" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-11 w-24 rounded-lg" />
              <Skeleton className="h-11 w-24 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Skeleton Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Inbound message skeleton */}
          <div className="flex justify-start">
            <div className="max-w-[70%] rounded-2xl rounded-bl-md bg-surface px-4 py-3">
              <SkeletonText lines={2} lastLineWidth="80%" gap="gap-2" />
              <Skeleton className="h-3 w-16 mt-2" />
            </div>
          </div>
          {/* Outbound message skeleton */}
          <div className="flex justify-end">
            <div className="max-w-[70%] rounded-2xl rounded-br-md bg-navy-700 px-4 py-3">
              <SkeletonText lines={1} lastLineWidth="100%" gap="gap-2" />
              <Skeleton className="h-3 w-16 mt-2" />
            </div>
          </div>
          {/* Inbound message skeleton */}
          <div className="flex justify-start">
            <div className="max-w-[70%] rounded-2xl rounded-bl-md bg-surface px-4 py-3">
              <SkeletonText lines={3} lastLineWidth="60%" gap="gap-2" />
              <Skeleton className="h-3 w-16 mt-2" />
            </div>
          </div>
          {/* Outbound message skeleton */}
          <div className="flex justify-end">
            <div className="max-w-[70%] rounded-2xl rounded-br-md bg-navy-700 px-4 py-3">
              <SkeletonText lines={2} lastLineWidth="70%" gap="gap-2" />
              <Skeleton className="h-3 w-16 mt-2" />
            </div>
          </div>
        </div>

        {/* Skeleton Input */}
        <div className="p-4 border-t border-white/10 bg-surface">
          <div className="flex items-center gap-3">
            <Skeleton className="flex-1 h-12 rounded-full" />
            <Skeleton className="h-12 w-12 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full bg-navy-900">
        <EmptyState
          icon={MessageSquare}
          title="Select a conversation"
          description="Choose a conversation from the list to view messages."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-navy-900">
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-surface">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {showBackButton && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-navy-800 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
            )}
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
              <span className="text-sm font-semibold text-orange-500">
                {conversation.customer?.firstName?.[0]}{conversation.customer?.lastName?.[0]}
              </span>
            </div>
            <div>
              <p className="font-semibold text-white">
                {conversation.customer?.firstName} {conversation.customer?.lastName}
              </p>
              {conversation.customer?.phone && (
                <a
                  href={`tel:${conversation.customer.phone}`}
                  className="text-sm text-orange-500 flex items-center gap-1 hover:text-orange-400"
                >
                  <Phone className="w-3 h-3" />
                  {conversation.customer.phone}
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onStatusChange('resolved')}
              className="flex items-center gap-1 px-3 py-2 text-sm font-semibold text-green-400 bg-green-500/20 rounded-lg hover:bg-green-500/30 transition-colors min-h-[44px]"
            >
              <CheckCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Resolve</span>
            </button>
            <button
              onClick={() => onStatusChange('archived')}
              className="flex items-center gap-1 px-3 py-2 text-sm font-semibold text-gray-400 bg-navy-800 rounded-lg hover:bg-navy-700 transition-colors min-h-[44px]"
            >
              <Archive className="w-4 h-4" />
              <span className="hidden sm:inline">Archive</span>
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="w-14 h-14 rounded-xl bg-navy-800 flex items-center justify-center mb-4">
              <MessageSquare className="w-7 h-7 text-gray-500" />
            </div>
            <h4 className="text-base font-semibold text-white mb-1">Start the conversation</h4>
            <p className="text-sm text-gray-500">Send the first message to this customer.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOutbound = msg.direction === 'outbound';
            return (
              <div
                key={msg.id}
                className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-3 ${
                    isOutbound
                      ? 'bg-orange-500 text-white rounded-br-md'
                      : 'bg-surface text-white rounded-bl-md'
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <p className={`text-xs mt-1.5 ${isOutbound ? 'text-orange-200' : 'text-gray-500'}`}>
                    {format(new Date(msg.createdAt), 'h:mm a')}
                    {msg.senderType && (
                      <span className="ml-2 capitalize">({msg.senderType})</span>
                    )}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-white/10 bg-surface">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 bg-navy-800 border border-white/10 text-white placeholder-gray-500 rounded-full focus:outline-none focus:border-orange-500 min-h-[48px]"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sendMutation.isPending}
            className="p-3 bg-orange-500 text-white rounded-full hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
          >
            {sendMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

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
    // Cache for 10 seconds - conversations update frequently
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
