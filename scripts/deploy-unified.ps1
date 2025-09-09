param(
    [string]$Environment = "production",
    [switch]$BuildImages,
    [switch]$WithMonitoring,
    [switch]$SkipHealthChecks,
    [switch]$Verbose
)

# Enhanced deployment script for CroweQuantumMyceliumNexus

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

function Show-Banner {
    Write-ColorOutput @"

╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║     CROWE QUANTUM MYCELIUM NEXUS - UNIFIED DEPLOYMENT       ║
║                                                               ║
║     Integrating MyceliumEI + CroweQuantumNexusAI            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

"@ "Cyan"
}

function Test-Prerequisites {
    Write-ColorOutput "🔍 Checking prerequisites..." "Yellow"
    
    $checks = @(
        @{Name="Docker"; Command="docker --version"; Required=$true},
        @{Name="Docker Compose"; Command="docker compose version"; Required=$true},
        @{Name="Git"; Command="git --version"; Required=$false},
        @{Name="Python"; Command="python --version"; Required=$false}
    )
    
    $failed = $false
    foreach ($check in $checks) {
        try {
            $result = Invoke-Expression $check.Command 2>&1
            Write-ColorOutput "  ✅ $($check.Name): Found" "Green"
            if ($Verbose) {
                Write-ColorOutput "     $result" "Gray"
            }
        } catch {
            if ($check.Required) {
                Write-ColorOutput "  ❌ $($check.Name): Not found (REQUIRED)" "Red"
                $failed = $true
            } else {
                Write-ColorOutput "  ⚠️  $($check.Name): Not found (optional)" "Yellow"
            }
        }
    }
    
    if ($failed) {
        throw "Required prerequisites not met"
    }
    
    Write-ColorOutput "✅ All prerequisites satisfied" "Green"
}

function Initialize-Environment {
    Write-ColorOutput "`n📋 Initializing environment..." "Yellow"
    
    # Check for .env file
    if (-Not (Test-Path ".env.unified")) {
        Write-ColorOutput "  Creating .env.unified from template..." "Yellow"
        Copy-Item ".env.unified.example" ".env.unified"
    }
    
    # Load environment variables
    $env:Path = Get-Content ".env.unified" | Where-Object { $_ -match "^[^#].*=" } | ForEach-Object {
        $parts = $_.Split('=', 2)
        [Environment]::SetEnvironmentVariable($parts[0], $parts[1])
        if ($Verbose) {
            Write-ColorOutput "  Set $($parts[0])" "Gray"
        }
    }
    
    # Create required directories
    $dirs = @(
        "mycelium",
        "quantum", 
        "integration",
        "frontend",
        "monitoring",
        "nginx",
        "scripts",
        "data/shared",
        "data/backups",
        "data/compliance"
    )
    
    foreach ($dir in $dirs) {
        if (-Not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-ColorOutput "  📁 Created directory: $dir" "Green"
        }
    }
    
    Write-ColorOutput "✅ Environment initialized" "Green"
}

function Copy-ProjectFiles {
    Write-ColorOutput "`n📦 Copying project files..." "Yellow"
    
    # Copy MyceliumEI files
    if (Test-Path "C:\Users\micha\MyceliumEI-Production") {
        Write-ColorOutput "  Copying MyceliumEI files..." "Yellow"
        Copy-Item -Path "C:\Users\micha\MyceliumEI-Production\app" -Destination ".\mycelium\" -Recurse -Force
        Copy-Item -Path "C:\Users\micha\MyceliumEI-Production\requirements*.txt" -Destination ".\mycelium\" -Force
        Write-ColorOutput "  ✅ MyceliumEI files copied" "Green"
    } else {
        Write-ColorOutput "  ⚠️  MyceliumEI source not found" "Yellow"
    }
    
    # Copy CroweQuantumNexusAI files
    $quantumPath = "C:\Users\micha\Downloads\CroweQuantumNexusAI-extracted\CroweQuantumNexusAI"
    if (Test-Path $quantumPath) {
        Write-ColorOutput "  Copying CroweQuantumNexusAI files..." "Yellow"
        Get-ChildItem $quantumPath -Recurse | Where-Object { 
            $_.Name -notmatch "^\." -and $_.Extension -in @(".py", ".js", ".json", ".yml", ".yaml")
        } | ForEach-Object {
            $dest = $_.FullName.Replace($quantumPath, ".\quantum")
            $destDir = Split-Path $dest -Parent
            if (-Not (Test-Path $destDir)) {
                New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            }
            Copy-Item $_.FullName -Destination $dest -Force
        }
        Write-ColorOutput "  ✅ CroweQuantumNexusAI files copied" "Green"
    } else {
        Write-ColorOutput "  ⚠️  CroweQuantumNexusAI source not found" "Yellow"
    }
}

function Build-DockerImages {
    param([switch]$Force)
    
    Write-ColorOutput "`n🔨 Building Docker images..." "Yellow"
    
    $images = @(
        @{Name="MyceliumEI"; Context="./mycelium"; Dockerfile="Dockerfile"},
        @{Name="CroweQuantumNexusAI"; Context="./quantum"; Dockerfile="Dockerfile"},
        @{Name="Integration Orchestrator"; Context="./integration"; Dockerfile="Dockerfile"},
        @{Name="Unified Frontend"; Context="./frontend"; Dockerfile="Dockerfile"}
    )
    
    foreach ($image in $images) {
        if (Test-Path "$($image.Context)/$($image.Dockerfile)") {
            Write-ColorOutput "  Building $($image.Name)..." "Yellow"
            
            $buildArgs = @(
                "-f", "$($image.Context)/$($image.Dockerfile)",
                "-t", "$($image.Name.ToLower().Replace(' ', '-')):latest"
            )
            
            if ($Force) {
                $buildArgs += "--no-cache"
            }
            
            $buildArgs += $image.Context
            
            docker build @buildArgs
            
            if ($LASTEXITCODE -eq 0) {
                Write-ColorOutput "  ✅ $($image.Name) built successfully" "Green"
            } else {
                Write-ColorOutput "  ❌ Failed to build $($image.Name)" "Red"
            }
        } else {
            Write-ColorOutput "  ⚠️  Dockerfile not found for $($image.Name)" "Yellow"
        }
    }
}

function Deploy-Services {
    param([switch]$WithMonitoring)
    
    Write-ColorOutput "`n🚀 Deploying services..." "Yellow"
    
    # Deploy core services
    Write-ColorOutput "  Starting core infrastructure..." "Yellow"
    docker compose -f docker-compose.unified.yml up -d unified-db unified-cache rabbitmq
    
    Start-Sleep -Seconds 10
    
    # Deploy application services
    Write-ColorOutput "  Starting application services..." "Yellow"
    docker compose -f docker-compose.unified.yml up -d mycelium-app quantum-core integration-orchestrator
    
    Start-Sleep -Seconds 10
    
    # Deploy workers
    Write-ColorOutput "  Starting worker services..." "Yellow"
    docker compose -f docker-compose.unified.yml up -d mycelium-worker quantum-worker data-pipeline
    
    # Deploy frontend and gateway
    Write-ColorOutput "  Starting frontend and API gateway..." "Yellow"
    docker compose -f docker-compose.unified.yml up -d unified-frontend api-gateway nginx
    
    # Deploy monitoring if requested
    if ($WithMonitoring) {
        Write-ColorOutput "  Starting monitoring stack..." "Yellow"
        docker compose -f docker-compose.unified.yml up -d prometheus grafana jaeger
    }
    
    Write-ColorOutput "✅ All services deployed" "Green"
}

function Test-ServiceHealth {
    param([switch]$Skip)
    
    if ($Skip) {
        Write-ColorOutput "`n⚠️  Skipping health checks" "Yellow"
        return
    }
    
    Write-ColorOutput "`n🏥 Running health checks..." "Yellow"
    
    $services = @(
        @{Name="Unified Database"; Container="unified-db"; Check="pg_isready -U nexus_admin"},
        @{Name="Redis Cache"; Container="unified-cache"; Check="redis-cli ping"},
        @{Name="RabbitMQ"; Container="rabbitmq"; Check="rabbitmq-diagnostics ping"},
        @{Name="MyceliumEI"; Container="mycelium-app"; Check="curl -f http://localhost:8000/healthz"},
        @{Name="CroweQuantumNexusAI"; Container="quantum-core"; Check="curl -f http://localhost:9000/healthz"},
        @{Name="Integration Orchestrator"; Container="integration-orchestrator"; Check="curl -f http://localhost:8080/healthz"},
        @{Name="API Gateway"; Container="api-gateway"; Check="curl -f http://localhost:8001/status"}
    )
    
    $healthy = 0
    $total = $services.Count
    
    foreach ($service in $services) {
        try {
            $result = docker compose exec -T $service.Container $service.Check 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-ColorOutput "  ✅ $($service.Name): Healthy" "Green"
                $healthy++
            } else {
                Write-ColorOutput "  ❌ $($service.Name): Unhealthy" "Red"
                if ($Verbose) {
                    Write-ColorOutput "     $result" "Gray"
                }
            }
        } catch {
            Write-ColorOutput "  ❌ $($service.Name): Error checking health" "Red"
        }
    }
    
    Write-ColorOutput "`n📊 Health Check Summary: $healthy/$total services healthy" $(if ($healthy -eq $total) { "Green" } else { "Yellow" })
}

function Show-AccessInfo {
    Write-ColorOutput "`n🌐 Access Information:" "Cyan"
    Write-ColorOutput "════════════════════════" "Cyan"
    
    $domain = [Environment]::GetEnvironmentVariable("DOMAIN")
    if (-Not $domain) { $domain = "localhost" }
    
    Write-ColorOutput @"

  Main Application:
    • Unified Frontend:     http://$domain:3000
    • API Gateway:          http://$domain:8000
    • MyceliumEI:          http://$domain:8100
    • CroweQuantumNexusAI: http://$domain:9000

  Monitoring:
    • Grafana:             http://$domain:3001  (admin/password)
    • Prometheus:          http://$domain:9090
    • Jaeger Tracing:      http://$domain:16686
    • RabbitMQ Management: http://$domain:15672

  Documentation:
    • API Docs:            http://$domain:8000/docs
    • Integration Guide:   http://$domain:3000/guide

"@ "White"
}

function Show-QuickCommands {
    Write-ColorOutput "📝 Quick Commands:" "Cyan"
    Write-ColorOutput "═════════════════" "Cyan"
    
    Write-ColorOutput @"

  View logs:
    docker compose -f docker-compose.unified.yml logs -f [service-name]

  Check status:
    docker compose -f docker-compose.unified.yml ps

  Restart service:
    docker compose -f docker-compose.unified.yml restart [service-name]

  Run integration tests:
    ./scripts/test-integration.ps1

  Generate EPA report:
    ./scripts/generate-compliance-report.ps1

  Backup data:
    ./scripts/backup-unified.ps1

"@ "Gray"
}

# Main execution
try {
    Show-Banner
    
    # Run deployment steps
    Test-Prerequisites
    Initialize-Environment
    Copy-ProjectFiles
    
    if ($BuildImages) {
        Build-DockerImages -Force:$BuildImages
    }
    
    Deploy-Services -WithMonitoring:$WithMonitoring
    
    # Wait for services to stabilize
    Write-ColorOutput "`n⏳ Waiting for services to stabilize..." "Yellow"
    Start-Sleep -Seconds 20
    
    Test-ServiceHealth -Skip:$SkipHealthChecks
    
    Show-AccessInfo
    Show-QuickCommands
    
    Write-ColorOutput "`n✨ Deployment completed successfully!" "Green"
    Write-ColorOutput "════════════════════════════════════" "Green"
    
    exit 0
    
} catch {
    Write-ColorOutput "`n💥 Deployment failed: $_" "Red"
    Write-ColorOutput "`n🔧 Troubleshooting:" "Yellow"
    Write-ColorOutput "  1. Check logs: docker compose logs" "White"
    Write-ColorOutput "  2. Verify .env.unified configuration" "White"
    Write-ColorOutput "  3. Ensure all source projects are available" "White"
    Write-ColorOutput "  4. Run with -Verbose flag for more details" "White"
    
    exit 1
}