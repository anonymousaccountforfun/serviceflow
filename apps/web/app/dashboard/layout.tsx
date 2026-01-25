'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { SignOutButton, UserButton } from '@clerk/nextjs';
import {
  LayoutDashboard,
  Calendar,
  MessageSquare,
  Users,
  Briefcase,
  Star,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { useState } from 'react';
import { Providers } from '../../lib/providers';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { useCurrentUser, useAuthContext } from '../../lib/auth/context';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/calendar', label: 'Calendar', icon: Calendar },
  { href: '/dashboard/inbox', label: 'Inbox', icon: MessageSquare },
  { href: '/dashboard/customers', label: 'Customers', icon: Users },
  { href: '/dashboard/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/dashboard/reviews', label: 'Reviews', icon: Star },
];

function UserInfo() {
  const { organization, initials, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="flex items-center gap-3">
        <div className="animate-pulse">
          <div className="h-4 w-24 bg-white/10 rounded hidden sm:block" />
          <div className="h-3 w-16 bg-white/10 rounded mt-1 hidden sm:block" />
        </div>
        <div className="w-9 h-9 rounded-lg bg-white/10 animate-pulse" />
      </div>
    );
  }

  const tierLabel = organization?.subscriptionTier === 'starter' ? 'Starter' :
                    organization?.subscriptionTier === 'growth' ? 'Growth' :
                    organization?.subscriptionTier === 'scale' ? 'Scale' : 'Free';

  const statusLabel = organization?.subscriptionStatus === 'trialing' ? ' (Trial)' : '';

  return (
    <div className="flex items-center gap-3">
      <div className="text-right hidden sm:block">
        <p className="text-sm font-medium text-white">{organization?.name || 'My Business'}</p>
        <p className="text-xs text-gray-500">{tierLabel}{statusLabel}</p>
      </div>
      <UserButton
        appearance={{
          elements: {
            avatarBox: 'w-9 h-9 rounded-lg',
          }
        }}
      />
    </div>
  );
}

function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-navy-950
        transform transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-5">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-accent rounded flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                ServiceFlow
              </span>
            </Link>
            <button
              onClick={onClose}
              className="lg:hidden p-2 hover:bg-white/10 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`
                    flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-semibold
                    transition-all duration-150 min-h-[44px]
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950
                    ${isActive
                      ? 'bg-accent text-white'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }
                  `}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight className="w-4 h-4" />}
                </Link>
              );
            })}
          </nav>

          {/* Bottom section */}
          <div className="px-3 py-4 border-t border-white/10 space-y-1">
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-semibold text-gray-400 hover:bg-white/5 hover:text-white transition-all min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950"
            >
              <Settings className="w-5 h-5" />
              Settings
            </Link>
            <SignOutButton>
              <button
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-semibold text-gray-400 hover:bg-white/5 hover:text-white transition-all w-full text-left min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950"
              >
                <LogOut className="w-5 h-5" />
                Sign out
              </button>
            </SignOutButton>
          </div>
        </div>
      </aside>
    </>
  );
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isLoading, isNewUser, organization } = useAuthContext();
  const router = useRouter();

  // Check if onboarding is completed
  const onboardingCompleted = (organization?.settings as any)?.onboardingCompleted;

  // Redirect new users or users who haven't completed onboarding
  if (isNewUser || (organization && !onboardingCompleted)) {
    router.push('/onboarding');
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-900">
      {/* Skip link for keyboard navigation */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="lg:ml-64 min-h-screen flex flex-col">
        {/* Top bar - minimal */}
        <header className="sticky top-0 z-30 h-14 bg-navy-950/90 backdrop-blur-sm border-b border-white/5 flex items-center px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-white/10 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5 text-white" />
          </button>

          <div className="flex-1" />

          {/* User indicator */}
          <UserInfo />
        </header>

        {/* Page content */}
        <main id="main-content" className="flex-1 p-4 lg:p-6" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary>
      <Providers>
        <DashboardContent>{children}</DashboardContent>
      </Providers>
    </ErrorBoundary>
  );
}
