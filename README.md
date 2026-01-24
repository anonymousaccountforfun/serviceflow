# ServiceFlow

AI-powered growth automation platform for home services businesses.

## Project Structure

```
serviceflow/
├── apps/
│   ├── web/          # Next.js frontend (port 3000)
│   ├── api/          # Express API server (port 3001)
│   └── mobile/       # React Native app (future)
├── packages/
│   ├── shared/       # Shared types, utils, constants
│   ├── database/     # Prisma schema and client
│   └── ui/           # Shared UI components (future)
├── docs/             # Documentation
└── scripts/          # Build and deployment scripts
```

## Prerequisites

- Node.js 20+
- pnpm 8+
- PostgreSQL 15+ (or Supabase)
- Redis (or Upstash)

## Quick Start

### 1. Install dependencies

```bash
pnpm install
# or if pnpm is not installed:
npx pnpm install
```

### 2. Set up database

Choose one of these options:

**Option A: Docker (Recommended)**
```bash
docker-compose up -d
```

**Option B: Neon (Free cloud PostgreSQL)**
1. Sign up at https://neon.tech
2. Create a new project
3. Copy the connection string

**Option C: Supabase (Free cloud PostgreSQL)**
1. Sign up at https://supabase.com
2. Create a new project
3. Go to Settings > Database and copy the connection string

### 3. Set up environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your database URL:
```bash
# For Docker:
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/serviceflow"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/serviceflow"

# For Neon/Supabase: paste your connection string
```

### 4. Initialize database

```bash
# Generate Prisma client
pnpm db:generate

# Push schema to database (creates tables)
pnpm db:push

# Seed with demo data (organization, templates, sample customers)
pnpm db:seed
```

### 5. Start development servers

```bash
pnpm dev
```

This starts:
- Web app: http://localhost:3000
- API server: http://localhost:3001

### 6. Test the missed call flow

```bash
npx tsx scripts/test-missed-call.ts
```

## Environment Variables

See `.env.example` for all required variables. Key ones:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `ANTHROPIC_API_KEY` | Claude API key |
| `CLERK_SECRET_KEY` | Clerk authentication |
| `STRIPE_SECRET_KEY` | Stripe payments |

## Development

### Database

```bash
# Open Prisma Studio
pnpm db:studio

# Create migration
pnpm --filter @serviceflow/database db:migrate

# Reset database
pnpm --filter @serviceflow/database db:reset
```

### Testing

```bash
pnpm test
```

### Linting

```bash
pnpm lint
```

## Architecture

### Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Express, TypeScript
- **Database**: PostgreSQL (Prisma ORM)
- **Cache**: Redis
- **Auth**: Clerk
- **Payments**: Stripe
- **Telephony**: Twilio
- **Voice AI**: Vapi
- **LLM**: Claude (Anthropic)

### Key Services

1. **Telephony Service** - Handles calls, SMS, webhooks
2. **AI Service** - LLM orchestration for voice and text
3. **Review Service** - Review requests,monitoring, responses
4. **Sequence Service** - Automated follow-up workflows

## API Endpoints

### Health
- `GET /health` - Health check

### Customers
- `GET /api/customers` - List customers
- `GET /api/customers/:id` - Get customer
- `POST /api/customers` - Create customer
- `PATCH /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Jobs
- `GET /api/jobs` - List jobs
- `GET /api/jobs/:id` - Get job
- `POST /api/jobs` - Create job
- `PATCH /api/jobs/:id` - Update job
- `DELETE /api/jobs/:id` - Delete job

### Webhooks
- `POST /webhooks/twilio/voice` - Incoming calls
- `POST /webhooks/twilio/voice/status` - Call status updates
- `POST /webhooks/twilio/sms` - Incoming SMS
- `POST /webhooks/twilio/sms/status` - SMS status updates

## Deployment

### Vercel (Web)

```bash
vercel --prod
```

### Railway (API)

```bash
railway up
```

## License

Proprietary - All rights reserved.
