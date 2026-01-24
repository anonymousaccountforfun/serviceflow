'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Phone,
  PhoneIncoming,
  PhoneMissed,
  Bot,
  DollarSign,
  Users,
  Briefcase,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { api } from '../../lib/api';

function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  href,
}: {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: any;
  href?: string;
}) {
  const content = (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {change >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span className={`text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {change >= 0 ? '+' : ''}{change}%
              </span>
              {changeLabel && (
                <span className="text-sm text-gray-500">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
        <div className="p-3 bg-brand-50 rounded-lg">
          <Icon className="w-6 h-6 text-brand-600" />
        </div>
      </div>
      {href && (
        <Link href={href} className="flex items-center gap-1 text-sm text-brand-600 mt-4 font-medium hover:underline">
          View details <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );

  return href ? content : content;
}

function RecentActivity({ title, items, emptyMessage }: {
  title: string;
  items: any[];
  emptyMessage: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      {items.length === 0 ? (
        <p className="text-gray-500 text-sm">{emptyMessage}</p>
      ) : (
        <div className="space-y-3">
          {items.slice(0, 5).map((item, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
              <div className="w-2 h-2 rounded-full bg-brand-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{item.title || item.name}</p>
                <p className="text-xs text-gray-500">{item.subtitle || item.time}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => api.getAnalyticsOverview(),
  });

  const { data: jobsData } = useQuery({
    queryKey: ['jobs', 'recent'],
    queryFn: () => api.getJobs({ page: 1 }),
  });

  const { data: conversationsData } = useQuery({
    queryKey: ['conversations', 'recent'],
    queryFn: () => api.getConversations({ page: 1 }),
  });

  const stats = overview?.data || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
              <div className="h-8 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Calls"
            value={stats.calls?.total || 0}
            change={stats.calls?.changePercent}
            changeLabel="vs last period"
            icon={Phone}
          />
          <StatCard
            title="AI Handled"
            value={stats.calls?.aiHandled || 0}
            icon={Bot}
          />
          <StatCard
            title="Revenue"
            value={stats.revenue?.formatted || '$0'}
            change={stats.revenue?.changePercent}
            changeLabel="vs last period"
            icon={DollarSign}
            href="/dashboard/jobs"
          />
          <StatCard
            title="New Customers"
            value={stats.customers?.new || 0}
            change={stats.customers?.changePercent}
            changeLabel="vs last period"
            icon={Users}
            href="/dashboard/customers"
          />
        </div>
      )}

      {/* Call Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <PhoneIncoming className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.calls?.answered || 0}</p>
              <p className="text-sm text-gray-500">Answered Calls</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <PhoneMissed className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.calls?.missed || 0}</p>
              <p className="text-sm text-gray-500">Missed Calls</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-100 rounded-lg">
              <MessageSquare className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.conversations?.total || 0}</p>
              <p className="text-sm text-gray-500">Conversations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity
          title="Recent Jobs"
          items={(jobsData?.data || []).map((job: any) => ({
            title: job.title,
            subtitle: `${job.customer?.firstName} ${job.customer?.lastName} - ${job.status}`,
          }))}
          emptyMessage="No recent jobs"
        />
        <RecentActivity
          title="Recent Conversations"
          items={(conversationsData?.data || []).map((conv: any) => ({
            title: `${conv.customer?.firstName} ${conv.customer?.lastName}`,
            subtitle: conv.messages?.[0]?.content?.slice(0, 50) || 'No messages',
          }))}
          emptyMessage="No recent conversations"
        />
      </div>
    </div>
  );
}
