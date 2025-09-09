# GitHub CLI Authentication Setup Script

Write-Host "GitHub CLI Authentication Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if GitHub CLI is installed
$ghInstalled = Get-Command gh -ErrorAction SilentlyContinue

if (-not $ghInstalled) {
    Write-Host "GitHub CLI not found. Installing..." -ForegroundColor Yellow
    
    # Install GitHub CLI using winget
    winget install GitHub.cli
    
    Write-Host "GitHub CLI installed. Please restart PowerShell and run this script again." -ForegroundColor Green
    exit
}

Write-Host "GitHub CLI is installed." -ForegroundColor Green
Write-Host ""
Write-Host "Starting authentication process..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Follow these prompts:" -ForegroundColor Cyan
Write-Host "1. Choose 'GitHub.com'" -ForegroundColor White
Write-Host "2. Choose 'HTTPS' for preferred protocol" -ForegroundColor White
Write-Host "3. Authenticate with 'Login with a web browser'" -ForegroundColor White
Write-Host "4. Press Enter to open browser" -ForegroundColor White
Write-Host "5. Enter the code shown in terminal" -ForegroundColor White
Write-Host "6. Authorize GitHub CLI" -ForegroundColor White
Write-Host ""

# Run gh auth login
gh auth login

# Check if authentication was successful
$authStatus = gh auth status 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Authentication successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your GitHub account details:" -ForegroundColor Cyan
    gh auth status
    
    Write-Host ""
    Write-Host "You can now push your repository:" -ForegroundColor Green
    Write-Host "gh repo create CroweQuantumMyceliumNexus --public --source . --push" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "❌ Authentication failed. Please try again." -ForegroundColor Red
    Write-Host "Error: $authStatus" -ForegroundColor Red
}