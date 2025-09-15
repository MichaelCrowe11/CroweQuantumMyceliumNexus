# Update DNS to point to Vercel/Netlify instead of VPS

param(
    [string]$HostingPlatform = "vercel",  # or "netlify"
    [switch]$DryRun
)

$ApiUser = "southwestfungi"
$ApiKey = "437d398aa3ec49a0906426778b5b9354"

Write-Host "🌐 Updating DNS for Cloud Hosting" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

# DNS records for different platforms
$vercelRecords = @(
    @{Type="A"; Name="@"; Address="76.76.21.21"; TTL="1800"},
    @{Type="CNAME"; Name="www"; Address="cname.vercel-dns.com."; TTL="1800"}
)

$netlifyRecords = @(
    @{Type="A"; Name="@"; Address="75.2.60.5"; TTL="1800"},
    @{Type="CNAME"; Name="www"; Address="quantum-mycelium.netlify.app."; TTL="1800"}
)

# Keep API subdomain pointing to different service
$apiRecords = @(
    @{Type="CNAME"; Name="api"; Address="quantum-mycelium-api.up.railway.app."; TTL="1800"}
)

# Choose records based on platform
if ($HostingPlatform -eq "vercel") {
    $newRecords = $vercelRecords
    Write-Host "Platform: Vercel" -ForegroundColor Green
} else {
    $newRecords = $netlifyRecords
    Write-Host "Platform: Netlify" -ForegroundColor Green
}

# Add API records
$newRecords += $apiRecords

# Keep existing TXT records
$existingTxtRecords = @(
    @{Type="TXT"; Name="@"; Address="replit-verify=3ef7e77d-bcba-4b6e-a24d-ce4fa1b9b364"; TTL="1800"},
    @{Type="TXT"; Name="_twilio"; Address="twilio-domain-verification=fedfedaced23da12716ae71cf8508be0"; TTL="1800"}
)

Write-Host "`n📝 DNS Records to Configure:" -ForegroundColor Yellow
foreach ($record in $newRecords) {
    Write-Host "$($record.Type) $($record.Name) → $($record.Address)" -ForegroundColor White
}

if ($DryRun) {
    Write-Host "`n✅ DRY RUN - No changes made" -ForegroundColor Yellow
    exit
}

# Apply DNS changes
Write-Host "`n🚀 Applying DNS changes..." -ForegroundColor Yellow

$baseUrl = "https://api.namecheap.com/xml.response"
$params = "ApiUser=${ApiUser}&ApiKey=${ApiKey}&UserName=${ApiUser}&Command=namecheap.domains.dns.setHosts&ClientIp=98.186.221.213&SLD=mycelium-ei&TLD=io"

$recordIndex = 1
foreach ($record in $newRecords) {
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
        Write-Host "✅ DNS Updated for $HostingPlatform hosting!" -ForegroundColor Green
        
        Write-Host "`n📋 Next Steps:" -ForegroundColor Cyan
        if ($HostingPlatform -eq "vercel") {
            Write-Host "1. Run: npm install -g vercel" -ForegroundColor White
            Write-Host "2. Run: vercel login" -ForegroundColor White
            Write-Host "3. Run: ./deploy-to-vercel.sh" -ForegroundColor White
            Write-Host "4. Add domain in Vercel dashboard" -ForegroundColor White
        } else {
            Write-Host "1. Go to: https://app.netlify.com" -ForegroundColor White
            Write-Host "2. Drag & drop the 'frontend/build' folder" -ForegroundColor White
            Write-Host "3. Add custom domain: mycelium-ei.io" -ForegroundColor White
        }
    }
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}