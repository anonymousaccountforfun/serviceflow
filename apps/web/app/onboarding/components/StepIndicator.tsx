'use client';

import { Check, LucideIcon } from 'lucide-react';

interface Step {
  icon: LucideIcon;
  label: string;
}

interface StepIndicatorProps {
  currentStep: number;
  steps: Step[];
}

export function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
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
