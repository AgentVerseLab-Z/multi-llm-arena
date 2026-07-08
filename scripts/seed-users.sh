#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is required"
  exit 1
fi

echo "🌱 Seeding default users..."
npx tsx prisma/seed.ts
