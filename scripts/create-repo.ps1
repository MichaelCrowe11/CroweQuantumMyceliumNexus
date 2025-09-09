# Create and push CroweQuantumMyceliumNexus to GitHub

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  CREATING CROWEQUANTUMMYCELIUMNEXUS ON GITHUB  " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "GitHub Account: MichaelCrowe11" -ForegroundColor Green
Write-Host ""

# Navigate to project directory
Write-Host "Navigating to project directory..." -ForegroundColor Yellow
Set-Location "C:\Users\micha\CroweQuantumMyceliumNexus"

# Initialize git if needed
if (-not (Test-Path ".git")) {
    Write-Host "Initializing Git repository..." -ForegroundColor Yellow
    git init
    Write-Host "Git repository initialized" -ForegroundColor Green
} else {
    Write-Host "Git repository already initialized" -ForegroundColor Green
}

# Configure git user
Write-Host ""
Write-Host "Configuring Git user..." -ForegroundColor Yellow
git config user.name "Michael Crowe"
git config user.email "michaelcrowe11@users.noreply.github.com"

# Add all files
Write-Host ""
Write-Host "Staging files..." -ForegroundColor Yellow
git add -A
$fileCount = (git status --short | Measure-Object -Line).Lines
Write-Host "Staged $fileCount files" -ForegroundColor Green

# Create commit
Write-Host ""
Write-Host "Creating commit..." -ForegroundColor Yellow
$commitMessage = @"
Initial commit: CroweQuantumMyceliumNexus unified platform

- Integrated MyceliumEI ecological intelligence with EPA compliance
- Integrated CroweQuantumNexusAI quantum computing capabilities
- Unified Docker deployment with docker-compose.unified.yml
- Advanced integration orchestrator with data transformation pipelines
- PowerShell deployment scripts for Windows
- Monitoring stack (Prometheus, Grafana, Jaeger)
- Complete documentation and setup guides
"@

git commit -m $commitMessage
Write-Host "Commit created" -ForegroundColor Green

# Create and push repository
Write-Host ""
Write-Host "Creating GitHub repository and pushing..." -ForegroundColor Yellow
Write-Host "Repository: https://github.com/MichaelCrowe11/CroweQuantumMyceliumNexus" -ForegroundColor Cyan
Write-Host ""

# Use gh CLI to create and push
gh repo create CroweQuantumMyceliumNexus --public --source . --remote origin --push --description "Unified AI Platform integrating MyceliumEI ecological intelligence with CroweQuantumNexusAI quantum computing"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "SUCCESS! Repository created and pushed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Repository URL: https://github.com/MichaelCrowe11/CroweQuantumMyceliumNexus" -ForegroundColor Cyan
    Write-Host ""
    
    # Open in browser
    Start-Process "https://github.com/MichaelCrowe11/CroweQuantumMyceliumNexus"
} else {
    Write-Host ""
    Write-Host "Repository may already exist. Attempting to push..." -ForegroundColor Yellow
    
    # Try setting remote and pushing
    git remote remove origin 2>$null
    git remote add origin https://github.com/MichaelCrowe11/CroweQuantumMyceliumNexus.git
    git branch -M main
    git push -u origin main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Successfully pushed to repository!" -ForegroundColor Green
        Write-Host "URL: https://github.com/MichaelCrowe11/CroweQuantumMyceliumNexus" -ForegroundColor Cyan
    }
}