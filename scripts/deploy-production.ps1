param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "production",
    
    [Parameter(Mandatory=$false)]
    [string]$Namespace = "quantum-mycelium",
    
    [Parameter(Mandatory=$false)]
    [string]$HelmReleaseName = "quantum-mycelium-nexus",
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun,
    
    [Parameter(Mandatory=$false)]
    [switch]$Upgrade,
    
    [Parameter(Mandatory=$false)]
    [switch]$Install,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipPreCheck,
    
    [Parameter(Mandatory=$false)]
    [string]$ValuesFile = "",
    
    [Parameter(Mandatory=$false)]
    [hashtable]$SetValues = @{},
    
    [Parameter(Mandatory=$false)]
    [switch]$EnableBackup,
    
    [Parameter(Mandatory=$false)]
    [switch]$EnableMonitoring
)

$ErrorActionPreference = "Stop"

# Set working directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
Set-Location $projectRoot

Write-Host "🚀 QuantumMycelium Nexus Production Deployment" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Validate prerequisites
if (!$SkipPreCheck) {
    Write-Host "🔍 Validating prerequisites..." -ForegroundColor Yellow
    
    # Check kubectl
    try {
        $kubectlVersion = kubectl version --client --short 2>$null
        Write-Host "✅ kubectl: $kubectlVersion" -ForegroundColor Green
    } catch {
        Write-Host "❌ kubectl not found or not configured" -ForegroundColor Red
        exit 1
    }
    
    # Check Helm
    try {
        $helmVersion = helm version --short 2>$null
        Write-Host "✅ Helm: $helmVersion" -ForegroundColor Green
    } catch {
        Write-Host "❌ Helm not found" -ForegroundColor Red
        exit 1
    }
    
    # Check cluster connection
    try {
        $clusterInfo = kubectl cluster-info --request-timeout=5s 2>$null
        Write-Host "✅ Kubernetes cluster connection verified" -ForegroundColor Green
    } catch {
        Write-Host "❌ Cannot connect to Kubernetes cluster" -ForegroundColor Red
        exit 1
    }
    
    # Check required permissions
    try {
        kubectl auth can-i create deployments --namespace=$Namespace 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Insufficient permissions to create deployments in namespace $Namespace" -ForegroundColor Red
            exit 1
        }
        Write-Host "✅ Kubernetes permissions verified" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Could not verify Kubernetes permissions" -ForegroundColor Yellow
    }
}

# Create namespace if it doesn't exist
Write-Host "📁 Setting up namespace..." -ForegroundColor Yellow
try {
    kubectl get namespace $Namespace 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   Creating namespace: $Namespace" -ForegroundColor Gray
        kubectl apply -f k8s/namespace.yaml
    } else {
        Write-Host "   Namespace $Namespace already exists" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Failed to create namespace" -ForegroundColor Red
    exit 1
}

# Add Helm repositories
Write-Host "📦 Adding Helm repositories..." -ForegroundColor Yellow
$helmRepos = @(
    @{Name="bitnami"; URL="https://charts.bitnami.com/bitnami"},
    @{Name="prometheus-community"; URL="https://prometheus-community.github.io/helm-charts"},
    @{Name="grafana"; URL="https://grafana.github.io/helm-charts"},
    @{Name="jaegertracing"; URL="https://jaegertracing.github.io/helm-charts"},
    @{Name="ingress-nginx"; URL="https://kubernetes.github.io/ingress-nginx"},
    @{Name="cert-manager"; URL="https://charts.jetstack.io"}
)

foreach ($repo in $helmRepos) {
    Write-Host "   Adding $($repo.Name) repository..." -ForegroundColor Gray
    helm repo add $repo.Name $repo.URL 2>$null
}

Write-Host "   Updating Helm repositories..." -ForegroundColor Gray
helm repo update

# Generate secrets if they don't exist
Write-Host "🔐 Generating secrets..." -ForegroundColor Yellow
$secretsScript = Join-Path $scriptPath "generate-secrets.ps1"
if (Test-Path $secretsScript) {
    & $secretsScript -Environment $Environment -Namespace $Namespace
} else {
    Write-Host "⚠️  Secrets generation script not found, using defaults" -ForegroundColor Yellow
}

# Prepare Helm values
$helmArgs = @(
    "--namespace", $Namespace,
    "--create-namespace"
)

# Add values file
if ($ValuesFile -ne "") {
    if (Test-Path $ValuesFile) {
        $helmArgs += "--values", $ValuesFile
    } else {
        Write-Host "❌ Values file not found: $ValuesFile" -ForegroundColor Red
        exit 1
    }
} else {
    $defaultValuesFile = "helm/quantum-mycelium-nexus/values-$Environment.yaml"
    if (Test-Path $defaultValuesFile) {
        $helmArgs += "--values", $defaultValuesFile
    } else {
        $helmArgs += "--values", "helm/quantum-mycelium-nexus/values.yaml"
    }
}

# Add set values
foreach ($key in $SetValues.Keys) {
    $helmArgs += "--set", "$key=$($SetValues[$key])"
}

# Environment-specific overrides
if ($Environment -eq "production") {
    $helmArgs += @(
        "--set", "global.environment=production",
        "--set", "monitoring.prometheus.enabled=true",
        "--set", "monitoring.grafana.enabled=true",
        "--set", "backup.enabled=$($EnableBackup.IsPresent)",
        "--set", "rbac.create=true",
        "--set", "networkPolicy.enabled=true",
        "--set", "podSecurityPolicy.enabled=true"
    )
} elseif ($Environment -eq "staging") {
    $helmArgs += @(
        "--set", "global.environment=staging",
        "--set", "myceliumRuntime.replicaCount=2",
        "--set", "quantumCompute.replicaCount=1",
        "--set", "orchestrator.replicaCount=1"
    )
}

# Enable monitoring if requested
if ($EnableMonitoring) {
    $helmArgs += @(
        "--set", "monitoring.prometheus.enabled=true",
        "--set", "monitoring.grafana.enabled=true",
        "--set", "tracing.jaeger.enabled=true"
    )
}

# Dry run check
if ($DryRun) {
    $helmArgs += "--dry-run", "--debug"
    Write-Host "🧪 Performing dry run..." -ForegroundColor Yellow
} else {
    Write-Host "🚀 Deploying to $Environment..." -ForegroundColor Yellow
}

# Install or upgrade
$chartPath = "helm/quantum-mycelium-nexus"

if ($Install -or $Upgrade) {
    if ($Install) {
        Write-Host "📥 Installing QuantumMycelium Nexus..." -ForegroundColor Yellow
        $action = "install"
    } else {
        Write-Host "⬆️  Upgrading QuantumMycelium Nexus..." -ForegroundColor Yellow
        $action = "upgrade"
        $helmArgs += "--reuse-values"
    }
    
    # Execute Helm command
    $helmCommand = "helm $action $HelmReleaseName $chartPath " + ($helmArgs -join " ")
    Write-Host "   Executing: $helmCommand" -ForegroundColor Gray
    
    Invoke-Expression $helmCommand
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Helm $action failed" -ForegroundColor Red
        exit 1
    }
} else {
    # Auto-detect install or upgrade
    try {
        helm get values $HelmReleaseName --namespace=$Namespace 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "⬆️  Upgrading existing release..." -ForegroundColor Yellow
            $helmArgs += "--reuse-values"
            $action = "upgrade"
        } else {
            Write-Host "📥 Installing new release..." -ForegroundColor Yellow
            $action = "install"
        }
    } catch {
        Write-Host "📥 Installing new release..." -ForegroundColor Yellow
        $action = "install"
    }
    
    # Execute Helm command
    $helmCommand = "helm $action $HelmReleaseName $chartPath " + ($helmArgs -join " ")
    Write-Host "   Executing: $helmCommand" -ForegroundColor Gray
    
    Invoke-Expression $helmCommand
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Helm $action failed" -ForegroundColor Red
        exit 1
    }
}

if (!$DryRun) {
    # Wait for deployment to be ready
    Write-Host "⏳ Waiting for deployment to be ready..." -ForegroundColor Yellow
    
    $deployments = @(
        "mycelium-runtime",
        "quantum-compute", 
        "integration-orchestrator",
        "frontend"
    )
    
    foreach ($deployment in $deployments) {
        Write-Host "   Waiting for $deployment..." -ForegroundColor Gray
        kubectl rollout status deployment/$deployment --namespace=$Namespace --timeout=300s
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "⚠️  Deployment $deployment did not become ready within timeout" -ForegroundColor Yellow
        }
    }
    
    # Verify pods are running
    Write-Host "🔍 Verifying pod status..." -ForegroundColor Yellow
    $pods = kubectl get pods --namespace=$Namespace --selector="app.kubernetes.io/part-of=quantum-mycelium-nexus" --output=json | ConvertFrom-Json
    
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
        }
    }
    
    Write-Host "📊 Pod Summary: $runningPods/$totalPods running" -ForegroundColor Cyan
    
    # Display service URLs
    Write-Host "`n🌐 Service URLs:" -ForegroundColor Cyan
    
    try {
        $services = kubectl get services --namespace=$Namespace --output=json | ConvertFrom-Json
        foreach ($service in $services.items) {
            $serviceName = $service.metadata.name
            $serviceType = $service.spec.type
            $ports = $service.spec.ports
            
            if ($ports) {
                foreach ($port in $ports) {
                    $portNumber = $port.port
                    if ($serviceType -eq "LoadBalancer") {
                        $externalIP = $service.status.loadBalancer.ingress[0].ip
                        if ($externalIP) {
                            Write-Host "   $serviceName : http://$externalIP`:$portNumber" -ForegroundColor White
                        }
                    } elseif ($serviceType -eq "ClusterIP") {
                        Write-Host "   $serviceName : http://$serviceName.$Namespace.svc.cluster.local:$portNumber" -ForegroundColor White
                    }
                }
            }
        }
    } catch {
        Write-Host "   Could not retrieve service information" -ForegroundColor Yellow
    }
    
    # Display ingress information
    try {
        $ingresses = kubectl get ingress --namespace=$Namespace --output=json | ConvertFrom-Json
        if ($ingresses.items.Count -gt 0) {
            Write-Host "`n🌍 Ingress URLs:" -ForegroundColor Cyan
            foreach ($ingress in $ingresses.items) {
                foreach ($rule in $ingress.spec.rules) {
                    $host = $rule.host
                    $scheme = if ($ingress.spec.tls) { "https" } else { "http" }
                    Write-Host "   Frontend: $scheme`://$host" -ForegroundColor White
                }
            }
        }
    } catch {
        Write-Host "   No ingress configured" -ForegroundColor Gray
    }
    
    # Display monitoring URLs
    if ($EnableMonitoring) {
        Write-Host "`n📈 Monitoring URLs:" -ForegroundColor Cyan
        Write-Host "   Prometheus: http://prometheus.$Namespace.svc.cluster.local:9090" -ForegroundColor White
        Write-Host "   Grafana: http://grafana.$Namespace.svc.cluster.local:3000" -ForegroundColor White
        Write-Host "   Jaeger: http://jaeger-query.$Namespace.svc.cluster.local:16686" -ForegroundColor White
    }
    
    # Final status
    Write-Host "`n✨ QuantumMycelium Nexus deployment complete!" -ForegroundColor Green
    Write-Host "   Environment: $Environment" -ForegroundColor Gray
    Write-Host "   Namespace: $Namespace" -ForegroundColor Gray
    Write-Host "   Release: $HelmReleaseName" -ForegroundColor Gray
    
    Write-Host "`n🔧 Management Commands:" -ForegroundColor Cyan
    Write-Host "   View pods: kubectl get pods -n $Namespace" -ForegroundColor White
    Write-Host "   View services: kubectl get services -n $Namespace" -ForegroundColor White
    Write-Host "   View logs: kubectl logs -f deployment/mycelium-runtime -n $Namespace" -ForegroundColor White
    Write-Host "   Port forward: kubectl port-forward svc/frontend-service 3000:3000 -n $Namespace" -ForegroundColor White
    Write-Host "   Helm status: helm status $HelmReleaseName -n $Namespace" -ForegroundColor White
    Write-Host "   Uninstall: helm uninstall $HelmReleaseName -n $Namespace" -ForegroundColor White
} else {
    Write-Host "✅ Dry run completed successfully" -ForegroundColor Green
}