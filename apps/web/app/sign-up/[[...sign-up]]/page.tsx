import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">
            ServiceFlow
          </span>
        </div>

        {/* Tagline */}
        <p className="text-center text-gray-400 mb-6">
          Never miss another call, job, or dollar
        </p>

        {/* Clerk Sign Up Component */}
        <SignUp
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'bg-navy-800 border border-white/10 shadow-xl',
              headerTitle: 'text-white',
              headerSubtitle: 'text-gray-400',
              socialButtonsBlockButton: 'bg-white/5 border-white/10 text-white hover:bg-white/10',
              socialButtonsBlockButtonText: 'text-white',
              dividerLine: 'bg-white/10',
              dividerText: 'text-gray-500',
              formFieldLabel: 'text-gray-300',
              formFieldInput: 'bg-navy-900 border-white/10 text-white placeholder:text-gray-500',
              formButtonPrimary: 'bg-accent hover:bg-accent/90 text-white',
              footerActionLink: 'text-accent hover:text-accent/80',
              identityPreviewText: 'text-white',
              identityPreviewEditButton: 'text-accent',
              formFieldInputShowPasswordButton: 'text-gray-400',
              alertText: 'text-white',
              formFieldSuccessText: 'text-green-400',
              formFieldErrorText: 'text-red-400',
            },
          }}
          afterSignUpUrl="/onboarding"
          signInUrl="/sign-in"
        />

        {/* Benefits */}
        <div className="mt-8 space-y-3">
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-green-400 text-xs">✓</span>
            </div>
            <span>30-day free trial, no credit card required</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-green-400 text-xs">✓</span>
            </div>
            <span>AI answers calls and texts back missed calls</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-green-400 text-xs">✓</span>
            </div>
            <span>Get paid faster with instant invoicing</span>
          </div>
        </div>
      </div>
    </div>
  );
}
