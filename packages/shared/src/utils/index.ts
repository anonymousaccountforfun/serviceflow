// ============================================
// PHONE NUMBER UTILITIES
// ============================================

/**
 * Normalize phone number to E.164 format
 * @param phone - Phone number in any format
 * @returns E.164 formatted number or null if invalid
 */
export function normalizePhone(phone: string): string | null {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Handle US numbers
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // Already has country code
  if (digits.length > 10) {
    return `+${digits}`;
  }

  return null;
}

/**
 * Format phone number for display
 * @param phone - E.164 formatted phone number
 * @returns Human-readable format
 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return phone;
}

/**
 * Mask phone number for privacy
 * @param phone - Phone number
 * @returns Masked phone (e.g., (***) ***-1234)
 */
export function maskPhone(phone: string): string {
  const formatted = formatPhone(phone);
  return formatted.replace(/\d(?=\d{4})/g, '*');
}

// ============================================
// CURRENCY UTILITIES
// ============================================

/**
 * Format cents to currency string
 * @param cents - Amount in cents
 * @returns Formatted currency string
 */
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

/**
 * Convert dollars to cents
 * @param dollars - Amount in dollars
 * @returns Amount in cents
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Convert cents to dollars
 * @param cents - Amount in cents
 * @returns Amount in dollars
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

// ============================================
// DATE/TIME UTILITIES
// ============================================

/**
 * Format date for display
 * @param date - Date object or ISO string
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', options).format(d);
}

/**
 * Format time for display
 * @param date - Date object or ISO string
 * @returns Formatted time string (e.g., "2:30 PM")
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

/**
 * Format date and time together
 * @param date - Date object or ISO string
 * @returns Formatted datetime string
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${formatDate(d)} at ${formatTime(d)}`;
}

/**
 * Get relative time string
 * @param date - Date object or ISO string
 * @returns Relative time (e.g., "2 hours ago", "in 3 days")
 */
export function relativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (Math.abs(diffSec) < 60) {
    return rtf.format(diffSec, 'second');
  }
  if (Math.abs(diffMin) < 60) {
    return rtf.format(diffMin, 'minute');
  }
  if (Math.abs(diffHour) < 24) {
    return rtf.format(diffHour, 'hour');
  }
  if (Math.abs(diffDay) < 30) {
    return rtf.format(diffDay, 'day');
  }

  return formatDate(d);
}

/**
 * Check if a time is within quiet hours
 * @param time - Time to check (Date or ISO string)
 * @param quietStart - Quiet hours start (HH:mm)
 * @param quietEnd - Quiet hours end (HH:mm)
 * @param timezone - Timezone to use
 * @returns True if within quiet hours
 */
export function isQuietHours(
  time: Date | string,
  quietStart: string,
  quietEnd: string,
  timezone: string = 'America/New_York'
): boolean {
  const d = typeof time === 'string' ? new Date(time) : time;
  const timeStr = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  });

  // Handle overnight quiet hours (e.g., 21:00 - 08:00)
  if (quietStart > quietEnd) {
    return timeStr >= quietStart || timeStr < quietEnd;
  }

  return timeStr >= quietStart && timeStr < quietEnd;
}

/**
 * Check if current time is within business hours
 * @param businessHours - Business hours object
 * @param timezone - Timezone
 * @returns True if within business hours
 */
export function isBusinessHours(
  businessHours: Record<string, { open: string; close: string } | null>,
  timezone: string = 'America/New_York'
): boolean {
  const now = new Date();
  const dayName = now
    .toLocaleDateString('en-US', { weekday: 'long', timeZone: timezone })
    .toLowerCase();
  const hours = businessHours[dayName];

  if (!hours) return false;

  const currentTime = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  });

  return currentTime >= hours.open && currentTime < hours.close;
}

// ============================================
// STRING UTILITIES
// ============================================

/**
 * Interpolate template string with variables
 * @param template - Template string with {{variable}} placeholders
 * @param variables - Object with variable values
 * @returns Interpolated string
 */
export function interpolate(
  template: string,
  variables: Record<string, string | number | undefined>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = variables[key];
    return value !== undefined ? String(value) : `{{${key}}}`;
  });
}

/**
 * Truncate string with ellipsis
 * @param str - String to truncate
 * @param maxLength - Maximum length
 * @returns Truncated string
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}

/**
 * Generate a slug from a string
 * @param str - String to slugify
 * @returns URL-safe slug
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Capitalize first letter of each word
 * @param str - String to title case
 * @returns Title cased string
 */
export function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get initials from a name
 * @param name - Full name
 * @returns Initials (max 2 characters)
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

// ============================================
// ID UTILITIES
// ============================================

/**
 * Generate a random ID
 * @param length - Length of the ID
 * @returns Random alphanumeric ID
 */
export function generateId(length: number = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a short code (for referral links, etc.)
 * @returns 8-character uppercase code
 */
export function generateShortCode(): string {
  return generateId(8).toUpperCase();
}

// ============================================
// VALIDATION UTILITIES
// ============================================

/**
 * Check if a ZIP code is in Nassau County
 * @param zipCode - ZIP code to check
 * @param validZipCodes - Array of valid ZIP codes
 * @returns True if in service area
 */
export function isInServiceArea(zipCode: string, validZipCodes: string[]): boolean {
  return validZipCodes.includes(zipCode.slice(0, 5));
}

/**
 * Validate E.164 phone number format
 * @param phone - Phone number to validate
 * @returns True if valid E.164 format
 */
export function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{1,14}$/.test(phone);
}

/**
 * Validate email format
 * @param email - Email to validate
 * @returns True if valid email format
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ============================================
// ARRAY UTILITIES
// ============================================

/**
 * Group array items by a key
 * @param array - Array to group
 * @param key - Key to group by
 * @returns Grouped object
 */
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce(
    (result, item) => {
      const groupKey = String(item[key]);
      if (!result[groupKey]) {
        result[groupKey] = [];
      }
      result[groupKey].push(item);
      return result;
    },
    {} as Record<string, T[]>
  );
}

/**
 * Remove duplicates from array
 * @param array - Array with potential duplicates
 * @param key - Optional key for object arrays
 * @returns Array without duplicates
 */
export function unique<T>(array: T[], key?: keyof T): T[] {
  if (key) {
    const seen = new Set();
    return array.filter((item) => {
      const k = item[key];
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }
  return [...new Set(array)];
}

// ============================================
// ASYNC UTILITIES
// ============================================

/**
 * Sleep for a specified duration
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after the duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries
 * @param baseDelay - Base delay in ms
 * @returns Result of the function
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}
