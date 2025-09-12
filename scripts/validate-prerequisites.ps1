# ========================================
# PREREQUISITE VALIDATION SCRIPT
# ========================================
# Checks all required tools and services before deployment

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  VALIDATING DEPLOYMENT PREREQUISITES" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

$errors = @()
$warnings = @()

# Check Docker
Write-Host "Checking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK Docker: $dockerVersion" -ForegroundColor Green
        
        # Check if Docker is running
        docker ps 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  OK Docker daemon is running" -ForegroundColor Green
        } else {
            $errors += "Docker daemon is not running. Please start Docker Desktop."
        }
    } else {
        $errors += "Docker is not installed or not in PATH"
    }
} catch {
    $errors += "Docker is not installed or not in PATH"
}

# Check Docker Compose
Write-Host "Checking Docker Compose..." -ForegroundColor Yellow
try {
    $composeVersion = docker compose version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK Docker Compose: $composeVersion" -ForegroundColor Green
    } else {
        # Try older docker-compose command
        $composeVersion = docker-compose --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  OK Docker Compose (standalone): $composeVersion" -ForegroundColor Green
            $warnings += "Using standalone docker-compose. Consider upgrading to Docker Compose V2."
        } else {
            $errors += "Docker Compose is not installed"
        }
    }
} catch {
    $errors += "Docker Compose is not installed"
}

# Check Git
Write-Host "Checking Git..." -ForegroundColor Yellow
try {
    $gitVersion = git --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK Git: $gitVersion" -ForegroundColor Green
    } else {
        $warnings += "Git is not installed. Required for version control."
    }
} catch {
    $warnings += "Git is not installed. Required for version control."
}

# Check GitHub CLI
Write-Host "Checking GitHub CLI..." -ForegroundColor Yellow
try {
    $ghVersion = gh --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK GitHub CLI installed" -ForegroundColor Green
        
        # Check authentication
        gh auth status 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  OK GitHub authenticated" -ForegroundColor Green
        } else {
            $warnings += "GitHub CLI not authenticated. Run 'gh auth login' to authenticate."
        }
    } else {
        $warnings += "GitHub CLI not installed. Required for GitHub operations."
    }
} catch {
    $warnings += "GitHub CLI not installed. Required for GitHub operations."
}

# Check Python
Write-Host "Checking Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    if ($pythonVersion -match "Python 3") {
        Write-Host "  OK Python: $pythonVersion" -ForegroundColor Green
    } else {
        $warnings += "Python 3.x not found. Required for backend services."
    }
} catch {
    $warnings += "Python is not installed or not in PATH"
}

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK Node.js: $nodeVersion" -ForegroundColor Green
        
        # Check npm
        $npmVersion = npm --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  OK npm: $npmVersion" -ForegroundColor Green
        }
    } else {
        $warnings += "Node.js is not installed. Required for frontend services."
    }
} catch {
    $warnings += "Node.js is not installed. Required for frontend services."
}

# Check PowerShell version
Write-Host "Checking PowerShell..." -ForegroundColor Yellow
$psVersion = $PSVersionTable.PSVersion
if ($psVersion.Major -ge 5) {
    Write-Host "  OK PowerShell: $psVersion" -ForegroundColor Green
} else {
    $warnings += "PowerShell 5.0 or higher recommended"
}

# Check available ports
Write-Host "Checking port availability..." -ForegroundColor Yellow
$portsToCheck = @(3000, 5432, 6379, 8080, 8100, 8200, 9000, 9090, 3001)
$portsInUse = @()

foreach ($port in $portsToCheck) {
    $tcpConnection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($tcpConnection) {
        $portsInUse += $port
    }
}

if ($portsInUse.Count -eq 0) {
    Write-Host "  OK All ports are available" -ForegroundColor Green
} else {
    foreach ($port in $portsInUse) {
        $warnings += "Port $port is already in use"
    }
}

# Check disk space
Write-Host "Checking disk space..." -ForegroundColor Yellow
$drive = Get-PSDrive -Name C
$freeSpaceGB = [math]::Round($drive.Free / 1GB, 2)
if ($freeSpaceGB -gt 10) {
    Write-Host "  OK Disk space available: ${freeSpaceGB} GB" -ForegroundColor Green
} else {
    $warnings += "Low disk space: ${freeSpaceGB} GB free. Recommend at least 10GB."
}

# Check WSL2 (for Windows)
if ($env:OS -eq "Windows_NT") {
    Write-Host "Checking WSL2..." -ForegroundColor Yellow
    try {
        wsl --list --verbose 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  OK WSL2 is installed" -ForegroundColor Green
        } else {
            $warnings += "WSL2 not configured. Docker Desktop performs better with WSL2."
        }
    } catch {
        $warnings += "WSL2 not installed. Recommended for Docker on Windows."
    }
}

# Check environment file
Write-Host "Checking environment configuration..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "  OK .env file exists" -ForegroundColor Green
    
    # Check for placeholder values
    $envContent = Get-Content ".env"
    $placeholders = $envContent | Select-String "CHANGE_ME|XXXXXXXXX|YOUR_.*_HERE"
    if ($placeholders) {
        $warnings += ".env file contains placeholder values that need to be configured"
    }
} else {
    $errors += ".env file not found. Run setup-environment.ps1 first."
}

# Display results
Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  VALIDATION RESULTS" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

if ($errors.Count -eq 0) {
    Write-Host "No critical errors found!" -ForegroundColor Green
} else {
    Write-Host "Critical errors found:" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host "  - $error" -ForegroundColor Red
    }
}

Write-Host ""

if ($warnings.Count -gt 0) {
    Write-Host "Warnings:" -ForegroundColor Yellow
    foreach ($warning in $warnings) {
        Write-Host "  - $warning" -ForegroundColor Yellow
    }
} else {
    Write-Host "No warnings!" -ForegroundColor Green
}

Write-Host ""

# Provide recommendation
if ($errors.Count -eq 0) {
    Write-Host "=================================================" -ForegroundColor Green
    Write-Host "  READY FOR DEPLOYMENT!" -ForegroundColor Green
    Write-Host "=================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Run setup-environment.ps1 to configure environment" -ForegroundColor White
    Write-Host "2. Run deploy-unified.ps1 to deploy the platform" -ForegroundColor White
} else {
    Write-Host "=================================================" -ForegroundColor Red
    Write-Host "  DEPLOYMENT BLOCKED" -ForegroundColor Red
    Write-Host "=================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please fix the critical errors before proceeding." -ForegroundColor Yellow
}

Write-Host ""

# Return exit code
if ($errors.Count -gt 0) {
    exit 1
} else {
    exit 0
}