'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Star,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2,
  Send
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { api } from '../../../lib/api';

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'
          }`}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: any }) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const queryClient = useQueryClient();

  const replyMutation = useMutation({
    mutationFn: (response: string) => api.replyToReview(review.id, response),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      setShowReplyForm(false);
      setReplyText('');
    },
  });

  const platformColors: Record<string, { bg: string; text: string }> = {
    google: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
    yelp: { bg: 'bg-red-500/20', text: 'text-red-400' },
    facebook: { bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
    internal: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
  };

  const platform = platformColors[review.platform] || platformColors.internal;

  const handleSubmitReply = () => {
    if (replyText.trim()) {
      replyMutation.mutate(replyText.trim());
    }
  };

  return (
    <div className="bg-surface rounded-lg p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-semibold text-orange-500">
              {review.reviewerName?.[0] || '?'}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-white">{review.reviewerName || 'Anonymous'}</p>
              <span className={`px-2 py-0.5 text-xs font-semibold uppercase rounded ${platform.bg} ${platform.text}`}>
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
        <p className="mt-4 text-gray-300">{review.content}</p>
      )}

      {/* Response */}
      {review.response && (
        <div className="mt-4 p-4 bg-navy-800 rounded-lg border-l-4 border-orange-500">
          <p className="text-sm font-semibold text-white mb-1">Your Response</p>
          <p className="text-sm text-gray-300">{review.response}</p>
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
                className="w-full p-3 bg-navy-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 resize-none min-h-[100px]"
                rows={3}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSubmitReply}
                  disabled={!replyText.trim() || replyMutation.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  {replyMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Response
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowReplyForm(false);
                    setReplyText('');
                  }}
                  className="px-4 py-2.5 text-gray-400 hover:bg-navy-800 rounded-lg font-semibold transition-colors min-h-[44px]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowReplyForm(true)}
              className="flex items-center gap-2 text-sm text-orange-500 hover:text-orange-400 font-semibold min-h-[44px]"
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
      <div className="bg-surface rounded-lg p-4 animate-pulse">
        <div className="h-6 bg-navy-700 rounded w-48" />
      </div>
    );
  }

  const connected = status?.data?.connected;

  return (
    <div className="bg-surface rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${connected ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
            {connected ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-gray-500" />
            )}
          </div>
          <div>
            <p className="font-semibold text-white">Google Business Profile</p>
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
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-orange-500 bg-orange-500/20 rounded-lg hover:bg-orange-500/30 disabled:opacity-50 transition-colors min-h-[44px]"
          >
            <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            {syncMutation.isPending ? 'Syncing...' : 'Sync Reviews'}
          </button>
        ) : (
          <Link
            href="/dashboard/settings/integrations"
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors min-h-[44px]"
          >
            <ExternalLink className="w-4 h-4" />
            Connect
          </Link>
        )}
      </div>

      {status?.data?.lastSyncAt && (
        <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-white/10">
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

  const platforms = [
    { value: '', label: 'All' },
    { value: 'google', label: 'Google' },
    { value: 'yelp', label: 'Yelp' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'internal', label: 'Internal' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Reviews</h1>
          <p className="text-gray-500 mt-1">Monitor and respond to customer reviews</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-4xl font-bold text-white">{avgRating}</p>
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
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {platforms.map((platform) => (
          <button
            key={platform.value}
            onClick={() => {
              setPlatformFilter(platform.value);
              setPage(1);
            }}
            className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap min-h-[44px] ${
              platformFilter === platform.value
                ? 'bg-orange-500 text-white'
                : 'bg-surface text-gray-400 hover:bg-surface-light hover:text-white'
            }`}
          >
            {platform.label}
          </button>
        ))}
      </div>

      {/* Reviews list */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-surface rounded-lg p-6 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-navy-700" />
                <div className="flex-1">
                  <div className="h-5 bg-navy-700 rounded w-32 mb-2" />
                  <div className="h-4 bg-navy-700 rounded w-24" />
                </div>
              </div>
              <div className="h-16 bg-navy-700 rounded mt-4" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-surface rounded-lg p-12 text-center">
          <div className="w-16 h-16 rounded-xl bg-navy-800 flex items-center justify-center mx-auto mb-4">
            <Star className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No reviews yet</h3>
          <p className="text-gray-500">
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
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * meta.perPage + 1} to {Math.min(page * meta.perPage, meta.total)} of {meta.total}
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
                  disabled={page >= meta.totalPages}
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
