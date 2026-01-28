'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus, Phone, Mail, Loader2 } from 'lucide-react';
import { api } from '../../../../lib/api';
import type { CreateCustomerInput, CustomerSource } from '../../../../lib/types';
import { rules, validateForm, hasErrors, formatPhoneNumber, type ValidationErrors } from '../../../../lib/validation';
import { invalidateOnCustomerCreate, invalidateEntityOnError } from '../../../../lib/query-invalidation';
import { FormField, TextInput, FormErrorBanner } from '../../../../components/ui/FormField';

const sourceOptions: { value: CustomerSource; label: string }[] = [
  { value: 'referral', label: 'Referral' },
  { value: 'google', label: 'Google' },
  { value: 'yelp', label: 'Yelp' },
  { value: 'web_form', label: 'Website' },
  { value: 'phone_inbound', label: 'Phone Call' },
  { value: 'manual', label: 'Manual Entry' },
];

const customerValidationSchema = {
  firstName: [rules.required('First name is required')],
  phone: [rules.required('Phone number is required'), rules.phone()],
  email: [rules.email()],
  state: [rules.state()],
  zip: [rules.zip()],
};

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateCustomerModal({ isOpen, onClose, onSuccess }: CreateCustomerModalProps) {
  const queryClient = useQueryClient();
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
      invalidateEntityOnError(queryClient, 'customer');
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
