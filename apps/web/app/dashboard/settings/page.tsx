'use client';

import { Settings, User, Building, Bell, Key, CreditCard } from 'lucide-react';
import Link from 'next/link';

const settingsSections = [
  {
    title: 'Profile',
    description: 'Manage your personal information',
    icon: User,
    href: '/dashboard/settings/profile',
  },
  {
    title: 'Business',
    description: 'Update your business details and hours',
    icon: Building,
    href: '/dashboard/settings/business',
  },
  {
    title: 'Integrations',
    description: 'Connect Google, Twilio, and other services',
    icon: Key,
    href: '/dashboard/settings/integrations',
  },
  {
    title: 'Notifications',
    description: 'Configure alerts and reminders',
    icon: Bell,
    href: '/dashboard/settings/notifications',
  },
  {
    title: 'Billing',
    description: 'Manage subscription and payments',
    icon: CreditCard,
    href: '/dashboard/settings/billing',
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
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
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-brand-50 rounded-lg">
                  <Icon className="w-6 h-6 text-brand-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{section.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{section.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
