/**
 * Jest Environment Setup
 *
 * This file runs BEFORE test files are imported to set up environment variables.
 * Must be in setupFiles (not setupFilesAfterEnv) to run before module imports.
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Set required environment variables for API to start
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.CLERK_SECRET_KEY = 'test_clerk_secret_key_123';
process.env.TWILIO_ACCOUNT_SID = 'ACtest123456789';
process.env.TWILIO_AUTH_TOKEN = 'test_twilio_auth_token_123';
process.env.TWILIO_PHONE_NUMBER = '+15551234567';

// Optional env vars with test values
process.env.VAPI_API_KEY = 'test_vapi_key';
process.env.OPENAI_API_KEY = 'test_openai_key';
process.env.ANTHROPIC_API_KEY = 'test_anthropic_key';
process.env.SENTRY_DSN = '';
