param(
    [Parameter(Mandatory=$false)]
    [string]$TestSuite = "all",
    
    [Parameter(Mandatory=$false)]
    [string]$Namespace = "quantum-mycelium-staging",
    
    [Parameter(Mandatory=$false)]
    [switch]$Parallel,
    
    [Parameter(Mandatory=$false)]
    [switch]$Verbose,
    
    [Parameter(Mandatory=$false)]
    [string]$OutputDir = "test-results"
)

$ErrorActionPreference = "Stop"

# Set working directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
Set-Location $projectRoot

Write-Host "🧪 QuantumMycelium Nexus Comprehensive Test Suite" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Create output directory
if (!(Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

# Test configuration
$testConfig = @{
    baseUrl = "http://localhost:8300"
    frontendUrl = "http://localhost:3000"
    grafanaUrl = "http://localhost:3001"
    prometheusUrl = "http://localhost:9090"
    namespace = $Namespace
    timeout = 300  # 5 minutes
    retryAttempts = 3
    retryDelaySeconds = 5
}

# Initialize test results
$testResults = @{
    startTime = Get-Date
    results = @()
    totalTests = 0
    passedTests = 0
    failedTests = 0
    skippedTests = 0
}

# Test helper functions
function Write-TestHeader {
    param([string]$TestName)
    Write-Host "`n🔬 Testing: $TestName" -ForegroundColor Yellow
    Write-Host ("=" * ($TestName.Length + 12)) -ForegroundColor Yellow
}

function Write-TestResult {
    param(
        [string]$TestName,
        [bool]$Passed,
        [string]$Message = "",
        [hashtable]$Metrics = @{}
    )
    
    $result = @{
        testName = $TestName
        passed = $Passed
        message = $Message
        metrics = $Metrics
        timestamp = Get-Date
    }
    
    $script:testResults.results += $result
    $script:testResults.totalTests++
    
    if ($Passed) {
        $script:testResults.passedTests++
        Write-Host "   ✅ $TestName" -ForegroundColor Green
        if ($Message) { Write-Host "      $Message" -ForegroundColor Gray }
    } else {
        $script:testResults.failedTests++
        Write-Host "   ❌ $TestName" -ForegroundColor Red
        if ($Message) { Write-Host "      $Message" -ForegroundColor Red }
    }
    
    # Log metrics
    if ($Metrics.Count -gt 0) {
        foreach ($key in $Metrics.Keys) {
            Write-Host "      📊 $key`: $($Metrics[$key])" -ForegroundColor Cyan
        }
    }
}

function Invoke-ApiTest {
    param(
        [string]$Endpoint,
        [string]$Method = "GET",
        [hashtable]$Body = $null,
        [int]$ExpectedStatus = 200,
        [int]$TimeoutSeconds = 30
    )
    
    try {
        $uri = "$($testConfig.baseUrl)$Endpoint"
        $params = @{
            Uri = $uri
            Method = $Method
            TimeoutSec = $TimeoutSeconds
            UseBasicParsing = $true
        }
        
        if ($Body) {
            $params.Body = $Body | ConvertTo-Json
            $params.ContentType = "application/json"
        }
        
        $response = Invoke-WebRequest @params
        
        return @{
            success = ($response.StatusCode -eq $ExpectedStatus)
            statusCode = $response.StatusCode
            content = $response.Content
            responseTime = $null  # Would need to measure this
        }
    } catch {
        return @{
            success = $false
            statusCode = $null
            content = $null
            error = $_.Exception.Message
        }
    }
}

function Test-PodHealth {
    param([string]$DeploymentName)
    
    try {
        $pods = kubectl get pods -l app=$DeploymentName -n $testConfig.namespace -o json | ConvertFrom-Json
        
        if ($pods.items.Count -eq 0) {
            return @{ healthy = $false; message = "No pods found" }
        }
        
        $runningPods = ($pods.items | Where-Object { $_.status.phase -eq "Running" }).Count
        $totalPods = $pods.items.Count
        
        return @{
            healthy = ($runningPods -eq $totalPods -and $totalPods -gt 0)
            runningPods = $runningPods
            totalPods = $totalPods
            message = "$runningPods/$totalPods pods running"
        }
    } catch {
        return @{ healthy = $false; message = $_.Exception.Message }
    }
}

# Test Suite 1: Infrastructure Health Tests
function Test-InfrastructureHealth {
    Write-TestHeader "Infrastructure Health"
    
    # Test Kubernetes cluster connectivity
    try {
        kubectl cluster-info --request-timeout=10s | Out-Null
        Write-TestResult "Kubernetes Cluster" $true "Cluster is accessible"
    } catch {
        Write-TestResult "Kubernetes Cluster" $false "Cannot connect to cluster"
        return
    }
    
    # Test namespace exists
    try {
        kubectl get namespace $testConfig.namespace | Out-Null
        Write-TestResult "Namespace Exists" $true "Namespace $($testConfig.namespace) found"
    } catch {
        Write-TestResult "Namespace Exists" $false "Namespace $($testConfig.namespace) not found"
        return
    }
    
    # Test pod health for each deployment
    $deployments = @("mycelium-runtime", "quantum-compute", "orchestrator", "frontend")
    
    foreach ($deployment in $deployments) {
        $health = Test-PodHealth $deployment
        Write-TestResult "Pod Health: $deployment" $health.healthy $health.message
    }
    
    # Test services exist
    $services = @("mycelium-runtime-service", "quantum-compute-service", "orchestrator-service", "frontend-service")
    
    foreach ($service in $services) {
        try {
            kubectl get service $service -n $testConfig.namespace | Out-Null
            Write-TestResult "Service: $service" $true "Service exists"
        } catch {
            Write-TestResult "Service: $service" $false "Service not found"
        }
    }
    
    # Test persistent volumes
    try {
        $pvcs = kubectl get pvc -n $testConfig.namespace -o json | ConvertFrom-Json
        $boundPVCs = ($pvcs.items | Where-Object { $_.status.phase -eq "Bound" }).Count
        $totalPVCs = $pvcs.items.Count
        
        Write-TestResult "Persistent Volumes" ($boundPVCs -eq $totalPVCs) "$boundPVCs/$totalPVCs PVCs bound"
    } catch {
        Write-TestResult "Persistent Volumes" $false "Cannot check PVCs"
    }
}

# Test Suite 2: API Endpoint Tests
function Test-ApiEndpoints {
    Write-TestHeader "API Endpoints"
    
    # Health check endpoint
    $health = Invoke-ApiTest "/health"
    Write-TestResult "Health Endpoint" $health.success "Status: $($health.statusCode)"
    
    # API version endpoint
    $version = Invoke-ApiTest "/api/v1/version"
    Write-TestResult "Version Endpoint" $version.success "Status: $($version.statusCode)"
    
    # Networks endpoint
    $networks = Invoke-ApiTest "/api/v1/networks"
    Write-TestResult "Networks Endpoint" $networks.success "Status: $($networks.statusCode)"
    
    # Quantum circuits endpoint  
    $circuits = Invoke-ApiTest "/api/v1/quantum/circuits"
    Write-TestResult "Quantum Circuits Endpoint" $circuits.success "Status: $($circuits.statusCode)"
    
    # Metrics endpoint
    $metrics = Invoke-ApiTest "/metrics"
    Write-TestResult "Metrics Endpoint" $metrics.success "Status: $($metrics.statusCode)"
    
    # Test authentication (should fail without token)
    $auth = Invoke-ApiTest "/api/v1/compute/hybrid" "POST" @{} 401
    Write-TestResult "Authentication Required" $auth.success "Properly requires authentication"
}

# Test Suite 3: Frontend Tests
function Test-Frontend {
    Write-TestHeader "Frontend Application"
    
    # Test frontend accessibility
    try {
        $response = Invoke-WebRequest -Uri $testConfig.frontendUrl -TimeoutSec 10 -UseBasicParsing
        Write-TestResult "Frontend Accessibility" ($response.StatusCode -eq 200) "Status: $($response.StatusCode)"
        
        # Check for key elements in HTML
        $content = $response.Content
        $hasReact = $content -like "*react*" -or $content -like "*App*"
        Write-TestResult "Frontend React App" $hasReact "React application detected"
        
    } catch {
        Write-TestResult "Frontend Accessibility" $false "Cannot reach frontend: $($_.Exception.Message)"
    }
    
    # Test static assets (would need to check specific paths)
    try {
        $manifest = Invoke-WebRequest -Uri "$($testConfig.frontendUrl)/manifest.json" -TimeoutSec 5 -UseBasicParsing
        Write-TestResult "Frontend Manifest" ($manifest.StatusCode -eq 200) "Manifest file accessible"
    } catch {
        Write-TestResult "Frontend Manifest" $false "Manifest not accessible"
    }
}

# Test Suite 4: Database Connectivity
function Test-DatabaseConnectivity {
    Write-TestHeader "Database Connectivity"
    
    # Test PostgreSQL connectivity via pod
    try {
        $pgPod = kubectl get pods -l app.kubernetes.io/name=postgresql -n $testConfig.namespace -o jsonpath='{.items[0].metadata.name}' 2>$null
        
        if ($pgPod) {
            $dbTest = kubectl exec $pgPod -n $testConfig.namespace -- psql -U postgres -d quantum_mycelium_staging -c "SELECT 1;" 2>$null
            Write-TestResult "PostgreSQL Connection" ($LASTEXITCODE -eq 0) "Database query successful"
            
            # Test table creation (basic)
            $tableTest = kubectl exec $pgPod -n $testConfig.namespace -- psql -U postgres -d quantum_mycelium_staging -c "CREATE TABLE IF NOT EXISTS test_table (id SERIAL PRIMARY KEY);" 2>$null
            Write-TestResult "PostgreSQL Write Access" ($LASTEXITCODE -eq 0) "Can create tables"
        } else {
            Write-TestResult "PostgreSQL Connection" $false "PostgreSQL pod not found"
        }
    } catch {
        Write-TestResult "PostgreSQL Connection" $false "Database test failed: $($_.Exception.Message)"
    }
    
    # Test Redis connectivity
    try {
        $redisPod = kubectl get pods -l app.kubernetes.io/name=redis -n $testConfig.namespace -o jsonpath='{.items[0].metadata.name}' 2>$null
        
        if ($redisPod) {
            $redisTest = kubectl exec $redisPod -n $testConfig.namespace -- redis-cli ping 2>$null
            Write-TestResult "Redis Connection" ($LASTEXITCODE -eq 0) "Redis ping successful"
        } else {
            Write-TestResult "Redis Connection" $false "Redis pod not found"
        }
    } catch {
        Write-TestResult "Redis Connection" $false "Redis test failed: $($_.Exception.Message)"
    }
}

# Test Suite 5: Monitoring Stack
function Test-MonitoringStack {
    Write-TestHeader "Monitoring Stack"
    
    # Test Prometheus
    try {
        $prometheus = Invoke-WebRequest -Uri "$($testConfig.prometheusUrl)/-/healthy" -TimeoutSec 10 -UseBasicParsing
        Write-TestResult "Prometheus Health" ($prometheus.StatusCode -eq 200) "Prometheus is healthy"
        
        # Test targets
        $targets = Invoke-WebRequest -Uri "$($testConfig.prometheusUrl)/api/v1/targets" -TimeoutSec 10 -UseBasicParsing
        Write-TestResult "Prometheus Targets" ($targets.StatusCode -eq 200) "Can query targets"
        
    } catch {
        Write-TestResult "Prometheus Health" $false "Cannot reach Prometheus: $($_.Exception.Message)"
    }
    
    # Test Grafana
    try {
        $grafana = Invoke-WebRequest -Uri "$($testConfig.grafanaUrl)/api/health" -TimeoutSec 10 -UseBasicParsing
        Write-TestResult "Grafana Health" ($grafana.StatusCode -eq 200) "Grafana is healthy"
    } catch {
        Write-TestResult "Grafana Health" $false "Cannot reach Grafana: $($_.Exception.Message)"
    }
}

# Test Suite 6: Resource Utilization
function Test-ResourceUtilization {
    Write-TestHeader "Resource Utilization"
    
    try {
        # Get node metrics
        $nodes = kubectl top nodes --no-headers 2>$null
        if ($nodes) {
            Write-TestResult "Node Metrics" $true "Node resource metrics available"
            
            # Parse CPU and memory usage
            $nodeLines = $nodes -split "`n" | Where-Object { $_ -ne "" }
            foreach ($line in $nodeLines) {
                $parts = $line -split '\s+' | Where-Object { $_ -ne "" }
                if ($parts.Count -ge 5) {
                    $nodeName = $parts[0]
                    $cpuUsage = $parts[1]
                    $memoryUsage = $parts[3]
                    Write-Host "      📊 $nodeName - CPU: $cpuUsage, Memory: $memoryUsage" -ForegroundColor Cyan
                }
            }
        } else {
            Write-TestResult "Node Metrics" $false "Cannot get node metrics"
        }
        
        # Get pod metrics
        $pods = kubectl top pods -n $testConfig.namespace --no-headers 2>$null
        if ($pods) {
            Write-TestResult "Pod Metrics" $true "Pod resource metrics available"
            
            $podLines = $pods -split "`n" | Where-Object { $_ -ne "" }
            $totalCpuUsage = 0
            $totalMemoryUsage = 0
            
            foreach ($line in $podLines) {
                $parts = $line -split '\s+' | Where-Object { $_ -ne "" }
                if ($parts.Count -ge 3) {
                    $podName = $parts[0]
                    $cpuUsage = $parts[1]
                    $memoryUsage = $parts[2]
                    Write-Host "      📊 $podName - CPU: $cpuUsage, Memory: $memoryUsage" -ForegroundColor Cyan
                }
            }
        } else {
            Write-TestResult "Pod Metrics" $false "Cannot get pod metrics"
        }
        
    } catch {
        Write-TestResult "Resource Utilization" $false "Resource metrics failed: $($_.Exception.Message)"
    }
}

# Main test execution
Write-Host "🚀 Starting comprehensive test suite..." -ForegroundColor Green
Write-Host "   Target: $($testConfig.baseUrl)" -ForegroundColor Gray
Write-Host "   Namespace: $($testConfig.namespace)" -ForegroundColor Gray
Write-Host "   Output: $OutputDir" -ForegroundColor Gray

# Run test suites based on parameter
switch ($TestSuite.ToLower()) {
    "all" {
        Test-InfrastructureHealth
        Test-ApiEndpoints
        Test-Frontend
        Test-DatabaseConnectivity
        Test-MonitoringStack
        Test-ResourceUtilization
    }
    "infra" { Test-InfrastructureHealth }
    "api" { Test-ApiEndpoints }
    "frontend" { Test-Frontend }
    "database" { Test-DatabaseConnectivity }
    "monitoring" { Test-MonitoringStack }
    "resources" { Test-ResourceUtilization }
    default {
        Write-Host "❌ Unknown test suite: $TestSuite" -ForegroundColor Red
        Write-Host "   Available suites: all, infra, api, frontend, database, monitoring, resources" -ForegroundColor Yellow
        exit 1
    }
}

# Generate test report
$testResults.endTime = Get-Date
$testResults.duration = $testResults.endTime - $testResults.startTime

Write-Host "`n📊 Test Results Summary" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan
Write-Host "   Total Tests: $($testResults.totalTests)" -ForegroundColor White
Write-Host "   Passed: $($testResults.passedTests)" -ForegroundColor Green
Write-Host "   Failed: $($testResults.failedTests)" -ForegroundColor Red
Write-Host "   Duration: $($testResults.duration.TotalSeconds.ToString('F2')) seconds" -ForegroundColor White

$successRate = if ($testResults.totalTests -gt 0) { 
    ($testResults.passedTests / $testResults.totalTests * 100).ToString('F1')
} else { 
    "0"
}
Write-Host "   Success Rate: $successRate%" -ForegroundColor Cyan

# Save detailed results to JSON
$reportPath = Join-Path $OutputDir "staging-test-report.json"
$testResults | ConvertTo-Json -Depth 5 | Out-File $reportPath
Write-Host "`n📄 Detailed report saved to: $reportPath" -ForegroundColor Gray

# Save summary report
$summaryPath = Join-Path $OutputDir "staging-test-summary.txt"
@"
QuantumMycelium Nexus Staging Test Summary
==========================================
Executed: $($testResults.startTime)
Duration: $($testResults.duration.TotalSeconds.ToString('F2')) seconds
Environment: $($testConfig.namespace)

Results:
- Total Tests: $($testResults.totalTests)
- Passed: $($testResults.passedTests)
- Failed: $($testResults.failedTests)
- Success Rate: $successRate%

Failed Tests:
$($testResults.results | Where-Object { !$_.passed } | ForEach-Object { "- $($_.testName): $($_.message)" } | Out-String)
"@ | Out-File $summaryPath

# Exit with appropriate code
if ($testResults.failedTests -eq 0) {
    Write-Host "✅ All tests passed!" -ForegroundColor Green
    Write-Host "   Ready to proceed with quantum computation validation" -ForegroundColor Gray
    exit 0
} else {
    Write-Host "❌ $($testResults.failedTests) test(s) failed" -ForegroundColor Red
    Write-Host "   Review the detailed report for more information" -ForegroundColor Gray
    exit 1
}