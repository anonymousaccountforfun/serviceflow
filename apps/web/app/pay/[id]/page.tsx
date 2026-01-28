'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  CreditCard,
  Building2,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText,
  Clock,
} from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
);

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  dueDate: string;
  paidAt: string | null;
  // Deposit workflow fields
  isDeposit: boolean;
  depositRequired: number | null;
  depositPaid: boolean;
  depositPaidAt: string | null;
  customer: {
    name: string;
    email: string;
  };
  business: {
    name: string;
  };
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

function PaymentForm({
  invoice,
  clientSecret,
  onSuccess,
}: {
  invoice: Invoice;
  clientSecret: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/pay/${invoice.id}?status=success`,
      },
    });

    if (submitError) {
      setError(submitError.message || 'Payment failed. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement
        options={{
          layout: 'tabs',
        }}
      />

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full py-3 bg-accent text-white rounded-lg font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            {invoice.isDeposit ? 'Pay Deposit' : 'Pay'} ${(invoice.total / 100).toFixed(2)}
          </>
        )}
      </button>

      <p className="text-xs text-gray-500 text-center">
        Your payment is secure and encrypted. Powered by Stripe.
      </p>
    </form>
  );
}

function InvoiceDetails({ invoice }: { invoice: Invoice }) {
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-surface rounded-xl p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">
            {invoice.isDeposit ? 'Deposit Request' : 'Invoice'}
          </p>
          <p className="text-lg font-semibold text-white">#{invoice.invoiceNumber}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {invoice.isDeposit && (
            <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">
              Deposit
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm">
            <Clock className="w-4 h-4" />
            Due {formatDate(invoice.dueDate)}
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-accent/20 rounded-lg">
            <Building2 className="w-5 h-5 text-accent" />
          </div>
          <div>
            <p className="text-white font-medium">{invoice.business.name}</p>
            <p className="text-sm text-gray-500">Service Provider</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Items</p>
        {invoice.lineItems.map((item, index) => (
          <div key={index} className="flex justify-between text-sm">
            <div>
              <p className="text-white">{item.description}</p>
              <p className="text-gray-500">
                {item.quantity} × {formatCurrency(item.unitPrice)}
              </p>
            </div>
            <p className="text-white">{formatCurrency(item.total)}</p>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-white/10 space-y-2">
        <div className="flex justify-between text-sm">
          <p className="text-gray-500">Subtotal</p>
          <p className="text-white">{formatCurrency(invoice.subtotal)}</p>
        </div>
        {invoice.tax > 0 && (
          <div className="flex justify-between text-sm">
            <p className="text-gray-500">Tax</p>
            <p className="text-white">{formatCurrency(invoice.tax)}</p>
          </div>
        )}
        <div className="flex justify-between text-lg font-semibold pt-2 border-t border-white/10">
          <p className="text-white">
            {invoice.isDeposit ? 'Deposit Due' : 'Total Due'}
          </p>
          <p className="text-accent">{formatCurrency(invoice.total)}</p>
        </div>
      </div>

      {invoice.isDeposit && (
        <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
          <p className="text-purple-300 text-sm">
            This is a deposit payment to secure your service. The remaining balance will be due upon completion.
          </p>
        </div>
      )}
    </div>
  );
}

function PaymentSuccess({ invoice }: { invoice: Invoice }) {
  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
        <CheckCircle className="w-10 h-10 text-green-400" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">
          {invoice.isDeposit ? 'Deposit Received!' : 'Payment Successful!'}
        </h1>
        <p className="text-gray-400">
          {invoice.isDeposit
            ? `Thank you for your deposit. Your service is now confirmed. A receipt has been sent to ${invoice.customer.email}.`
            : `Thank you for your payment. A receipt has been sent to ${invoice.customer.email}.`}
        </p>
      </div>
      <div className="bg-surface rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-accent" />
            <div>
              <p className="text-white font-medium">
                {invoice.isDeposit ? 'Deposit' : 'Invoice'} #{invoice.invoiceNumber}
              </p>
              <p className="text-sm text-gray-500">{invoice.business.name}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white font-semibold">
              ${(invoice.total / 100).toFixed(2)}
            </p>
            <p className="text-sm text-green-400">Paid</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AlreadyPaid({ invoice }: { invoice: Invoice }) {
  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
        <CheckCircle className="w-10 h-10 text-green-400" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Invoice Already Paid</h1>
        <p className="text-gray-400">
          This invoice was paid on {new Date(invoice.paidAt!).toLocaleDateString()}.
        </p>
      </div>
      <div className="bg-surface rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-accent" />
            <div>
              <p className="text-white font-medium">Invoice #{invoice.invoiceNumber}</p>
              <p className="text-sm text-gray-500">{invoice.business.name}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white font-semibold">
              ${(invoice.total / 100).toFixed(2)}
            </p>
            <p className="text-sm text-green-400">Paid</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PayInvoicePage() {
  const params = useParams();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Check for success redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('status') === 'success' || urlParams.get('redirect_status') === 'succeeded') {
      setPaymentSuccess(true);
      // Clean URL
      window.history.replaceState({}, '', `/pay/${invoiceId}`);
    }
  }, [invoiceId]);

  // Fetch invoice details
  useEffect(() => {
    async function fetchInvoice() {
      try {
        const response = await fetch(`/api/payments/invoice/${invoiceId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || 'Invoice not found');
        }

        setInvoice(data.data);

        // If not already paid, get payment intent
        if (data.data.status !== 'paid') {
          const intentResponse = await fetch(`/api/payments/invoice/${invoiceId}/intent`, {
            method: 'POST',
          });
          const intentData = await intentResponse.json();

          if (intentResponse.ok && intentData.data?.clientSecret) {
            setClientSecret(intentData.data.clientSecret);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load invoice');
      } finally {
        setIsLoading(false);
      }
    }

    fetchInvoice();
  }, [invoiceId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-4" />
          <p className="text-gray-400">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Invoice Not Found</h1>
          <p className="text-gray-400">
            {error || 'This invoice may have been deleted or the link is invalid.'}
          </p>
        </div>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <PaymentSuccess invoice={invoice} />
        </div>
      </div>
    );
  }

  if (invoice.status === 'paid') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <AlreadyPaid invoice={invoice} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">
            {invoice.isDeposit ? 'Pay Deposit' : 'Pay Invoice'}
          </h1>
          <p className="text-gray-400">
            {invoice.isDeposit
              ? 'Secure your service with this deposit payment.'
              : 'Complete your payment securely with your credit or debit card.'}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <InvoiceDetails invoice={invoice} />

          <div className="bg-surface rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-accent" />
              Payment Details
            </h2>

            {clientSecret ? (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: 'night',
                    variables: {
                      colorPrimary: '#6366f1',
                      colorBackground: '#1a1a2e',
                      colorText: '#ffffff',
                      colorDanger: '#ef4444',
                      fontFamily: 'system-ui, sans-serif',
                      borderRadius: '8px',
                    },
                  },
                }}
              >
                <PaymentForm
                  invoice={invoice}
                  clientSecret={clientSecret}
                  onSuccess={() => setPaymentSuccess(true)}
                />
              </Elements>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-4" />
                <p className="text-gray-400">
                  Payment processing is not available at this time.
                  Please contact the business directly.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
