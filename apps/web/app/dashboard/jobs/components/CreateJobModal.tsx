'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus, Search, DollarSign, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../../lib/api';
import type { Customer, CreateJobInput, JobType, JobPriority } from '../../../../lib/types';
import { rules, validateForm, hasErrors, type ValidationErrors } from '../../../../lib/validation';
import { invalidateOnJobCreate, invalidateEntityOnError, StaleTime } from '../../../../lib/query-invalidation';
import { FormField, TextInput, TextArea } from '../../../../components/ui/FormField';

const jobTypes = [
  { value: 'repair', label: 'Repair' },
  { value: 'installation', label: 'Installation' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'estimate', label: 'Estimate' },
  { value: 'other', label: 'Other' },
];

const priorities = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'emergency', label: 'Emergency' },
];

const jobValidationSchema = {
  title: [rules.required('Job title is required'), rules.minLength(3, 'Title must be at least 3 characters')],
  customerId: [rules.required('Please select a customer')],
  estimatedValue: [rules.positiveNumber('Please enter a valid amount')],
};

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateJobModal({ isOpen, onClose, onSuccess }: CreateJobModalProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<JobType>('repair');
  const [priority, setPriority] = useState<JobPriority>('normal');
  const [customerId, setCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const { data: customersData } = useQuery({
    queryKey: ['customers', 'search', customerSearch],
    queryFn: () => api.getCustomers({ search: customerSearch }),
    enabled: customerSearch.length > 0,
    staleTime: StaleTime.SHORT,
  });

  const customers = customersData?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: CreateJobInput) => api.createJob(data),
    onSuccess: () => {
      toast.success('Job created successfully');
      onSuccess();
      resetForm();
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create job');
      invalidateEntityOnError(queryClient, 'job');
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setType('repair');
    setPriority('normal');
    setCustomerId('');
    setCustomerSearch('');
    setScheduledAt('');
    setEstimatedValue('');
    setTouched({});
    setValidationErrors({});
  };

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const validateAllFields = () => {
    const values = { title, customerId, estimatedValue };
    const errors = validateForm(values, jobValidationSchema);
    setValidationErrors(errors);
    setTouched({ title: true, customerId: true, estimatedValue: true });
    return !hasErrors(errors);
  };

  const isFormValid = () => {
    const values = { title, customerId, estimatedValue };
    const errors = validateForm(values, jobValidationSchema);
    return !hasErrors(errors);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateAllFields()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    createMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      type,
      priority,
      customerId,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      estimatedValue: estimatedValue ? Math.round(parseFloat(estimatedValue) * 100) : undefined,
      status: 'lead',
    });
  };

  const selectCustomer = (customer: Customer) => {
    setCustomerId(customer.id);
    setCustomerSearch(`${customer.firstName} ${customer.lastName}`);
    setShowCustomerDropdown(false);
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
          <h2 className="text-xl font-bold text-white">New Job</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Title */}
          <FormField
            label="Job Title"
            required
            error={validationErrors.title}
            touched={touched.title}
          >
            <TextInput
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => markTouched('title')}
              placeholder="e.g., Fix leaking faucet"
              error={validationErrors.title}
              touched={touched.title}
            />
          </FormField>

          {/* Customer Search */}
          <FormField
            label="Customer"
            required
            error={validationErrors.customerId}
            touched={touched.customerId}
          >
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                    if (!e.target.value) setCustomerId('');
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  onBlur={() => markTouched('customerId')}
                  placeholder="Search customers..."
                  className={`w-full pl-10 pr-4 py-3 bg-navy-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none min-h-[44px] transition-colors ${
                    validationErrors.customerId && touched.customerId
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-white/10 focus:border-orange-500'
                  }`}
                  aria-invalid={validationErrors.customerId && touched.customerId ? 'true' : 'false'}
                />
              </div>
              {/* Customer Dropdown */}
              {showCustomerDropdown && customerSearch && customers.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-navy-800 border border-white/10 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {(customers as Customer[]).map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => selectCustomer(customer)}
                      className="w-full px-4 py-3 text-left hover:bg-navy-700 transition-colors flex items-center gap-3 min-h-[44px]"
                    >
                      <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-orange-500">
                          {customer.firstName?.[0]}{customer.lastName?.[0]}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-medium">{customer.firstName} {customer.lastName}</p>
                        <p className="text-sm text-gray-500">{customer.phone}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </FormField>

          {/* Type and Priority Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2">
                Job Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as JobType)}
                className="w-full px-4 py-3 bg-navy-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500 min-h-[44px]"
              >
                {jobTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as JobPriority)}
                className="w-full px-4 py-3 bg-navy-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500 min-h-[44px]"
              >
                {priorities.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Scheduled Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-2">
              Schedule For (Optional)
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-4 py-3 bg-navy-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500 min-h-[44px]"
            />
          </div>

          {/* Estimated Value */}
          <FormField
            label="Estimated Value (Optional)"
            error={validationErrors.estimatedValue}
            touched={touched.estimatedValue}
          >
            <TextInput
              type="number"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value)}
              onBlur={() => markTouched('estimatedValue')}
              placeholder="0.00"
              step="0.01"
              min="0"
              icon={<DollarSign className="w-5 h-5" />}
              error={validationErrors.estimatedValue}
              touched={touched.estimatedValue}
            />
          </FormField>

          {/* Description */}
          <FormField label="Description">
            <TextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the job..."
              rows={3}
            />
          </FormField>

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
              disabled={createMutation.isPending || !isFormValid()}
              className="flex-1 px-5 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex items-center justify-center gap-2"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Create Job
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
