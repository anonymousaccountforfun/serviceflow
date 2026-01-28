'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Phone,
  Clock,
  Bot,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
} from 'lucide-react';
import { useAuthContext } from '../../lib/auth/context';
import { toast } from 'sonner';
import { useOnboardingPersistence } from '../../hooks/useOnboardingPersistence';
import {
  StepIndicator,
  BusinessProfileStep,
  PhoneSetupStep,
  BusinessHoursStep,
  AIPreviewStep,
  type BusinessProfileData,
  type PhoneSetupData,
  type BusinessHoursData,
  type AISettingsData,
  type ProvisionedNumber,
} from './components';

// Default business hours
const DEFAULT_BUSINESS_HOURS: BusinessHoursData = {
  monday: { open: '08:00', close: '17:00' },
  tuesday: { open: '08:00', close: '17:00' },
  wednesday: { open: '08:00', close: '17:00' },
  thursday: { open: '08:00', close: '17:00' },
  friday: { open: '08:00', close: '17:00' },
  saturday: { open: null, close: null },
  sunday: { open: null, close: null },
};

// Default phone setup
const DEFAULT_PHONE_SETUP: PhoneSetupData = {
  areaCode: '',
  phoneNumber: '',
  useExisting: false,
  selectedNumber: '',
  provisionedNumber: null,
};

// Default AI settings
const DEFAULT_AI_SETTINGS: AISettingsData = {
  greeting: '',
  voiceEnabled: true,
};

export default function OnboardingPage() {
  const router = useRouter();
  const { organization, refetch } = useAuthContext();

  // Persistence hook
  const {
    isLoaded: persistenceLoaded,
    savedProgress,
    saveProgress,
    clearProgress,
    hasSavedProgress,
    getTimeRemaining,
  } = useOnboardingPersistence();

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasRestoredProgress, setHasRestoredProgress] = useState(false);

  // Form state
  const [businessProfile, setBusinessProfile] = useState<BusinessProfileData>({
    businessName: organization?.name || '',
    serviceType: '',
  });

  const [phoneSetup, setPhoneSetup] = useState<PhoneSetupData>(DEFAULT_PHONE_SETUP);
  const [businessHours, setBusinessHours] = useState<BusinessHoursData>(DEFAULT_BUSINESS_HOURS);
  const [aiSettings, setAiSettings] = useState<AISettingsData>(DEFAULT_AI_SETTINGS);

  // Sample data toggle (default off)
  const [loadSampleData, setLoadSampleData] = useState(false);

  // Detect user's timezone on mount
  const [detectedTimezone, setDetectedTimezone] = useState('America/New_York');
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) {
        setDetectedTimezone(tz);
      }
    } catch {
      // Fallback to default timezone if detection fails
    }
  }, []);

  // Restore saved progress on mount
  useEffect(() => {
    if (persistenceLoaded && savedProgress && !hasRestoredProgress) {
      setCurrentStep(savedProgress.currentStep);
      setBusinessProfile(savedProgress.businessProfile);
      setPhoneSetup(savedProgress.phoneSetup);
      setBusinessHours(savedProgress.businessHours);
      setAiSettings(savedProgress.aiSettings);
      setLoadSampleData(savedProgress.loadSampleData);
      if (savedProgress.timezone) {
        setDetectedTimezone(savedProgress.timezone);
      }
      setHasRestoredProgress(true);

      const timeRemaining = getTimeRemaining();
      if (timeRemaining) {
        toast.info(`Welcome back! Your progress was saved. (expires in ${timeRemaining})`);
      }
    }
  }, [persistenceLoaded, savedProgress, hasRestoredProgress, getTimeRemaining]);

  // Auto-save progress when form state changes
  useEffect(() => {
    // Don't save until initial load is complete
    if (!persistenceLoaded || !hasRestoredProgress && hasSavedProgress) return;

    saveProgress({
      currentStep,
      businessProfile,
      phoneSetup,
      businessHours,
      aiSettings,
      loadSampleData,
      timezone: detectedTimezone,
    });
  }, [
    persistenceLoaded,
    hasRestoredProgress,
    hasSavedProgress,
    currentStep,
    businessProfile,
    phoneSetup,
    businessHours,
    aiSettings,
    loadSampleData,
    detectedTimezone,
    saveProgress,
  ]);

  const steps = [
    { icon: Building2, label: 'Business' },
    { icon: Phone, label: 'Phone' },
    { icon: Clock, label: 'Hours' },
    { icon: Bot, label: 'AI' },
  ];

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return businessProfile.businessName.trim() && businessProfile.serviceType;
      case 1:
        // For new number: require a provisioned number
        // For existing: require a phone number input
        return phoneSetup.useExisting
          ? phoneSetup.phoneNumber.trim().length > 0
          : phoneSetup.provisionedNumber !== null;
      case 2:
        return true; // Hours are always valid
      case 3:
        return true; // AI settings are always valid
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      setIsSubmitting(true);
      try {
        const response = await fetch('/api/onboarding/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessProfile,
            phoneSetup,
            businessHours,
            aiSettings,
            timezone: detectedTimezone,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to complete onboarding');
        }

        // Seed sample data if requested (non-blocking - continue even if it fails)
        if (loadSampleData) {
          try {
            const seedResponse = await fetch('/api/onboarding/seed-sample-data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });

            if (seedResponse.ok) {
              toast.success('Sample data loaded successfully!');
            } else {
              // Don't block onboarding completion, just warn
              console.warn('Failed to seed sample data');
            }
          } catch (seedError) {
            console.warn('Sample data seeding error:', seedError);
            // Continue anyway - sample data is optional
          }
        }

        // Clear saved progress on successful completion
        clearProgress();

        // Refresh auth context to get updated org settings
        await refetch();

        // Redirect to dashboard
        router.push('/dashboard');
      } catch (error) {
        console.error('Onboarding error:', error);
        toast.error('Failed to complete setup. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/onboarding/skip', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to skip onboarding');
      }

      // Clear saved progress
      clearProgress();

      // Refresh auth context to get updated org settings
      await refetch();

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Skip onboarding error:', error);
      toast.error('Failed to skip setup. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">
            ServiceFlow
          </span>
        </div>

        {/* Step indicator */}
        <StepIndicator currentStep={currentStep} steps={steps} />

        {/* Step content */}
        <div className="bg-navy-800 border border-white/10 rounded-xl p-6 mb-6">
          {currentStep === 0 && (
            <BusinessProfileStep data={businessProfile} onChange={setBusinessProfile} />
          )}
          {currentStep === 1 && (
            <PhoneSetupStep data={phoneSetup} onChange={setPhoneSetup} />
          )}
          {currentStep === 2 && (
            <BusinessHoursStep
              data={businessHours}
              onChange={setBusinessHours}
              timezone={detectedTimezone}
              onTimezoneChange={setDetectedTimezone}
            />
          )}
          {currentStep === 3 && (
            <AIPreviewStep
              data={aiSettings}
              onChange={setAiSettings}
              businessName={businessProfile.businessName}
              loadSampleData={loadSampleData}
              onLoadSampleDataChange={setLoadSampleData}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed() || isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-accent text-white hover:bg-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Setting up...
              </>
            ) : currentStep === steps.length - 1 ? (
              <>
                Complete Setup
                <Check className="w-4 h-4" />
              </>
            ) : (
              <>
                Continue
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Skip option */}
        <p className="text-center text-gray-500 text-sm mt-6">
          <button
            type="button"
            onClick={handleSkip}
            disabled={isSubmitting}
            className="hover:text-gray-400 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Skipping...' : 'Skip for now'}
          </button>
        </p>
      </div>
    </div>
  );
}
