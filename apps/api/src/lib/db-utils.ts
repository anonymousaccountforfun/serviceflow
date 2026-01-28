/**
 * Database Utilities
 *
 * Provides utilities for safe database operations including:
 * - Lock ordering to prevent deadlocks
 * - Transaction helpers
 * - Atomic update patterns
 */

import { prisma } from '@serviceflow/database';
import { logger } from './logger';

/**
 * LOCK ORDERING STRATEGY
 *
 * When updating multiple entities in a transaction, always acquire locks
 * in this order to prevent deadlocks:
 *
 * 1. Organization (highest level)
 * 2. Customer
 * 3. Job
 * 4. Appointment
 * 5. Estimate
 * 6. Invoice
 * 7. Payment (lowest level)
 *
 * Example: When creating a payment that updates an invoice and job:
 *   1. Lock/update Job first
 *   2. Lock/update Invoice second
 *   3. Create Payment last
 *
 * Usage:
 *   await prisma.$transaction(async (tx) => {
 *     // Lock in order: Job -> Invoice -> Payment
 *     const job = await tx.job.update({ where: { id: jobId }, data: {...} });
 *     const invoice = await tx.invoice.update({ where: { id: invoiceId }, data: {...} });
 *     const payment = await tx.payment.create({ data: {...} });
 *   });
 */

/**
 * Entity lock order - lower number = lock first
 */
export const LOCK_ORDER = {
  organization: 1,
  customer: 2,
  job: 3,
  appointment: 4,
  estimate: 5,
  invoice: 6,
  payment: 7,
} as const;

export type EntityType = keyof typeof LOCK_ORDER;

/**
 * Sort entity types by lock order for consistent locking
 *
 * @param entities - Array of entity types to sort
 * @returns Sorted array with entities in correct lock order
 *
 * Example:
 *   sortByLockOrder(['payment', 'job', 'invoice'])
 *   // Returns: ['job', 'invoice', 'payment']
 */
export function sortByLockOrder(entities: EntityType[]): EntityType[] {
  return [...entities].sort((a, b) => LOCK_ORDER[a] - LOCK_ORDER[b]);
}

/**
 * Validate that entities are being locked in the correct order
 * Throws an error if the order is incorrect (useful for development/testing)
 *
 * @param entities - Array of entity types in the order they will be locked
 * @throws Error if entities are not in correct lock order
 */
export function validateLockOrder(entities: EntityType[]): void {
  for (let i = 1; i < entities.length; i++) {
    if (LOCK_ORDER[entities[i]] < LOCK_ORDER[entities[i - 1]]) {
      const correctOrder = sortByLockOrder(entities);
      throw new Error(
        `Invalid lock order: ${entities.join(' -> ')}. ` +
        `Correct order: ${correctOrder.join(' -> ')}`
      );
    }
  }
}

/**
 * Execute a transaction with automatic retry on deadlock
 *
 * @param fn - Transaction function to execute
 * @param maxRetries - Maximum number of retries (default: 3)
 * @returns Result of the transaction function
 */
export async function withDeadlockRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if this is a deadlock error (P2034 in Prisma)
      const isDeadlock =
        error?.code === 'P2034' ||
        error?.message?.includes('deadlock') ||
        error?.message?.includes('Deadlock');

      if (!isDeadlock || attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff before retry
      const delay = Math.min(100 * Math.pow(2, attempt), 1000);
      logger.warn('Deadlock detected, retrying transaction', {
        attempt,
        maxRetries,
        delay,
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Atomic increment with bounds checking
 *
 * @param model - Prisma model name
 * @param id - Record ID
 * @param field - Field to increment
 * @param amount - Amount to increment (default: 1)
 * @param maxValue - Maximum allowed value (optional)
 * @returns Number of rows updated (0 if max reached)
 */
export async function atomicIncrement(
  table: 'ShareToken' | 'Invoice' | 'Customer',
  id: string,
  field: string,
  amount: number = 1,
  maxValue?: number
): Promise<number> {
  // Build the WHERE clause to check max value
  const maxCheck = maxValue !== undefined
    ? `AND ("${field}" + ${amount}) <= ${maxValue}`
    : '';

  const result = await prisma.$executeRawUnsafe(
    `UPDATE "${table}" SET "${field}" = "${field}" + $1 WHERE "id" = $2 ${maxCheck}`,
    amount,
    id
  );

  return result;
}

/**
 * Atomic decrement with floor at zero
 *
 * @param table - Table name
 * @param id - Record ID
 * @param field - Field to decrement
 * @param amount - Amount to decrement (default: 1)
 * @returns Number of rows updated
 */
export async function atomicDecrement(
  table: 'ShareToken' | 'Invoice' | 'Customer',
  id: string,
  field: string,
  amount: number = 1
): Promise<number> {
  const result = await prisma.$executeRawUnsafe(
    `UPDATE "${table}" SET "${field}" = GREATEST(0, "${field}" - $1) WHERE "id" = $2`,
    amount,
    id
  );

  return result;
}
