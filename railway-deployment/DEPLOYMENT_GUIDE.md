# QuantumMycelium Nexus - Railway Deployment Guide

## Prerequisites
- Railway CLI installed: `npm install -g @railway/cli`
- Railway account created at https://railway.app

## Quick Deploy

### Option 1: Windows Batch Script
```batch
cd C:\Users\micha\CroweQuantumMyceliumNexus\railway-deployment
deploy.bat
```

### Option 2: Manual Commands
```bash
cd C:\Users\micha\CroweQuantumMyceliumNexus\railway-deployment

# Login to Railway
railway login

# Initialize project
railway init

# Set environment variables
railway variables set COINBASE_COMMERCE_API_KEY="Sw3+wuhe84CgNRToB+CmS716P0mxOWi+/Wsh/XKIexams8P6XVa4M2gfKvZ5KrEmDmboYnoEl0Mds/JNjzGHfg=="
railway variables set COINBASE_WEBHOOK_SECRET="pUd5Z0yx9dJo4o6NIn4Ox4Idvv"
railway variables set FRONTEND_URL="https://mycelium-ei.io"
railway variables set NODE_ENV="production"
railway variables set PORT="3000"

# Deploy
railway up
```

## Required Manual Configuration

**You MUST set these variables manually with your actual values:**

```bash
railway variables set SUPABASE_URL="your_supabase_project_url"
railway variables set SUPABASE_ANON_KEY="your_supabase_anon_key"
railway variables set SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key"
railway variables set JWT_SECRET="your_jwt_secret_key"
```

## Post-Deployment Steps

1. **Get your Railway URL:**
   ```bash
   railway status
   ```

2. **Update Coinbase Commerce Webhook:**
   - Go to Coinbase Commerce dashboard
   - Settings → Webhook subscriptions
   - Update URL to: `https://your-railway-domain.railway.app/api/payments/webhook`

3. **Test the deployment:**
   - Visit your Railway URL
   - Test user registration/login
   - Test payment flow

## Environment Variables Reference

| Variable | Description | Status |
|----------|-------------|---------|
| `COINBASE_COMMERCE_API_KEY` | Coinbase Commerce API key | ✅ Set |
| `COINBASE_WEBHOOK_SECRET` | Coinbase webhook secret | ✅ Set |
| `FRONTEND_URL` | Frontend domain | ✅ Set |
| `NODE_ENV` | Environment | ✅ Set |
| `PORT` | Server port | ✅ Set |
| `SUPABASE_URL` | Supabase project URL | ❌ Needs manual setup |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | ❌ Needs manual setup |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | ❌ Needs manual setup |
| `JWT_SECRET` | JWT signing secret | ❌ Needs manual setup |

## Troubleshooting

- **Build fails**: Check `railway logs` for errors
- **Database connection issues**: Verify Supabase credentials
- **Payment webhook not working**: Ensure webhook URL is correctly set in Coinbase Commerce
- **CORS errors**: Verify `ALLOWED_ORIGINS` includes your domain

## Files Included

- `server.js` - Main Express server
- `routes/payments.js` - Payment processing routes
- `database/payment-schema.sql` - Database schema
- `package.json` - Dependencies
- `railway.json` - Railway configuration
- `.env.example` - Environment variables template