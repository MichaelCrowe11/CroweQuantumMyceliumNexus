# Check DNS Records for domain
param(
    [string]$Domain = "mycelium-ei.io"
)

$ApiUser = "southwestfungi"
$ApiKey = "437d398aa3ec49a0906426778b5b9354"

Write-Host "🔍 Checking DNS records for $Domain" -ForegroundColor Cyan

$baseUrl = "https://api.namecheap.com/xml.response"
$domainParts = $Domain.Split('.')
$sld = $domainParts[0]
$tld = $domainParts[1..($domainParts.Length-1)] -join '.'

$url = "${baseUrl}?ApiUser=${ApiUser}&ApiKey=${ApiKey}&UserName=${ApiUser}&Command=namecheap.domains.dns.getHosts&ClientIp=98.186.221.213&SLD=${sld}&TLD=${tld}"

try {
    $response = Invoke-RestMethod -Uri $url -Method Get
    
    if ($response.ApiResponse.Status -eq "OK") {
        $hosts = $response.ApiResponse.CommandResponse.DomainDNSGetHostsResult.host
        
        Write-Host "✅ Current DNS Records:" -ForegroundColor Green
        Write-Host ""
        Write-Host "Type     Host              Value                           TTL" -ForegroundColor Yellow
        Write-Host "----     ----              -----                           ---" -ForegroundColor Yellow
        
        if ($hosts) {
            foreach ($record in $hosts) {
                $type = if ($record.Type) { $record.Type } else { "?" }
                $name = if ($record.Name) { $record.Name } else { "@" }
                $address = if ($record.Address) { $record.Address } else { "?" }
                $ttl = if ($record.TTL) { $record.TTL } else { "Auto" }
                
                # Truncate long values for display
                if ($address.Length -gt 40) {
                    $address = $address.Substring(0, 37) + "..."
                }
                
                Write-Host ("{0,-8} {1,-17} {2,-31} {3}" -f $type, $name, $address, $ttl)
            }
        } else {
            Write-Host "   No DNS records found" -ForegroundColor Gray
        }
        
        Write-Host ""
        Write-Host "📝 Ready to configure production DNS records" -ForegroundColor Cyan
        
    } else {
        Write-Host "❌ Error: $($response.ApiResponse.Errors.Error.'#text')" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}