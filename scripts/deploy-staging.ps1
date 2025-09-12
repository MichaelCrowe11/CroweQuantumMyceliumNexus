param(
    [Parameter(Mandatory=$false)]
    [switch]$DryRun,
    
    [Parameter(Mandatory=$false)]
    [switch]$CleanDeploy,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipTests,
    
    [Parameter(Mandatory=$false)]
    [string]$LocalRegistry = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$BuildImages
)

$ErrorActionPreference = "Stop"

# Set working directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
Set-Location $projectRoot

Write-Host "🧪 QuantumMycelium Nexus Staging Deployment" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Configuration
$namespace = "quantum-mycelium-staging"
$releaseName = "qm-staging"
$chartPath = "helm/quantum-mycelium-nexus"
$valuesFile = "helm/quantum-mycelium-nexus/values-staging.yaml"

# Check prerequisites
Write-Host "🔍 Checking prerequisites..." -ForegroundColor Yellow

try {
    kubectl version --client --short | Out-Null
    Write-Host "✅ kubectl found" -ForegroundColor Green
} catch {
    Write-Host "❌ kubectl not found" -ForegroundColor Red
    exit 1
}

try {
    helm version --short | Out-Null
    Write-Host "✅ Helm found" -ForegroundColor Green
} catch {
    Write-Host "❌ Helm not found" -ForegroundColor Red
    exit 1
}

try {
    kubectl cluster-info --request-timeout=5s | Out-Null
    Write-Host "✅ Kubernetes cluster connected" -ForegroundColor Green
} catch {
    Write-Host "❌ Cannot connect to Kubernetes cluster" -ForegroundColor Red
    Write-Host "   Please ensure kubectl is configured and cluster is running" -ForegroundColor Yellow
    exit 1
}

# Clean deployment if requested
if ($CleanDeploy) {
    Write-Host "🧹 Cleaning existing staging deployment..." -ForegroundColor Yellow
    
    try {
        helm uninstall $releaseName --namespace=$namespace 2>$null
        Write-Host "   Uninstalled existing Helm release" -ForegroundColor Gray
    } catch {
        Write-Host "   No existing Helm release found" -ForegroundColor Gray
    }
    
    try {
        kubectl delete namespace $namespace --ignore-not-found=true
        Write-Host "   Deleted namespace $namespace" -ForegroundColor Gray
        
        # Wait for namespace to be fully deleted
        Write-Host "   Waiting for namespace deletion..." -ForegroundColor Gray
        do {
            Start-Sleep -Seconds 2
            $nsExists = kubectl get namespace $namespace --ignore-not-found=true 2>$null
        } while ($nsExists)
        
    } catch {
        Write-Host "   Namespace cleanup completed" -ForegroundColor Gray
    }
}

# Build images if requested
if ($BuildImages) {
    Write-Host "🔨 Building Docker images..." -ForegroundColor Yellow
    
    $images = @(
        @{Name="mycelium-runtime"; Path="integration/mycelium-ei-integration"; Dockerfile="Dockerfile.runtime"},
        @{Name="quantum-compute"; Path="quantum-circuits"; Dockerfile="Dockerfile"},
        @{Name="orchestrator"; Path="integration/mycelium-ei-integration"; Dockerfile="Dockerfile.orchestrator"},
        @{Name="frontend"; Path="frontend"; Dockerfile="Dockerfile"},
        @{Name="ml-models"; Path="ml-models"; Dockerfile="Dockerfile"}
    )
    
    foreach ($image in $images) {
        $tag = if ($LocalRegistry) { "$LocalRegistry/quantum-mycelium/$($image.Name):v1.0.0" } else { "quantum-mycelium/$($image.Name):v1.0.0" }
        
        Write-Host "   Building $($image.Name)..." -ForegroundColor Gray
        
        if (Test-Path $image.Path) {
            docker build -t $tag -f "$($image.Path)/$($image.Dockerfile)" $image.Path
            
            if ($LASTEXITCODE -ne 0) {
                Write-Host "❌ Failed to build $($image.Name)" -ForegroundColor Red
                exit 1
            }
        } else {
            Write-Host "⚠️  Path not found for $($image.Name): $($image.Path)" -ForegroundColor Yellow
        }
    }
    
    Write-Host "✅ All images built successfully" -ForegroundColor Green
}

# Create namespace
Write-Host "📁 Setting up staging namespace..." -ForegroundColor Yellow
kubectl create namespace $namespace --dry-run=client -o yaml | kubectl apply -f -

# Label namespace for staging
kubectl label namespace $namespace environment=staging --overwrite
kubectl label namespace $namespace app.kubernetes.io/part-of=quantum-mycelium-nexus --overwrite

# Add Helm repositories
Write-Host "📦 Setting up Helm repositories..." -ForegroundColor Yellow
$repos = @(
    @{Name="bitnami"; URL="https://charts.bitnami.com/bitnami"},
    @{Name="prometheus-community"; URL="https://prometheus-community.github.io/helm-charts"},
    @{Name="grafana"; URL="https://grafana.github.io/helm-charts"},
    @{Name="jaegertracing"; URL="https://jaegertracing.github.io/helm-charts"}
)

foreach ($repo in $repos) {
    helm repo add $repo.Name $repo.URL 2>$null
}
helm repo update

# Prepare Helm command
$helmArgs = @(
    "--namespace", $namespace,
    "--create-namespace",
    "--values", $valuesFile,
    "--set", "global.environment=staging",
    "--set", "config.global.logLevel=debug"
)

if ($LocalRegistry) {
    $helmArgs += "--set", "global.imageRegistry=$LocalRegistry"
}

if ($DryRun) {
    $helmArgs += "--dry-run", "--debug"
    Write-Host "🧪 Performing dry run deployment..." -ForegroundColor Yellow
} else {
    Write-Host "🚀 Deploying to staging..." -ForegroundColor Yellow
}

# Deploy with Helm
try {
    $existingRelease = helm get values $releaseName --namespace=$namespace 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   Upgrading existing release..." -ForegroundColor Gray
        $helmCommand = "helm upgrade $releaseName $chartPath " + ($helmArgs -join " ")
    } else {
        Write-Host "   Installing new release..." -ForegroundColor Gray
        $helmCommand = "helm install $releaseName $chartPath " + ($helmArgs -join " ")
    }
} catch {
    Write-Host "   Installing new release..." -ForegroundColor Gray
    $helmCommand = "helm install $releaseName $chartPath " + ($helmArgs -join " ")
}

Write-Host "   Command: $helmCommand" -ForegroundColor Gray
Invoke-Expression $helmCommand

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Helm deployment failed" -ForegroundColor Red
    exit 1
}

if (!$DryRun) {
    # Wait for deployments to be ready
    Write-Host "⏳ Waiting for deployments to be ready..." -ForegroundColor Yellow
    
    $deployments = @("mycelium-runtime", "quantum-compute", "orchestrator", "frontend")
    
    foreach ($deployment in $deployments) {
        Write-Host "   Waiting for $deployment..." -ForegroundColor Gray
        kubectl rollout status deployment/$deployment --namespace=$namespace --timeout=300s
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "⚠️  Deployment $deployment did not become ready" -ForegroundColor Yellow
        }
    }
    
    # Check pod status
    Write-Host "🔍 Checking pod status..." -ForegroundColor Yellow
    $pods = kubectl get pods --namespace=$namespace --output=json | ConvertFrom-Json
    
    $runningPods = 0
    $totalPods = $pods.items.Count
    
    foreach ($pod in $pods.items) {
        $podName = $pod.metadata.name
        $podStatus = $pod.status.phase
        
        if ($podStatus -eq "Running") {
            $runningPods++
            Write-Host "   ✅ $podName - $podStatus" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  $podName - $podStatus" -ForegroundColor Yellow
            
            # Get pod events for failed pods
            if ($podStatus -eq "Failed" -or $podStatus -eq "CrashLoopBackOff") {
                Write-Host "      Events:" -ForegroundColor Gray
                kubectl describe pod $podName --namespace=$namespace | Select-String "Events:" -A 10
            }
        }
    }
    
    Write-Host "📊 Pod Status: $runningPods/$totalPods running" -ForegroundColor Cyan
    
    # Display service information
    Write-Host "`n🌐 Staging Services:" -ForegroundColor Cyan
    
    # Port forward setup for local access
    Write-Host "   Setting up port forwards for local access..." -ForegroundColor Yellow
    
    # Kill any existing port forwards
    Get-Process -Name kubectl -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*port-forward*" } | Stop-Process -Force
    
    # Frontend
    Start-Process -FilePath "kubectl" -ArgumentList "port-forward", "svc/frontend-service", "3000:3000", "--namespace=$namespace" -WindowStyle Hidden
    Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
    
    # API/Orchestrator
    Start-Process -FilePath "kubectl" -ArgumentList "port-forward", "svc/orchestrator-service", "8300:8300", "--namespace=$namespace" -WindowStyle Hidden
    Write-Host "   API Gateway: http://localhost:8300" -ForegroundColor White
    
    # Grafana
    Start-Process -FilePath "kubectl" -ArgumentList "port-forward", "svc/grafana", "3001:3000", "--namespace=$namespace" -WindowStyle Hidden
    Write-Host "   Grafana: http://localhost:3001 (admin/staging123)" -ForegroundColor White
    
    # Prometheus
    Start-Process -FilePath "kubectl" -ArgumentList "port-forward", "svc/prometheus-server", "9090:80", "--namespace=$namespace" -WindowStyle Hidden
    Write-Host "   Prometheus: http://localhost:9090" -ForegroundColor White
    
    # Wait a moment for port forwards to establish
    Start-Sleep -Seconds 3
    
    # Health check
    Write-Host "`n🏥 Health Checks:" -ForegroundColor Cyan
    
    $healthChecks = @(
        @{Name="Frontend"; URL="http://localhost:3000"},
        @{Name="API Gateway"; URL="http://localhost:8300/health"},
        @{Name="Grafana"; URL="http://localhost:3001/api/health"}
    )
    
    foreach ($check in $healthChecks) {
        try {
            $response = Invoke-WebRequest -Uri $check.URL -TimeoutSec 5 -UseBasicParsing 2>$null
            if ($response.StatusCode -eq 200) {
                Write-Host "   ✅ $($check.Name) - Healthy" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️  $($check.Name) - Status: $($response.StatusCode)" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "   ❌ $($check.Name) - Not responding" -ForegroundColor Red
        }
    }
    
    Write-Host "`n✨ Staging deployment complete!" -ForegroundColor Green
    Write-Host "   Namespace: $namespace" -ForegroundColor Gray
    Write-Host "   Release: $releaseName" -ForegroundColor Gray
    Write-Host "   Values: $valuesFile" -ForegroundColor Gray
    
    Write-Host "`n🔧 Management Commands:" -ForegroundColor Cyan
    Write-Host "   View pods: kubectl get pods -n $namespace" -ForegroundColor White
    Write-Host "   View logs: kubectl logs -f deployment/mycelium-runtime -n $namespace" -ForegroundColor White
    Write-Host "   Shell into pod: kubectl exec -it deployment/orchestrator -n $namespace -- /bin/bash" -ForegroundColor White
    Write-Host "   Helm status: helm status $releaseName -n $namespace" -ForegroundColor White
    Write-Host "   Scale up: kubectl scale deployment orchestrator --replicas=2 -n $namespace" -ForegroundColor White
    
    if (!$SkipTests) {
        Write-Host "`n🧪 Ready for testing! Run the test suite with:" -ForegroundColor Cyan
        Write-Host "   ./scripts/run-staging-tests.ps1" -ForegroundColor White
    }
    
} else {
    Write-Host "✅ Dry run completed successfully" -ForegroundColor Green
    Write-Host "   Run without -DryRun to deploy" -ForegroundColor Gray
}