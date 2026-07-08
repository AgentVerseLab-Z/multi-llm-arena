#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is required"
  exit 1
fi

echo "🔄 Initializing database schema..."
npx prisma db push --url "$DATABASE_URL"
