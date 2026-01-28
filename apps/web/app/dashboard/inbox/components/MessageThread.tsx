'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  MessageSquare,
  Send,
  Phone,
  CheckCircle,
  Archive,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { api } from '../../../../lib/api';
import type { Conversation, Message } from '../../../../lib/types';
import { SkeletonAvatar, SkeletonText, Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

interface MessageThreadProps {
  conversationId: string;
  onStatusChange: (status: string) => void;
  onBack: () => void;
  showBackButton: boolean;
}

export function MessageThread({
  conversationId,
  onStatusChange,
  onBack,
  showBackButton,
}: MessageThreadProps) {
  const [newMessage, setNewMessage] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => api.getConversation(conversationId),
    enabled: !!conversationId,
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
