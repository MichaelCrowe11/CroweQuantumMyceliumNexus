# ========================================
# GOOGLE CLOUD PLATFORM DEPLOYMENT SCRIPT
# ========================================
# Deploys CroweQuantumMyceliumNexus to GCP

param(
    [string]$ProjectId = "tenacious-cocoa-471700-i9",
    [string]$Region = "us-central1",
    [string]$Environment = "production",
    [switch]$BuildOnly = $false,
    [switch]$DeployOnly = $false
)

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  DEPLOYING TO GOOGLE CLOUD PLATFORM" -ForegroundColor Cyan
Write-Host "  Project: $ProjectId" -ForegroundColor Yellow
Write-Host "  Region: $Region" -ForegroundColor Yellow
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Check if gcloud is installed
Write-Host "Checking Google Cloud SDK..." -ForegroundColor Yellow
try {
    $gcloudVersion = gcloud version --format=json | ConvertFrom-Json
    Write-Host "  OK Google Cloud SDK installed" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Google Cloud SDK not installed!" -ForegroundColor Red
    Write-Host "Download from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit 1
}

# Set project
Write-Host "Setting GCP project..." -ForegroundColor Yellow
gcloud config set project $ProjectId

# Authenticate if needed
$authStatus = gcloud auth list --filter=status:ACTIVE --format="value(account)"
if (-not $authStatus) {
    Write-Host "Authenticating with Google Cloud..." -ForegroundColor Yellow
    gcloud auth login
}

# Enable required APIs
Write-Host ""
Write-Host "Enabling required GCP APIs..." -ForegroundColor Yellow
$apis = @(
    "cloudbuild.googleapis.com",
    "run.googleapis.com",
    "container.googleapis.com",
    "sqladmin.googleapis.com",
    "redis.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "compute.googleapis.com",
    "monitoring.googleapis.com",
    "logging.googleapis.com"
)

foreach ($api in $apis) {
    Write-Host "  Enabling $api..." -ForegroundColor White
    gcloud services enable $api --quiet
}

# Create Artifact Registry repository if not exists
Write-Host ""
Write-Host "Setting up Artifact Registry..." -ForegroundColor Yellow
$repoName = "nexus-images"
$repoExists = gcloud artifacts repositories list --location=$Region --format="value(name)" | Select-String $repoName

if (-not $repoExists) {
    Write-Host "  Creating repository $repoName..." -ForegroundColor White
    gcloud artifacts repositories create $repoName `
        --repository-format=docker `
        --location=$Region `
        --description="Docker images for CroweQuantumMyceliumNexus"
} else {
    Write-Host "  Repository $repoName already exists" -ForegroundColor Green
}

# Configure Docker authentication
Write-Host "Configuring Docker authentication..." -ForegroundColor Yellow
gcloud auth configure-docker "$Region-docker.pkg.dev"

# Build and push images
if (-not $DeployOnly) {
    Write-Host ""
    Write-Host "Building and pushing Docker images..." -ForegroundColor Yellow
    
    $services = @(
        @{Name="mycelium"; Context="./MyceliumEI"; Tag="mycelium-app"},
        @{Name="quantum"; Context="./CroweQuantumNexusAI"; Tag="quantum-core"},
        @{Name="integration"; Context="./integration"; Tag="integration-hub"},
        @{Name="weather"; Context="./crowe-sense"; Tag="weather-service"}
    )
    
    foreach ($service in $services) {
        $imageName = "$Region-docker.pkg.dev/$ProjectId/$repoName/$($service.Tag):latest"
        
        Write-Host "  Building $($service.Name)..." -ForegroundColor White
        docker build -t $imageName $service.Context
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Build failed for $($service.Name)!" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "  Pushing $($service.Name)..." -ForegroundColor White
        docker push $imageName
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Push failed for $($service.Name)!" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "  OK $($service.Name) pushed successfully" -ForegroundColor Green
    }
}

if ($BuildOnly) {
    Write-Host ""
    Write-Host "Build complete! Skipping deployment." -ForegroundColor Green
    exit 0
}

# Create Cloud SQL instance
Write-Host ""
Write-Host "Setting up Cloud SQL..." -ForegroundColor Yellow
$sqlInstanceName = "nexus-postgres"
$sqlExists = gcloud sql instances list --format="value(name)" | Select-String $sqlInstanceName

if (-not $sqlExists) {
    Write-Host "  Creating Cloud SQL instance..." -ForegroundColor White
    gcloud sql instances create $sqlInstanceName `
        --database-version=POSTGRES_15 `
        --tier=db-g1-small `
        --region=$Region `
        --network=default `
        --no-assign-ip `
        --backup `
        --backup-start-time=02:00
        
    # Create databases
    gcloud sql databases create nexus_main --instance=$sqlInstanceName
    gcloud sql databases create quantum --instance=$sqlInstanceName
    gcloud sql databases create weather --instance=$sqlInstanceName
    
    # Set root password
    $sqlPassword = [System.Web.Security.Membership]::GeneratePassword(24, 4)
    gcloud sql users set-password postgres --instance=$sqlInstanceName --password=$sqlPassword
    
    Write-Host "  Cloud SQL instance created" -ForegroundColor Green
    Write-Host "  Password saved to .env.gcp.local" -ForegroundColor Yellow
    "CLOUD_SQL_PASSWORD=$sqlPassword" | Add-Content ".env.gcp.local"
} else {
    Write-Host "  Cloud SQL instance already exists" -ForegroundColor Green
}

# Create Memorystore Redis instance
Write-Host ""
Write-Host "Setting up Memorystore Redis..." -ForegroundColor Yellow
$redisInstanceName = "nexus-redis"
$redisExists = gcloud redis instances list --region=$Region --format="value(name)" | Select-String $redisInstanceName

if (-not $redisExists) {
    Write-Host "  Creating Redis instance..." -ForegroundColor White
    gcloud redis instances create $redisInstanceName `
        --size=1 `
        --region=$Region `
        --redis-version=redis_7_0 `
        --network=default
        
    Write-Host "  Redis instance created" -ForegroundColor Green
} else {
    Write-Host "  Redis instance already exists" -ForegroundColor Green
}

# Deploy to Cloud Run
Write-Host ""
Write-Host "Deploying services to Cloud Run..." -ForegroundColor Yellow

$cloudRunServices = @(
    @{
        Name="mycelium-app"
        Image="$Region-docker.pkg.dev/$ProjectId/$repoName/mycelium-app:latest"
        Port=8000
        Memory="1Gi"
        CPU="1"
    },
    @{
        Name="quantum-core"
        Image="$Region-docker.pkg.dev/$ProjectId/$repoName/quantum-core:latest"
        Port=9000
        Memory="2Gi"
        CPU="2"
    },
    @{
        Name="integration-hub"
        Image="$Region-docker.pkg.dev/$ProjectId/$repoName/integration-hub:latest"
        Port=8080
        Memory="1Gi"
        CPU="1"
    },
    @{
        Name="weather-service"
        Image="$Region-docker.pkg.dev/$ProjectId/$repoName/weather-service:latest"
        Port=8200
        Memory="512Mi"
        CPU="1"
    }
)

foreach ($service in $cloudRunServices) {
    Write-Host "  Deploying $($service.Name)..." -ForegroundColor White
    
    gcloud run deploy $service.Name `
        --image=$service.Image `
        --port=$service.Port `
        --memory=$service.Memory `
        --cpu=$service.CPU `
        --region=$Region `
        --platform=managed `
        --allow-unauthenticated `
        --set-env-vars="ENVIRONMENT=production,GCP_PROJECT_ID=$ProjectId" `
        --add-cloudsql-instances="${ProjectId}:${Region}:${sqlInstanceName}" `
        --quiet
        
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK $($service.Name) deployed" -ForegroundColor Green
        
        # Get service URL
        $serviceUrl = gcloud run services describe $service.Name --region=$Region --format="value(status.url)"
        Write-Host "     URL: $serviceUrl" -ForegroundColor Cyan
    } else {
        Write-Host "  Failed to deploy $($service.Name)" -ForegroundColor Red
    }
}

# Set up Cloud Scheduler for periodic tasks
Write-Host ""
Write-Host "Setting up Cloud Scheduler..." -ForegroundColor Yellow

# Create App Engine app if not exists (required for Cloud Scheduler)
$appEngineExists = gcloud app describe 2>$null
if (-not $appEngineExists) {
    Write-Host "  Creating App Engine app..." -ForegroundColor White
    gcloud app create --region=$Region
}

# Create scheduled jobs
$jobs = @(
    @{
        Name="weather-sync"
        Schedule="*/30 * * * *"
        Uri="https://weather-service-${ProjectId}.${Region}.run.app/api/sync"
    },
    @{
        Name="quantum-optimization"
        Schedule="0 */6 * * *"
        Uri="https://quantum-core-${ProjectId}.${Region}.run.app/api/optimize"
    },
    @{
        Name="backup-databases"
        Schedule="0 2 * * *"
        Uri="https://integration-hub-${ProjectId}.${Region}.run.app/api/backup"
    }
)

foreach ($job in $jobs) {
    Write-Host "  Creating job $($job.Name)..." -ForegroundColor White
    gcloud scheduler jobs create http $job.Name `
        --location=$Region `
        --schedule="$($job.Schedule)" `
        --uri=$job.Uri `
        --http-method=POST `
        --attempt-deadline=30m `
        2>$null
}

# Create monitoring dashboard
Write-Host ""
Write-Host "Setting up monitoring..." -ForegroundColor Yellow
Write-Host "  Creating dashboard..." -ForegroundColor White

# Export monitoring configuration
$dashboardConfig = @{
    displayName = "CroweQuantumMyceliumNexus Dashboard"
    gridLayout = @{
        widgets = @(
            @{
                title = "Cloud Run Request Rate"
                xyChart = @{
                    dataSets = @(@{
                        timeSeriesQuery = @{
                            timeSeriesFilter = @{
                                filter = "resource.type=`"cloud_run_revision`" resource.labels.service_name=~`".*`""
                                aggregation = @{
                                    alignmentPeriod = "60s"
                                    perSeriesAligner = "ALIGN_RATE"
                                }
                            }
                        }
                    })
                }
            }
        )
    }
}

$dashboardConfig | ConvertTo-Json -Depth 10 | Set-Content "monitoring-dashboard.json"
gcloud monitoring dashboards create --config-from-file=monitoring-dashboard.json

Write-Host ""
Write-Host "=================================================" -ForegroundColor Green
Write-Host "  DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Project: $ProjectId" -ForegroundColor Cyan
Write-Host "Region: $Region" -ForegroundColor Cyan
Write-Host ""
Write-Host "Service URLs:" -ForegroundColor Cyan
$cloudRunServices | ForEach-Object {
    $url = gcloud run services describe $_.Name --region=$Region --format="value(status.url)" 2>$null
    if ($url) {
        Write-Host "  $($_.Name): $url" -ForegroundColor White
    }
}
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Configure custom domain: gcloud run domain-mappings create" -ForegroundColor White
Write-Host "2. Set up CI/CD: gcloud builds triggers create" -ForegroundColor White
Write-Host "3. Configure alerts: gcloud alpha monitoring policies create" -ForegroundColor White
Write-Host "4. Review costs: https://console.cloud.google.com/billing" -ForegroundColor White
Write-Host ""