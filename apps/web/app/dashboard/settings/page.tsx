'use client';

import { User, Building, Bell, Key, CreditCard, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const settingsSections = [
  {
    title: 'Profile',
    description: 'Manage your personal information',
    icon: User,
    href: '/dashboard/settings/profile',
    color: 'bg-blue-500/20 text-blue-400',
  },
  {
    title: 'Business',
    description: 'Update your business details and hours',
    icon: Building,
    href: '/dashboard/settings/business',
    color: 'bg-purple-500/20 text-purple-400',
  },
  {
    title: 'Integrations',
    description: 'Connect Google, Twilio, and other services',
    icon: Key,
    href: '/dashboard/settings/integrations',
    color: 'bg-green-500/20 text-green-400',
  },
  {
    title: 'Notifications',
    description: 'Configure alerts and reminders',
    icon: Bell,
    href: '/dashboard/settings/notifications',
    color: 'bg-yellow-500/20 text-yellow-400',
  },
  {
    title: 'Billing',
    description: 'Manage subscription and payments',
    icon: CreditCard,
    href: '/dashboard/settings/billing',
    color: 'bg-orange-500/20 text-orange-400',
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account and preferences</p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {settingsSections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.title}
              href={section.href}
              className="bg-surface rounded-lg p-6 hover:bg-surface-light transition-colors min-h-[120px] flex items-start"
            >
              <div className="flex items-start gap-4 flex-1">
                <div className={`p-3 rounded-lg ${section.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white">{section.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{section.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-600 flex-shrink-0" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
