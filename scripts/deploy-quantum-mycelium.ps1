param(
    [Parameter(Mandatory=$false)]
    [switch]$BuildImages,
    
    [Parameter(Mandatory=$false)]
    [switch]$WithMonitoring,
    
    [Parameter(Mandatory=$false)]
    [switch]$ForceRecreate,
    
    [Parameter(Mandatory=$false)]
    [string]$Environment = "development"
)

$ErrorActionPreference = "Stop"

Write-Host "🧬⚛️ Deploying QuantumMycelium Nexus Platform" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Set working directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
Set-Location $projectRoot

# Load environment variables
$envFile = ".env.$Environment"
if (Test-Path $envFile) {
    Write-Host "📋 Loading environment from $envFile" -ForegroundColor Yellow
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^#].+?)=(.+)$') {
            [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
        }
    }
} else {
    Write-Host "⚠️  Environment file $envFile not found, using defaults" -ForegroundColor Yellow
}

# Check Docker is running
Write-Host "🐳 Checking Docker status..." -ForegroundColor Yellow
$dockerStatus = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker is running" -ForegroundColor Green

# Create required directories
Write-Host "📁 Creating required directories..." -ForegroundColor Yellow
$directories = @(
    "data/mycelium",
    "data/quantum",
    "data/orchestrator",
    "data/pipeline",
    "mycelium-programs",
    "quantum-circuits",
    "config/orchestrator",
    "config/pipeline",
    "monitoring/prometheus",
    "monitoring/grafana/dashboards",
    "monitoring/grafana/datasources",
    "logs"
)

foreach ($dir in $directories) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "   Created: $dir" -ForegroundColor Gray
    }
}

# Generate default configurations if they don't exist
Write-Host "⚙️  Generating configurations..." -ForegroundColor Yellow

# Orchestrator config
$orchestratorConfig = @"
[server]
host = "0.0.0.0"
port = 8300
workers = 4

[mycelium]
runtime_url = "http://mycelium-runtime:8200"
max_connections = 10
timeout_ms = 5000

[quantum]
compute_url = "http://quantum-compute:9000"
max_qubits = 20
optimization_level = 3

[pipeline]
batch_size = 100
buffer_size = 1000
flush_interval_ms = 1000

[monitoring]
enabled = true
prometheus_port = 9100
"@

if (!(Test-Path "config/orchestrator/orchestrator.toml")) {
    $orchestratorConfig | Out-File -FilePath "config/orchestrator/orchestrator.toml" -Encoding UTF8
    Write-Host "   Generated orchestrator.toml" -ForegroundColor Gray
}

# Prometheus config
$prometheusConfig = @"
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'mycelium-runtime'
    static_configs:
      - targets: ['mycelium-runtime:8200']
  
  - job_name: 'quantum-compute'
    static_configs:
      - targets: ['quantum-compute:9000']
  
  - job_name: 'orchestrator'
    static_configs:
      - targets: ['integration-orchestrator:9100']
  
  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
"@

if (!(Test-Path "monitoring/prometheus/prometheus.yml")) {
    $prometheusConfig | Out-File -FilePath "monitoring/prometheus/prometheus.yml" -Encoding UTF8
    Write-Host "   Generated prometheus.yml" -ForegroundColor Gray
}

# Build images if requested
if ($BuildImages) {
    Write-Host "🔨 Building Docker images..." -ForegroundColor Yellow
    
    # Build Mycelium-EI integration image
    Write-Host "   Building mycelium-ei-integration..." -ForegroundColor Gray
    docker build -t quantum-mycelium/integration:latest `
        -f integration/mycelium-ei-integration/Dockerfile.runtime `
        integration/mycelium-ei-integration
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to build mycelium-ei-integration image" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Images built successfully" -ForegroundColor Green
}

# Prepare docker-compose command
$composeFile = "docker-compose.quantum-mycelium.yml"
$composeCmd = "docker compose -f $composeFile"

# Stop existing services if force recreate
if ($ForceRecreate) {
    Write-Host "🛑 Stopping existing services..." -ForegroundColor Yellow
    Invoke-Expression "$composeCmd down -v"
}

# Deploy services
Write-Host "🚀 Deploying QuantumMycelium Nexus services..." -ForegroundColor Yellow

$deployCmd = "$composeCmd up -d"
if ($ForceRecreate) {
    $deployCmd += " --force-recreate"
}

# Deploy core services
$coreServices = @(
    "redis",
    "rabbitmq",
    "zookeeper",
    "kafka",
    "mycelium-runtime",
    "quantum-compute",
    "integration-orchestrator",
    "data-pipeline"
)

Write-Host "   Deploying core services..." -ForegroundColor Gray
Invoke-Expression "$deployCmd $($coreServices -join ' ')"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to deploy core services" -ForegroundColor Red
    exit 1
}

# Deploy monitoring if requested
if ($WithMonitoring) {
    Write-Host "   Deploying monitoring services..." -ForegroundColor Gray
    $monitoringServices = @("prometheus", "grafana", "jaeger")
    Invoke-Expression "$deployCmd $($monitoringServices -join ' ')"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Warning: Failed to deploy some monitoring services" -ForegroundColor Yellow
    }
}

# Wait for services to be healthy
Write-Host "⏳ Waiting for services to be healthy..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0
$allHealthy = $false

while ($attempt -lt $maxAttempts -and !$allHealthy) {
    Start-Sleep -Seconds 5
    $attempt++
    
    Write-Host "   Checking health (attempt $attempt/$maxAttempts)..." -ForegroundColor Gray
    
    $healthStatus = docker compose -f $composeFile ps --format json | ConvertFrom-Json
    $unhealthyServices = $healthStatus | Where-Object { $_.Health -ne "healthy" -and $_.Health -ne "" }
    
    if ($unhealthyServices.Count -eq 0) {
        $allHealthy = $true
    }
}

if ($allHealthy) {
    Write-Host "✅ All services are healthy!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some services may not be fully healthy yet" -ForegroundColor Yellow
}

# Display service URLs
Write-Host "`n📌 Service URLs:" -ForegroundColor Cyan
Write-Host "   Mycelium Runtime:    http://localhost:8200" -ForegroundColor White
Write-Host "   Quantum Compute:     http://localhost:9000" -ForegroundColor White
Write-Host "   Orchestrator:        http://localhost:8300" -ForegroundColor White
Write-Host "   RabbitMQ Management: http://localhost:15672" -ForegroundColor White

if ($WithMonitoring) {
    Write-Host "   Prometheus:          http://localhost:9090" -ForegroundColor White
    Write-Host "   Grafana:             http://localhost:3001" -ForegroundColor White
    Write-Host "   Jaeger UI:           http://localhost:16686" -ForegroundColor White
}

Write-Host "`n✨ QuantumMycelium Nexus deployment complete!" -ForegroundColor Green
Write-Host "   Run './scripts/test-quantum-mycelium.ps1' to test the integration" -ForegroundColor Gray
Write-Host "   Run 'docker compose -f $composeFile logs -f' to view logs" -ForegroundColor Gray
Write-Host "   Run 'docker compose -f $composeFile down' to stop services" -ForegroundColor Gray