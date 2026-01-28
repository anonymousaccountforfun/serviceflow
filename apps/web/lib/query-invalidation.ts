/**
 * Centralized Query Invalidation Utilities
 *
 * Provides cascading invalidation for related queries to ensure
 * UI consistency after mutations.
 *
 * Usage:
 *   const queryClient = useQueryClient();
 *   invalidateOnJobCreate(queryClient);
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Standardized staleTime values for consistent caching behavior
 *
 * Use these constants in useQuery options to ensure consistent cache behavior:
 *   useQuery({ queryKey: [...], queryFn: ..., staleTime: StaleTime.STANDARD })
 */
export const StaleTime = {
  /** Default for most data - 30 seconds */
  STANDARD: 30 * 1000,
  /** For frequently changing data (inbox, notifications) - 10 seconds */
  SHORT: 10 * 1000,
  /** For rarely changing data (settings, user profile) - 5 minutes */
  LONG: 5 * 60 * 1000,
  /** For static reference data (dropdown options) - 10 minutes */
  STATIC: 10 * 60 * 1000,
  /** Always fresh - 0 (no caching) */
  NONE: 0,
} as const;

/**
 * Query keys used throughout the application
 */
export const QueryKeys = {
  // Core entities
  jobs: ['jobs'] as const,
  job: (id: string) => ['jobs', id] as const,
  customers: ['customers'] as const,
  customer: (id: string) => ['customers', id] as const,
  appointments: ['appointments'] as const,
  appointment: (id: string) => ['appointments', id] as const,
  estimates: ['estimates'] as const,
  estimate: (id: string) => ['estimates', id] as const,
  invoices: ['invoices'] as const,
  invoice: (id: string) => ['invoices', id] as const,

  // Dashboard & Analytics
  dashboard: ['dashboard'] as const,
  analytics: ['analytics'] as const,
  calendar: ['calendar'] as const,

  // Search caches
  customerSearch: (query: string) => ['customers', 'search', query] as const,

  // Related data
  jobAppointments: (jobId: string) => ['jobs', jobId, 'appointments'] as const,
  customerJobs: (customerId: string) => ['customers', customerId, 'jobs'] as const,
  customerStats: (customerId: string) => ['customers', customerId, 'stats'] as const,
} as const;

/**
 * Invalidate queries after creating a job
 * - Jobs list (all pages/filters)
 * - Customer stats (job count changed)
 * - Calendar (if job is scheduled)
 * - Dashboard stats
 */
export function invalidateOnJobCreate(
  queryClient: QueryClient,
  customerId?: string
): void {
  queryClient.invalidateQueries({ queryKey: QueryKeys.jobs });
  queryClient.invalidateQueries({ queryKey: QueryKeys.dashboard });
  queryClient.invalidateQueries({ queryKey: QueryKeys.calendar });
  queryClient.invalidateQueries({ queryKey: QueryKeys.analytics });

  if (customerId) {
    queryClient.invalidateQueries({ queryKey: QueryKeys.customer(customerId) });
    queryClient.invalidateQueries({ queryKey: QueryKeys.customerStats(customerId) });
    queryClient.invalidateQueries({ queryKey: QueryKeys.customerJobs(customerId) });
  }
}

/**
 * Invalidate queries after updating a job
 * - Specific job
 * - Jobs list
 * - Calendar (schedule may have changed)
 * - Dashboard stats (if status changed)
 */
export function invalidateOnJobUpdate(
  queryClient: QueryClient,
  jobId: string,
  customerId?: string
): void {
  queryClient.invalidateQueries({ queryKey: QueryKeys.job(jobId) });
  queryClient.invalidateQueries({ queryKey: QueryKeys.jobs });
  queryClient.invalidateQueries({ queryKey: QueryKeys.calendar });
  queryClient.invalidateQueries({ queryKey: QueryKeys.dashboard });

  if (customerId) {
    queryClient.invalidateQueries({ queryKey: QueryKeys.customerJobs(customerId) });
  }
}

/**
 * Invalidate queries after deleting a job
 */
export function invalidateOnJobDelete(
  queryClient: QueryClient,
  customerId?: string
): void {
  queryClient.invalidateQueries({ queryKey: QueryKeys.jobs });
  queryClient.invalidateQueries({ queryKey: QueryKeys.dashboard });
  queryClient.invalidateQueries({ queryKey: QueryKeys.calendar });
  queryClient.invalidateQueries({ queryKey: QueryKeys.analytics });

  if (customerId) {
    queryClient.invalidateQueries({ queryKey: QueryKeys.customer(customerId) });
    queryClient.invalidateQueries({ queryKey: QueryKeys.customerStats(customerId) });
    queryClient.invalidateQueries({ queryKey: QueryKeys.customerJobs(customerId) });
  }
}

/**
 * Invalidate queries after creating a customer
 * - Customers list
 * - All customer search caches (new customer should appear in dropdowns)
 * - Dashboard stats
 */
export function invalidateOnCustomerCreate(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: QueryKeys.customers });
  queryClient.invalidateQueries({ queryKey: QueryKeys.dashboard });
  // Invalidate all search queries so new customer appears in dropdowns
  queryClient.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) &&
      query.queryKey[0] === 'customers' &&
      query.queryKey[1] === 'search',
  });
}

/**
 * Invalidate queries after updating a customer
 */
export function invalidateOnCustomerUpdate(
  queryClient: QueryClient,
  customerId: string
): void {
  queryClient.invalidateQueries({ queryKey: QueryKeys.customer(customerId) });
  queryClient.invalidateQueries({ queryKey: QueryKeys.customers });
  // Invalidate search caches in case name changed
  queryClient.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) &&
      query.queryKey[0] === 'customers' &&
      query.queryKey[1] === 'search',
  });
}

/**
 * Invalidate queries after deleting a customer
 */
export function invalidateOnCustomerDelete(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: QueryKeys.customers });
  queryClient.invalidateQueries({ queryKey: QueryKeys.dashboard });
  queryClient.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) &&
      query.queryKey[0] === 'customers' &&
      query.queryKey[1] === 'search',
  });
}

/**
 * Invalidate queries after creating an appointment
 * - Appointments list
 * - Related job
 * - Calendar
 * - Customer appointments
 */
export function invalidateOnAppointmentCreate(
  queryClient: QueryClient,
  jobId?: string,
  customerId?: string
): void {
  queryClient.invalidateQueries({ queryKey: QueryKeys.appointments });
  queryClient.invalidateQueries({ queryKey: QueryKeys.calendar });

  if (jobId) {
    queryClient.invalidateQueries({ queryKey: QueryKeys.job(jobId) });
    queryClient.invalidateQueries({ queryKey: QueryKeys.jobAppointments(jobId) });
  }

  if (customerId) {
    queryClient.invalidateQueries({ queryKey: QueryKeys.customer(customerId) });
  }
}

/**
 * Invalidate queries after updating an appointment
 */
export function invalidateOnAppointmentUpdate(
  queryClient: QueryClient,
  appointmentId: string,
  jobId?: string
): void {
  queryClient.invalidateQueries({ queryKey: QueryKeys.appointment(appointmentId) });
  queryClient.invalidateQueries({ queryKey: QueryKeys.appointments });
  queryClient.invalidateQueries({ queryKey: QueryKeys.calendar });

  if (jobId) {
    queryClient.invalidateQueries({ queryKey: QueryKeys.job(jobId) });
    queryClient.invalidateQueries({ queryKey: QueryKeys.jobAppointments(jobId) });
  }
}

/**
 * Invalidate queries after creating/updating an estimate
 */
export function invalidateOnEstimateChange(
  queryClient: QueryClient,
  estimateId?: string,
  jobId?: string,
  customerId?: string
): void {
  queryClient.invalidateQueries({ queryKey: QueryKeys.estimates });

  if (estimateId) {
    queryClient.invalidateQueries({ queryKey: QueryKeys.estimate(estimateId) });
  }

  if (jobId) {
    queryClient.invalidateQueries({ queryKey: QueryKeys.job(jobId) });
  }

  if (customerId) {
    queryClient.invalidateQueries({ queryKey: QueryKeys.customer(customerId) });
  }
}

/**
 * Invalidate queries after invoice changes (create/update/payment)
 */
export function invalidateOnInvoiceChange(
  queryClient: QueryClient,
  invoiceId?: string,
  jobId?: string,
  customerId?: string
): void {
  queryClient.invalidateQueries({ queryKey: QueryKeys.invoices });
  queryClient.invalidateQueries({ queryKey: QueryKeys.dashboard });
  queryClient.invalidateQueries({ queryKey: QueryKeys.analytics });

  if (invoiceId) {
    queryClient.invalidateQueries({ queryKey: QueryKeys.invoice(invoiceId) });
  }

  if (jobId) {
    queryClient.invalidateQueries({ queryKey: QueryKeys.job(jobId) });
  }

  if (customerId) {
    queryClient.invalidateQueries({ queryKey: QueryKeys.customer(customerId) });
    queryClient.invalidateQueries({ queryKey: QueryKeys.customerStats(customerId) });
  }
}

/**
 * Invalidate all queries after an error to ensure fresh data
 * This is a recovery mechanism for when mutations fail and data may be stale
 */
export function invalidateOnError(queryClient: QueryClient): void {
  // Invalidate all queries to ensure we recover from stale state
  queryClient.invalidateQueries();
}

/**
 * Invalidate specific entity queries after an error
 * More targeted than invalidateOnError - use when you know which entity failed
 */
export function invalidateEntityOnError(
  queryClient: QueryClient,
  entityType: 'job' | 'customer' | 'appointment' | 'estimate' | 'invoice',
  entityId?: string
): void {
  switch (entityType) {
    case 'job':
      queryClient.invalidateQueries({ queryKey: QueryKeys.jobs });
      if (entityId) queryClient.invalidateQueries({ queryKey: QueryKeys.job(entityId) });
      break;
    case 'customer':
      queryClient.invalidateQueries({ queryKey: QueryKeys.customers });
      if (entityId) queryClient.invalidateQueries({ queryKey: QueryKeys.customer(entityId) });
      // Also invalidate search caches
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === 'customers' &&
          query.queryKey[1] === 'search',
      });
      break;
    case 'appointment':
      queryClient.invalidateQueries({ queryKey: QueryKeys.appointments });
      queryClient.invalidateQueries({ queryKey: QueryKeys.calendar });
      if (entityId) queryClient.invalidateQueries({ queryKey: QueryKeys.appointment(entityId) });
      break;
    case 'estimate':
      queryClient.invalidateQueries({ queryKey: QueryKeys.estimates });
      if (entityId) queryClient.invalidateQueries({ queryKey: QueryKeys.estimate(entityId) });
      break;
    case 'invoice':
      queryClient.invalidateQueries({ queryKey: QueryKeys.invoices });
      if (entityId) queryClient.invalidateQueries({ queryKey: QueryKeys.invoice(entityId) });
      break;
  }
}

/**
 * Create mutation options with built-in error recovery
 *
 * Usage:
 *   const mutation = useMutation({
 *     mutationFn: api.createJob,
 *     ...withErrorRecovery(queryClient, 'job', {
 *       onSuccess: () => { ... },
 *       onError: (err) => { toast.error(err.message); }
 *     })
 *   });
 */
export function withErrorRecovery<TData, TError, TVariables, TContext>(
  queryClient: QueryClient,
  entityType: 'job' | 'customer' | 'appointment' | 'estimate' | 'invoice',
  options: {
    onSuccess?: (data: TData, variables: TVariables, context: TContext) => void;
    onError?: (error: TError, variables: TVariables, context: TContext | undefined) => void;
    entityId?: string;
  } = {}
) {
  return {
    onSuccess: options.onSuccess,
    onError: (error: TError, variables: TVariables, context: TContext | undefined) => {
      // Always invalidate on error to recover from potential stale state
      invalidateEntityOnError(queryClient, entityType, options.entityId);
      // Call user's onError handler if provided
      options.onError?.(error, variables, context);
    },
  };
}
