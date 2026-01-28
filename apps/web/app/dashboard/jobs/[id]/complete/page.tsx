'use client';

/**
 * Mobile Job Completion Wizard
 *
 * 5-step wizard for completing a job on mobile:
 * 1. Work Summary (parts, duration)
 * 2. Photos (camera integration)
 * 3. Customer Signature
 * 4. Payment (invoice preview, QR code)
 * 5. Review Request
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clipboard,
  Camera,
  PenTool,
  CreditCard,
  Star,
  Loader2,
  AlertCircle,
  X,
  Plus,
  Minus,
  Clock,
  DollarSign,
  Send,
  ExternalLink,
} from 'lucide-react';
import { CameraCapture } from '../../../../../components/ui/camera-capture';
import { SignatureCapture } from '../../../../../components/ui/signature-capture';
import { saveDraft, getDraftByEntity, removeDraft, queueJobUpdate } from '../../../../../lib/offline';
import { useNetworkStatus } from '../../../../../hooks/useNetworkStatus';

// Types
interface Job {
  id: string;
  title: string;
  status: string;
  description: string | null;
  scheduledAt: string | null;
  estimatedValue: number | null;
  actualValue: number | null;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string;
  };
}

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface CompletionData {
  summary: string;
  duration: number; // minutes
  lineItems: LineItem[];
  photos: string[];
  signature: string | null;
  sendInvoice: boolean;
  requestReview: boolean;
}

const STEPS = [
  { id: 'summary', title: 'Work Summary', icon: Clipboard },
  { id: 'photos', title: 'Photos', icon: Camera },
  { id: 'signature', title: 'Signature', icon: PenTool },
  { id: 'payment', title: 'Payment', icon: CreditCard },
  { id: 'review', title: 'Review', icon: Star },
];

export default function JobCompletionWizard() {
  const params = useParams();
  const router = useRouter();
  const { isOnline } = useNetworkStatus();

  const jobId = params.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const [data, setData] = useState<CompletionData>({
    summary: '',
    duration: 60,
    lineItems: [{ description: 'Labor', quantity: 1, unitPrice: 0 }],
    photos: [],
    signature: null,
    sendInvoice: true,
    requestReview: true,
  });

  // Fetch job and restore draft
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        // Try to restore draft
        const draft = await getDraftByEntity('job_completion', jobId);
        if (draft) {
          setData(draft.data as unknown as CompletionData);
        }

        // Fetch job data
        if (isOnline) {
          const res = await fetch(`/api/jobs/${jobId}`);
          if (res.ok) {
            const result = await res.json();
            setJob(result.data);

            // Pre-fill estimated value if available
            if (result.data.estimatedValue && data.lineItems[0].unitPrice === 0) {
              setData((prev) => ({
                ...prev,
                lineItems: [
                  { description: 'Labor', quantity: 1, unitPrice: result.data.estimatedValue },
                ],
              }));
            }
          } else {
            setError('Failed to load job details');
          }
        }
      } catch (err) {
        console.error('Init error:', err);
        setError('Failed to initialize');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [jobId, isOnline]);

  // Auto-save draft
  useEffect(() => {
    const timer = setTimeout(() => {
      saveDraft({
        id: `draft_completion_${jobId}`,
        type: 'job_completion',
        entityId: jobId,
        data: data as unknown as Record<string, unknown>,
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [data, jobId]);

  // Calculate total
  const total = data.lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  // Update handlers
  const updateData = useCallback((updates: Partial<CompletionData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateLineItem = useCallback((index: number, updates: Partial<LineItem>) => {
    setData((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item, i) =>
        i === index ? { ...item, ...updates } : item
      ),
    }));
  }, []);

  const addLineItem = useCallback(() => {
    setData((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, { description: '', quantity: 1, unitPrice: 0 }],
    }));
  }, []);

  const removeLineItem = useCallback((index: number) => {
    setData((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index),
    }));
  }, []);

  // Navigation
  const canGoNext = useCallback(() => {
    switch (STEPS[currentStep].id) {
      case 'summary':
        return data.summary.length > 0 && data.lineItems.length > 0;
      case 'photos':
        return true; // Photos are optional
      case 'signature':
        return true; // Signature is optional but recommended
      case 'payment':
        return true;
      case 'review':
        return true;
      default:
        return true;
    }
  }, [currentStep, data]);

  const goNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep]);

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    } else {
      router.back();
    }
  }, [currentStep, router]);

  // Submit completion
  const submit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const completionPayload = {
        summary: data.summary,
        duration: data.duration,
        lineItems: data.lineItems,
        photos: data.photos,
        signature: data.signature,
        actualValue: total,
        collectNow: data.sendInvoice,
        requestReview: data.requestReview,
      };

      if (isOnline) {
        const res = await fetch(`/api/jobs/${jobId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(completionPayload),
        });

        if (!res.ok) {
          throw new Error('Failed to complete job');
        }
      } else {
        // Queue for offline sync
        await queueJobUpdate(jobId, {
          status: 'completed',
          ...completionPayload,
        });
      }

      // Clear draft
      await removeDraft(`draft_completion_${jobId}`);

      // Navigate to job detail
      router.push(`/dashboard/jobs/${jobId}?completed=true`);
    } catch (err) {
      console.error('Submit error:', err);
      setError('Failed to complete job. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [data, total, jobId, isOnline, router, submitting]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={goBack}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Complete Job</h1>
          <p className="text-gray-400 text-sm">
            {job?.customer.firstName} {job?.customer.lastName}
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-6">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;

          return (
            <div
              key={step.id}
              className={`flex flex-col items-center ${
                index < STEPS.length - 1 ? 'flex-1' : ''
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : isCompleted
                    ? 'bg-green-600 text-white'
                    : 'bg-navy-700 text-gray-400'
                }`}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>
              <span
                className={`mt-1 text-xs ${
                  isActive ? 'text-white' : 'text-gray-500'
                }`}
              >
                {step.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-navy-800 rounded-xl p-6 mb-6">
        {/* Step 1: Work Summary */}
        {STEPS[currentStep].id === 'summary' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Work Summary
              </label>
              <textarea
                value={data.summary}
                onChange={(e) => updateData({ summary: e.target.value })}
                placeholder="Describe the work performed..."
                rows={3}
                className="w-full px-4 py-3 bg-navy-900 border border-navy-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Time Spent
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() =>
                    updateData({ duration: Math.max(15, data.duration - 15) })
                  }
                  className="p-2 bg-navy-700 rounded-lg hover:bg-navy-600"
                >
                  <Minus className="w-5 h-5 text-white" />
                </button>
                <div className="flex items-center gap-2 text-white">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <span className="text-xl font-semibold">
                    {Math.floor(data.duration / 60)}h {data.duration % 60}m
                  </span>
                </div>
                <button
                  onClick={() => updateData({ duration: data.duration + 15 })}
                  className="p-2 bg-navy-700 rounded-lg hover:bg-navy-600"
                >
                  <Plus className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-300">
                  Line Items
                </label>
                <button
                  onClick={addLineItem}
                  className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>
              <div className="space-y-3">
                {data.lineItems.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) =>
                        updateLineItem(index, { description: e.target.value })
                      }
                      placeholder="Description"
                      className="flex-1 px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500"
                    />
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        updateLineItem(index, { quantity: parseInt(e.target.value) || 1 })
                      }
                      min={1}
                      className="w-16 px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm text-center focus:outline-none focus:border-blue-500"
                    />
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateLineItem(index, { unitPrice: parseFloat(e.target.value) || 0 })
                        }
                        placeholder="0"
                        className="w-24 pl-8 pr-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    {data.lineItems.length > 1 && (
                      <button
                        onClick={() => removeLineItem(index)}
                        className="p-2 text-gray-400 hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-navy-600 flex items-center justify-between">
                <span className="text-gray-400">Total</span>
                <span className="text-xl font-bold text-white">
                  ${total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Photos */}
        {STEPS[currentStep].id === 'photos' && (
          <div>
            <p className="text-gray-400 text-sm mb-4">
              Take photos to document the completed work.
            </p>
            <CameraCapture
              onCapture={(photos) => updateData({ photos })}
              existingPhotos={data.photos}
              maxPhotos={5}
            />
          </div>
        )}

        {/* Step 3: Signature */}
        {STEPS[currentStep].id === 'signature' && (
          <div>
            <p className="text-gray-400 text-sm mb-4">
              Get the customer&apos;s signature to confirm work completion.
            </p>
            <SignatureCapture
              onCapture={(signature) => updateData({ signature })}
              existingSignature={data.signature}
            />
          </div>
        )}

        {/* Step 4: Payment */}
        {STEPS[currentStep].id === 'payment' && (
          <div className="space-y-6">
            <div className="bg-navy-900 rounded-lg p-4">
              <h3 className="font-medium text-white mb-3">Invoice Summary</h3>
              <div className="space-y-2 text-sm">
                {data.lineItems.map((item, index) => (
                  <div key={index} className="flex justify-between text-gray-300">
                    <span>
                      {item.description} x{item.quantity}
                    </span>
                    <span>${(item.quantity * item.unitPrice).toFixed(2)}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-navy-600 flex justify-between font-semibold text-white">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <label className="flex items-center gap-3 p-4 bg-navy-900 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={data.sendInvoice}
                onChange={(e) => updateData({ sendInvoice: e.target.checked })}
                className="w-5 h-5 rounded border-navy-600 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-white font-medium">Send Invoice Now</span>
                <p className="text-gray-400 text-sm">
                  Customer will receive invoice via SMS with payment link
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Step 5: Review */}
        {STEPS[currentStep].id === 'review' && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 mb-4">
                <Star className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-lg font-semibold text-white">Request a Review</h3>
              <p className="text-gray-400 text-sm mt-1">
                Reviews help grow your business and build trust.
              </p>
            </div>

            <label className="flex items-center gap-3 p-4 bg-navy-900 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={data.requestReview}
                onChange={(e) => updateData({ requestReview: e.target.checked })}
                className="w-5 h-5 rounded border-navy-600 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-white font-medium">Request Review</span>
                <p className="text-gray-400 text-sm">
                  Send a review request to {job?.customer.firstName} via SMS
                </p>
              </div>
            </label>

            {/* Summary */}
            <div className="bg-navy-900 rounded-lg p-4">
              <h3 className="font-medium text-white mb-3">Completion Summary</h3>
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex justify-between">
                  <span>Work Duration</span>
                  <span>
                    {Math.floor(data.duration / 60)}h {data.duration % 60}m
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Photos</span>
                  <span>{data.photos.length} uploaded</span>
                </div>
                <div className="flex justify-between">
                  <span>Signature</span>
                  <span>{data.signature ? 'Captured' : 'Not captured'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Invoice Total</span>
                  <span className="font-semibold text-white">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-navy-950 border-t border-navy-800">
        <div className="max-w-lg mx-auto flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={goBack}
              className="px-6 py-3 border border-navy-600 rounded-lg text-white hover:bg-navy-800 transition-colors"
            >
              Back
            </button>
          )}

          {currentStep < STEPS.length - 1 ? (
            <button
              onClick={goNext}
              disabled={!canGoNext()}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Complete Job
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
