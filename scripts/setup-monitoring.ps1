# ========================================
# MONITORING SETUP SCRIPT
# ========================================
# Sets up Prometheus, Grafana, and alerting

param(
    [switch]$LocalOnly = $false,
    [switch]$SkipDashboards = $false
)

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  SETTING UP MONITORING STACK" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Create monitoring network if not exists
Write-Host "Creating monitoring network..." -ForegroundColor Yellow
docker network create monitoring 2>$null

# Deploy Prometheus
Write-Host "Deploying Prometheus..." -ForegroundColor Yellow
docker run -d `
    --name prometheus `
    --network monitoring `
    -p 9090:9090 `
    -v ${PWD}/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml `
    -v ${PWD}/monitoring/alerts:/etc/prometheus/alerts `
    -v prometheus_data:/prometheus `
    prom/prometheus:latest `
    --config.file=/etc/prometheus/prometheus.yml `
    --storage.tsdb.path=/prometheus `
    --web.console.libraries=/usr/share/prometheus/console_libraries `
    --web.console.templates=/usr/share/prometheus/consoles `
    --web.enable-lifecycle

if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK Prometheus deployed" -ForegroundColor Green
} else {
    Write-Host "  Prometheus may already be running" -ForegroundColor Yellow
}

# Deploy Grafana
Write-Host "Deploying Grafana..." -ForegroundColor Yellow

# Create Grafana provisioning directories
$grafanaProvisioningPath = ".\monitoring\grafana\provisioning"
if (-not (Test-Path $grafanaProvisioningPath)) {
    New-Item -ItemType Directory -Path $grafanaProvisioningPath\datasources -Force | Out-Null
    New-Item -ItemType Directory -Path $grafanaProvisioningPath\dashboards -Force | Out-Null
}

# Create datasource provisioning
$datasourceConfig = @"
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
    jsonData:
      timeInterval: "15s"
"@
$datasourceConfig | Set-Content "$grafanaProvisioningPath\datasources\prometheus.yml"

# Create dashboard provisioning
$dashboardConfig = @"
apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
"@
$dashboardConfig | Set-Content "$grafanaProvisioningPath\dashboards\default.yml"

# Get Grafana admin password from .env
$grafanaPassword = "admin"
if (Test-Path ".env") {
    $envContent = Get-Content ".env"
    $passwordLine = $envContent | Where-Object { $_ -match "GRAFANA_ADMIN_PASSWORD=" }
    if ($passwordLine) {
        $grafanaPassword = $passwordLine -replace "GRAFANA_ADMIN_PASSWORD=", ""
    }
}

# Deploy Grafana container
docker run -d `
    --name grafana `
    --network monitoring `
    -p 3001:3000 `
    -v ${PWD}/monitoring/grafana/provisioning:/etc/grafana/provisioning `
    -v ${PWD}/monitoring/grafana/dashboards:/var/lib/grafana/dashboards `
    -v grafana_data:/var/lib/grafana `
    -e "GF_SECURITY_ADMIN_PASSWORD=$grafanaPassword" `
    -e "GF_INSTALL_PLUGINS=grafana-piechart-panel,grafana-worldmap-panel" `
    grafana/grafana:latest

if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK Grafana deployed" -ForegroundColor Green
} else {
    Write-Host "  Grafana may already be running" -ForegroundColor Yellow
}

# Deploy Alertmanager
Write-Host "Deploying Alertmanager..." -ForegroundColor Yellow

# Create Alertmanager config
$alertmanagerConfig = @"
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'critical'
      continue: true
    - match:
        severity: warning
      receiver: 'warning'

receivers:
  - name: 'default'
    webhook_configs:
      - url: 'http://integration-hub:8080/api/alerts'
        send_resolved: true

  - name: 'critical'
    webhook_configs:
      - url: 'http://integration-hub:8080/api/alerts/critical'
        send_resolved: true

  - name: 'warning'
    webhook_configs:
      - url: 'http://integration-hub:8080/api/alerts/warning'
        send_resolved: true

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'cluster', 'service']
"@

$alertmanagerConfig | Set-Content ".\monitoring\alertmanager.yml"

docker run -d `
    --name alertmanager `
    --network monitoring `
    -p 9093:9093 `
    -v ${PWD}/monitoring/alertmanager.yml:/etc/alertmanager/alertmanager.yml `
    prom/alertmanager:latest

if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK Alertmanager deployed" -ForegroundColor Green
} else {
    Write-Host "  Alertmanager may already be running" -ForegroundColor Yellow
}

# Deploy Node Exporter
Write-Host "Deploying Node Exporter..." -ForegroundColor Yellow
docker run -d `
    --name node-exporter `
    --network monitoring `
    -p 9100:9100 `
    --pid="host" `
    -v "/:/host:ro,rslave" `
    prom/node-exporter:latest `
    --path.rootfs=/host

if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK Node Exporter deployed" -ForegroundColor Green
} else {
    Write-Host "  Node Exporter may already be running" -ForegroundColor Yellow
}

# Deploy cAdvisor for container metrics
Write-Host "Deploying cAdvisor..." -ForegroundColor Yellow
docker run -d `
    --name cadvisor `
    --network monitoring `
    -p 8081:8080 `
    --volume=/:/rootfs:ro `
    --volume=/var/run:/var/run:ro `
    --volume=/sys:/sys:ro `
    --volume=/var/lib/docker/:/var/lib/docker:ro `
    gcr.io/cadvisor/cadvisor:latest

if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK cAdvisor deployed" -ForegroundColor Green
} else {
    Write-Host "  cAdvisor may already be running" -ForegroundColor Yellow
}

# Connect monitoring network to default network
Write-Host ""
Write-Host "Connecting monitoring to application network..." -ForegroundColor Yellow
docker network connect monitoring mycelium-app 2>$null
docker network connect monitoring quantum-core 2>$null
docker network connect monitoring integration-hub 2>$null
docker network connect nexus-local prometheus 2>$null
docker network connect nexus-local grafana 2>$null

# Wait for services to be ready
Write-Host ""
Write-Host "Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Verify services
Write-Host ""
Write-Host "Verifying monitoring services..." -ForegroundColor Yellow

$services = @(
    @{Name="Prometheus"; Url="http://localhost:9090/-/ready"},
    @{Name="Grafana"; Url="http://localhost:3001/api/health"},
    @{Name="Alertmanager"; Url="http://localhost:9093/-/ready"},
    @{Name="Node Exporter"; Url="http://localhost:9100/metrics"},
    @{Name="cAdvisor"; Url="http://localhost:8081/healthz"}
)

foreach ($service in $services) {
    try {
        $response = Invoke-WebRequest -Uri $service.Url -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "  OK $($service.Name) is healthy" -ForegroundColor Green
        }
    } catch {
        Write-Host "  Warning: $($service.Name) not responding" -ForegroundColor Yellow
    }
}

# Import Grafana dashboards
if (-not $SkipDashboards) {
    Write-Host ""
    Write-Host "Importing Grafana dashboards..." -ForegroundColor Yellow
    
    # Wait for Grafana to be fully ready
    Start-Sleep -Seconds 5
    
    # Get dashboards
    $dashboards = Get-ChildItem ".\monitoring\grafana\dashboards\*.json" -ErrorAction SilentlyContinue
    
    if ($dashboards) {
        foreach ($dashboard in $dashboards) {
            Write-Host "  Importing $($dashboard.Name)..." -ForegroundColor White
            
            $dashboardContent = Get-Content $dashboard.FullName -Raw
            $body = @{
                dashboard = $dashboardContent | ConvertFrom-Json
                overwrite = $true
                folderId = 0
            } | ConvertTo-Json -Depth 10
            
            try {
                $response = Invoke-RestMethod `
                    -Uri "http://admin:$grafanaPassword@localhost:3001/api/dashboards/db" `
                    -Method POST `
                    -Body $body `
                    -ContentType "application/json"
                    
                Write-Host "    OK Dashboard imported" -ForegroundColor Green
            } catch {
                Write-Host "    Failed to import dashboard" -ForegroundColor Yellow
            }
        }
    }
}

Write-Host ""
Write-Host "=================================================" -ForegroundColor Green
Write-Host "  MONITORING SETUP COMPLETE!" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Access URLs:" -ForegroundColor Cyan
Write-Host "  Prometheus: http://localhost:9090" -ForegroundColor White
Write-Host "  Grafana: http://localhost:3001" -ForegroundColor White
Write-Host "    Username: admin" -ForegroundColor Gray
Write-Host "    Password: $grafanaPassword" -ForegroundColor Gray
Write-Host "  Alertmanager: http://localhost:9093" -ForegroundColor White
Write-Host ""
Write-Host "Useful queries:" -ForegroundColor Cyan
Write-Host "  View all metrics: http://localhost:9090/graph" -ForegroundColor White
Write-Host "  View targets: http://localhost:9090/targets" -ForegroundColor White
Write-Host "  View alerts: http://localhost:9090/alerts" -ForegroundColor White
Write-Host ""
Write-Host "To stop monitoring:" -ForegroundColor Yellow
Write-Host "  docker stop prometheus grafana alertmanager node-exporter cadvisor" -ForegroundColor White
Write-Host ""