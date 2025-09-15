Write-Host "🔌 Quick Namecheap API Test" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan

# Get API credentials from user
Write-Host ""
Write-Host "Please provide your Namecheap API credentials:" -ForegroundColor Yellow
$ApiUser = Read-Host "API Username"
$ApiKey = Read-Host "API Key" -AsSecureString
$ApiKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiKey))

# Get client IP
$ClientIP = "98.186.221.213"  # Your detected IP
Write-Host "Using IP: $ClientIP" -ForegroundColor Gray

# Test API call
Write-Host ""
Write-Host "Testing API connection..." -ForegroundColor Yellow

$baseUrl = "https://api.namecheap.com/xml.response"
$params = @{
    ApiUser = $ApiUser
    ApiKey = $ApiKeyPlain
    UserName = $ApiUser
    Command = "namecheap.users.getInfo"
    ClientIp = $ClientIP
}

$queryString = ($params.GetEnumerator() | ForEach-Object { "$($_.Key)=$([System.Uri]::EscapeDataString($_.Value))" }) -join "&"
$fullUrl = "$baseUrl?$queryString"

try {
    $response = Invoke-WebRequest -Uri $fullUrl -UseBasicParsing
    [xml]$xmlResponse = $response.Content
    
    if ($xmlResponse.ApiResponse.Status -eq "OK") {
        Write-Host "✅ API Connection Successful!" -ForegroundColor Green
        Write-Host "User ID: $($xmlResponse.ApiResponse.CommandResponse.UserGetInfoResult.ID)" -ForegroundColor White
        Write-Host "Email: $($xmlResponse.ApiResponse.CommandResponse.UserGetInfoResult.Email)" -ForegroundColor White
        
        # Save credentials
        [System.Environment]::SetEnvironmentVariable("NAMECHEAP_API_USER", $ApiUser, "User")
        [System.Environment]::SetEnvironmentVariable("NAMECHEAP_API_KEY", $ApiKeyPlain, "User")
        Write-Host "✅ Credentials saved for future use" -ForegroundColor Green
        
    } else {
        $errorMsg = $xmlResponse.ApiResponse.Errors.Error.'#text'
        Write-Host "❌ API Error: $errorMsg" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Connection failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Next: Run './scripts/test-namecheap-api.ps1 -ListDomains' to see your domains" -ForegroundColor Cyan