/**
 * IndexedDB Wrapper for Offline Storage
 *
 * Provides typed access to IndexedDB for offline data storage.
 * Stores jobs, customers, mutations, and drafts.
 */

const DB_NAME = 'serviceflow-offline';
const DB_VERSION = 1;

// Store names
export const STORES = {
  JOBS: 'jobs',
  CUSTOMERS: 'customers',
  MUTATIONS: 'mutations',
  DRAFTS: 'drafts',
  METADATA: 'metadata',
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

// Types for stored data
export interface StoredJob {
  id: string;
  customerId: string;
  customerName: string;
  address: string;
  scheduledAt: string;
  status: string;
  priority: string;
  type: string;
  description: string | null;
  notes: string[];
  cachedAt: number;
}

export interface StoredCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: Record<string, unknown> | null;
  cachedAt: number;
}

export interface StoredMutation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'job' | 'note' | 'invoice' | 'customer';
  entityId: string;
  data: Record<string, unknown>;
  createdAt: number;
  retries: number;
  status: 'pending' | 'in_progress' | 'failed';
  error?: string;
}

export interface StoredDraft {
  id: string;
  type: 'job_completion' | 'note' | 'invoice';
  entityId: string;
  data: Record<string, unknown>;
  updatedAt: number;
}

export interface StoredMetadata {
  key: string;
  value: unknown;
  updatedAt: number;
}

// Database instance
let dbInstance: IDBDatabase | null = null;

/**
 * Open and initialize the database
 */
export async function openDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[OfflineDB] Failed to open database', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      console.log('[OfflineDB] Database opened');
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      console.log('[OfflineDB] Upgrading database schema');

      // Jobs store - indexed by id and scheduledAt
      if (!db.objectStoreNames.contains(STORES.JOBS)) {
        const jobsStore = db.createObjectStore(STORES.JOBS, { keyPath: 'id' });
        jobsStore.createIndex('scheduledAt', 'scheduledAt', { unique: false });
        jobsStore.createIndex('status', 'status', { unique: false });
        jobsStore.createIndex('customerId', 'customerId', { unique: false });
      }

      // Customers store
      if (!db.objectStoreNames.contains(STORES.CUSTOMERS)) {
        db.createObjectStore(STORES.CUSTOMERS, { keyPath: 'id' });
      }

      // Mutations store - for offline writes queue
      if (!db.objectStoreNames.contains(STORES.MUTATIONS)) {
        const mutationsStore = db.createObjectStore(STORES.MUTATIONS, { keyPath: 'id' });
        mutationsStore.createIndex('status', 'status', { unique: false });
        mutationsStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Drafts store - for unsaved work
      if (!db.objectStoreNames.contains(STORES.DRAFTS)) {
        const draftsStore = db.createObjectStore(STORES.DRAFTS, { keyPath: 'id' });
        draftsStore.createIndex('type', 'type', { unique: false });
        draftsStore.createIndex('entityId', 'entityId', { unique: false });
      }

      // Metadata store - for sync timestamps etc
      if (!db.objectStoreNames.contains(STORES.METADATA)) {
        db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
      }
    };
  });
}

/**
 * Close the database connection
 */
export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    console.log('[OfflineDB] Database closed');
  }
}

/**
 * Generic get operation
 */
export async function get<T>(storeName: StoreName, key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Generic getAll operation
 */
export async function getAll<T>(storeName: StoreName): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Generic put operation (insert or update)
 */
export async function put<T>(storeName: StoreName, data: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Generic delete operation
 */
export async function remove(storeName: StoreName, key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Clear all data from a store
 */
export async function clear(storeName: StoreName): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Query by index
 */
export async function getByIndex<T>(
  storeName: StoreName,
  indexName: string,
  value: IDBValidKey
): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Query by index range
 */
export async function getByIndexRange<T>(
  storeName: StoreName,
  indexName: string,
  range: IDBKeyRange
): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(range);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// ============================================
// JOB OPERATIONS
// ============================================

export async function cacheJob(job: StoredJob): Promise<void> {
  await put(STORES.JOBS, { ...job, cachedAt: Date.now() });
}

export async function cacheJobs(jobs: StoredJob[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.JOBS, 'readwrite');
    const store = transaction.objectStore(STORES.JOBS);
    const now = Date.now();

    jobs.forEach((job) => {
      store.put({ ...job, cachedAt: now });
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getCachedJob(id: string): Promise<StoredJob | undefined> {
  return get(STORES.JOBS, id);
}

export async function getCachedJobs(): Promise<StoredJob[]> {
  return getAll(STORES.JOBS);
}

export async function getTodaysJobs(): Promise<StoredJob[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const range = IDBKeyRange.bound(today.toISOString(), tomorrow.toISOString(), false, true);
  return getByIndexRange(STORES.JOBS, 'scheduledAt', range);
}

// ============================================
// CUSTOMER OPERATIONS
// ============================================

export async function cacheCustomer(customer: StoredCustomer): Promise<void> {
  await put(STORES.CUSTOMERS, { ...customer, cachedAt: Date.now() });
}

export async function getCachedCustomer(id: string): Promise<StoredCustomer | undefined> {
  return get(STORES.CUSTOMERS, id);
}

// ============================================
// MUTATION QUEUE OPERATIONS
// ============================================

export async function addMutation(mutation: Omit<StoredMutation, 'id' | 'createdAt' | 'retries' | 'status'>): Promise<string> {
  const id = `mutation_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const fullMutation: StoredMutation = {
    ...mutation,
    id,
    createdAt: Date.now(),
    retries: 0,
    status: 'pending',
  };
  await put(STORES.MUTATIONS, fullMutation);
  return id;
}

export async function getPendingMutations(): Promise<StoredMutation[]> {
  return getByIndex(STORES.MUTATIONS, 'status', 'pending');
}

export async function updateMutationStatus(
  id: string,
  status: StoredMutation['status'],
  error?: string
): Promise<void> {
  const mutation = await get<StoredMutation>(STORES.MUTATIONS, id);
  if (mutation) {
    await put(STORES.MUTATIONS, {
      ...mutation,
      status,
      error,
      retries: status === 'failed' ? mutation.retries + 1 : mutation.retries,
    });
  }
}

export async function removeMutation(id: string): Promise<void> {
  await remove(STORES.MUTATIONS, id);
}

// ============================================
// DRAFT OPERATIONS
// ============================================

export async function saveDraft(draft: Omit<StoredDraft, 'updatedAt'>): Promise<void> {
  await put(STORES.DRAFTS, { ...draft, updatedAt: Date.now() });
}

export async function getDraft(id: string): Promise<StoredDraft | undefined> {
  return get(STORES.DRAFTS, id);
}

export async function getDraftByEntity(
  type: StoredDraft['type'],
  entityId: string
): Promise<StoredDraft | undefined> {
  const drafts = await getByIndex<StoredDraft>(STORES.DRAFTS, 'entityId', entityId);
  return drafts.find((d) => d.type === type);
}

export async function removeDraft(id: string): Promise<void> {
  await remove(STORES.DRAFTS, id);
}

// ============================================
// METADATA OPERATIONS
// ============================================

export async function setMetadata(key: string, value: unknown): Promise<void> {
  await put(STORES.METADATA, { key, value, updatedAt: Date.now() });
}

export async function getMetadata<T>(key: string): Promise<T | undefined> {
  const data = await get<StoredMetadata>(STORES.METADATA, key);
  return data?.value as T | undefined;
}

// ============================================
// UTILITY OPERATIONS
// ============================================

/**
 * Clear all cached data (keep mutations and drafts)
 */
export async function clearCache(): Promise<void> {
  await clear(STORES.JOBS);
  await clear(STORES.CUSTOMERS);
  console.log('[OfflineDB] Cache cleared');
}

/**
 * Clear all offline data including mutations and drafts
 */
export async function clearAll(): Promise<void> {
  await clear(STORES.JOBS);
  await clear(STORES.CUSTOMERS);
  await clear(STORES.MUTATIONS);
  await clear(STORES.DRAFTS);
  await clear(STORES.METADATA);
  console.log('[OfflineDB] All data cleared');
}

/**
 * Get database statistics
 */
export async function getStats(): Promise<{
  jobs: number;
  customers: number;
  pendingMutations: number;
  drafts: number;
}> {
  const jobs = await getAll(STORES.JOBS);
  const customers = await getAll(STORES.CUSTOMERS);
  const mutations = await getPendingMutations();
  const drafts = await getAll(STORES.DRAFTS);

  return {
    jobs: jobs.length,
    customers: customers.length,
    pendingMutations: mutations.length,
    drafts: drafts.length,
  };
}
