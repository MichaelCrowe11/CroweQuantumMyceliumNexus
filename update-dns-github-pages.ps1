# Update DNS for GitHub Pages hosting
param(
    [switch]$DryRun
)

$ApiUser = "southwestfungi"
$ApiKey = "437d398aa3ec49a0906426778b5b9354"

Write-Host "🌐 Configuring DNS for GitHub Pages" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# GitHub Pages DNS records
$githubRecords = @(
    @{Type="A"; Name="@"; Address="185.199.108.153"; TTL="1800"},
    @{Type="A"; Name="@"; Address="185.199.109.153"; TTL="1800"},
    @{Type="A"; Name="@"; Address="185.199.110.153"; TTL="1800"},
    @{Type="A"; Name="@"; Address="185.199.111.153"; TTL="1800"},
    @{Type="CNAME"; Name="www"; Address="michaelcrowe11.github.io."; TTL="1800"}
)

# Keep existing TXT records
$existingTxtRecords = @(
    @{Type="TXT"; Name="@"; Address="replit-verify=3ef7e77d-bcba-4b6e-a24d-ce4fa1b9b364"; TTL="1800"},
    @{Type="TXT"; Name="_twilio"; Address="twilio-domain-verification=fedfedaced23da12716ae71cf8508be0"; TTL="1800"}
)

Write-Host "`n📝 DNS Records to Configure:" -ForegroundColor Yellow
Write-Host "A Records pointing to GitHub Pages IPs" -ForegroundColor White
Write-Host "CNAME www → michaelcrowe11.github.io" -ForegroundColor White

if ($DryRun) {
    Write-Host "`n✅ DRY RUN - No changes made" -ForegroundColor Yellow
    exit
}

Write-Host "`n🚀 Applying DNS changes..." -ForegroundColor Yellow

$baseUrl = "https://api.namecheap.com/xml.response"
$params = "ApiUser=${ApiUser}&ApiKey=${ApiKey}&UserName=${ApiUser}&Command=namecheap.domains.dns.setHosts&ClientIp=98.186.221.213&SLD=mycelium-ei&TLD=io"

$recordIndex = 1
foreach ($record in $githubRecords) {
    $params += "&HostName${recordIndex}=$($record.Name)&RecordType${recordIndex}=$($record.Type)&Address${recordIndex}=$($record.Address)&TTL${recordIndex}=$($record.TTL)"
    $recordIndex++
}

foreach ($record in $existingTxtRecords) {
    $params += "&HostName${recordIndex}=$($record.Name)&RecordType${recordIndex}=$($record.Type)&Address${recordIndex}=$($record.Address)&TTL${recordIndex}=$($record.TTL)"
    $recordIndex++
}

$url = "${baseUrl}?${params}"

try {
    $response = Invoke-RestMethod -Uri $url -Method Get
    
    if ($response.ApiResponse.Status -eq "OK") {
        Write-Host "✅ DNS Updated for GitHub Pages!" -ForegroundColor Green
        
        Write-Host "`n🎉 Your site will be available at:" -ForegroundColor Cyan
        Write-Host "   https://mycelium-ei.io" -ForegroundColor White
        Write-Host "   https://www.mycelium-ei.io" -ForegroundColor White
        
        Write-Host "`n⏳ Note: DNS propagation takes 5-30 minutes" -ForegroundColor Yellow
        Write-Host "   GitHub Pages SSL certificate may take up to 24 hours" -ForegroundColor Yellow
        
        Write-Host "`n📋 Also accessible at:" -ForegroundColor Gray
        Write-Host "   https://michaelcrowe11.github.io/CroweQuantumMyceliumNexus" -ForegroundColor Gray
        
    } else {
        Write-Host "❌ Error: $($response.ApiResponse.Errors.Error.'#text')" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}