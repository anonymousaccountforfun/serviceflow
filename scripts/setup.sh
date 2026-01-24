#!/bin/bash

# ServiceFlow Setup Script

set -e

echo "============================================"
echo "ServiceFlow - Development Setup"
echo "============================================"
echo ""

# Check for pnpm
if ! command -v pnpm &> /dev/null; then
    echo "pnpm not found. Using npx pnpm..."
    PNPM="npx pnpm"
else
    PNPM="pnpm"
fi

# Install dependencies
echo "📦 Installing dependencies..."
$PNPM install

# Check for .env.local
if [ ! -f .env.local ]; then
    echo ""
    echo "⚙️  Creating .env.local from .env.example..."
    cp .env.example .env.local
    echo "   ✅ Created .env.local"
    echo ""
    echo "⚠️  IMPORTANT: You need to set up a database!"
    echo ""
    echo "   Quick option (Neon - free cloud PostgreSQL):"
    echo "   1. Go to https://neon.tech and sign up"
    echo "   2. Create a new project"
    echo "   3. Copy the connection string"
    echo "   4. Update DATABASE_URL in .env.local"
    echo ""
    echo "   Press Enter after you've updated DATABASE_URL..."
    read
fi

# Check if DATABASE_URL is set
source .env.local 2>/dev/null || true
if [ -z "$DATABASE_URL" ] || [ "$DATABASE_URL" == 'postgresql://postgres:password@localhost:5432/serviceflow' ]; then
    echo "⚠️  DATABASE_URL not configured in .env.local"
    echo "   Please update it with your database connection string."
    echo ""
    echo "   Options:"
    echo "   - Docker: docker-compose up -d (then use localhost)"
    echo "   - Neon: https://neon.tech (free cloud PostgreSQL)"
    echo "   - Supabase: https://supabase.com (free cloud PostgreSQL)"
    echo ""
    exit 1
fi

# Generate Prisma client
echo ""
echo "🔧 Generating Prisma client..."
$PNPM --filter @serviceflow/database db:generate

# Push schema to database
echo ""
echo "📊 Pushing schema to database..."
$PNPM --filter @serviceflow/database db:push

# Seed database
echo ""
echo "🌱 Seeding database with demo data..."
$PNPM --filter @serviceflow/database db:seed

echo ""
echo "============================================"
echo "✅ Setup complete!"
echo "============================================"
echo ""
echo "Start the development servers:"
echo "  $PNPM dev"
echo ""
echo "Test the missed call flow:"
echo "  npx tsx scripts/test-missed-call.ts"
echo ""
