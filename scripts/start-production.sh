#!/bin/sh

# Production startup script for NestJS application
# This script handles database migrations and starts the application

set -e

echo "🚀 Starting TecnoAging API in production mode..."

# Run database migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy

echo "🎯 Starting the application..."
exec "$@"
