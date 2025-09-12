# ========================================
# LOCAL DEPLOYMENT SCRIPT
# ========================================
# Deploys core services locally for testing

param(
    [string]$Mode = "core",  # core, full, or minimal
    [switch]$NoBuild = $false,
    [switch]$Detached = $true
)

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  DEPLOYING CROWE QUANTUM MYCELIUM NEXUS" -ForegroundColor Cyan
Write-Host "  Mode: $Mode" -ForegroundColor Yellow
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
$validationResult = & ".\scripts\validate-prerequisites.ps1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Prerequisites validation failed. Please fix errors first." -ForegroundColor Red
    exit 1
}

# Stop any existing containers
Write-Host ""
Write-Host "Stopping existing containers..." -ForegroundColor Yellow
docker compose -f docker-compose.unified.yml down 2>&1 | Out-Null

# Define service groups
$coreServices = @(
    "unified-db",
    "unified-cache",
    "rabbitmq",
    "mycelium-app",
    "quantum-core",
    "integration-hub"
)

$fullServices = @(
    "unified-db",
    "unified-cache", 
    "rabbitmq",
    "mycelium-app",
    "quantum-core",
    "integration-hub",
    "crowe-weather-service",
    "weather-predictor",
    "prometheus",
    "grafana",
    "kong"
)

$minimalServices = @(
    "unified-db",
    "unified-cache",
    "mycelium-app"
)

# Select services based on mode
$servicesToDeploy = switch ($Mode) {
    "core" { $coreServices }
    "full" { $fullServices }
    "minimal" { $minimalServices }
    default { $coreServices }
}

Write-Host ""
Write-Host "Services to deploy:" -ForegroundColor Cyan
foreach ($service in $servicesToDeploy) {
    Write-Host "  - $service" -ForegroundColor White
}

# Build if needed
if (-not $NoBuild) {
    Write-Host ""
    Write-Host "Building Docker images..." -ForegroundColor Yellow
    Write-Host "This may take several minutes on first run..." -ForegroundColor Yellow
    
    $buildCommand = "docker compose -f docker-compose.unified.yml build"
    foreach ($service in $servicesToDeploy) {
        $buildCommand += " $service"
    }
    
    Invoke-Expression $buildCommand
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Build failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "Build completed successfully!" -ForegroundColor Green
}

# Start services
Write-Host ""
Write-Host "Starting services..." -ForegroundColor Yellow

$upCommand = "docker compose -f docker-compose.unified.yml up"
if ($Detached) {
    $upCommand += " -d"
}
foreach ($service in $servicesToDeploy) {
    $upCommand += " $service"
}

Invoke-Expression $upCommand

if ($LASTEXITCODE -ne 0) {
    Write-Host "Deployment failed!" -ForegroundColor Red
    exit 1
}

# Wait for services to be healthy
Write-Host ""
Write-Host "Waiting for services to be healthy..." -ForegroundColor Yellow

$maxAttempts = 30
$attempt = 0
$allHealthy = $false

while ($attempt -lt $maxAttempts -and -not $allHealthy) {
    $attempt++
    Start-Sleep -Seconds 5
    
    $unhealthyServices = @()
    foreach ($service in $servicesToDeploy) {
        $health = docker inspect --format='{{.State.Health.Status}}' "crowequantummyceliumnexus-$service-1" 2>$null
        if ($health -ne "healthy" -and $health -ne $null -and $health -ne "") {
            $unhealthyServices += $service
        }
    }
    
    if ($unhealthyServices.Count -eq 0) {
        $allHealthy = $true
    } else {
        Write-Host "  Attempt $attempt/$maxAttempts - Waiting for: $($unhealthyServices -join ', ')" -ForegroundColor Yellow
    }
}

if ($allHealthy) {
    Write-Host "All services are healthy!" -ForegroundColor Green
} else {
    Write-Host "Some services did not become healthy in time" -ForegroundColor Yellow
    Write-Host "Check logs with: docker compose -f docker-compose.unified.yml logs" -ForegroundColor Yellow
}

# Display service URLs
Write-Host ""
Write-Host "=================================================" -ForegroundColor Green
Write-Host "  DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Service URLs:" -ForegroundColor Cyan

$urls = @{
    "MyceliumEI Application" = "http://localhost:8100"
    "Quantum Core API" = "http://localhost:9000"
    "Integration Hub API" = "http://localhost:8080"
    "Weather Service" = "http://localhost:8200"
    "Grafana Dashboard" = "http://localhost:3001"
    "Prometheus Metrics" = "http://localhost:9090"
    "Kong API Gateway" = "http://localhost:8000"
    "RabbitMQ Management" = "http://localhost:15672"
}

foreach ($serviceName in $urls.Keys) {
    $serviceKey = $serviceName -replace ' ', '-' -replace 'Application|API|Service|Dashboard|Metrics|Gateway|Management', '' -replace '-+$', '' -replace 'MyceliumEI', 'mycelium-app'
    
    if ($servicesToDeploy -contains $serviceKey -or $Mode -eq "full") {
        Write-Host "  $serviceName : $($urls[$serviceName])" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Cyan
Write-Host "  View logs: docker compose -f docker-compose.unified.yml logs -f" -ForegroundColor White
Write-Host "  Stop services: docker compose -f docker-compose.unified.yml down" -ForegroundColor White
Write-Host "  View status: docker compose -f docker-compose.unified.yml ps" -ForegroundColor White
Write-Host "  Enter container: docker exec -it crowequantummyceliumnexus-mycelium-app-1 /bin/bash" -ForegroundColor White
Write-Host ""

# Open browser if in interactive mode
if ($Detached) {
    $openBrowser = Read-Host "Open MyceliumEI in browser? (Y/n)"
    if ($openBrowser -ne 'n') {
        Start-Process "http://localhost:8100"
    }
}

Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host ""