@echo off
echo ========================================
echo QuantumMycelium Nexus Railway Deployment
echo ========================================
echo.

echo Step 1: Logging into Railway...
railway login

echo.
echo Step 2: Initializing Railway project...
railway init

echo.
echo Step 3: Setting environment variables...
echo Setting Coinbase Commerce variables...
railway variables set COINBASE_COMMERCE_API_KEY="Sw3+wuhe84CgNRToB+CmS716P0mxOWi+/Wsh/XKIexams8P6XVa4M2gfKvZ5KrEmDmboYnoEl0Mds/JNjzGHfg=="
railway variables set COINBASE_WEBHOOK_SECRET="pUd5Z0yx9dJo4o6NIn4Ox4Idvv"

echo Setting application variables...
railway variables set FRONTEND_URL="https://mycelium-ei.io"
railway variables set NODE_ENV="production"
railway variables set PORT="3000"
railway variables set API_RATE_LIMIT="100"
railway variables set MAX_QUBITS="10"
railway variables set MAX_SIMULATION_STEPS="10000"
railway variables set LOG_LEVEL="info"
railway variables set ALLOWED_ORIGINS="https://mycelium-ei.io,https://www.mycelium-ei.io,http://localhost:3000"

echo.
echo ============================================
echo IMPORTANT: You still need to set these manually:
echo ============================================
echo railway variables set SUPABASE_URL="your_supabase_project_url"
echo railway variables set SUPABASE_ANON_KEY="your_supabase_anon_key"
echo railway variables set SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key"
echo railway variables set JWT_SECRET="your_jwt_secret_key"
echo.

pause
echo.
echo Step 4: Deploying to Railway...
railway up

echo.
echo Step 5: Getting deployment status...
railway status

echo.
echo ============================================
echo Deployment Complete!
echo ============================================
echo Don't forget to:
echo 1. Update Coinbase webhook URL with your Railway domain
echo 2. Test payment functionality
echo 3. Configure DNS if needed
pause