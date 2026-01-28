/**
 * Onboarding Form Persistence Hook
 *
 * Saves onboarding progress to localStorage for session recovery.
 * Automatically handles expiry (7 days) and data validation.
 */

import { useCallback, useEffect, useState } from 'react';

// Storage key for onboarding progress
const STORAGE_KEY = 'serviceflow_onboarding_progress';

// Expiry duration: 7 days in milliseconds
const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

// Provisioned phone number type
interface ProvisionedNumber {
  id: string;
  number: string;
  label: string;
}

// Types for onboarding data
export interface OnboardingProgress {
  currentStep: number;
  businessProfile: {
    businessName: string;
    serviceType: string;
  };
  phoneSetup: {
    areaCode: string;
    phoneNumber: string;
    useExisting: boolean;
    selectedNumber: string;
    provisionedNumber: ProvisionedNumber | null;
  };
  businessHours: {
    [key: string]: { open: string | null; close: string | null };
  };
  aiSettings: {
    greeting: string;
    voiceEnabled: boolean;
  };
  loadSampleData: boolean;
  timezone: string;
  savedAt: number;
}

// Helper to check if localStorage is available
function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

// Validate that loaded data has the expected structure
function isValidProgress(data: unknown): data is OnboardingProgress {
  if (!data || typeof data !== 'object') return false;

  const progress = data as Record<string, unknown>;

  return (
    typeof progress.currentStep === 'number' &&
    progress.currentStep >= 0 &&
    progress.currentStep <= 3 &&
    typeof progress.savedAt === 'number' &&
    progress.businessProfile !== undefined &&
    progress.phoneSetup !== undefined &&
    progress.businessHours !== undefined &&
    progress.aiSettings !== undefined
  );
}

// Check if progress has expired
function isExpired(savedAt: number): boolean {
  return Date.now() - savedAt > EXPIRY_MS;
}

export function useOnboardingPersistence() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [savedProgress, setSavedProgress] = useState<OnboardingProgress | null>(null);

  // Load progress from localStorage on mount
  useEffect(() => {
    if (!isLocalStorageAvailable()) {
      setIsLoaded(true);
      return;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setIsLoaded(true);
        return;
      }

      const parsed = JSON.parse(stored);

      if (!isValidProgress(parsed)) {
        // Invalid data structure, clear it
        localStorage.removeItem(STORAGE_KEY);
        setIsLoaded(true);
        return;
      }

      if (isExpired(parsed.savedAt)) {
        // Expired data, clear it
        localStorage.removeItem(STORAGE_KEY);
        setIsLoaded(true);
        return;
      }

      setSavedProgress(parsed);
    } catch {
      // JSON parse error or other issue, clear storage
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore removal error
      }
    }

    setIsLoaded(true);
  }, []);

  // Save progress to localStorage
  const saveProgress = useCallback((progress: Omit<OnboardingProgress, 'savedAt'>) => {
    if (!isLocalStorageAvailable()) return;

    try {
      const dataToSave: OnboardingProgress = {
        ...progress,
        savedAt: Date.now(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      setSavedProgress(dataToSave);
    } catch {
      // Ignore save errors (e.g., quota exceeded)
      console.warn('Failed to save onboarding progress to localStorage');
    }
  }, []);

  // Clear progress from localStorage
  const clearProgress = useCallback(() => {
    if (!isLocalStorageAvailable()) return;

    try {
      localStorage.removeItem(STORAGE_KEY);
      setSavedProgress(null);
    } catch {
      // Ignore removal errors
    }
  }, []);

  // Load saved progress (returns null if none available)
  const loadProgress = useCallback((): OnboardingProgress | null => {
    return savedProgress;
  }, [savedProgress]);

  // Get formatted time remaining for display
  const getTimeRemaining = useCallback((): string | null => {
    if (!savedProgress) return null;

    const remaining = EXPIRY_MS - (Date.now() - savedProgress.savedAt);
    if (remaining <= 0) return null;

    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    if (days > 0) return `${days} day${days !== 1 ? 's' : ''}`;

    const hours = Math.floor(remaining / (60 * 60 * 1000));
    if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;

    const minutes = Math.floor(remaining / (60 * 1000));
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }, [savedProgress]);

  return {
    isLoaded,
    savedProgress,
    saveProgress,
    loadProgress,
    clearProgress,
    getTimeRemaining,
    hasSavedProgress: savedProgress !== null,
  };
}
