'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  MessageSquare,
  Send,
  Phone,
  User,
  Clock,
  CheckCircle,
  Circle,
  Archive
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { api } from '../../../lib/api';

function ConversationList({
  conversations,
  selectedId,
  onSelect,
  isLoading,
}: {
  conversations: any[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-gray-100 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <MessageSquare className="w-12 h-12 mb-2 opacity-50" />
        <p>No conversations yet</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {conversations.map((conv) => {
        const lastMessage = conv.messages?.[0];
        const isSelected = conv.id === selectedId;

        return (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
              isSelected ? 'bg-brand-50 border-l-2 border-brand-600' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900 truncate">
                    {conv.customer?.firstName} {conv.customer?.lastName}
                  </p>
                  <span className="text-xs text-gray-500">
                    {conv.lastMessageAt && formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-gray-500 truncate mt-0.5">
                  {lastMessage?.content || 'No messages'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    conv.status === 'open' ? 'bg-green-100 text-green-700' :
                    conv.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    conv.status === 'resolved' ? 'bg-gray-100 text-gray-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {conv.status}
                  </span>
                  {conv.channel === 'sms' && (
                    <span className="text-xs text-gray-400">SMS</span>
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
}: {
  conversationId: string;
  onStatusChange: (status: string) => void;
}) {
  const [newMessage, setNewMessage] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => api.getConversation(conversationId),
    enabled: !!conversationId,
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) => api.sendMessage(conversationId, content),
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const conversation = data?.data;
  const messages = conversation?.messages || [];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      sendMutation.mutate(newMessage.trim());
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg">Select a conversation</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {conversation.customer?.firstName} {conversation.customer?.lastName}
              </p>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {conversation.customer?.phone}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onStatusChange('resolved')}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100"
            >
              <CheckCircle className="w-4 h-4" />
              Resolve
            </button>
            <button
              onClick={() => onStatusChange('archived')}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <Archive className="w-4 h-4" />
              Archive
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg: any) => {
          const isOutbound = msg.direction === 'outbound';
          return (
            <div
              key={msg.id}
              className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                  isOutbound
                    ? 'bg-brand-600 text-white rounded-br-md'
                    : 'bg-white border border-gray-200 rounded-bl-md'
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <p className={`text-xs mt-1 ${isOutbound ? 'text-brand-200' : 'text-gray-400'}`}>
                  {format(new Date(msg.createdAt), 'h:mm a')}
                  {msg.senderType && (
                    <span className="ml-2 capitalize">({msg.senderType})</span>
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sendMutation.isPending}
            className="p-2 bg-brand-600 text-white rounded-full hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}

export default function InboxPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['conversations', statusFilter],
    queryFn: () => api.getConversations({ status: statusFilter || undefined }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.updateConversationStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation', selectedId] });
    },
  });

  const conversations = data?.data || [];

  const handleStatusChange = (status: string) => {
    if (selectedId) {
      updateStatusMutation.mutate({ id: selectedId, status });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
          <p className="text-gray-500 mt-1">Manage customer conversations</p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          {['', 'open', 'pending', 'resolved'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                statusFilter === status
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation list and thread */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 h-[calc(100vh-250px)] min-h-[500px]">
          {/* Conversation list */}
          <div className="border-r border-gray-200 overflow-y-auto">
            <ConversationList
              conversations={conversations}
              selectedId={selectedId}
              onSelect={setSelectedId}
              isLoading={isLoading}
            />
          </div>

          {/* Message thread */}
          <div className="col-span-2 hidden lg:block">
            {selectedId ? (
              <MessageThread
                conversationId={selectedId}
                onStatusChange={handleStatusChange}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg">Select a conversation to view</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
