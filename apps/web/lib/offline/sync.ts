/**
 * Offline Sync Manager
 *
 * Handles syncing offline mutations when the connection is restored.
 * Uses a queue-based approach with retry logic.
 */

import {
  getPendingMutations,
  updateMutationStatus,
  removeMutation,
  StoredMutation,
  setMetadata,
  getMetadata,
} from './db';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 15000]; // Exponential backoff

type SyncStatus = 'idle' | 'syncing' | 'error';

interface SyncState {
  status: SyncStatus;
  lastSyncAt: number | null;
  pendingCount: number;
  error: string | null;
}

let syncState: SyncState = {
  status: 'idle',
  lastSyncAt: null,
  pendingCount: 0,
  error: null,
};

const listeners: Set<(state: SyncState) => void> = new Set();

/**
 * Subscribe to sync state changes
 */
export function subscribeSyncState(callback: (state: SyncState) => void): () => void {
  listeners.add(callback);
  callback(syncState);
  return () => listeners.delete(callback);
}

function notifyListeners(): void {
  listeners.forEach((callback) => callback(syncState));
}

function updateState(updates: Partial<SyncState>): void {
  syncState = { ...syncState, ...updates };
  notifyListeners();
}

/**
 * API endpoint mapping for mutations
 */
function getMutationEndpoint(mutation: StoredMutation): { method: string; url: string; body?: unknown } {
  const { type, entity, entityId, data } = mutation;

  switch (entity) {
    case 'job':
      switch (type) {
        case 'create':
          return { method: 'POST', url: '/api/jobs', body: data };
        case 'update':
          return { method: 'PATCH', url: `/api/jobs/${entityId}`, body: data };
        case 'delete':
          return { method: 'DELETE', url: `/api/jobs/${entityId}` };
      }
      break;
    case 'note':
      switch (type) {
        case 'create':
          return { method: 'POST', url: `/api/jobs/${data.jobId}/notes`, body: data };
        case 'update':
          return { method: 'PATCH', url: `/api/jobs/${data.jobId}/notes/${entityId}`, body: data };
        case 'delete':
          return { method: 'DELETE', url: `/api/jobs/${data.jobId}/notes/${entityId}` };
      }
      break;
    case 'invoice':
      switch (type) {
        case 'create':
          return { method: 'POST', url: '/api/invoices', body: data };
        case 'update':
          return { method: 'PATCH', url: `/api/invoices/${entityId}`, body: data };
        case 'delete':
          return { method: 'DELETE', url: `/api/invoices/${entityId}` };
      }
      break;
    case 'customer':
      switch (type) {
        case 'update':
          return { method: 'PATCH', url: `/api/customers/${entityId}`, body: data };
      }
      break;
  }

  throw new Error(`Unknown mutation: ${entity}.${type}`);
}

/**
 * Execute a single mutation
 */
async function executeMutation(mutation: StoredMutation): Promise<boolean> {
  const { method, url, body } = getMutationEndpoint(mutation);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('[Sync] Mutation failed:', mutation.id, error);
    throw error;
  }
}

/**
 * Process a single mutation with retry logic
 */
async function processMutation(mutation: StoredMutation): Promise<boolean> {
  if (mutation.retries >= MAX_RETRIES) {
    console.error('[Sync] Max retries exceeded for mutation:', mutation.id);
    await updateMutationStatus(mutation.id, 'failed', 'Max retries exceeded');
    return false;
  }

  await updateMutationStatus(mutation.id, 'in_progress');

  try {
    const success = await executeMutation(mutation);
    if (success) {
      await removeMutation(mutation.id);
      console.log('[Sync] Mutation succeeded:', mutation.id);
      return true;
    }
    return false;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await updateMutationStatus(mutation.id, 'pending', errorMessage);

    // Retry with delay
    if (mutation.retries < MAX_RETRIES - 1) {
      const delay = RETRY_DELAYS[mutation.retries] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
      console.log('[Sync] Retrying mutation in', delay, 'ms:', mutation.id);
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Refetch mutation to get updated retry count
      const updatedMutation = await getPendingMutations().then(
        (mutations) => mutations.find((m) => m.id === mutation.id)
      );

      if (updatedMutation) {
        return processMutation(updatedMutation);
      }
    }

    return false;
  }
}

/**
 * Sync all pending mutations
 */
export async function syncMutations(): Promise<{ synced: number; failed: number }> {
  if (syncState.status === 'syncing') {
    console.log('[Sync] Already syncing, skipping');
    return { synced: 0, failed: 0 };
  }

  if (!navigator.onLine) {
    console.log('[Sync] Offline, skipping sync');
    return { synced: 0, failed: 0 };
  }

  const mutations = await getPendingMutations();
  if (mutations.length === 0) {
    console.log('[Sync] No pending mutations');
    return { synced: 0, failed: 0 };
  }

  console.log('[Sync] Starting sync of', mutations.length, 'mutations');
  updateState({ status: 'syncing', pendingCount: mutations.length, error: null });

  let synced = 0;
  let failed = 0;

  // Sort by creation time to maintain order
  const sortedMutations = [...mutations].sort((a, b) => a.createdAt - b.createdAt);

  for (const mutation of sortedMutations) {
    const success = await processMutation(mutation);
    if (success) {
      synced++;
    } else {
      failed++;
    }
    updateState({ pendingCount: mutations.length - synced - failed });
  }

  const lastSyncAt = Date.now();
  await setMetadata('lastSyncAt', lastSyncAt);

  updateState({
    status: failed > 0 ? 'error' : 'idle',
    lastSyncAt,
    pendingCount: 0,
    error: failed > 0 ? `${failed} mutations failed to sync` : null,
  });

  console.log('[Sync] Sync complete:', { synced, failed });
  return { synced, failed };
}

/**
 * Initialize sync state from database
 */
export async function initSync(): Promise<void> {
  const lastSyncAt = await getMetadata<number>('lastSyncAt');
  const mutations = await getPendingMutations();

  updateState({
    lastSyncAt: lastSyncAt || null,
    pendingCount: mutations.length,
  });

  // Sync if online and have pending mutations
  if (navigator.onLine && mutations.length > 0) {
    console.log('[Sync] Found pending mutations, starting sync');
    syncMutations();
  }
}

/**
 * Get current sync state
 */
export function getSyncState(): SyncState {
  return { ...syncState };
}

/**
 * Register sync event listeners
 */
export function setupSyncListeners(): () => void {
  const handleOnline = () => {
    console.log('[Sync] Back online, triggering sync');
    syncMutations();
  };

  const handleSyncComplete = () => {
    console.log('[Sync] Service worker sync complete');
    syncMutations();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('sw-sync-complete', handleSyncComplete);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('sw-sync-complete', handleSyncComplete);
  };
}
