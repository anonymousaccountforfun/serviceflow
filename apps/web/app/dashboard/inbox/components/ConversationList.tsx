'use client';

import { formatDistanceToNow } from 'date-fns';
import { Inbox } from 'lucide-react';
import type { Conversation } from '../../../../lib/types';
import { SkeletonAvatar, Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  isLoading,
}: ConversationListProps) {
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
