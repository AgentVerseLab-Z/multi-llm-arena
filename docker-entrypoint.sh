#!/bin/sh
set -e

echo "⏳ Waiting for PostgreSQL..."
# Prisma will handle the connection retry

echo "🔄 Running database migrations..."
npx prisma db push --skip-generate

echo "🌱 Seeding database (if needed)..."
npx tsx prisma/seed.ts 2>/dev/null || echo "  (already seeded, skipping)"

echo "🚀 Starting server..."
exec node server.js
