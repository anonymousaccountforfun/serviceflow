/**
 * Client-side form validation utilities
 */

// Validation rule types
export interface ValidationRule {
  validate: (value: string) => boolean;
  message: string;
}

export interface FieldValidation {
  [fieldName: string]: ValidationRule[];
}

export interface ValidationErrors {
  [fieldName: string]: string | undefined;
}

// Common validation rules
export const rules = {
  required: (message = 'This field is required'): ValidationRule => ({
    validate: (value) => value.trim().length > 0,
    message,
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    validate: (value) => value.trim().length >= min,
    message: message || `Must be at least ${min} characters`,
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    validate: (value) => value.trim().length <= max,
    message: message || `Must be no more than ${max} characters`,
  }),

  email: (message = 'Please enter a valid email address'): ValidationRule => ({
    validate: (value) => {
      if (!value.trim()) return true; // Let required handle empty
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    message,
  }),

  phone: (message = 'Please enter a valid phone number'): ValidationRule => ({
    validate: (value) => {
      if (!value.trim()) return true; // Let required handle empty
      // Strip non-digits and check length
      const digits = value.replace(/\D/g, '');
      return digits.length >= 10 && digits.length <= 15;
    },
    message,
  }),

  url: (message = 'Please enter a valid URL'): ValidationRule => ({
    validate: (value) => {
      if (!value.trim()) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message,
  }),

  numeric: (message = 'Please enter a valid number'): ValidationRule => ({
    validate: (value) => {
      if (!value.trim()) return true;
      return !isNaN(parseFloat(value));
    },
    message,
  }),

  positiveNumber: (message = 'Please enter a positive number'): ValidationRule => ({
    validate: (value) => {
      if (!value.trim()) return true;
      const num = parseFloat(value);
      return !isNaN(num) && num > 0;
    },
    message,
  }),

  zip: (message = 'Please enter a valid ZIP code'): ValidationRule => ({
    validate: (value) => {
      if (!value.trim()) return true;
      // US ZIP: 5 digits or 5+4
      const zipRegex = /^\d{5}(-\d{4})?$/;
      return zipRegex.test(value);
    },
    message,
  }),

  state: (message = 'Please enter a valid 2-letter state code'): ValidationRule => ({
    validate: (value) => {
      if (!value.trim()) return true;
      return /^[A-Za-z]{2}$/.test(value);
    },
    message,
  }),

  match: (getOther: () => string, message = 'Fields do not match'): ValidationRule => ({
    validate: (value) => value === getOther(),
    message,
  }),

  pattern: (regex: RegExp, message: string): ValidationRule => ({
    validate: (value) => {
      if (!value.trim()) return true;
      return regex.test(value);
    },
    message,
  }),
};

/**
 * Validate a single field against its rules
 */
export function validateField(value: string, fieldRules: ValidationRule[]): string | undefined {
  for (const rule of fieldRules) {
    if (!rule.validate(value)) {
      return rule.message;
    }
  }
  return undefined;
}

/**
 * Validate all fields in a form
 */
export function validateForm(
  values: Record<string, string>,
  schema: FieldValidation
): ValidationErrors {
  const errors: ValidationErrors = {};

  for (const [fieldName, fieldRules] of Object.entries(schema)) {
    const value = values[fieldName] || '';
    const error = validateField(value, fieldRules);
    if (error) {
      errors[fieldName] = error;
    }
  }

  return errors;
}

/**
 * Check if form has any errors
 */
export function hasErrors(errors: ValidationErrors): boolean {
  return Object.values(errors).some((error) => error !== undefined);
}

/**
 * Format phone number as user types
 */
export function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

/**
 * Format currency as user types
 */
export function formatCurrency(value: string): string {
  const num = parseFloat(value.replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return '';
  return num.toFixed(2);
}
