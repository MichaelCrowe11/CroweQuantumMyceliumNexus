param(
    [Parameter(Mandatory=$false)]
    [string]$ApiUser = "",
    
    [Parameter(Mandatory=$false)]
    [string]$ApiKey = "",
    
    [Parameter(Mandatory=$false)]
    [string]$Domain = "mycelium-ei.io",
    
    [Parameter(Mandatory=$false)]
    [switch]$ListDomains,
    
    [Parameter(Mandatory=$false)]
    [switch]$GetDNSRecords,
    
    [Parameter(Mandatory=$false)]
    [switch]$TestConnection
)

$ErrorActionPreference = "Stop"

Write-Host "🌐 Namecheap API Connection Test" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Check for API credentials
if ($ApiUser -eq "" -or $ApiKey -eq "") {
    Write-Host "📋 Namecheap API Setup Instructions:" -ForegroundColor Yellow
    Write-Host "====================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Login to Namecheap: https://www.namecheap.com/myaccount/login/" -ForegroundColor White
    Write-Host "2. Go to Profile → Tools → Business & API → API Access" -ForegroundColor White
    Write-Host "   Direct link: https://ap.www.namecheap.com/settings/tools/apiaccess/" -ForegroundColor White
    Write-Host "3. Enable API access and note your API username" -ForegroundColor White
    Write-Host "4. Generate an API key" -ForegroundColor White
    Write-Host "5. Whitelist your IP address" -ForegroundColor White
    Write-Host ""
    
    if ($ApiUser -eq "") {
        $ApiUser = Read-Host "Enter your Namecheap API Username"
    }
    
    if ($ApiKey -eq "") {
        $ApiKey = Read-Host "Enter your Namecheap API Key" -MaskInput
    }
}

# Get client IP for API authentication
Write-Host "🔍 Getting your public IP address..." -ForegroundColor Yellow
try {
    $ClientIP = (Invoke-WebRequest -Uri "https://ipinfo.io/ip" -UseBasicParsing).Content.Trim()
    Write-Host "✅ Your IP: $ClientIP" -ForegroundColor Green
    Write-Host "   Make sure this IP is whitelisted in your Namecheap API settings!" -ForegroundColor Yellow
} catch {
    Write-Host "❌ Failed to get public IP automatically" -ForegroundColor Red
    $ClientIP = Read-Host "Enter your public IP address"
}

# Function to call Namecheap API
function Invoke-NamecheapAPI {
    param(
        [string]$Command,
        [hashtable]$Parameters = @{},
        [switch]$ShowResponse
    )
    
    $baseUrl = "https://api.namecheap.com/xml.response"
    $commonParams = @{
        ApiUser = $script:ApiUser
        ApiKey = $script:ApiKey
        UserName = $script:ApiUser
        Command = $Command
        ClientIp = $script:ClientIP
    }
    
    $allParams = $commonParams + $Parameters
    $queryString = ($allParams.GetEnumerator() | ForEach-Object { 
        "$($_.Key)=$([System.Uri]::EscapeDataString($_.Value))" 
    }) -join "&"
    $fullUrl = "$baseUrl?$queryString"
    
    Write-Host "   📡 API Call: $Command" -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri $fullUrl -UseBasicParsing
        [xml]$xmlResponse = $response.Content
        
        if ($ShowResponse) {
            Write-Host "   📄 Raw Response:" -ForegroundColor Gray
            Write-Host $response.Content -ForegroundColor DarkGray
        }
        
        if ($xmlResponse.ApiResponse.Status -ne "OK") {
            $errorMsg = if ($xmlResponse.ApiResponse.Errors.Error) {
                $xmlResponse.ApiResponse.Errors.Error | ForEach-Object { 
                    if ($_.InnerText) { $_.InnerText } else { $_ }
                } | Join-String -Separator "; "
            } else {
                "Unknown error"
            }
            throw "Namecheap API Error: $errorMsg"
        }
        
        return $xmlResponse
    } catch [System.Net.WebException] {
        $statusCode = $_.Exception.Response.StatusCode
        Write-Host "   ❌ HTTP Error: $statusCode" -ForegroundColor Red
        throw "HTTP request failed: $statusCode - $($_.Exception.Message)"
    } catch {
        Write-Host "   ❌ API Error: $($_.Exception.Message)" -ForegroundColor Red
        throw
    }
}

# Test API connection
if ($TestConnection) {
    Write-Host "`n🔌 Testing API Connection..." -ForegroundColor Yellow
    
    try {
        Write-Host "   Testing basic API access..." -ForegroundColor Gray
        $response = Invoke-NamecheapAPI -Command "namecheap.users.getInfo"
        
        Write-Host "   ✅ API connection successful!" -ForegroundColor Green
        Write-Host "   User ID: $($response.ApiResponse.CommandResponse.UserGetInfoResult.ID)" -ForegroundColor White
        Write-Host "   Email: $($response.ApiResponse.CommandResponse.UserGetInfoResult.Email)" -ForegroundColor White
        
    } catch {
        Write-Host "   ❌ API connection failed!" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "📝 Troubleshooting checklist:" -ForegroundColor Cyan
        Write-Host "   • Is API access enabled in your Namecheap account?" -ForegroundColor White
        Write-Host "   • Is your IP ($ClientIP) whitelisted?" -ForegroundColor White
        Write-Host "   • Are the API username and key correct?" -ForegroundColor White
        Write-Host "   • Are you using the correct API username (not account username)?" -ForegroundColor White
        exit 1
    }
}

# List domains
if ($ListDomains) {
    Write-Host "`n📋 Listing Your Domains..." -ForegroundColor Yellow
    
    try {
        $response = Invoke-NamecheapAPI -Command "namecheap.domains.getList"
        $domains = $response.ApiResponse.CommandResponse.DomainGetListResult.Domain
        
        if ($domains) {
            Write-Host "   ✅ Found $($domains.Count) domain(s):" -ForegroundColor Green
            foreach ($domain in $domains) {
                $name = if ($domain.Name) { $domain.Name } else { $domain }
                $expiry = if ($domain.Expires) { $domain.Expires } else { "N/A" }
                $autoRenew = if ($domain.AutoRenew) { $domain.AutoRenew } else { "N/A" }
                
                Write-Host "     📌 $name" -ForegroundColor White
                Write-Host "        Expires: $expiry | Auto-renew: $autoRenew" -ForegroundColor Gray
            }
        } else {
            Write-Host "   ⚠️  No domains found" -ForegroundColor Yellow
        }
        
    } catch {
        Write-Host "   ❌ Failed to list domains" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# Get DNS records for specific domain
if ($GetDNSRecords) {
    Write-Host "`n🔍 Getting DNS Records for $Domain..." -ForegroundColor Yellow
    
    try {
        $domainParts = $Domain.Split('.')
        if ($domainParts.Length -lt 2) {
            throw "Invalid domain format. Expected format: example.com"
        }
        
        $sld = $domainParts[0]  # Second Level Domain (e.g., "mycelium-ei")
        $tld = $domainParts[1]  # Top Level Domain (e.g., "io")
        
        Write-Host "   SLD: $sld, TLD: $tld" -ForegroundColor Gray
        
        $response = Invoke-NamecheapAPI -Command "namecheap.domains.dns.getHosts" -Parameters @{
            SLD = $sld
            TLD = $tld
        }
        
        $hosts = $response.ApiResponse.CommandResponse.DomainDNSGetHostsResult.host
        
        if ($hosts) {
            Write-Host "   ✅ Found $($hosts.Count) DNS record(s):" -ForegroundColor Green
            Write-Host ""
            Write-Host "   Type      Host                    Value                           TTL" -ForegroundColor Cyan
            Write-Host "   ----      ----                    -----                           ---" -ForegroundColor Cyan
            
            foreach ($host in $hosts) {
                $type = if ($host.Type) { $host.Type } else { "N/A" }
                $name = if ($host.Name) { $host.Name } else { "@" }
                $address = if ($host.Address) { $host.Address } else { "N/A" }
                $ttl = if ($host.TTL) { $host.TTL } else { "Auto" }
                
                Write-Host ("   {0,-9} {1,-23} {2,-31} {3}" -f $type, $name, $address, $ttl) -ForegroundColor White
            }
        } else {
            Write-Host "   ⚠️  No DNS records found for $Domain" -ForegroundColor Yellow
        }
        
    } catch {
        Write-Host "   ❌ Failed to get DNS records" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# Interactive mode if no specific action requested
if (-not $TestConnection -and -not $ListDomains -and -not $GetDNSRecords) {
    Write-Host "`n🎯 What would you like to do?" -ForegroundColor Yellow
    Write-Host "1. Test API connection" -ForegroundColor White
    Write-Host "2. List all domains" -ForegroundColor White
    Write-Host "3. Get DNS records for $Domain" -ForegroundColor White
    Write-Host "4. All of the above" -ForegroundColor White
    Write-Host ""
    
    $choice = Read-Host "Enter choice (1-4)"
    
    switch ($choice) {
        "1" {
            & $MyInvocation.MyCommand.Path -ApiUser $ApiUser -ApiKey $ApiKey -TestConnection
        }
        "2" {
            & $MyInvocation.MyCommand.Path -ApiUser $ApiUser -ApiKey $ApiKey -ListDomains
        }
        "3" {
            & $MyInvocation.MyCommand.Path -ApiUser $ApiUser -ApiKey $ApiKey -Domain $Domain -GetDNSRecords
        }
        "4" {
            & $MyInvocation.MyCommand.Path -ApiUser $ApiUser -ApiKey $ApiKey -TestConnection -ListDomains -Domain $Domain -GetDNSRecords
        }
        default {
            Write-Host "Invalid choice" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "🎉 Namecheap API test complete!" -ForegroundColor Green