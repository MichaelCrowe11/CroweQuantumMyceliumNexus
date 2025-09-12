# ========================================
# CROWEQUANTUMMYCELIUMNEXUS ENVIRONMENT SETUP
# ========================================
# This script helps configure the .env file with secure secrets

param(
    [switch]$ValidateKeys = $false,
    [switch]$GenerateSecrets = $true,
    [switch]$Interactive = $true
)

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  CROWE QUANTUM MYCELIUM NEXUS ENVIRONMENT SETUP" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env.example exists
if (-not (Test-Path ".env.example")) {
    Write-Host "ERROR: .env.example not found!" -ForegroundColor Red
    Write-Host "Please ensure you're in the project root directory" -ForegroundColor Yellow
    exit 1
}

# Function to generate secure random string
function New-SecureString {
    param([int]$Length = 32)
    
    $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@$%^*'
    $secureString = ''
    $random = New-Object System.Random
    
    for ($i = 0; $i -lt $Length; $i++) {
        $secureString += $chars[$random.Next(0, $chars.Length)]
    }
    
    return $secureString
}

# Function to generate alphanumeric string (for keys without special chars)
function New-AlphanumericString {
    param([int]$Length = 32)
    
    $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    $string = ''
    $random = New-Object System.Random
    
    for ($i = 0; $i -lt $Length; $i++) {
        $string += $chars[$random.Next(0, $chars.Length)]
    }
    
    return $string
}

# Check if .env already exists
$envExists = Test-Path ".env"
if ($envExists) {
    Write-Host "WARNING: .env file already exists!" -ForegroundColor Yellow
    if ($Interactive) {
        $overwrite = Read-Host "Do you want to overwrite it? (y/N)"
        if ($overwrite -ne 'y') {
            Write-Host "Creating .env.backup..." -ForegroundColor Yellow
            Copy-Item ".env" ".env.backup" -Force
        }
    } else {
        Write-Host "Creating .env.backup..." -ForegroundColor Yellow
        Copy-Item ".env" ".env.backup" -Force
    }
}

Write-Host "Creating .env file from template..." -ForegroundColor Green

# Copy template
Copy-Item ".env.example" ".env" -Force

# Read the .env file
$envContent = Get-Content ".env"

# Generate secure secrets
if ($GenerateSecrets) {
    Write-Host ""
    Write-Host "Generating secure secrets..." -ForegroundColor Yellow
    
    # Define replacements
    $replacements = @{
        'CHANGE_ME_strong_password_here' = (New-SecureString -Length 24)
        'CHANGE_ME_unified_db_password' = (New-SecureString -Length 24)
        'CHANGE_ME_audit_password' = (New-SecureString -Length 24)
        'CHANGE_ME_redis_password' = (New-SecureString -Length 20)
        'CHANGE_ME_rabbitmq_password' = (New-SecureString -Length 20)
        'CHANGE_ME_generate_64_char_secret_key' = (New-AlphanumericString -Length 64)
        'CHANGE_ME_generate_48_char_jwt_secret' = (New-AlphanumericString -Length 48)
        'CHANGE_ME_generate_32_char_encryption_key' = (New-AlphanumericString -Length 32)
        'CHANGE_ME_generate_32_char_salt' = (New-AlphanumericString -Length 32)
        'CHANGE_ME_grafana_admin_password' = (New-SecureString -Length 16)
        'CHANGE_ME_kong_password' = (New-SecureString -Length 20)
        'CHANGE_ME_smtp_password' = (New-SecureString -Length 20)
        'CHANGE_ME_backup_encryption_key' = (New-AlphanumericString -Length 32)
        'CHANGE_ME_github_token' = 'YOUR_GITHUB_TOKEN_HERE'
    }
    
    # Apply replacements
    foreach ($placeholder in $replacements.Keys) {
        $newValue = $replacements[$placeholder]
        $envContent = $envContent -replace [regex]::Escape($placeholder), $newValue
        Write-Host "  Generated secret for: $placeholder" -ForegroundColor Green
    }
}

# Interactive API key configuration
if ($Interactive) {
    Write-Host ""
    Write-Host "API KEY CONFIGURATION" -ForegroundColor Cyan
    Write-Host "Press Enter to skip any API key you don't have yet" -ForegroundColor Yellow
    Write-Host ""
    
    # Prompt for API keys
    $apiKeyPrompts = @(
        @{Name='OPENAI_API_KEY'; Prompt='OpenAI API Key (sk-...)'},
        @{Name='ANTHROPIC_API_KEY'; Prompt='Anthropic API Key (sk-ant-...)'},
        @{Name='TOMORROW_API_KEY'; Prompt='Tomorrow.io Weather API Key'},
        @{Name='OPENWEATHER_API_KEY'; Prompt='OpenWeather API Key'},
        @{Name='AWS_ACCESS_KEY_ID'; Prompt='AWS Access Key ID'},
        @{Name='AWS_SECRET_ACCESS_KEY'; Prompt='AWS Secret Access Key'},
        @{Name='MAPBOX_TOKEN'; Prompt='Mapbox Token (pk....)'},
        @{Name='SENDGRID_API_KEY'; Prompt='SendGrid API Key (SG....)'},
        @{Name='TWILIO_ACCOUNT_SID'; Prompt='Twilio Account SID'},
        @{Name='TWILIO_AUTH_TOKEN'; Prompt='Twilio Auth Token'}
    )
    
    foreach ($apiKey in $apiKeyPrompts) {
        $value = Read-Host $apiKey.Prompt
        
        if ($value -and $value.Trim() -ne '') {
            # Find and replace the line with this env var
            for ($i = 0; $i -lt $envContent.Length; $i++) {
                if ($envContent[$i] -like "$($apiKey.Name)=*") {
                    $envContent[$i] = "$($apiKey.Name)=$value"
                    Write-Host "  Set $($apiKey.Name)" -ForegroundColor Green
                    break
                }
            }
        }
    }
}

# Save the updated content
$envContent | Set-Content ".env"

Write-Host ""
Write-Host "Environment file created successfully!" -ForegroundColor Green

# Create .env.local for sensitive overrides
Write-Host ""
Write-Host "Creating .env.local for sensitive overrides..." -ForegroundColor Yellow

$envLocalContent = @"
# ========================================
# LOCAL ENVIRONMENT OVERRIDES
# ========================================
# Place sensitive API keys here that you don't want in .env
# This file is gitignored and won't be committed

# Example:
# OPENAI_API_KEY=sk-your-actual-key-here
# AWS_SECRET_ACCESS_KEY=your-actual-secret-here
"@

$envLocalContent | Set-Content ".env.local"

# Update .gitignore
$gitignorePath = ".gitignore"
if (Test-Path $gitignorePath) {
    $gitignoreContent = Get-Content $gitignorePath -Raw
    if ($gitignoreContent -notlike "*.env*") {
        $additionalIgnore = @"

# Environment files
.env
.env.local
.env.*.local
.env.backup
"@
        Add-Content $gitignorePath $additionalIgnore
        Write-Host "Updated .gitignore to exclude environment files" -ForegroundColor Green
    }
} else {
    $gitignoreContent = @"
# Environment files
.env
.env.local
.env.*.local
.env.backup

# Dependencies
node_modules/
__pycache__/
*.pyc
.pytest_cache/

# Logs
*.log
logs/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
"@
    $gitignoreContent | Set-Content $gitignorePath
    Write-Host "Created .gitignore with environment file exclusions" -ForegroundColor Green
}

Write-Host ""
Write-Host "=================================================" -ForegroundColor Green
Write-Host "  ENVIRONMENT SETUP COMPLETE!" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Review the generated .env file" -ForegroundColor White
Write-Host "2. Add any missing API keys to .env or .env.local" -ForegroundColor White
Write-Host "3. Run validate-prerequisites.ps1 to check system" -ForegroundColor White
Write-Host "4. Run deploy-unified.ps1 to deploy the platform" -ForegroundColor White
Write-Host ""
Write-Host "Security notes:" -ForegroundColor Yellow
Write-Host "- Secure passwords have been generated for all services" -ForegroundColor White
Write-Host "- The .env file contains sensitive information - keep it secure" -ForegroundColor White
Write-Host "- Use .env.local for API keys you want to keep extra private" -ForegroundColor White
Write-Host "- Both .env and .env.local are gitignored" -ForegroundColor White
Write-Host ""