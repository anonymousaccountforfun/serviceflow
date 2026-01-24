'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Star,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { api } from '../../../lib/api';

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: any }) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');

  const platformColors: Record<string, { bg: string; text: string }> = {
    google: { bg: 'bg-blue-100', text: 'text-blue-700' },
    yelp: { bg: 'bg-red-100', text: 'text-red-700' },
    facebook: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
    internal: { bg: 'bg-gray-100', text: 'text-gray-700' },
  };

  const platform = platformColors[review.platform] || platformColors.internal;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-semibold text-gray-600">
              {review.reviewerName?.[0] || '?'}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900">{review.reviewerName || 'Anonymous'}</p>
              <span className={`px-2 py-0.5 text-xs font-medium rounded ${platform.bg} ${platform.text}`}>
                {review.platform}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <StarRating rating={review.rating} />
              <span className="text-sm text-gray-500">
                {format(new Date(review.createdAt), 'MMM d, yyyy')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {review.content && (
        <p className="mt-4 text-gray-700">{review.content}</p>
      )}

      {/* Response */}
      {review.response && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border-l-4 border-brand-500">
          <p className="text-sm font-medium text-gray-900 mb-1">Your Response</p>
          <p className="text-sm text-gray-700">{review.response}</p>
          {review.respondedAt && (
            <p className="text-xs text-gray-500 mt-2">
              Responded {format(new Date(review.respondedAt), 'MMM d, yyyy')}
            </p>
          )}
        </div>
      )}

      {/* Reply form */}
      {!review.response && (
        <div className="mt-4">
          {showReplyForm ? (
            <div className="space-y-3">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write your response..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                rows={3}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    // TODO: Implement reply mutation
                    setShowReplyForm(false);
                    setReplyText('');
                  }}
                  className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium"
                >
                  Send Response
                </button>
                <button
                  onClick={() => {
                    setShowReplyForm(false);
                    setReplyText('');
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowReplyForm(true)}
              className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              <MessageSquare className="w-4 h-4" />
              Write a response
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function GoogleConnectionStatus() {
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery({
    queryKey: ['google', 'status'],
    queryFn: () => api.getGoogleStatus(),
  });

  const syncMutation = useMutation({
    mutationFn: () => api.syncGoogleReviews(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['google', 'status'] });
    },
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-48" />
      </div>
    );
  }

  const connected = status?.data?.connected;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${connected ? 'bg-green-100' : 'bg-gray-100'}`}>
            {connected ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900">Google Business Profile</p>
            <p className="text-sm text-gray-500">
              {connected
                ? `Connected to ${status?.data?.locationName || 'your business'}`
                : 'Not connected'}
            </p>
          </div>
        </div>

        {connected ? (
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-600 bg-brand-50 rounded-lg hover:bg-brand-100 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            {syncMutation.isPending ? 'Syncing...' : 'Sync Reviews'}
          </button>
        ) : (
          <a
            href="/dashboard/settings/integrations"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700"
          >
            <ExternalLink className="w-4 h-4" />
            Connect
          </a>
        )}
      </div>

      {status?.data?.lastSyncAt && (
        <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
          Last synced: {format(new Date(status.data.lastSyncAt), 'MMM d, yyyy h:mm a')}
        </p>
      )}
    </div>
  );
}

export default function ReviewsPage() {
  const [platformFilter, setPlatformFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['reviews', platformFilter, page],
    queryFn: () => api.getReviews({ platform: platformFilter || undefined, page }),
  });

  const reviews = data?.data || [];
  const meta = data?.meta;

  // Calculate average rating
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const platforms = ['', 'google', 'yelp', 'facebook', 'internal'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
          <p className="text-gray-500 mt-1">Monitor and respond to customer reviews</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-900">{avgRating}</p>
            <div className="flex items-center gap-1 justify-end">
              <StarRating rating={Math.round(parseFloat(avgRating))} />
              <span className="text-sm text-gray-500">({reviews.length})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Google Connection Status */}
      <GoogleConnectionStatus />

      {/* Filters */}
      <div className="flex items-center gap-2">
        {platforms.map((platform) => (
          <button
            key={platform}
            onClick={() => {
              setPlatformFilter(platform);
              setPage(1);
            }}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors capitalize ${
              platformFilter === platform
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {platform || 'All'}
          </button>
        ))}
      </div>

      {/* Reviews list */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-200" />
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 rounded w-32 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-24" />
                </div>
              </div>
              <div className="h-16 bg-gray-200 rounded mt-4" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No reviews yet</h3>
          <p className="text-gray-500 mt-1">
            Connect your Google Business Profile to sync reviews
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {reviews.map((review: any) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * meta.perPage + 1} to {Math.min(page * meta.perPage, meta.total)} of {meta.total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= meta.totalPages}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
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
