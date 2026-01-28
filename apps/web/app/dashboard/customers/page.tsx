'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Users,
  UserPlus,
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
import type { Customer, CreateCustomerInput, CustomerSource } from '../../../lib/types';
import { rules, validateForm, hasErrors, formatPhoneNumber, type ValidationErrors } from '../../../lib/validation';
import { invalidateOnCustomerCreate } from '../../../lib/query-invalidation';
import { FormField, TextInput, FormErrorBanner } from '../../../components/ui/FormField';
import { Skeleton, SkeletonAvatar } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

const sourceOptions: { value: CustomerSource; label: string }[] = [
  { value: 'referral', label: 'Referral' },
  { value: 'google', label: 'Google' },
  { value: 'yelp', label: 'Yelp' },
  { value: 'web_form', label: 'Website' },
  { value: 'phone_inbound', label: 'Phone Call' },
  { value: 'manual', label: 'Manual Entry' },
];

// Validation schema for customer form
const customerValidationSchema = {
  firstName: [rules.required('First name is required')],
  phone: [rules.required('Phone number is required'), rules.phone()],
  email: [rules.email()],
  state: [rules.state()],
  zip: [rules.zip()],
};

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
  const [source, setSource] = useState<CustomerSource>('referral');

  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

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
    setTouched({});
    setValidationErrors({});
    setError(null);
  };

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const validateAllFields = () => {
    const values = { firstName, phone, email, state, zip };
    const errors = validateForm(values, customerValidationSchema);
    setValidationErrors(errors);
    // Mark all fields as touched
    setTouched({ firstName: true, phone: true, email: true, state: true, zip: true });
    return !hasErrors(errors);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateAllFields()) {
      return;
    }

    createMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      address: (address.trim() || city.trim() || state.trim() || zip.trim()) ? {
        street: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        zip: zip.trim() || undefined,
      } : undefined,
      source,
    });
  };

  const handlePhoneChange = (value: string) => {
    setPhone(formatPhoneNumber(value));
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-navy-900 rounded-xl shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 id="modal-title" className="text-xl font-bold text-white">Add Customer</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* API Error Banner */}
          <FormErrorBanner error={error} />

          {/* Name Row */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="First Name"
              required
              error={validationErrors.firstName}
              touched={touched.firstName}
            >
              <TextInput
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                onBlur={() => markTouched('firstName')}
                placeholder="John"
                error={validationErrors.firstName}
                touched={touched.firstName}
              />
            </FormField>
            <FormField label="Last Name">
              <TextInput
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Smith"
              />
            </FormField>
          </div>

          {/* Phone */}
          <FormField
            label="Phone"
            required
            error={validationErrors.phone}
            touched={touched.phone}
          >
            <TextInput
              type="tel"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              onBlur={() => markTouched('phone')}
              placeholder="(555) 123-4567"
              icon={<Phone className="w-5 h-5" />}
              error={validationErrors.phone}
              touched={touched.phone}
            />
          </FormField>

          {/* Email */}
          <FormField
            label="Email"
            error={validationErrors.email}
            touched={touched.email}
          >
            <TextInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => markTouched('email')}
              placeholder="john@example.com"
              icon={<Mail className="w-5 h-5" />}
              error={validationErrors.email}
              touched={touched.email}
            />
          </FormField>

          {/* Address */}
          <FormField label="Street Address">
            <TextInput
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St"
            />
          </FormField>

          {/* City, State, Zip */}
          <div className="grid grid-cols-6 gap-4">
            <FormField label="City" className="col-span-3">
              <TextInput
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="New York"
              />
            </FormField>
            <FormField
              label="State"
              error={validationErrors.state}
              touched={touched.state}
              className="col-span-1"
            >
              <TextInput
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase())}
                onBlur={() => markTouched('state')}
                placeholder="NY"
                maxLength={2}
                error={validationErrors.state}
                touched={touched.state}
              />
            </FormField>
            <FormField
              label="ZIP"
              error={validationErrors.zip}
              touched={touched.zip}
              className="col-span-2"
            >
              <TextInput
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                onBlur={() => markTouched('zip')}
                placeholder="10001"
                error={validationErrors.zip}
                touched={touched.zip}
              />
            </FormField>
          </div>

          {/* Source */}
          <FormField label="How did they find you?">
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as CustomerSource)}
              className="w-full px-4 py-3 bg-navy-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/30 min-h-[44px]"
            >
              {sourceOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </FormField>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-5 py-3 bg-navy-800 text-white rounded-lg font-semibold hover:bg-navy-700 transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!firstName.trim() || !phone.trim() || createMutation.isPending}
              className="flex-1 px-5 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900"
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

function CustomerCardSkeleton() {
  return (
    <div className="bg-surface rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <SkeletonAvatar size="lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-3 w-3" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-3 w-3" />
              <Skeleton className="h-3 w-36" />
            </div>
          </div>
        </div>
        <Skeleton className="h-5 w-5" />
      </div>

      <div className="flex items-start gap-1.5 mt-3 pt-3 border-t border-white/5">
        <Skeleton className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
        <Skeleton className="h-3 w-48" />
      </div>

      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5">
        <Skeleton className="h-5 w-16 rounded" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  );
}

function CustomerCard({ customer }: { customer: Customer }) {
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

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search, page],
    queryFn: () => api.getCustomers({ search: search || undefined, page }),
    // Cache for 30 seconds - customer list doesn't change frequently
    staleTime: 30 * 1000,
  });

  const customers: Customer[] = data?.data || [];
  const meta = data?.meta;

  const handleCustomerCreated = () => {
    // Use centralized invalidation to update all related caches including search dropdowns
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <CustomerCardSkeleton key={i} />
          ))}
        </div>
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
