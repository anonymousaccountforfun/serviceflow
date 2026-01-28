'use client';

import { Wrench, Flame, Zap, Home } from 'lucide-react';

const SERVICE_TYPES = [
  { value: 'plumber', label: 'Plumber', icon: Wrench },
  { value: 'hvac', label: 'HVAC', icon: Flame },
  { value: 'electrician', label: 'Electrician', icon: Zap },
  { value: 'other', label: 'Other', icon: Home },
];

export interface BusinessProfileData {
  businessName: string;
  serviceType: string;
}

interface BusinessProfileStepProps {
  data: BusinessProfileData;
  onChange: (data: BusinessProfileData) => void;
}

export function BusinessProfileStep({ data, onChange }: BusinessProfileStepProps) {
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
