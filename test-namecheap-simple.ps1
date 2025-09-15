# Simple Namecheap API Test
param(
    [string]$ApiUser = "southwestfungi_api",
    [string]$ApiKey = "437d398aa3ec49a0906426778b5b9354"
)

Write-Host "Testing Namecheap API Connection..." -ForegroundColor Cyan

# Build URL manually
$baseUrl = "https://api.namecheap.com/xml.response"
$fullUrl = "${baseUrl}?ApiUser=${ApiUser}&ApiKey=${ApiKey}&UserName=${ApiUser}&Command=namecheap.users.getInfo&ClientIp=98.186.221.213"

Write-Host "URL (first 100 chars): $($fullUrl.Substring(0, [Math]::Min(100, $fullUrl.Length)))..." -ForegroundColor Gray

try {
    # Make the API call
    $response = Invoke-RestMethod -Uri $fullUrl -Method Get
    
    # Check if it's an error response
    if ($response.ApiResponse.Status -eq "ERROR") {
        Write-Host "❌ API Error Response:" -ForegroundColor Red
        $errorMsg = $response.ApiResponse.Errors.Error.'#text'
        Write-Host "   $errorMsg" -ForegroundColor Yellow
        
        # Common error meanings
        if ($errorMsg -like "*Invalid request IP*") {
            Write-Host "`n🔧 Solution: Add IP 98.186.221.213 to whitelist in Namecheap API settings" -ForegroundColor Cyan
        } elseif ($errorMsg -like "*Authentication*") {
            Write-Host "`n🔧 Solution: Check API username and key are correct" -ForegroundColor Cyan
        }
    } elseif ($response.ApiResponse.Status -eq "OK") {
        Write-Host "✅ SUCCESS! API Connection Working" -ForegroundColor Green
        Write-Host "Account Email: $($response.ApiResponse.CommandResponse.UserGetInfoResult.Email)" -ForegroundColor White
        
        # Test domain list
        Write-Host "`nGetting domain list..." -ForegroundColor Yellow
        $domainUrl = "${baseUrl}?ApiUser=${ApiUser}&ApiKey=${ApiKey}&UserName=${ApiUser}&Command=namecheap.domains.getList&ClientIp=98.186.221.213"
        $domainResponse = Invoke-RestMethod -Uri $domainUrl -Method Get
        
        if ($domainResponse.ApiResponse.Status -eq "OK") {
            $domains = $domainResponse.ApiResponse.CommandResponse.DomainGetListResult.Domain
            Write-Host "✅ Found domains:" -ForegroundColor Green
            foreach ($domain in $domains) {
                Write-Host "   📌 $($domain.Name)" -ForegroundColor White
            }
            
            # Save credentials
            [System.Environment]::SetEnvironmentVariable("NAMECHEAP_API_USER", $ApiUser, "User")
            [System.Environment]::SetEnvironmentVariable("NAMECHEAP_API_KEY", $ApiKey, "User") 
            Write-Host "`n✅ Credentials saved for future use!" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "❌ Connection Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Gray
    }
}