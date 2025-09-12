param(
    [Parameter(Mandatory=$true)]
    [string]$Domain,
    
    [Parameter(Mandatory=$false)]
    [string]$Namespace = "quantum-mycelium-prod",
    
    [Parameter(Mandatory=$false)]
    [int]$TimeoutMinutes = 10
)

$ErrorActionPreference = "Stop"

Write-Host "🔍 QuantumMycelium Nexus Production Validation" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "Domain: $Domain" -ForegroundColor White
Write-Host "Namespace: $Namespace" -ForegroundColor White

# Test suite
$testResults = @()

# Function to add test result
function Add-TestResult {
    param($Name, $Status, $Details = "")
    $testResults += @{
        Name = $Name
        Status = $Status
        Details = $Details
        Timestamp = Get-Date
    }
}

# 1. Kubernetes cluster health
Write-Host "`n🏥 Cluster Health Checks" -ForegroundColor Yellow
try {
    kubectl cluster-info | Out-Null
    Add-TestResult "Kubernetes Cluster" "✅ PASS"
} catch {
    Add-TestResult "Kubernetes Cluster" "❌ FAIL" "Cannot connect to cluster"
}

# 2. Namespace validation
Write-Host "📁 Namespace Validation" -ForegroundColor Yellow
try {
    $namespaceInfo = kubectl get namespace $Namespace -o json | ConvertFrom-Json
    $labels = $namespaceInfo.metadata.labels
    
    if ($labels."environment" -eq "production") {
        Add-TestResult "Namespace Labels" "✅ PASS"
    } else {
        Add-TestResult "Namespace Labels" "⚠️  WARN" "Production label missing"
    }
} catch {
    Add-TestResult "Namespace Validation" "❌ FAIL" "Namespace not found"
}

# 3. Pod health
Write-Host "🔍 Pod Health Assessment" -ForegroundColor Yellow
try {
    $pods = kubectl get pods --namespace=$Namespace -o json | ConvertFrom-Json
    $runningPods = ($pods.items | Where-Object { $_.status.phase -eq "Running" }).Count
    $totalPods = $pods.items.Count
    
    if ($runningPods -eq $totalPods -and $totalPods -gt 0) {
        Add-TestResult "Pod Health" "✅ PASS" "$runningPods/$totalPods pods running"
    } else {
        Add-TestResult "Pod Health" "⚠️  WARN" "$runningPods/$totalPods pods running"
    }
} catch {
    Add-TestResult "Pod Health" "❌ FAIL" "Cannot retrieve pod information"
}

# 4. Service connectivity
Write-Host "🌐 Service Connectivity" -ForegroundColor Yellow
$services = @("mycelium-runtime", "quantum-compute", "orchestrator", "frontend")
foreach ($service in $services) {
    try {
        $serviceInfo = kubectl get service "$service-service" --namespace=$Namespace -o json 2>$null | ConvertFrom-Json
        if ($serviceInfo) {
            Add-TestResult "Service: $service" "✅ PASS"
        } else {
            Add-TestResult "Service: $service" "❌ FAIL" "Service not found"
        }
    } catch {
        Add-TestResult "Service: $service" "❌ FAIL" "Service check failed"
    }
}

# 5. Ingress validation
Write-Host "🚪 Ingress Validation" -ForegroundColor Yellow
try {
    $ingresses = kubectl get ingress --namespace=$Namespace -o json | ConvertFrom-Json
    $ingressCount = $ingresses.items.Count
    
    if ($ingressCount -gt 0) {
        Add-TestResult "Ingress Configuration" "✅ PASS" "$ingressCount ingress(es) configured"
        
        # Check specific ingress hosts
        foreach ($ingress in $ingresses.items) {
            foreach ($rule in $ingress.spec.rules) {
                if ($rule.host -like "*$Domain*") {
                    Add-TestResult "Domain Routing: $($rule.host)" "✅ PASS"
                }
            }
        }
    } else {
        Add-TestResult "Ingress Configuration" "❌ FAIL" "No ingress found"
    }
} catch {
    Add-TestResult "Ingress Validation" "❌ FAIL" "Cannot retrieve ingress information"
}

# 6. SSL Certificate validation
Write-Host "🔒 SSL Certificate Validation" -ForegroundColor Yellow
try {
    $certificates = kubectl get certificates --namespace=$Namespace -o json | ConvertFrom-Json
    foreach ($cert in $certificates.items) {
        $certName = $cert.metadata.name
        $ready = $cert.status.conditions | Where-Object { $_.type -eq "Ready" }
        
        if ($ready.status -eq "True") {
            Add-TestResult "SSL Certificate: $certName" "✅ PASS"
        } else {
            Add-TestResult "SSL Certificate: $certName" "⚠️  WARN" "Certificate not ready"
        }
    }
} catch {
    Add-TestResult "SSL Certificate Check" "❌ FAIL" "Cannot check certificates"
}

# 7. HTTP/HTTPS endpoint validation
Write-Host "🌍 Endpoint Validation" -ForegroundColor Yellow
$endpoints = @(
    @{Name="Main Site"; URL="https://$Domain"; ExpectedStatus=200},
    @{Name="API Health"; URL="https://api.$Domain/health"; ExpectedStatus=200},
    @{Name="Grafana"; URL="https://grafana.$Domain/api/health"; ExpectedStatus=200}
)

foreach ($endpoint in $endpoints) {
    try {
        $response = Invoke-WebRequest -Uri $endpoint.URL -TimeoutSec 30 -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq $endpoint.ExpectedStatus) {
            Add-TestResult "Endpoint: $($endpoint.Name)" "✅ PASS" "Status: $($response.StatusCode)"
        } else {
            Add-TestResult "Endpoint: $($endpoint.Name)" "⚠️  WARN" "Status: $($response.StatusCode)"
        }
    } catch {
        Add-TestResult "Endpoint: $($endpoint.Name)" "❌ FAIL" "Not accessible: $($_.Exception.Message)"
    }
}

# 8. Database connectivity
Write-Host "🗄️  Database Validation" -ForegroundColor Yellow
try {
    # Check if PostgreSQL pod is running
    $postgresqlPod = kubectl get pods --namespace=$Namespace -l app.kubernetes.io/name=postgresql -o jsonpath='{.items[0].metadata.name}' 2>$null
    if ($postgresqlPod) {
        $dbStatus = kubectl exec $postgresqlPod --namespace=$Namespace -- pg_isready -U postgres 2>$null
        if ($LASTEXITCODE -eq 0) {
            Add-TestResult "PostgreSQL Database" "✅ PASS"
        } else {
            Add-TestResult "PostgreSQL Database" "❌ FAIL" "Database not ready"
        }
    } else {
        Add-TestResult "PostgreSQL Database" "⚠️  WARN" "PostgreSQL pod not found"
    }
} catch {
    Add-TestResult "Database Connectivity" "❌ FAIL" "Cannot check database"
}

# 9. Redis cache validation
Write-Host "🔄 Cache Validation" -ForegroundColor Yellow
try {
    $redisPod = kubectl get pods --namespace=$Namespace -l app.kubernetes.io/name=redis -o jsonpath='{.items[0].metadata.name}' 2>$null
    if ($redisPod) {
        $redisStatus = kubectl exec $redisPod --namespace=$Namespace -- redis-cli ping 2>$null
        if ($redisStatus -eq "PONG") {
            Add-TestResult "Redis Cache" "✅ PASS"
        } else {
            Add-TestResult "Redis Cache" "❌ FAIL" "Cache not responding"
        }
    } else {
        Add-TestResult "Redis Cache" "⚠️  WARN" "Redis pod not found"
    }
} catch {
    Add-TestResult "Cache Validation" "❌ FAIL" "Cannot check cache"
}

# 10. Monitoring stack validation
Write-Host "📊 Monitoring Stack Validation" -ForegroundColor Yellow
$monitoringComponents = @("prometheus", "grafana", "jaeger")
foreach ($component in $monitoringComponents) {
    try {
        $componentPods = kubectl get pods --namespace=$Namespace -l app.kubernetes.io/name=$component -o json | ConvertFrom-Json
        $runningPods = ($componentPods.items | Where-Object { $_.status.phase -eq "Running" }).Count
        
        if ($runningPods -gt 0) {
            Add-TestResult "Monitoring: $component" "✅ PASS" "$runningPods pod(s) running"
        } else {
            Add-TestResult "Monitoring: $component" "⚠️  WARN" "No running pods"
        }
    } catch {
        Add-TestResult "Monitoring: $component" "❌ FAIL" "Cannot check component"
    }
}

# 11. Resource utilization check
Write-Host "⚡ Resource Utilization Check" -ForegroundColor Yellow
try {
    # Check node resource usage
    $nodeMetrics = kubectl top nodes --no-headers 2>$null
    if ($LASTEXITCODE -eq 0) {
        Add-TestResult "Node Metrics Available" "✅ PASS"
    } else {
        Add-TestResult "Node Metrics" "⚠️  WARN" "Metrics server may not be installed"
    }
    
    # Check pod resource usage
    $podMetrics = kubectl top pods --namespace=$Namespace --no-headers 2>$null
    if ($LASTEXITCODE -eq 0) {
        Add-TestResult "Pod Metrics Available" "✅ PASS"
    } else {
        Add-TestResult "Pod Metrics" "⚠️  WARN" "Pod metrics not available"
    }
} catch {
    Add-TestResult "Resource Utilization" "❌ FAIL" "Cannot check resource metrics"
}

# 12. Security validation
Write-Host "🛡️  Security Validation" -ForegroundColor Yellow
try {
    # Check for security policies
    $networkPolicies = kubectl get networkpolicies --namespace=$Namespace 2>$null
    if ($LASTEXITCODE -eq 0) {
        Add-TestResult "Network Policies" "✅ PASS"
    } else {
        Add-TestResult "Network Policies" "⚠️  WARN" "No network policies found"
    }
    
    # Check pod security contexts
    $pods = kubectl get pods --namespace=$Namespace -o json | ConvertFrom-Json
    $securePodsCount = 0
    foreach ($pod in $pods.items) {
        if ($pod.spec.securityContext -and $pod.spec.securityContext.runAsNonRoot) {
            $securePodsCount++
        }
    }
    
    if ($securePodsCount -eq $pods.items.Count) {
        Add-TestResult "Pod Security Contexts" "✅ PASS" "All pods run as non-root"
    } elseif ($securePodsCount -gt 0) {
        Add-TestResult "Pod Security Contexts" "⚠️  WARN" "$securePodsCount/$($pods.items.Count) pods secure"
    } else {
        Add-TestResult "Pod Security Contexts" "❌ FAIL" "No secure pod contexts found"
    }
} catch {
    Add-TestResult "Security Validation" "❌ FAIL" "Cannot check security configurations"
}

# Generate validation report
Write-Host "`n📋 Validation Report" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan

$passCount = ($testResults | Where-Object { $_.Status -like "*PASS*" }).Count
$warnCount = ($testResults | Where-Object { $_.Status -like "*WARN*" }).Count
$failCount = ($testResults | Where-Object { $_.Status -like "*FAIL*" }).Count
$totalTests = $testResults.Count

# Display results
foreach ($result in $testResults) {
    $status = $result.Status
    $details = if ($result.Details) { " - $($result.Details)" } else { "" }
    Write-Host "   $status $($result.Name)$details" -ForegroundColor White
}

Write-Host "`n📊 Summary:" -ForegroundColor Cyan
Write-Host "   ✅ Passed: $passCount" -ForegroundColor Green
Write-Host "   ⚠️  Warnings: $warnCount" -ForegroundColor Yellow
Write-Host "   ❌ Failed: $failCount" -ForegroundColor Red
Write-Host "   📋 Total Tests: $totalTests" -ForegroundColor White

# Overall assessment
$successRate = ($passCount / $totalTests) * 100
Write-Host "`n🎯 Success Rate: $([math]::Round($successRate, 1))%" -ForegroundColor Cyan

if ($failCount -eq 0 -and $successRate -ge 80) {
    Write-Host "🎉 Production deployment is HEALTHY!" -ForegroundColor Green
    $exitCode = 0
} elseif ($failCount -eq 0) {
    Write-Host "⚠️  Production deployment has warnings but is functional" -ForegroundColor Yellow
    $exitCode = 1
} else {
    Write-Host "❌ Production deployment has critical issues" -ForegroundColor Red
    $exitCode = 2
}

# Additional recommendations
if ($warnCount -gt 0 -or $failCount -gt 0) {
    Write-Host "`n🔧 Recommendations:" -ForegroundColor Cyan
    
    if ($failCount -gt 0) {
        Write-Host "   • Address critical failures before proceeding to production" -ForegroundColor Red
        Write-Host "   • Check pod logs: kubectl logs -f deployment/[component] -n $Namespace" -ForegroundColor White
        Write-Host "   • Review events: kubectl get events --namespace=$Namespace --sort-by='.lastTimestamp'" -ForegroundColor White
    }
    
    if ($warnCount -gt 0) {
        Write-Host "   • Review warnings and consider improvements" -ForegroundColor Yellow
        Write-Host "   • Enable monitoring if not already configured" -ForegroundColor White
        Write-Host "   • Implement network policies for enhanced security" -ForegroundColor White
    }
}

Write-Host "`n🔗 Useful Commands:" -ForegroundColor Cyan
Write-Host "   • View all resources: kubectl get all -n $Namespace" -ForegroundColor White
Write-Host "   • Check ingress: kubectl get ingress -n $Namespace" -ForegroundColor White
Write-Host "   • Monitor certificates: kubectl get certificates -n $Namespace" -ForegroundColor White
Write-Host "   • View logs: kubectl logs -f -l app.kubernetes.io/part-of=quantum-mycelium-nexus -n $Namespace" -ForegroundColor White

exit $exitCode