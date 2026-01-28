'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Users, UserPlus, Search, Plus } from 'lucide-react';
import { api } from '../../../lib/api';
import type { Customer } from '../../../lib/types';
import { invalidateOnCustomerCreate, StaleTime } from '../../../lib/query-invalidation';
import { EmptyState } from '@/components/ui/empty-state';
import {
  CustomerCard,
  CustomersListSkeleton,
  CreateCustomerModal,
} from './components';

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search, page],
    queryFn: () => api.getCustomers({ search: search || undefined, page }),
    staleTime: StaleTime.STANDARD,
  });

  const customers: Customer[] = data?.data || [];
  const meta = data?.meta;

  const handleCustomerCreated = () => {
    invalidateOnCustomerCreate(queryClient);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Customers</h1>
          <p className="text-gray-500 mt-1">Manage your customer database</p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-semibold transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900"
        >
          <Plus className="w-5 h-5" />
          Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          type="text"
          placeholder="Search customers..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full pl-12 pr-4 py-3 bg-surface border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/30 min-h-[48px]"
        />
      </div>

      {/* Customer list */}
      {isLoading ? (
        <CustomersListSkeleton />
      ) : customers.length === 0 ? (
        search ? (
          <EmptyState
            icon={Users}
            title="No customers found"
            description="Try a different search term"
          />
        ) : (
          <EmptyState
            icon={UserPlus}
            title="No customers yet"
            description="Add your first customer to get started. Customers are also created automatically when they call."
            action={{ label: "Add Customer", onClick: () => setShowCreateModal(true) }}
          />
        )
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customers.map((customer) => (
              <CustomerCard key={customer.id} customer={customer} />
            ))}
          </div>

          {/* Pagination */}
          {meta && (meta.totalPages ?? 1) > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * (meta.perPage ?? 20) + 1} to {Math.min(page * (meta.perPage ?? 20), meta.total ?? 0)} of {meta.total ?? 0}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-4 py-2.5 text-sm font-semibold text-white bg-surface rounded-lg hover:bg-surface-light disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= (meta.totalPages ?? 1)}
                  className="px-4 py-2.5 text-sm font-semibold text-white bg-surface rounded-lg hover:bg-surface-light disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Customer Modal */}
      <CreateCustomerModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCustomerCreated}
      />
    </div>
  );
}
