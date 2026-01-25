'use client';

import { useState } from 'react';
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
  Wrench,
  Flame,
  Zap,
  Home,
} from 'lucide-react';
import { useAuthContext } from '../../lib/auth/context';

// Step indicator component
function StepIndicator({ currentStep, steps }: { currentStep: number; steps: { icon: any; label: string }[] }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isComplete = index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <div key={index} className="flex items-center">
            <div
              className={`
                w-10 h-10 rounded-full flex items-center justify-center transition-all
                ${isComplete ? 'bg-green-500 text-white' : ''}
                ${isCurrent ? 'bg-accent text-white' : ''}
                ${!isComplete && !isCurrent ? 'bg-white/10 text-gray-500' : ''}
              `}
            >
              {isComplete ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-12 h-0.5 mx-1 ${isComplete ? 'bg-green-500' : 'bg-white/10'}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Service type options
const SERVICE_TYPES = [
  { value: 'plumber', label: 'Plumber', icon: Wrench },
  { value: 'hvac', label: 'HVAC', icon: Flame },
  { value: 'electrician', label: 'Electrician', icon: Zap },
  { value: 'other', label: 'Other', icon: Home },
];

// Step 1: Business Profile
function BusinessProfileStep({
  data,
  onChange,
}: {
  data: { businessName: string; serviceType: string };
  onChange: (data: { businessName: string; serviceType: string }) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Tell us about your business</h2>
        <p className="text-gray-400">This helps us customize ServiceFlow for you.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Business Name
          </label>
          <input
            type="text"
            value={data.businessName}
            onChange={(e) => onChange({ ...data, businessName: e.target.value })}
            placeholder="e.g., Mike's Plumbing"
            className="w-full px-4 py-3 bg-navy-800 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            What type of service do you provide?
          </label>
          <div className="grid grid-cols-2 gap-3">
            {SERVICE_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = data.serviceType === type.value;

              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => onChange({ ...data, serviceType: type.value })}
                  className={`
                    flex items-center gap-3 p-4 rounded-lg border transition-all
                    ${isSelected
                      ? 'bg-accent/20 border-accent text-white'
                      : 'bg-navy-800 border-white/10 text-gray-400 hover:border-white/20'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 2: Phone Setup
function PhoneSetupStep({
  data,
  onChange,
}: {
  data: { areaCode: string; phoneNumber: string; useExisting: boolean };
  onChange: (data: { areaCode: string; phoneNumber: string; useExisting: boolean }) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Set up your business phone</h2>
        <p className="text-gray-400">This number will handle incoming calls and texts.</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onChange({ ...data, useExisting: false })}
            className={`
              p-4 rounded-lg border transition-all text-left
              ${!data.useExisting
                ? 'bg-accent/20 border-accent text-white'
                : 'bg-navy-800 border-white/10 text-gray-400 hover:border-white/20'
              }
            `}
          >
            <div className="font-medium mb-1">Get a new number</div>
            <div className="text-sm text-gray-400">We'll provision a number for you</div>
          </button>

          <button
            type="button"
            onClick={() => onChange({ ...data, useExisting: true })}
            className={`
              p-4 rounded-lg border transition-all text-left
              ${data.useExisting
                ? 'bg-accent/20 border-accent text-white'
                : 'bg-navy-800 border-white/10 text-gray-400 hover:border-white/20'
              }
            `}
          >
            <div className="font-medium mb-1">Use existing number</div>
            <div className="text-sm text-gray-400">Connect your Twilio number</div>
          </button>
        </div>

        {!data.useExisting ? (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Preferred Area Code
            </label>
            <input
              type="text"
              value={data.areaCode}
              onChange={(e) => onChange({ ...data, areaCode: e.target.value.replace(/\D/g, '').slice(0, 3) })}
              placeholder="e.g., 512"
              maxLength={3}
              className="w-full px-4 py-3 bg-navy-800 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-2">
              We'll find an available number in this area code.
            </p>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Your Twilio Phone Number
            </label>
            <input
              type="tel"
              value={data.phoneNumber}
              onChange={(e) => onChange({ ...data, phoneNumber: e.target.value })}
              placeholder="+1 (555) 123-4567"
              className="w-full px-4 py-3 bg-navy-800 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-2">
              We'll configure this number to work with ServiceFlow.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Step 3: Business Hours
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function BusinessHoursStep({
  data,
  onChange,
}: {
  data: { [key: string]: { open: string | null; close: string | null } };
  onChange: (data: { [key: string]: { open: string | null; close: string | null } }) => void;
}) {
  const setPreset = (preset: 'weekdays' | 'everyday' | 'custom') => {
    if (preset === 'weekdays') {
      const newData: { [key: string]: { open: string | null; close: string | null } } = {};
      DAYS.forEach((day) => {
        const isWeekday = !['Saturday', 'Sunday'].includes(day);
        newData[day.toLowerCase()] = isWeekday
          ? { open: '08:00', close: '17:00' }
          : { open: null, close: null };
      });
      onChange(newData);
    } else if (preset === 'everyday') {
      const newData: { [key: string]: { open: string | null; close: string | null } } = {};
      DAYS.forEach((day) => {
        newData[day.toLowerCase()] = { open: '08:00', close: '18:00' };
      });
      onChange(newData);
    }
  };

  const toggleDay = (day: string) => {
    const key = day.toLowerCase();
    const current = data[key];
    if (current?.open) {
      onChange({ ...data, [key]: { open: null, close: null } });
    } else {
      onChange({ ...data, [key]: { open: '08:00', close: '17:00' } });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Set your business hours</h2>
        <p className="text-gray-400">We'll use this to customize AI responses.</p>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setPreset('weekdays')}
          className="px-4 py-2 rounded-lg bg-navy-800 border border-white/10 text-gray-300 hover:border-white/20 text-sm"
        >
          Mon-Fri 8-5
        </button>
        <button
          type="button"
          onClick={() => setPreset('everyday')}
          className="px-4 py-2 rounded-lg bg-navy-800 border border-white/10 text-gray-300 hover:border-white/20 text-sm"
        >
          7 Days 8-6
        </button>
      </div>

      <div className="space-y-2">
        {DAYS.map((day) => {
          const key = day.toLowerCase();
          const hours = data[key] || { open: null, close: null };
          const isOpen = hours.open !== null;

          return (
            <div
              key={day}
              className="flex items-center gap-4 p-3 bg-navy-800 rounded-lg"
            >
              <button
                type="button"
                onClick={() => toggleDay(day)}
                className={`
                  w-6 h-6 rounded flex items-center justify-center transition-all
                  ${isOpen ? 'bg-accent text-white' : 'bg-white/10 text-gray-500'}
                `}
              >
                {isOpen && <Check className="w-4 h-4" />}
              </button>

              <span className="w-24 text-gray-300 font-medium">{day}</span>

              {isOpen ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    value={hours.open || '08:00'}
                    onChange={(e) =>
                      onChange({ ...data, [key]: { ...hours, open: e.target.value } })
                    }
                    className="px-3 py-1.5 bg-navy-900 border border-white/10 rounded text-white text-sm"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="time"
                    value={hours.close || '17:00'}
                    onChange={(e) =>
                      onChange({ ...data, [key]: { ...hours, close: e.target.value } })
                    }
                    className="px-3 py-1.5 bg-navy-900 border border-white/10 rounded text-white text-sm"
                  />
                </div>
              ) : (
                <span className="text-gray-500 text-sm">Closed</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Step 4: AI Preview
function AIPreviewStep({
  data,
  onChange,
  businessName,
}: {
  data: { greeting: string; voiceEnabled: boolean };
  onChange: (data: { greeting: string; voiceEnabled: boolean }) => void;
  businessName: string;
}) {
  const defaultGreeting = `Hi, thanks for calling ${businessName || 'us'}! We're helping another customer right now, but we'll get back to you shortly. Can I get your name and what you're calling about?`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Preview your AI assistant</h2>
        <p className="text-gray-400">This is how your AI will greet callers.</p>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-navy-800 rounded-lg border border-white/10">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-400 mb-1">AI Assistant</p>
              <p className="text-white">{data.greeting || defaultGreeting}</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Customize Greeting (optional)
          </label>
          <textarea
            value={data.greeting}
            onChange={(e) => onChange({ ...data, greeting: e.target.value })}
            placeholder={defaultGreeting}
            rows={4}
            className="w-full px-4 py-3 bg-navy-800 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
          />
        </div>

        <div className="flex items-center gap-3 p-4 bg-navy-800 rounded-lg border border-white/10">
          <button
            type="button"
            onClick={() => onChange({ ...data, voiceEnabled: !data.voiceEnabled })}
            className={`
              w-12 h-6 rounded-full transition-all relative
              ${data.voiceEnabled ? 'bg-accent' : 'bg-white/20'}
            `}
          >
            <div
              className={`
                w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all
                ${data.voiceEnabled ? 'left-6' : 'left-0.5'}
              `}
            />
          </button>
          <div>
            <p className="text-white font-medium">AI Voice Answering</p>
            <p className="text-sm text-gray-400">Let AI answer calls when you're busy</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main onboarding page
export default function OnboardingPage() {
  const router = useRouter();
  const { organization, refetch } = useAuthContext();

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [businessProfile, setBusinessProfile] = useState({
    businessName: organization?.name || '',
    serviceType: '',
  });

  const [phoneSetup, setPhoneSetup] = useState({
    areaCode: '',
    phoneNumber: '',
    useExisting: false,
  });

  const [businessHours, setBusinessHours] = useState<{
    [key: string]: { open: string | null; close: string | null };
  }>({
    monday: { open: '08:00', close: '17:00' },
    tuesday: { open: '08:00', close: '17:00' },
    wednesday: { open: '08:00', close: '17:00' },
    thursday: { open: '08:00', close: '17:00' },
    friday: { open: '08:00', close: '17:00' },
    saturday: { open: null, close: null },
    sunday: { open: null, close: null },
  });

  const [aiSettings, setAiSettings] = useState({
    greeting: '',
    voiceEnabled: true,
  });

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
        return phoneSetup.useExisting ? phoneSetup.phoneNumber.trim() : phoneSetup.areaCode.length === 3;
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
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to complete onboarding');
        }

        // Refresh auth context to get updated org settings
        await refetch();

        // Redirect to dashboard
        router.push('/dashboard');
      } catch (error) {
        console.error('Onboarding error:', error);
        alert('Failed to complete setup. Please try again.');
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
            <BusinessHoursStep data={businessHours} onChange={setBusinessHours} />
          )}
          {currentStep === 3 && (
            <AIPreviewStep
              data={aiSettings}
              onChange={setAiSettings}
              businessName={businessProfile.businessName}
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
            onClick={() => router.push('/dashboard')}
            className="hover:text-gray-400 transition-colors"
          >
            Skip for now
          </button>
        </p>
      </div>
    </div>
  );
}
