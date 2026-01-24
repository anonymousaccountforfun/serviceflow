'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Users,
  Search,
  Phone,
  Mail,
  MapPin,
  Plus,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { api } from '../../../lib/api';

function CustomerCard({ customer }: { customer: any }) {
  return (
    <Link
      href={`/dashboard/customers/${customer.id}`}
      className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-semibold text-brand-600">
              {customer.firstName?.[0]}{customer.lastName?.[0]}
            </span>
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              {customer.firstName} {customer.lastName}
            </p>
            <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
              <Phone className="w-3 h-3" />
              {customer.phone}
            </div>
            {customer.email && (
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Mail className="w-3 h-3" />
                {customer.email}
              </div>
            )}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </div>

      {customer.address && (
        <div className="flex items-start gap-1 text-sm text-gray-500 mt-3 pt-3 border-t border-gray-100">
          <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>
            {customer.address.street}, {customer.address.city}, {customer.address.state} {customer.address.zipCode}
          </span>
        </div>
      )}

      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
          {customer.source?.replace('_', ' ')}
        </span>
        <span className="text-xs text-gray-500">
          Added {format(new Date(customer.createdAt), 'MMM d, yyyy')}
        </span>
        {customer._count?.jobs > 0 && (
          <span className="text-xs text-brand-600 font-medium">
            {customer._count.jobs} job{customer._count.jobs !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </Link>
  );
}

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search, page],
    queryFn: () => api.getCustomers({ search: search || undefined, page }),
  });

  const customers = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 mt-1">Manage your customer database</p>
        </div>

        <button className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium">
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search customers..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>

      {/* Customer list */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-200" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No customers found</h3>
          <p className="text-gray-500 mt-1">
            {search ? 'Try a different search term' : 'Add your first customer to get started'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customers.map((customer: any) => (
              <CustomerCard key={customer.id} customer={customer} />
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
