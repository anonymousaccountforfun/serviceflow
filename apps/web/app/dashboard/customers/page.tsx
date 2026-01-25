'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Users,
  Search,
  Phone,
  Mail,
  MapPin,
  Plus,
  ChevronRight,
  X,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { api } from '../../../lib/api';
import type { Customer, CreateCustomerInput } from '../../../lib/types';

const sourceOptions = [
  { value: 'referral', label: 'Referral' },
  { value: 'google', label: 'Google' },
  { value: 'website', label: 'Website' },
  { value: 'phone', label: 'Phone Call' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'other', label: 'Other' },
];

function CreateCustomerModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [source, setSource] = useState('referral');

  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: CreateCustomerInput) => api.createCustomer(data),
    onSuccess: () => {
      setError(null);
      onSuccess();
      resetForm();
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to create customer');
    },
  });

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setCity('');
    setState('');
    setZip('');
    setSource('referral');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !phone.trim()) return;

    createMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      zip: zip.trim() || undefined,
      source,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-navy-900 rounded-xl shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Add Customer</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Name Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                className="w-full px-4 py-3 bg-navy-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 min-h-[44px]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Smith"
                className="w-full px-4 py-3 bg-navy-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 min-h-[44px]"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-2">
              Phone <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full pl-10 pr-4 py-3 bg-navy-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 min-h-[44px]"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="w-full pl-10 pr-4 py-3 bg-navy-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 min-h-[44px]"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-2">
              Street Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St"
              className="w-full px-4 py-3 bg-navy-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 min-h-[44px]"
            />
          </div>

          {/* City, State, Zip */}
          <div className="grid grid-cols-6 gap-4">
            <div className="col-span-3">
              <label className="block text-sm font-semibold text-gray-400 mb-2">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="New York"
                className="w-full px-4 py-3 bg-navy-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 min-h-[44px]"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-sm font-semibold text-gray-400 mb-2">
                State
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="NY"
                maxLength={2}
                className="w-full px-4 py-3 bg-navy-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 min-h-[44px]"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-gray-400 mb-2">
                ZIP
              </label>
              <input
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="10001"
                className="w-full px-4 py-3 bg-navy-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 min-h-[44px]"
              />
            </div>
          </div>

          {/* Source */}
          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-2">
              How did they find you?
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full px-4 py-3 bg-navy-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500 min-h-[44px]"
            >
              {sourceOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-5 py-3 bg-navy-800 text-white rounded-lg font-semibold hover:bg-navy-700 transition-colors min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!firstName.trim() || !phone.trim() || createMutation.isPending}
              className="flex-1 px-5 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex items-center justify-center gap-2"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Add Customer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CustomerCard({ customer }: { customer: Customer }) {
  const address = [customer.address, customer.city, customer.state, customer.zip].filter(Boolean).join(', ');

  return (
    <Link
      href={`/dashboard/customers/${customer.id}`}
      className="block bg-surface rounded-lg p-4 hover:bg-surface-light transition-colors min-h-[44px]"
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
        {customer._count?.jobs > 0 && (
          <span className="text-xs text-orange-500 font-semibold">
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search, page],
    queryFn: () => api.getCustomers({ search: search || undefined, page }),
  });

  const customers: Customer[] = data?.data || [];
  const meta = data?.meta;

  const handleCustomerCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['customers'] });
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
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-semibold transition-colors min-h-[44px]"
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
          className="w-full pl-12 pr-4 py-3 bg-surface border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 min-h-[48px]"
        />
      </div>

      {/* Customer list */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-surface rounded-lg p-4 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-navy-700" />
                <div className="flex-1">
                  <div className="h-4 bg-navy-700 rounded w-32 mb-2" />
                  <div className="h-3 bg-navy-700 rounded w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-surface rounded-lg p-12 text-center">
          <div className="w-16 h-16 rounded-xl bg-navy-800 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No customers found</h3>
          <p className="text-gray-500 mb-6">
            {search ? 'Try a different search term' : 'Add your first customer to get started'}
          </p>
          {!search && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-5 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              Add First Customer
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customers.map((customer) => (
              <CustomerCard key={customer.id} customer={customer} />
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

      {/* Create Customer Modal */}
      <CreateCustomerModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCustomerCreated}
      />
    </div>
  );
}
