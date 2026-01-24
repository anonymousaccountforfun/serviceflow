import Link from 'next/link';
import { Phone, MessageSquare, Star, TrendingUp, Clock, Shield } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-brand-600">ServiceFlow</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/sign-in"
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Never Miss a Call.
              <br />
              <span className="text-brand-600">Never Lose a Lead.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
              ServiceFlow captures, converts, and retains customers while you focus on
              what you do best—plumbing. AI-powered automation handles your phones,
              reviews, and follow-ups 24/7.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                href="/sign-up"
                className="rounded-lg bg-brand-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-brand-700"
              >
                Start Free Trial
              </Link>
              <Link
                href="#demo"
                className="rounded-lg border border-gray-300 px-6 py-3 text-base font-semibold text-gray-700 hover:bg-gray-50"
              >
                Watch Demo
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              Everything You Need to Grow
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              One platform to handle calls, reviews, estimates, and more.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Phone className="h-6 w-6" />}
              title="AI Phone Answering"
              description="Never miss a call again. Our AI answers 24/7, qualifies leads, and books appointments while you're on the job."
            />
            <FeatureCard
              icon={<MessageSquare className="h-6 w-6" />}
              title="Missed Call Text-Back"
              description="Instant text to every missed call. Recover leads that would have called your competitor."
            />
            <FeatureCard
              icon={<Star className="h-6 w-6" />}
              title="Review Automation"
              description="Automatically request reviews after every job. Build your reputation while you sleep."
            />
            <FeatureCard
              icon={<TrendingUp className="h-6 w-6" />}
              title="Estimate Follow-up"
              description="Stop losing jobs to 'I'll think about it.' Automated sequences close more estimates."
            />
            <FeatureCard
              icon={<Clock className="h-6 w-6" />}
              title="Smart Scheduling"
              description="Customers book online. You get notified. Reminders go out automatically."
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              title="Payment Processing"
              description="Send invoices via text. Get paid same-day with card, ACH, or Apple Pay."
            />
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              Trusted by Plumbers in Nassau County
            </h2>
            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              <StatCard value="47%" label="More Calls Answered" />
              <StatCard value="3.2x" label="More Google Reviews" />
              <StatCard value="28%" label="Higher Close Rate" />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Simple Pricing</h2>
            <p className="mt-4 text-lg text-gray-600">
              Start small, scale as you grow. No hidden fees.
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            <PricingCard
              name="Starter"
              price="$149"
              description="For solo operators"
              features={[
                'Missed call text-back',
                'Review request automation',
                'GBP optimization',
                '500 SMS/month',
                '1 phone number',
              ]}
            />
            <PricingCard
              name="Growth"
              price="$299"
              description="For growing teams"
              features={[
                'Everything in Starter',
                'AI phone answering',
                'Digital estimates',
                'Follow-up sequences',
                '100 AI minutes/month',
                '3 phone numbers',
              ]}
              highlighted
            />
            <PricingCard
              name="Scale"
              price="$499"
              description="For multi-truck operations"
              features={[
                'Everything in Growth',
                'Advanced analytics',
                'Multi-location support',
                'Custom integrations',
                '300 AI minutes/month',
                'Unlimited SMS',
              ]}
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-600 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">
            Ready to grow your business?
          </h2>
          <p className="mt-4 text-lg text-brand-100">
            Join 50+ plumbers in Nassau County already using ServiceFlow.
          </p>
          <Link
            href="/sign-up"
            className="mt-8 inline-block rounded-lg bg-white px-6 py-3 text-base font-semibold text-brand-600 shadow-sm hover:bg-brand-50"
          >
            Start Your Free Trial
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-brand-600">ServiceFlow</span>
            <p className="text-sm text-gray-500">
              © 2026 ServiceFlow. Built in Manhasset, NY.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-gray-600">{description}</p>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-4xl font-bold text-brand-600">{value}</p>
      <p className="mt-2 text-gray-600">{label}</p>
    </div>
  );
}

function PricingCard({
  name,
  price,
  description,
  features,
  highlighted = false,
}: {
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-8 ${
        highlighted
          ? 'bg-brand-600 text-white ring-4 ring-brand-600 ring-offset-2'
          : 'bg-white border'
      }`}
    >
      <h3 className={`text-lg font-semibold ${highlighted ? 'text-white' : 'text-gray-900'}`}>
        {name}
      </h3>
      <p className={`mt-1 text-sm ${highlighted ? 'text-brand-100' : 'text-gray-500'}`}>
        {description}
      </p>
      <p className="mt-4">
        <span className={`text-4xl font-bold ${highlighted ? 'text-white' : 'text-gray-900'}`}>
          {price}
        </span>
        <span className={`text-sm ${highlighted ? 'text-brand-100' : 'text-gray-500'}`}>
          /month
        </span>
      </p>
      <ul className="mt-6 space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2">
            <svg
              className={`h-5 w-5 ${highlighted ? 'text-brand-200' : 'text-brand-600'}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className={`text-sm ${highlighted ? 'text-brand-50' : 'text-gray-600'}`}>
              {feature}
            </span>
          </li>
        ))}
      </ul>
      <Link
        href="/sign-up"
        className={`mt-8 block w-full rounded-lg py-2.5 text-center text-sm font-semibold ${
          highlighted
            ? 'bg-white text-brand-600 hover:bg-brand-50'
            : 'bg-brand-600 text-white hover:bg-brand-700'
        }`}
      >
        Get Started
      </Link>
    </div>
  );
}
