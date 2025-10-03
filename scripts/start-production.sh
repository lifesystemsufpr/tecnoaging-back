#!/bin/bash

# Production startup script for NestJS application
# This script handles database migrations and starts the application
# Designed to run directly on Azure VM without Docker

set -e

echo "🚀 Starting TecnoAging API in production mode..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Please create one based on env.example"
    echo "   You can copy the example: cp env.example .env"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy

# Build the application if dist doesn't exist
if [ ! -d "dist" ]; then
    echo "🏗️  Building the application..."
    npm run build
fi

echo "✅ Setup complete! Ready to start the application."
echo "💡 To start with PM2: pm2 start ecosystem.config.js"
echo "💡 To start directly: npm run start:prod"
