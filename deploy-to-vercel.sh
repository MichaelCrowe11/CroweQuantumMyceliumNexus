#!/bin/bash

# Deploy QuantumMycelium Nexus to Vercel (Free)

echo "🚀 Deploying QuantumMycelium Nexus to Vercel"
echo "==========================================="

# Install Vercel CLI if not present
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

# Create vercel.json configuration
cat > vercel.json << 'EOF'
{
  "name": "quantum-mycelium-nexus",
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "frontend/build"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "https://api.mycelium-ei.io/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/frontend/$1"
    }
  ],
  "env": {
    "REACT_APP_API_URL": "https://api.mycelium-ei.io",
    "REACT_APP_ENVIRONMENT": "production"
  }
}
EOF

# Build frontend
echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Deploy to Vercel
echo "Deploying to Vercel..."
vercel --prod --yes

echo "✅ Frontend deployed to Vercel!"
echo ""
echo "Next steps:"
echo "1. Update DNS to point to Vercel"
echo "2. Configure custom domain in Vercel dashboard"
echo "3. Deploy API to Railway.app"