# CroweQuantumMyceliumNexus - Quick Start Guide

## Prerequisites
- Docker Desktop installed and running
- PowerShell 5.0 or higher
- At least 10GB free disk space
- Git (optional, for version control)

## Quick Setup (5 minutes)

### 1. Configure Environment
```powershell
# Run from project root directory
.\scripts\setup-environment.ps1
```
This will:
- Create `.env` file with secure passwords
- Set up `.env.local` for API keys
- Configure `.gitignore`

### 2. Validate System
```powershell
.\scripts\validate-prerequisites.ps1
```
This checks:
- Docker installation and status
- Required ports availability
- Environment configuration

### 3. Deploy Locally

#### Option A: Minimal Setup (Fastest - 2 minutes)
```powershell
# Uses simplified docker-compose.local.yml
docker compose -f docker-compose.local.yml up -d
```
Access at:
- MyceliumEI: http://localhost:8100
- Quantum Core: http://localhost:9000
- Integration Hub: http://localhost:8080

#### Option B: Core Services (Recommended - 5 minutes)
```powershell
.\scripts\deploy-local.ps1 -Mode core
```
Includes:
- All databases and caching
- MyceliumEI application
- Quantum computing core
- Integration orchestrator

#### Option C: Full Platform (Complete - 10 minutes)
```powershell
.\scripts\deploy-local.ps1 -Mode full
```
Includes everything:
- All core services
- Weather integration
- Monitoring (Prometheus/Grafana)
- API Gateway (Kong)

## Verify Deployment

### Check Service Status
```powershell
docker compose -f docker-compose.local.yml ps
```

### View Logs
```powershell
# All services
docker compose -f docker-compose.local.yml logs -f

# Specific service
docker compose -f docker-compose.local.yml logs -f mycelium-app
```

### Test Endpoints
```powershell
# MyceliumEI Health Check
curl http://localhost:8100/health

# Quantum Core Status
curl http://localhost:9000/api/status

# Integration Hub
curl http://localhost:8080/api/health
```

## Default Credentials

### Databases
- PostgreSQL: `nexus_admin / localdev123`
- Redis: Password `localdev123`

### Applications
- Grafana: `admin / (check .env file)`
- RabbitMQ: `nexus_mq / (check .env file)`

## Common Issues

### Port Conflicts
If ports are already in use, the local compose file uses alternative ports:
- PostgreSQL: 5433 (instead of 5432)
- Redis: 6380 (instead of 6379)
- Frontend: 3003 (instead of 3000)

### Docker Not Running
```powershell
# Start Docker Desktop
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"

# Wait for Docker to be ready
docker ps
```

### Build Failures
```powershell
# Clean rebuild
docker compose -f docker-compose.local.yml down -v
docker compose -f docker-compose.local.yml build --no-cache
docker compose -f docker-compose.local.yml up -d
```

## Stop Services
```powershell
# Stop and keep data
docker compose -f docker-compose.local.yml down

# Stop and remove all data
docker compose -f docker-compose.local.yml down -v
```

## Next Steps

1. **Add API Keys**: Edit `.env.local` to add your API keys:
   - OpenAI/Anthropic for AI features
   - Tomorrow.io/OpenWeather for weather data
   - AWS/Mapbox for additional features

2. **Access Applications**:
   - MyceliumEI Dashboard: http://localhost:8100
   - API Documentation: http://localhost:8080/docs
   - Grafana Monitoring: http://localhost:3001 (full mode only)

3. **Development**:
   - Code changes in `./MyceliumEI` auto-reload
   - Database migrations in `./migrations`
   - Integration code in `./integration`

## Support

- GitHub Issues: https://github.com/MichaelCrowe11/CroweQuantumMyceliumNexus/issues
- Documentation: See `/docs` folder
- Logs: Check `docker compose logs` for troubleshooting

## License

Copyright (c) 2024 Crowe Logic. All rights reserved.