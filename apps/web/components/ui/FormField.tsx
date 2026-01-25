'use client';

import { AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  touched?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * FormField wrapper that provides consistent label, error, and hint display
 */
export function FormField({
  label,
  error,
  required,
  touched,
  hint,
  children,
  className,
}: FormFieldProps) {
  const showError = error && touched;

  return (
    <div className={className}>
      <label className="block text-sm font-semibold text-gray-400 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {showError && (
        <p className="flex items-center gap-1.5 mt-1.5 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </p>
      )}
      {hint && !showError && (
        <p className="mt-1.5 text-sm text-gray-500">{hint}</p>
      )}
    </div>
  );
}

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  touched?: boolean;
  icon?: React.ReactNode;
}

/**
 * Text input with error state styling
 */
export function TextInput({
  error,
  touched,
  icon,
  className,
  ...props
}: TextInputProps) {
  const hasError = error && touched;

  return (
    <div className="relative">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
          {icon}
        </div>
      )}
      <input
        {...props}
        className={clsx(
          'w-full px-4 py-3 bg-navy-800 border rounded-lg text-white placeholder-gray-500 transition-colors min-h-[44px]',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30',
          icon && 'pl-10',
          hasError
            ? 'border-red-500 focus:border-red-500 focus-visible:ring-red-500/30'
            : 'border-white/10 focus:border-orange-500',
          className
        )}
        aria-invalid={hasError ? 'true' : 'false'}
      />
    </div>
  );
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  touched?: boolean;
}

/**
 * Text area with error state styling
 */
export function TextArea({
  error,
  touched,
  className,
  ...props
}: TextAreaProps) {
  const hasError = error && touched;

  return (
    <textarea
      {...props}
      className={clsx(
        'w-full px-4 py-3 bg-navy-800 border rounded-lg text-white placeholder-gray-500 transition-colors resize-none',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30',
        hasError
          ? 'border-red-500 focus:border-red-500 focus-visible:ring-red-500/30'
          : 'border-white/10 focus:border-orange-500',
        className
      )}
      aria-invalid={hasError ? 'true' : 'false'}
    />
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  touched?: boolean;
}

/**
 * Select with error state styling
 */
export function Select({
  error,
  touched,
  className,
  children,
  ...props
}: SelectProps) {
  const hasError = error && touched;

  return (
    <select
      {...props}
      className={clsx(
        'w-full px-4 py-3 bg-navy-800 border rounded-lg text-white transition-colors min-h-[44px]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30',
        hasError
          ? 'border-red-500 focus:border-red-500 focus-visible:ring-red-500/30'
          : 'border-white/10 focus:border-orange-500',
        className
      )}
      aria-invalid={hasError ? 'true' : 'false'}
    >
      {children}
    </select>
  );
}

interface FormErrorBannerProps {
  error?: string | null;
  className?: string;
}

/**
 * Banner for displaying form-level errors
 */
export function FormErrorBanner({ error, className }: FormErrorBannerProps) {
  if (!error) return null;

  return (
    <div
      className={clsx(
        'p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2',
        className
      )}
      role="alert"
    >
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      {error}
    </div>
  );
}
