'use client';

import { Bot } from 'lucide-react';

export interface AISettingsData {
  greeting: string;
  voiceEnabled: boolean;
}

interface AIPreviewStepProps {
  data: AISettingsData;
  onChange: (data: AISettingsData) => void;
  businessName: string;
  loadSampleData: boolean;
  onLoadSampleDataChange: (load: boolean) => void;
}

export function AIPreviewStep({
  data,
  onChange,
  businessName,
  loadSampleData,
  onLoadSampleDataChange,
}: AIPreviewStepProps) {
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

        {/* Sample Data Toggle */}
        <div className="pt-4 border-t border-white/10">
          <div className="flex items-center gap-3 p-4 bg-navy-800 rounded-lg border border-white/10">
            <button
              type="button"
              onClick={() => onLoadSampleDataChange(!loadSampleData)}
              className={`
                w-12 h-6 rounded-full transition-all relative flex-shrink-0
                ${loadSampleData ? 'bg-green-500' : 'bg-white/20'}
              `}
            >
              <div
                className={`
                  w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all
                  ${loadSampleData ? 'left-6' : 'left-0.5'}
                `}
              />
            </button>
            <div className="flex-1">
              <p className="text-white font-medium">Load Sample Data</p>
              <p className="text-sm text-gray-400">
                See ServiceFlow in action with demo customers, jobs, and conversations
              </p>
            </div>
          </div>
          {loadSampleData && (
            <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-green-400 text-sm">
                We'll add sample data including:
              </p>
              <ul className="text-green-400/80 text-sm mt-2 space-y-1 ml-4">
                <li>• 5 sample customers</li>
                <li>• 8 jobs (leads, scheduled, completed)</li>
                <li>• 3 conversations with AI examples</li>
                <li>• 4 customer reviews</li>
              </ul>
              <p className="text-green-400/60 text-xs mt-2">
                You can remove sample data later from Settings.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
