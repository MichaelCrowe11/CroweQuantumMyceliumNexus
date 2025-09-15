# Quick Namecheap API Test
# Usage: ./test-api.ps1 "YOUR_API_USER" "YOUR_API_KEY"

param(
    [Parameter(Mandatory=$true)]
    [string]$ApiUser,
    
    [Parameter(Mandatory=$true)]
    [string]$ApiKey
)

Write-Host "🔌 Testing Namecheap API..." -ForegroundColor Cyan
Write-Host "API User: $ApiUser" -ForegroundColor Gray
Write-Host "Client IP: 98.186.221.213" -ForegroundColor Gray

$baseUrl = "https://api.namecheap.com/xml.response"
$params = @{
    ApiUser = $ApiUser
    ApiKey = $ApiKey
    UserName = $ApiUser
    Command = "namecheap.users.getInfo"
    ClientIp = "98.186.221.213"
}

$queryString = ""
foreach ($param in $params.GetEnumerator()) {
    if ($queryString -ne "") { $queryString += "&" }
    $queryString += "$($param.Key)=$($param.Value)"
}
$fullUrl = "$baseUrl?$queryString"

try {
    $response = Invoke-WebRequest -Uri $fullUrl -UseBasicParsing -TimeoutSec 30
    [xml]$xmlResponse = $response.Content
    
    if ($xmlResponse.ApiResponse.Status -eq "OK") {
        Write-Host "✅ SUCCESS! API Connection Working" -ForegroundColor Green
        Write-Host "Account Info:" -ForegroundColor Cyan
        Write-Host "  User ID: $($xmlResponse.ApiResponse.CommandResponse.UserGetInfoResult.ID)" -ForegroundColor White
        Write-Host "  Email: $($xmlResponse.ApiResponse.CommandResponse.UserGetInfoResult.Email)" -ForegroundColor White
        
        # Test domain listing
        Write-Host "`n📋 Getting your domains..." -ForegroundColor Yellow
        $domainParams = $params.Clone()
        $domainParams.Command = "namecheap.domains.getList"
        $domainQuery = ""
        foreach ($param in $domainParams.GetEnumerator()) {
            if ($domainQuery -ne "") { $domainQuery += "&" }
            $domainQuery += "$($param.Key)=$($param.Value)"
        }
        $domainUrl = "$baseUrl?$domainQuery"
        
        $domainResponse = Invoke-WebRequest -Uri $domainUrl -UseBasicParsing -TimeoutSec 30
        [xml]$domainXml = $domainResponse.Content
        
        if ($domainXml.ApiResponse.Status -eq "OK") {
            $domains = $domainXml.ApiResponse.CommandResponse.DomainGetListResult.Domain
            Write-Host "✅ Found $(@($domains).Count) domain(s):" -ForegroundColor Green
            foreach ($domain in $domains) {
                Write-Host "  📌 $($domain.Name)" -ForegroundColor White
            }
        }
        
        # Save credentials for automation
        [System.Environment]::SetEnvironmentVariable("NAMECHEAP_API_USER", $ApiUser, "User")
        [System.Environment]::SetEnvironmentVariable("NAMECHEAP_API_KEY", $ApiKey, "User")
        Write-Host "`n✅ Credentials saved! Ready for automated setup." -ForegroundColor Green
        
        Write-Host "`n🚀 Next step: Run automated DNS setup:" -ForegroundColor Cyan
        Write-Host "  pwsh ./scripts/setup-dns-cli.ps1 -GetLoadBalancerIP" -ForegroundColor White
        
    } else {
        Write-Host "❌ API Error:" -ForegroundColor Red
        Write-Host $xmlResponse.ApiResponse.Errors.Error.'#text' -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Connection Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`n🔧 Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  • Verify IP 98.186.221.213 is whitelisted" -ForegroundColor White
    Write-Host "  • Check API username and key are correct" -ForegroundColor White
    Write-Host "  • Ensure API access is enabled in Namecheap" -ForegroundColor White
}