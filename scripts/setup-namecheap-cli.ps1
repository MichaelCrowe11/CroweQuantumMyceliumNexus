param(
    [Parameter(Mandatory=$false)]
    [switch]$EnableAPI,
    
    [Parameter(Mandatory=$false)]
    [switch]$TestConnection,
    
    [Parameter(Mandatory=$false)]
    [switch]$WhitelistCurrentIP,
    
    [Parameter(Mandatory=$false)]
    [string]$ApiUser = "",
    
    [Parameter(Mandatory=$false)]
    [string]$ApiKey = ""
)

$ErrorActionPreference = "Stop"

Write-Host "🔧 Namecheap CLI Setup & Configuration" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

# Step 1: Enable API Access Instructions
if ($EnableAPI) {
    Write-Host "`n📋 Step 1: Enable Namecheap API Access" -ForegroundColor Yellow
    Write-Host "=======================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Follow these steps to enable API access:" -ForegroundColor White
    Write-Host ""
    Write-Host "1. 🌐 Login to Namecheap:" -ForegroundColor Cyan
    Write-Host "   https://www.namecheap.com/myaccount/login/" -ForegroundColor Blue
    Write-Host ""
    Write-Host "2. 🔧 Go to API Settings:" -ForegroundColor Cyan
    Write-Host "   Profile → Tools → Business & API → API Access" -ForegroundColor White
    Write-Host "   Direct link: https://ap.www.namecheap.com/settings/tools/apiaccess/" -ForegroundColor Blue
    Write-Host ""
    Write-Host "3. ✅ Enable API Access:" -ForegroundColor Cyan
    Write-Host "   • Toggle 'API Access' to ON" -ForegroundColor White
    Write-Host "   • Note your API Username (different from account username)" -ForegroundColor White
    Write-Host ""
    Write-Host "4. 🔑 Generate API Key:" -ForegroundColor Cyan
    Write-Host "   • Click 'Generate' to create a new API key" -ForegroundColor White
    Write-Host "   • Copy and save the API key securely" -ForegroundColor White
    Write-Host ""
    Write-Host "5. 🌍 Whitelist IP Addresses:" -ForegroundColor Cyan
    Write-Host "   • Add your current IP address to the whitelist" -ForegroundColor White
    Write-Host "   • For production, add your server's IP addresses" -ForegroundColor White
    Write-Host ""
    
    # Get current IP
    try {
        $currentIP = (Invoke-WebRequest -Uri "https://ipinfo.io/ip" -UseBasicParsing).Content.Trim()
        Write-Host "🌐 Your current public IP address: $currentIP" -ForegroundColor Green
        Write-Host "   ⚠️  Make sure to add this IP to the whitelist!" -ForegroundColor Yellow
    } catch {
        Write-Host "❌ Could not detect your public IP" -ForegroundColor Red
        Write-Host "   Please check your IP at: https://whatismyipaddress.com/" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Press any key when you have completed the API setup..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# Step 2: Test API Connection
if ($TestConnection -or $EnableAPI) {
    Write-Host "`n🔌 Step 2: Test API Connection" -ForegroundColor Yellow
    Write-Host "==============================" -ForegroundColor Yellow
    
    # Get API credentials if not provided
    if ($ApiUser -eq "" -or $ApiKey -eq "") {
        Write-Host ""
        Write-Host "Please enter your Namecheap API credentials:" -ForegroundColor Cyan
        
        if ($ApiUser -eq "") {
            $ApiUser = Read-Host "API Username (from API settings page)"
        }
        
        if ($ApiKey -eq "") {
            $ApiKey = Read-Host "API Key" -MaskInput
        }
    }
    
    # Test the connection
    Write-Host ""
    Write-Host "Testing API connection..." -ForegroundColor Gray
    
    try {
        & ".\scripts\test-namecheap-api.ps1" -ApiUser $ApiUser -ApiKey $ApiKey -TestConnection
        
        Write-Host "✅ API connection successful!" -ForegroundColor Green
        
        # Save credentials for future use
        Write-Host ""
        $save = Read-Host "Save API credentials for future use? (Y/n)"
        
        if ($save -eq "" -or $save -eq "Y" -or $save -eq "y") {
            [System.Environment]::SetEnvironmentVariable("NAMECHEAP_API_USER", $ApiUser, "User")
            [System.Environment]::SetEnvironmentVariable("NAMECHEAP_API_KEY", $ApiKey, "User")
            Write-Host "✅ API credentials saved to user environment variables" -ForegroundColor Green
            Write-Host "   You can now use Namecheap CLI commands without entering credentials each time" -ForegroundColor Gray
        }
        
    } catch {
        Write-Host "❌ API connection failed!" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "🔧 Common issues and solutions:" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Issue: Authentication failed" -ForegroundColor White
        Write-Host "  ➤ Check that API access is enabled" -ForegroundColor Gray
        Write-Host "  ➤ Verify API username and key are correct" -ForegroundColor Gray
        Write-Host "  ➤ API username ≠ account username" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Issue: IP not authorized" -ForegroundColor White
        Write-Host "  ➤ Add your IP ($currentIP) to the whitelist" -ForegroundColor Gray
        Write-Host "  ➤ Wait a few minutes after whitelisting" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Issue: Domain not found" -ForegroundColor White
        Write-Host "  ➤ Ensure domain is in your Namecheap account" -ForegroundColor Gray
        Write-Host "  ➤ Check domain spelling" -ForegroundColor Gray
        
        exit 1
    }
}

# Step 3: Domain and DNS Management
Write-Host "`n📋 Step 3: Available CLI Commands" -ForegroundColor Yellow
Write-Host "==================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Now that your API is configured, you can use these commands:" -ForegroundColor White
Write-Host ""

Write-Host "🔍 Testing & Diagnostics:" -ForegroundColor Cyan
Write-Host "  ./scripts/test-namecheap-api.ps1 -TestConnection" -ForegroundColor White
Write-Host "  ./scripts/test-namecheap-api.ps1 -ListDomains" -ForegroundColor White
Write-Host "  ./scripts/test-namecheap-api.ps1 -GetDNSRecords -Domain mycelium-ei.io" -ForegroundColor White
Write-Host ""

Write-Host "🌐 DNS Management:" -ForegroundColor Cyan
Write-Host "  ./scripts/setup-dns-cli.ps1 -GetLoadBalancerIP" -ForegroundColor White
Write-Host "  ./scripts/setup-dns-cli.ps1 -LoadBalancerIP 1.2.3.4 -DryRun" -ForegroundColor White
Write-Host ""

Write-Host "🚀 Complete Setup:" -ForegroundColor Cyan
Write-Host "  ./scripts/complete-setup.ps1 -Domain mycelium-ei.io -Production" -ForegroundColor White
Write-Host ""

# Step 4: Quick Domain Check
$storedApiUser = [System.Environment]::GetEnvironmentVariable("NAMECHEAP_API_USER", "User")
$storedApiKey = [System.Environment]::GetEnvironmentVariable("NAMECHEAP_API_KEY", "User")

if ($storedApiUser -and $storedApiKey) {
    Write-Host "🎯 Quick Domain Check" -ForegroundColor Yellow
    Write-Host "=====================" -ForegroundColor Yellow
    
    $checkDomains = Read-Host "Check your domains and DNS records? (Y/n)"
    
    if ($checkDomains -eq "" -or $checkDomains -eq "Y" -or $checkDomains -eq "y") {
        Write-Host ""
        Write-Host "Checking your domains..." -ForegroundColor Gray
        
        try {
            & ".\scripts\test-namecheap-api.ps1" -ApiUser $storedApiUser -ApiKey $storedApiKey -ListDomains
            
            Write-Host ""
            $domain = Read-Host "Check DNS records for domain (or press Enter to skip)"
            
            if ($domain -and $domain.Trim() -ne "") {
                & ".\scripts\test-namecheap-api.ps1" -ApiUser $storedApiUser -ApiKey $storedApiKey -GetDNSRecords -Domain $domain
            }
            
        } catch {
            Write-Host "⚠️  Domain check failed: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "✨ Namecheap CLI setup complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Test your domains: ./scripts/test-namecheap-api.ps1 -ListDomains" -ForegroundColor White
Write-Host "  2. Configure DNS: ./scripts/setup-dns-cli.ps1 -GetLoadBalancerIP" -ForegroundColor White
Write-Host "  3. Deploy platform: ./scripts/complete-setup.ps1 -Production" -ForegroundColor White
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Blue
Write-Host "  • Namecheap API Docs: https://www.namecheap.com/support/api/" -ForegroundColor White
Write-Host "  • DNS Configuration: docs/DNS_CONFIGURATION.md" -ForegroundColor White
Write-Host ""