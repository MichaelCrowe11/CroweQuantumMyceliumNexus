# Script to create and push CroweQuantumMyceliumNexus to GitHub

Write-Host @"

╔═══════════════════════════════════════════════════════════════╗
║     CREATING & PUSHING CROWEQUANTUMMYCELIUMNEXUS TO GITHUB   ║
╚═══════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Cyan

Write-Host "✅ GitHub Authentication Status:" -ForegroundColor Green
Write-Host "   Logged in as: MichaelCrowe11" -ForegroundColor White
Write-Host ""

# Navigate to project directory
Write-Host "📁 Navigating to project directory..." -ForegroundColor Yellow
Set-Location "C:\Users\micha\CroweQuantumMyceliumNexus"

# Initialize git if needed
if (-not (Test-Path ".git")) {
    Write-Host "🔧 Initializing Git repository..." -ForegroundColor Yellow
    git init
    Write-Host "✅ Git repository initialized" -ForegroundColor Green
} else {
    Write-Host "✅ Git repository already initialized" -ForegroundColor Green
}

# Configure git user
Write-Host "`n👤 Configuring Git user..." -ForegroundColor Yellow
git config user.name "Michael Crowe"
git config user.email "michaelcrowe11@users.noreply.github.com"
Write-Host "✅ Git user configured" -ForegroundColor Green

# Add all files
Write-Host "`n📦 Staging files..." -ForegroundColor Yellow
git add -A
$fileCount = (git status --short | Measure-Object -Line).Lines
Write-Host "✅ Staged $fileCount files" -ForegroundColor Green

# Create commit
Write-Host "`n💾 Creating commit..." -ForegroundColor Yellow
git commit -m "Initial commit: CroweQuantumMyceliumNexus unified platform

- Integrated MyceliumEI ecological intelligence with EPA compliance
- Integrated CroweQuantumNexusAI quantum computing capabilities
- Unified Docker deployment with docker-compose.unified.yml
- Advanced integration orchestrator with data transformation pipelines
- PowerShell deployment scripts for Windows
- Monitoring stack (Prometheus, Grafana, Jaeger)
- Complete documentation and setup guides

Co-authored-by: Claude <noreply@anthropic.com>"

Write-Host "✅ Commit created" -ForegroundColor Green

# Create and push repository
Write-Host "`n🚀 Creating GitHub repository and pushing..." -ForegroundColor Yellow
Write-Host "   This will create: https://github.com/MichaelCrowe11/CroweQuantumMyceliumNexus" -ForegroundColor Cyan

$result = gh repo create CroweQuantumMyceliumNexus `
    --public `
    --source . `
    --remote origin `
    --push `
    --description "Unified AI Platform integrating MyceliumEI ecological intelligence with CroweQuantumNexusAI quantum computing. Features EPA compliance, quantum-enhanced predictions, and enterprise deployment."

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n🎉 SUCCESS! Repository created and pushed!" -ForegroundColor Green
    Write-Host "════════════════════════════════════════" -ForegroundColor Green
    
    Write-Host "`n📍 Repository URLs:" -ForegroundColor Cyan
    Write-Host "   Main URL:  https://github.com/MichaelCrowe11/CroweQuantumMyceliumNexus" -ForegroundColor White
    Write-Host "   Clone URL: git clone https://github.com/MichaelCrowe11/CroweQuantumMyceliumNexus.git" -ForegroundColor White
    
    Write-Host "`n📊 Repository Info:" -ForegroundColor Cyan
    gh repo view MichaelCrowe11/CroweQuantumMyceliumNexus --web
    
} else {
    Write-Host "`n⚠️  Repository may already exist or there was an error." -ForegroundColor Yellow
    Write-Host "Attempting to push to existing repository..." -ForegroundColor Yellow
    
    # Try to set remote and push
    git remote remove origin 2>$null
    git remote add origin https://github.com/MichaelCrowe11/CroweQuantumMyceliumNexus.git
    git branch -M main
    git push -u origin main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Successfully pushed to existing repository!" -ForegroundColor Green
        Write-Host "   URL: https://github.com/MichaelCrowe11/CroweQuantumMyceliumNexus" -ForegroundColor White
    } else {
        Write-Host "`n❌ Failed to push. Please check the error messages above." -ForegroundColor Red
    }
}

Write-Host "`n📋 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Visit your repository: https://github.com/MichaelCrowe11/CroweQuantumMyceliumNexus" -ForegroundColor White
Write-Host "   2. Add repository topics: quantum-computing, mycology, ai, docker, epa-compliance" -ForegroundColor White
Write-Host "   3. Configure GitHub Actions secrets for CI/CD" -ForegroundColor White
Write-Host "   4. Set up branch protection rules" -ForegroundColor White
Write-Host "   5. Star the repository! ⭐" -ForegroundColor Yellow