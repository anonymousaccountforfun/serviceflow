'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { Phone, Mail, MapPin, ChevronRight } from 'lucide-react';
import type { Customer } from '../../../../lib/types';

interface CustomerCardProps {
  customer: Customer;
}

export function CustomerCard({ customer }: CustomerCardProps) {
  const address = [customer.address?.street, customer.address?.city, customer.address?.state, customer.address?.zip].filter(Boolean).join(', ');

  return (
    <Link
      href={`/dashboard/customers/${customer.id}`}
      className="block bg-surface rounded-lg p-4 hover:bg-surface-light transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-semibold text-orange-500">
              {customer.firstName?.[0]}{customer.lastName?.[0]}
            </span>
          </div>
          <div>
            <p className="font-semibold text-white">
              {customer.firstName} {customer.lastName}
            </p>
            {customer.phone && (
              <div className="flex items-center gap-1.5 text-sm text-gray-400 mt-1">
                <Phone className="w-3.5 h-3.5" />
                {customer.phone}
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-1.5 text-sm text-gray-400">
                <Mail className="w-3.5 h-3.5" />
                <span className="truncate max-w-[180px]">{customer.email}</span>
              </div>
            )}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-600" />
      </div>

      {address && (
        <div className="flex items-start gap-1.5 text-sm text-gray-500 mt-3 pt-3 border-t border-white/5">
          <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span className="line-clamp-1">{address}</span>
        </div>
      )}

      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5">
        {customer.source && (
          <span className="text-xs bg-navy-700 text-gray-400 px-2 py-1 rounded font-medium uppercase">
            {customer.source?.replace('_', ' ')}
          </span>
        )}
        <span className="text-xs text-gray-500">
          {format(new Date(customer.createdAt), 'MMM d, yyyy')}
        </span>
        {customer.jobCount > 0 && (
          <span className="text-xs text-orange-500 font-semibold">
            {customer.jobCount} job{customer.jobCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </Link>
  );
}
