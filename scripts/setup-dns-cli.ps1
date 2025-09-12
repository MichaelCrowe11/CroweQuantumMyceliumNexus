param(
    [Parameter(Mandatory=$false)]
    [string]$NamecheapApiUser = "",
    
    [Parameter(Mandatory=$false)]
    [string]$NamecheapApiKey = "",
    
    [Parameter(Mandatory=$false)]
    [string]$LoadBalancerIP = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$GetLoadBalancerIP,
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

Write-Host "🌐 DNS Configuration Setup for QuantumMycelium Nexus" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

# Get LoadBalancer IP from Kubernetes if not provided
if ($GetLoadBalancerIP -or $LoadBalancerIP -eq "") {
    Write-Host "🔍 Getting LoadBalancer IP from Kubernetes..." -ForegroundColor Yellow
    
    try {
        $LoadBalancerIP = kubectl get service nginx-ingress-controller -n quantum-mycelium-prod -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>$null
        
        if (-not $LoadBalancerIP) {
            # Try alternative service names
            $LoadBalancerIP = kubectl get service ingress-nginx-controller -n quantum-mycelium-prod -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>$null
        }
        
        if (-not $LoadBalancerIP) {
            Write-Host "⚠️  LoadBalancer IP not found. Checking all LoadBalancer services..." -ForegroundColor Yellow
            $services = kubectl get services --all-namespaces -o json | ConvertFrom-Json
            
            foreach ($service in $services.items) {
                if ($service.spec.type -eq "LoadBalancer" -and $service.status.loadBalancer.ingress) {
                    $LoadBalancerIP = $service.status.loadBalancer.ingress[0].ip
                    Write-Host "   Found LoadBalancer: $($service.metadata.name) → $LoadBalancerIP" -ForegroundColor Gray
                    break
                }
            }
        }
        
        if ($LoadBalancerIP) {
            Write-Host "✅ LoadBalancer IP: $LoadBalancerIP" -ForegroundColor Green
        } else {
            Write-Host "❌ No LoadBalancer IP found. Please deploy ingress controller first." -ForegroundColor Red
            Write-Host "   Run: ./scripts/deploy-production.ps1" -ForegroundColor Yellow
            exit 1
        }
    } catch {
        Write-Host "❌ Failed to get LoadBalancer IP from Kubernetes" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
        exit 1
    }
}

# Check for Namecheap API credentials
if ($NamecheapApiUser -eq "" -or $NamecheapApiKey -eq "") {
    Write-Host "🔐 Namecheap API credentials required for automated DNS setup" -ForegroundColor Yellow
    Write-Host "   Get your API key from: https://ap.www.namecheap.com/settings/tools/apiaccess/" -ForegroundColor Gray
    Write-Host ""
    
    if ($NamecheapApiUser -eq "") {
        $NamecheapApiUser = Read-Host "Enter Namecheap API Username"
    }
    
    if ($NamecheapApiKey -eq "") {
        $NamecheapApiKey = Read-Host "Enter Namecheap API Key" -MaskInput
    }
}

# Get client IP for API authentication
Write-Host "🌍 Getting client IP for API authentication..." -ForegroundColor Yellow
try {
    $ClientIP = (Invoke-WebRequest -Uri "https://ipinfo.io/ip" -UseBasicParsing).Content.Trim()
    Write-Host "✅ Client IP: $ClientIP" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to get client IP" -ForegroundColor Red
    $ClientIP = Read-Host "Enter your public IP address"
}

# DNS records to configure
$dnsRecords = @(
    # mycelium-ei.io records
    @{
        Domain = "mycelium-ei.io"
        Records = @(
            @{Type="A"; Host="@"; Value=$LoadBalancerIP; TTL="Automatic"},
            @{Type="A"; Host="www"; Value=$LoadBalancerIP; TTL="Automatic"},
            @{Type="A"; Host="api"; Value=$LoadBalancerIP; TTL="Automatic"},
            @{Type="A"; Host="grafana"; Value=$LoadBalancerIP; TTL="Automatic"},
            @{Type="A"; Host="prometheus"; Value=$LoadBalancerIP; TTL="Automatic"},
            @{Type="A"; Host="jaeger"; Value=$LoadBalancerIP; TTL="Automatic"},
            @{Type="A"; Host="staging"; Value=$LoadBalancerIP; TTL="Automatic"}
        )
    },
    # myceliumei.com records (keep existing redirect, add API subdomain)
    @{
        Domain = "myceliumei.com"
        Records = @(
            @{Type="A"; Host="api"; Value=$LoadBalancerIP; TTL="Automatic"},
            @{Type="A"; Host="staging"; Value=$LoadBalancerIP; TTL="Automatic"}
        )
    }
)

# Function to call Namecheap API
function Invoke-NamecheapAPI {
    param(
        [string]$Command,
        [hashtable]$Parameters = @{}
    )
    
    $baseUrl = "https://api.namecheap.com/xml.response"
    $commonParams = @{
        ApiUser = $NamecheapApiUser
        ApiKey = $NamecheapApiKey
        UserName = $NamecheapApiUser
        Command = $Command
        ClientIp = $ClientIP
    }
    
    $allParams = $commonParams + $Parameters
    $queryString = ($allParams.GetEnumerator() | ForEach-Object { "$($_.Key)=$([System.Uri]::EscapeDataString($_.Value))" }) -join "&"
    $fullUrl = "$baseUrl?$queryString"
    
    try {
        $response = Invoke-WebRequest -Uri $fullUrl -UseBasicParsing
        [xml]$xmlResponse = $response.Content
        
        if ($xmlResponse.ApiResponse.Status -ne "OK") {
            $errorMsg = $xmlResponse.ApiResponse.Errors.Error.'#text'
            throw "Namecheap API Error: $errorMsg"
        }
        
        return $xmlResponse
    } catch {
        Write-Host "❌ API call failed: $($_.Exception.Message)" -ForegroundColor Red
        throw
    }
}

# Function to get current DNS records
function Get-DNSRecords {
    param([string]$Domain)
    
    Write-Host "   Getting current DNS records for $Domain..." -ForegroundColor Gray
    
    $response = Invoke-NamecheapAPI -Command "namecheap.domains.dns.getHosts" -Parameters @{
        SLD = $Domain.Split('.')[0]
        TLD = $Domain.Split('.')[1]
    }
    
    return $response.ApiResponse.CommandResponse.DomainDNSGetHostsResult.host
}

# Function to set DNS records
function Set-DNSRecords {
    param(
        [string]$Domain,
        [array]$Records
    )
    
    Write-Host "   Setting DNS records for $Domain..." -ForegroundColor Gray
    
    # Get current records first
    $currentRecords = Get-DNSRecords -Domain $Domain
    
    # Prepare new records (merge existing with new)
    $allRecords = @()
    $newHostnames = $Records | ForEach-Object { $_.Host }
    
    # Keep existing records that we're not updating
    foreach ($record in $currentRecords) {
        if ($record.Name -notin $newHostnames) {
            $allRecords += @{
                HostName = $record.Name
                RecordType = $record.Type
                Address = $record.Address
                TTL = $record.TTL
            }
        }
    }
    
    # Add new records
    foreach ($record in $Records) {
        $allRecords += @{
            HostName = $record.Host
            RecordType = $record.Type
            Address = $record.Value
            TTL = if ($record.TTL -eq "Automatic") { "1800" } else { $record.TTL }
        }
    }
    
    # Build parameters for API call
    $params = @{
        SLD = $Domain.Split('.')[0]
        TLD = $Domain.Split('.')[1]
    }
    
    for ($i = 0; $i -lt $allRecords.Count; $i++) {
        $record = $allRecords[$i]
        $params["HostName$($i+1)"] = $record.HostName
        $params["RecordType$($i+1)"] = $record.RecordType
        $params["Address$($i+1)"] = $record.Address
        $params["TTL$($i+1)"] = $record.TTL
    }
    
    if ($DryRun) {
        Write-Host "   [DRY RUN] Would set DNS records:" -ForegroundColor Yellow
        foreach ($record in $Records) {
            Write-Host "     $($record.Type) $($record.Host) → $($record.Value)" -ForegroundColor Gray
        }
        return
    }
    
    $response = Invoke-NamecheapAPI -Command "namecheap.domains.dns.setHosts" -Parameters $params
    
    if ($response.ApiResponse.CommandResponse.DomainDNSSetHostsResult.IsSuccess -eq "true") {
        Write-Host "   ✅ DNS records updated successfully" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Failed to update DNS records" -ForegroundColor Red
    }
}

# Configure DNS for each domain
foreach ($domainConfig in $dnsRecords) {
    Write-Host "`n🔧 Configuring DNS for $($domainConfig.Domain)..." -ForegroundColor Yellow
    
    try {
        Set-DNSRecords -Domain $domainConfig.Domain -Records $domainConfig.Records
        
        Write-Host "   Records configured:" -ForegroundColor Green
        foreach ($record in $domainConfig.Records) {
            Write-Host "     $($record.Type) $($record.Host).$($domainConfig.Domain) → $($record.Value)" -ForegroundColor White
        }
    } catch {
        Write-Host "   ❌ Failed to configure DNS for $($domainConfig.Domain)" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# Wait for DNS propagation and verify
if (-not $DryRun) {
    Write-Host "`n⏳ Waiting for DNS propagation (30 seconds)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
    
    Write-Host "`n🔍 Verifying DNS records..." -ForegroundColor Yellow
    
    $testRecords = @(
        "mycelium-ei.io",
        "api.mycelium-ei.io", 
        "grafana.mycelium-ei.io"
    )
    
    foreach ($record in $testRecords) {
        try {
            $resolvedIP = [System.Net.Dns]::GetHostAddresses($record)[0].IPAddressToString
            if ($resolvedIP -eq $LoadBalancerIP) {
                Write-Host "   ✅ $record → $resolvedIP" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️  $record → $resolvedIP (expected: $LoadBalancerIP)" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "   ❌ $record → DNS resolution failed" -ForegroundColor Red
        }
    }
}

# Output final configuration
Write-Host "`n✨ DNS Configuration Complete!" -ForegroundColor Green
Write-Host "   LoadBalancer IP: $LoadBalancerIP" -ForegroundColor Gray
Write-Host "`n🌐 Your domains are now configured:" -ForegroundColor Cyan
Write-Host "   • https://mycelium-ei.io (Main platform)" -ForegroundColor White
Write-Host "   • https://api.mycelium-ei.io (API gateway)" -ForegroundColor White  
Write-Host "   • https://grafana.mycelium-ei.io (Monitoring)" -ForegroundColor White
Write-Host "   • https://staging.mycelium-ei.io (Staging environment)" -ForegroundColor White

Write-Host "`n📝 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Deploy production: ./scripts/deploy-production.ps1" -ForegroundColor White
Write-Host "   2. Validate deployment: ./scripts/validate-production.ps1 -Domain mycelium-ei.io" -ForegroundColor White
Write-Host "   3. Set up SSL certificates (handled automatically by cert-manager)" -ForegroundColor White

if ($DryRun) {
    Write-Host "`n🧪 This was a dry run. Add -DryRun:`$false to apply changes." -ForegroundColor Yellow
}