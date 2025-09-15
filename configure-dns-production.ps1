# Configure Production DNS for QuantumMycelium Nexus
param(
    [string]$LoadBalancerIP = "34.111.179.208",  # Using your existing IP for now
    [switch]$DryRun
)

$ApiUser = "southwestfungi"
$ApiKey = "437d398aa3ec49a0906426778b5b9354"
$Domain = "mycelium-ei.io"

Write-Host "🌐 Configuring Production DNS for QuantumMycelium Nexus" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Domain: $Domain" -ForegroundColor White
Write-Host "LoadBalancer IP: $LoadBalancerIP" -ForegroundColor White
if ($DryRun) {
    Write-Host "MODE: DRY RUN - No changes will be made" -ForegroundColor Yellow
}

# DNS records to configure
$newRecords = @(
    @{Type="A"; Name="@"; Address=$LoadBalancerIP; TTL="1800"},
    @{Type="A"; Name="www"; Address=$LoadBalancerIP; TTL="1800"},
    @{Type="A"; Name="api"; Address=$LoadBalancerIP; TTL="1800"},
    @{Type="A"; Name="grafana"; Address=$LoadBalancerIP; TTL="1800"},
    @{Type="A"; Name="prometheus"; Address=$LoadBalancerIP; TTL="1800"},
    @{Type="A"; Name="jaeger"; Address=$LoadBalancerIP; TTL="1800"},
    @{Type="A"; Name="staging"; Address=$LoadBalancerIP; TTL="1800"}
)

# Keep existing TXT records
$existingTxtRecords = @(
    @{Type="TXT"; Name="@"; Address="replit-verify=3ef7e77d-bcba-4b6e-a24d-ce4fa1b9b364"; TTL="1800"},
    @{Type="TXT"; Name="_twilio"; Address="twilio-domain-verification=fedfedaced23da12716ae71cf8508be0"; TTL="1800"},
    @{Type="TXT"; Name="weather"; Address="replit-verify=9bb38941-a81d-4d77-8aa8-7d2503212ec8"; TTL="1800"}
)

Write-Host "`n📝 DNS Records to Configure:" -ForegroundColor Yellow
Write-Host "Type     Host              Points To" -ForegroundColor Cyan
Write-Host "----     ----              ---------" -ForegroundColor Cyan

foreach ($record in $newRecords) {
    Write-Host ("{0,-8} {1,-17} → {2}" -f $record.Type, $record.Name, $record.Address) -ForegroundColor White
}

if ($DryRun) {
    Write-Host "`n✅ DRY RUN Complete - No changes made" -ForegroundColor Green
    Write-Host "Remove -DryRun flag to apply changes" -ForegroundColor Yellow
    exit 0
}

Write-Host "`n🚀 Applying DNS Changes..." -ForegroundColor Yellow

# Build the API call
$baseUrl = "https://api.namecheap.com/xml.response"
$params = "ApiUser=${ApiUser}&ApiKey=${ApiKey}&UserName=${ApiUser}&Command=namecheap.domains.dns.setHosts&ClientIp=98.186.221.213&SLD=mycelium-ei&TLD=io"

# Add all records to the API call
$recordIndex = 1
foreach ($record in $newRecords) {
    $params += "&HostName${recordIndex}=$($record.Name)&RecordType${recordIndex}=$($record.Type)&Address${recordIndex}=$($record.Address)&TTL${recordIndex}=$($record.TTL)"
    $recordIndex++
}

# Add existing TXT records
foreach ($record in $existingTxtRecords) {
    $params += "&HostName${recordIndex}=$($record.Name)&RecordType${recordIndex}=$($record.Type)&Address${recordIndex}=$($record.Address)&TTL${recordIndex}=$($record.TTL)"
    $recordIndex++
}

$url = "${baseUrl}?${params}"

try {
    $response = Invoke-RestMethod -Uri $url -Method Get
    
    if ($response.ApiResponse.Status -eq "OK") {
        Write-Host "✅ DNS Records Updated Successfully!" -ForegroundColor Green
        
        Write-Host "`n🌐 Your Platform URLs:" -ForegroundColor Cyan
        Write-Host "   Main Site: https://mycelium-ei.io" -ForegroundColor White
        Write-Host "   API: https://api.mycelium-ei.io" -ForegroundColor White
        Write-Host "   Monitoring: https://grafana.mycelium-ei.io" -ForegroundColor White
        Write-Host "   Tracing: https://jaeger.mycelium-ei.io" -ForegroundColor White
        Write-Host "   Staging: https://staging.mycelium-ei.io" -ForegroundColor White
        
        Write-Host "`n⏳ DNS propagation can take 5-30 minutes" -ForegroundColor Yellow
        Write-Host "   Use 'nslookup api.mycelium-ei.io' to verify" -ForegroundColor Gray
        
    } else {
        Write-Host "❌ Error: $($response.ApiResponse.Errors.Error.'#text')" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}