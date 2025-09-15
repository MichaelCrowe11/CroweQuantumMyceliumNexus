#!/bin/bash

echo "Setting up Railway deployment for QuantumMycelium Nexus..."

# Set Coinbase Commerce variables
railway variables set COINBASE_COMMERCE_API_KEY="Sw3+wuhe84CgNRToB+CmS716P0mxOWi+/Wsh/XKIexams8P6XVa4M2gfKvZ5KrEmDmboYnoEl0Mds/JNjzGHfg=="
railway variables set COINBASE_WEBHOOK_SECRET="pUd5Z0yx9dJo4o6NIn4Ox4Idvv"

# Set application variables
railway variables set FRONTEND_URL="https://mycelium-ei.io"
railway variables set NODE_ENV="production"
railway variables set PORT="3000"
railway variables set API_RATE_LIMIT="100"
railway variables set MAX_QUBITS="10"
railway variables set MAX_SIMULATION_STEPS="10000"
railway variables set LOG_LEVEL="info"
railway variables set ALLOWED_ORIGINS="https://mycelium-ei.io,https://www.mycelium-ei.io,http://localhost:3000"

echo "Environment variables set successfully!"
echo "Don't forget to set your Supabase and JWT secrets manually:"
echo "  railway variables set SUPABASE_URL='your_supabase_url'"
echo "  railway variables set SUPABASE_ANON_KEY='your_supabase_anon_key'"
echo "  railway variables set SUPABASE_SERVICE_ROLE_KEY='your_supabase_service_role_key'"
echo "  railway variables set JWT_SECRET='your_jwt_secret'"

echo ""
echo "Ready to deploy with: railway up"