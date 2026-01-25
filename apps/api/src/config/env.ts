/**
 * Environment Variable Configuration
 *
 * Validates required and optional environment variables at startup.
 * Fails fast with clear error messages if required variables are missing.
 */

interface EnvConfig {
  // Required variables
  DATABASE_URL: string;
  CLERK_SECRET_KEY: string;

  // Optional but recommended
  NODE_ENV: string;
  PORT: string;
  API_URL: string;
  CORS_ORIGIN: string;

  // Twilio (optional - features disabled without)
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;

  // OpenAI (optional - AI features disabled without)
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;

  // Vapi (optional - voice AI disabled without)
  VAPI_API_KEY?: string;
  VAPI_WEBHOOK_SECRET?: string;

  // Google (optional - Google reviews disabled without)
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;

  // Stripe (optional - payments disabled without)
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
}

interface ValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

/**
 * Required environment variables - app won't start without these
 */
const REQUIRED_VARS = [
  'DATABASE_URL',
  'CLERK_SECRET_KEY',
] as const;

/**
 * Optional but recommended variables - app will warn if missing
 */
const RECOMMENDED_VARS = [
  { name: 'API_URL', feature: 'webhook callbacks' },
  { name: 'CORS_ORIGIN', feature: 'CORS configuration' },
] as const;

/**
 * Feature-specific variables - features disabled without these
 */
const FEATURE_VARS = [
  { names: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN'], feature: 'Phone/SMS' },
  { names: ['OPENAI_API_KEY'], feature: 'AI SMS responses' },
  { names: ['VAPI_API_KEY'], feature: 'Voice AI' },
  { names: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'], feature: 'Google Reviews' },
  { names: ['STRIPE_SECRET_KEY'], feature: 'Payments' },
] as const;

/**
 * Validate environment variables
 */
function validateEnv(): ValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const varName of REQUIRED_VARS) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  // Check recommended variables
  for (const { name, feature } of RECOMMENDED_VARS) {
    if (!process.env[name]) {
      warnings.push(`${name} not set - ${feature} may not work correctly`);
    }
  }

  // Check feature-specific variables
  for (const { names, feature } of FEATURE_VARS) {
    const allMissing = names.every((name) => !process.env[name]);
    const someMissing = names.some((name) => !process.env[name]);

    if (allMissing) {
      warnings.push(`${feature} disabled - set ${names.join(', ')} to enable`);
    } else if (someMissing) {
      const missingNames = names.filter((name) => !process.env[name]);
      warnings.push(`${feature} partially configured - missing: ${missingNames.join(', ')}`);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * Initialize and validate environment
 * Call this at app startup - will exit process if required vars missing
 */
export function initEnv(): void {
  console.log('🔧 Validating environment configuration...');

  const result = validateEnv();

  // Log warnings for optional/feature variables
  if (result.warnings.length > 0) {
    console.log('\n⚠️  Environment warnings:');
    for (const warning of result.warnings) {
      console.log(`   - ${warning}`);
    }
    console.log('');
  }

  // Fail if required variables are missing
  if (!result.valid) {
    console.error('\n❌ Missing required environment variables:');
    for (const varName of result.missing) {
      console.error(`   - ${varName}`);
    }
    console.error('\nPlease set these variables in your .env file or environment.');
    console.error('See .env.example for reference.\n');
    process.exit(1);
  }

  console.log('✅ Environment configuration valid\n');
}

/**
 * Get typed environment variable (with default)
 */
export function getEnv(key: keyof EnvConfig, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Check if a feature is enabled (all its env vars are set)
 */
export function isFeatureEnabled(feature: 'twilio' | 'openai' | 'vapi' | 'google' | 'stripe'): boolean {
  switch (feature) {
    case 'twilio':
      return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
    case 'openai':
      return !!process.env.OPENAI_API_KEY;
    case 'vapi':
      return !!process.env.VAPI_API_KEY;
    case 'google':
      return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    case 'stripe':
      return !!process.env.STRIPE_SECRET_KEY;
    default:
      return false;
  }
}
