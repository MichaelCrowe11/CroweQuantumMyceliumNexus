# PowerShell script to initialize and push CroweQuantumMyceliumNexus to GitHub

param(
    [string]$RepoName = "CroweQuantumMyceliumNexus",
    [string]$GitHubUsername = "",
    [string]$Description = "Unified AI Platform integrating MyceliumEI ecological intelligence with CroweQuantumNexusAI quantum computing",
    [switch]$Private = $false,
    [switch]$CreateRepo = $false
)

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

Write-ColorOutput @"

╔═══════════════════════════════════════════════════════════════╗
║           GITHUB REPOSITORY SETUP & PUSH SCRIPT              ║
╚═══════════════════════════════════════════════════════════════╝

"@ "Cyan"

# Check if GitHub username is provided
if (-not $GitHubUsername) {
    $GitHubUsername = Read-Host "Enter your GitHub username"
}

# Step 1: Initialize Git repository
Write-ColorOutput "📁 Initializing Git repository..." "Yellow"

if (Test-Path ".git") {
    Write-ColorOutput "  Git repository already initialized" "Green"
} else {
    git init
    Write-ColorOutput "  ✅ Git repository initialized" "Green"
}

# Step 2: Create .gitignore file
Write-ColorOutput "`n📝 Creating .gitignore file..." "Yellow"

$gitignoreContent = @"
# Environment files
.env
.env.*
!.env.example
!.env.unified.example

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
ENV/
.venv

# Node
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Docker
*.log
docker-compose.override.yml

# IDE
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store

# Data and backups
data/
backups/
*.sql
*.dump
*.bak

# Secrets and certificates
*.pem
*.key
*.crt
*.p12
ssl/

# Build outputs
dist/
build/
*.egg-info/
.eggs/

# Test coverage
htmlcov/
.coverage
.coverage.*
coverage.xml
*.cover
.pytest_cache/

# Monitoring data
prometheus_data/
grafana_data/
loki_data/

# Application data
storage/
uploads/
logs/
cache/

# Temporary files
tmp/
temp/
*.tmp
"@

$gitignoreContent | Out-File -FilePath ".gitignore" -Encoding UTF8
Write-ColorOutput "  ✅ .gitignore created" "Green"

# Step 3: Create README if it doesn't exist
if (-not (Test-Path "README.md")) {
    Write-ColorOutput "`n📄 README.md not found, using existing one" "Yellow"
}

# Step 4: Stage all files
Write-ColorOutput "`n📦 Staging files for commit..." "Yellow"
git add -A
Write-ColorOutput "  ✅ Files staged" "Green"

# Step 5: Create initial commit
Write-ColorOutput "`n💾 Creating initial commit..." "Yellow"
git commit -m "Initial commit: CroweQuantumMyceliumNexus integrated platform

- Integrated MyceliumEI and CroweQuantumNexusAI
- Added unified Docker deployment
- Implemented integration orchestrator
- Added EPA compliance features
- Configured monitoring stack
- Created deployment scripts"

Write-ColorOutput "  ✅ Initial commit created" "Green"

# Step 6: Create GitHub repository (if requested)
if ($CreateRepo) {
    Write-ColorOutput "`n🌐 Creating GitHub repository..." "Yellow"
    
    # Check if GitHub CLI is installed
    $ghInstalled = Get-Command gh -ErrorAction SilentlyContinue
    
    if ($ghInstalled) {
        $visibility = if ($Private) { "--private" } else { "--public" }
        
        gh repo create $RepoName `
            --description "$Description" `
            $visibility `
            --source . `
            --remote origin `
            --push
            
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "  ✅ Repository created and pushed to GitHub" "Green"
            Write-ColorOutput "  📍 Repository URL: https://github.com/$GitHubUsername/$RepoName" "Cyan"
        } else {
            Write-ColorOutput "  ❌ Failed to create repository with GitHub CLI" "Red"
        }
    } else {
        Write-ColorOutput "  ⚠️  GitHub CLI not installed. Please create repository manually:" "Yellow"
        Write-ColorOutput "     1. Go to https://github.com/new" "White"
        Write-ColorOutput "     2. Repository name: $RepoName" "White"
        Write-ColorOutput "     3. Description: $Description" "White"
        Write-ColorOutput "     4. Visibility: $(if ($Private) { 'Private' } else { 'Public' })" "White"
        Write-ColorOutput "     5. DO NOT initialize with README, .gitignore, or license" "White"
    }
} else {
    Write-ColorOutput "`n📝 Manual GitHub repository setup required:" "Yellow"
    Write-ColorOutput "   1. Go to https://github.com/new" "White"
    Write-ColorOutput "   2. Create a new repository named: $RepoName" "White"
    Write-ColorOutput "   3. DO NOT initialize with README, .gitignore, or license" "White"
}

# Step 7: Add remote and push (if not using gh CLI)
if (-not $CreateRepo -or -not $ghInstalled) {
    Write-ColorOutput "`n🔗 After creating the repository on GitHub, run these commands:" "Cyan"
    Write-ColorOutput "" "White"
    Write-ColorOutput "  git remote add origin https://github.com/$GitHubUsername/$RepoName.git" "Yellow"
    Write-ColorOutput "  git branch -M main" "Yellow"
    Write-ColorOutput "  git push -u origin main" "Yellow"
    
    Write-ColorOutput "`n❓ Would you like to set up the remote now? (y/n)" "Cyan"
    $response = Read-Host
    
    if ($response -eq 'y' -or $response -eq 'Y') {
        Write-ColorOutput "`n🔗 Setting up remote..." "Yellow"
        git remote add origin "https://github.com/$GitHubUsername/$RepoName.git"
        git branch -M main
        Write-ColorOutput "  ✅ Remote configured" "Green"
        
        Write-ColorOutput "`n🚀 Ready to push! Run this command after creating the repo on GitHub:" "Cyan"
        Write-ColorOutput "  git push -u origin main" "Yellow"
    }
}

# Step 8: Create GitHub Actions workflow
Write-ColorOutput "`n🔄 Creating GitHub Actions workflow..." "Yellow"

$workflowDir = ".github\workflows"
if (-not (Test-Path $workflowDir)) {
    New-Item -ItemType Directory -Path $workflowDir -Force | Out-Null
}

$workflowContent = @"
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  workflow_dispatch:

env:
  DOCKER_REGISTRY: ghcr.io
  IMAGE_PREFIX: `${{ github.repository_owner }}/cqmn

jobs:
  test:
    name: Test Suite
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install -r mycelium/requirements.txt
          pip install pytest pytest-cov
      
      - name: Run tests
        run: |
          pytest tests/ --cov=. --cov-report=xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage.xml

  build:
    name: Build Docker Images
    runs-on: ubuntu-latest
    needs: test
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: `${{ env.DOCKER_REGISTRY }}
          username: `${{ github.actor }}
          password: `${{ secrets.GITHUB_TOKEN }}
      
      - name: Build and push images
        run: |
          docker compose -f docker-compose.unified.yml build
          docker compose -f docker-compose.unified.yml push

  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Deploy to server
        run: |
          echo "Deployment steps would go here"
          # Add your deployment commands
"@

$workflowContent | Out-File -FilePath "$workflowDir\ci-cd.yml" -Encoding UTF8
Write-ColorOutput "  ✅ GitHub Actions workflow created" "Green"

# Final instructions
Write-ColorOutput "`n✨ Git repository is ready!" "Green"
Write-ColorOutput "════════════════════════════" "Green"

Write-ColorOutput "`n📋 Summary:" "Cyan"
Write-ColorOutput "  • Repository name: $RepoName" "White"
Write-ColorOutput "  • GitHub user: $GitHubUsername" "White"
Write-ColorOutput "  • Files staged: $(git status --short | Measure-Object -Line | Select-Object -ExpandProperty Lines) files" "White"
Write-ColorOutput "  • Current branch: $(git branch --show-current)" "White"

Write-ColorOutput "`n📚 Next Steps:" "Cyan"
if (-not $CreateRepo -or -not $ghInstalled) {
    Write-ColorOutput "  1. Create repository on GitHub: https://github.com/new" "White"
    Write-ColorOutput "  2. Run: git push -u origin main" "White"
} else {
    Write-ColorOutput "  1. Visit your repository: https://github.com/$GitHubUsername/$RepoName" "White"
}
Write-ColorOutput "  3. Configure GitHub Secrets in repository settings:" "White"
Write-ColorOutput "     • DEPLOY_HOST (your server IP)" "White"
Write-ColorOutput "     • DEPLOY_USER (deployment user)" "White"
Write-ColorOutput "     • DEPLOY_KEY (SSH private key)" "White"
Write-ColorOutput "  4. Set up branch protection rules" "White"
Write-ColorOutput "  5. Enable GitHub Pages for documentation (optional)" "White"

Write-ColorOutput "`n🎉 Happy coding!" "Green"
"@