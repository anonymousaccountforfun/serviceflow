/**
 * Offline Mutation Queue
 *
 * Provides a simple API for queueing mutations when offline.
 * Mutations are automatically synced when back online.
 */

import { addMutation, StoredMutation } from './db';
import { syncMutations, getSyncState } from './sync';
import { requestBackgroundSync } from '../sw-registration';

type MutationType = StoredMutation['type'];
type EntityType = StoredMutation['entity'];

interface QueueOptions {
  immediate?: boolean; // Try to sync immediately if online
}

/**
 * Queue a mutation for offline sync
 */
async function queueMutation(
  type: MutationType,
  entity: EntityType,
  entityId: string,
  data: Record<string, unknown>,
  options: QueueOptions = {}
): Promise<string> {
  const mutationId = await addMutation({
    type,
    entity,
    entityId,
    data,
  });

  console.log('[Queue] Mutation queued:', { type, entity, entityId, mutationId });

  // Try background sync if supported
  await requestBackgroundSync();

  // Try immediate sync if online and requested
  if (options.immediate !== false && navigator.onLine) {
    syncMutations().catch(console.error);
  }

  return mutationId;
}

// ============================================
// JOB MUTATIONS
// ============================================

export async function queueJobUpdate(
  jobId: string,
  data: Record<string, unknown>,
  options?: QueueOptions
): Promise<string> {
  return queueMutation('update', 'job', jobId, data, options);
}

export async function queueJobCreate(
  data: Record<string, unknown>,
  options?: QueueOptions
): Promise<string> {
  const tempId = `temp_${Date.now()}`;
  return queueMutation('create', 'job', tempId, data, options);
}

// ============================================
// NOTE MUTATIONS
// ============================================

export async function queueNoteCreate(
  jobId: string,
  content: string,
  options?: QueueOptions
): Promise<string> {
  const tempId = `temp_${Date.now()}`;
  return queueMutation(
    'create',
    'note',
    tempId,
    { jobId, content, createdAt: new Date().toISOString() },
    options
  );
}

export async function queueNoteUpdate(
  noteId: string,
  jobId: string,
  content: string,
  options?: QueueOptions
): Promise<string> {
  return queueMutation('update', 'note', noteId, { jobId, content }, options);
}

export async function queueNoteDelete(
  noteId: string,
  jobId: string,
  options?: QueueOptions
): Promise<string> {
  return queueMutation('delete', 'note', noteId, { jobId }, options);
}

// ============================================
// INVOICE MUTATIONS
// ============================================

export async function queueInvoiceCreate(
  data: Record<string, unknown>,
  options?: QueueOptions
): Promise<string> {
  const tempId = `temp_${Date.now()}`;
  return queueMutation('create', 'invoice', tempId, data, options);
}

export async function queueInvoiceUpdate(
  invoiceId: string,
  data: Record<string, unknown>,
  options?: QueueOptions
): Promise<string> {
  return queueMutation('update', 'invoice', invoiceId, data, options);
}

// ============================================
// CUSTOMER MUTATIONS
// ============================================

export async function queueCustomerUpdate(
  customerId: string,
  data: Record<string, unknown>,
  options?: QueueOptions
): Promise<string> {
  return queueMutation('update', 'customer', customerId, data, options);
}

// ============================================
// QUEUE STATUS
// ============================================

export { getSyncState } from './sync';

/**
 * Check if there are pending mutations
 */
export function hasPendingMutations(): boolean {
  return getSyncState().pendingCount > 0;
}

/**
 * Get the number of pending mutations
 */
export function getPendingCount(): number {
  return getSyncState().pendingCount;
}

/**
 * Force sync all pending mutations
 */
export { syncMutations } from './sync';
