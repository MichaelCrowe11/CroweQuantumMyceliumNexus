#!/bin/bash

# CroweQuantumMyceliumNexus Deployment Script for Fly.io
# This script handles the complete deployment process

set -e

echo "🚀 Starting CroweQuantumMyceliumNexus deployment to Fly.io..."

# Check if flyctl is installed
if ! command -v flyctl &> /dev/null; then
    echo "❌ flyctl is not installed. Please install it first:"
    echo "   Visit: https://fly.io/docs/hands-on/install-flyctl/"
    exit 1
fi

# Check if user is logged in
if ! flyctl auth whoami &> /dev/null; then
    echo "🔐 Please log in to Fly.io:"
    flyctl auth login
fi

echo "📦 Building frontend..."
cd frontend
npm run build
cd ..

echo "🔧 Setting up environment variables..."
if [ ! -f .env.production ]; then
    cat > .env.production << EOF
# Production Environment Variables
NODE_ENV=production
REACT_APP_API_URL=https://your-app-name.fly.dev/api
REACT_APP_WS_URL=wss://your-app-name.fly.dev/ws
DATABASE_URL=postgresql://user:password@host:port/database
REDIS_URL=redis://localhost:6379
EOF
    echo "📝 Created .env.production - please update with your actual values"
fi

echo "🐳 Checking Docker configuration..."
if [ ! -f Dockerfile ]; then
    echo "⚠️  No Dockerfile found, using Dockerfile.fly"
    cp Dockerfile.fly Dockerfile
fi

echo "🛠️  Deploying to Fly.io..."
if [ ! -f fly.toml ]; then
    echo "🆕 Creating new Fly.io app..."
    flyctl launch --no-deploy --generate-name
else
    echo "🔄 Updating existing Fly.io app..."
    flyctl deploy
fi

echo "🎉 Deployment complete!"
echo "🌐 Your app should be available at: https://$(flyctl info --json | jq -r '.hostname')"
echo ""
echo "📋 Next steps:"
echo "   1. Update your environment variables if needed: flyctl secrets set KEY=value"
echo "   2. Set up your database: flyctl postgres create"
echo "   3. Monitor your app: flyctl logs"
echo "   4. Scale your app: flyctl scale count 1"