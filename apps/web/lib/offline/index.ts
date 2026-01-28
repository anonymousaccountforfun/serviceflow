/**
 * Offline Support Module
 *
 * Provides offline data storage, mutation queuing, and sync capabilities.
 */

// Database operations
export {
  openDB,
  closeDB,
  STORES,
  // Job operations
  cacheJob,
  cacheJobs,
  getCachedJob,
  getCachedJobs,
  getTodaysJobs,
  // Customer operations
  cacheCustomer,
  getCachedCustomer,
  // Draft operations
  saveDraft,
  getDraft,
  getDraftByEntity,
  removeDraft,
  // Metadata operations
  setMetadata,
  getMetadata,
  // Utility operations
  clearCache,
  clearAll,
  getStats,
  // Types
  type StoredJob,
  type StoredCustomer,
  type StoredMutation,
  type StoredDraft,
} from './db';

// Sync operations
export {
  syncMutations,
  initSync,
  getSyncState,
  subscribeSyncState,
  setupSyncListeners,
} from './sync';

// Queue operations
export {
  queueJobUpdate,
  queueJobCreate,
  queueNoteCreate,
  queueNoteUpdate,
  queueNoteDelete,
  queueInvoiceCreate,
  queueInvoiceUpdate,
  queueCustomerUpdate,
  hasPendingMutations,
  getPendingCount,
} from './queue';
