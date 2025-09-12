param(
    [Parameter(Mandatory=$false)]
    [string]$Domain = "mycelium-ei.io",
    
    [Parameter(Mandatory=$false)]
    [switch]$Production,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipDNS,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipDeploy,
    
    [Parameter(Mandatory=$false)]
    [switch]$Interactive = $true
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 QuantumMycelium Nexus Complete Setup" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "Domain: $Domain" -ForegroundColor White
Write-Host "Environment: $(if ($Production) { 'Production' } else { 'Development' })" -ForegroundColor White

# Step 1: Environment Setup
Write-Host "`n📋 Step 1: Environment Configuration" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Yellow

$envSetupArgs = @()
if ($Production) { $envSetupArgs += "-Production" }
if ($Interactive) { $envSetupArgs += "-SetupOAuth", "-SetupAnalytics" }
if (-not $Interactive) { $envSetupArgs += "-Interactive:`$false" }

Write-Host "Running environment setup..." -ForegroundColor Gray
& ".\scripts\setup-environment.ps1" @envSetupArgs

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Environment setup failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Environment configured successfully" -ForegroundColor Green

# Step 2: DNS Configuration
if (-not $SkipDNS) {
    Write-Host "`n🌐 Step 2: DNS Configuration" -ForegroundColor Yellow
    Write-Host "=============================" -ForegroundColor Yellow
    
    if ($Interactive) {
        $setupDNS = Read-Host "Configure DNS automatically via API? (Y/n)"
        if ($setupDNS -eq "" -or $setupDNS -eq "Y" -or $setupDNS -eq "y") {
            Write-Host "Running DNS setup..." -ForegroundColor Gray
            & ".\scripts\setup-dns-cli.ps1" -GetLoadBalancerIP
            
            if ($LASTEXITCODE -ne 0) {
                Write-Host "⚠️  DNS setup failed or was skipped" -ForegroundColor Yellow
                Write-Host "You can configure DNS manually or run setup-dns-cli.ps1 later" -ForegroundColor Gray
            } else {
                Write-Host "✅ DNS configured successfully" -ForegroundColor Green
            }
        } else {
            Write-Host "⏭️  DNS setup skipped" -ForegroundColor Yellow
            Write-Host "Manual DNS configuration required - see docs/DNS_CONFIGURATION.md" -ForegroundColor Gray
        }
    } else {
        Write-Host "⏭️  DNS setup skipped (non-interactive mode)" -ForegroundColor Yellow
    }
} else {
    Write-Host "`n🌐 Step 2: DNS Configuration - SKIPPED" -ForegroundColor Yellow
}

# Step 3: Production Deployment
if (-not $SkipDeploy) {
    Write-Host "`n☸️  Step 3: Production Deployment" -ForegroundColor Yellow
    Write-Host "==================================" -ForegroundColor Yellow
    
    $deployArgs = @("-Domain", $Domain)
    if ($Production) { $deployArgs += "-BuildAndPush" }
    
    if ($Interactive) {
        $deploy = Read-Host "Deploy to production cluster? (Y/n)"
        if ($deploy -eq "" -or $deploy -eq "Y" -or $deploy -eq "y") {
            Write-Host "Running production deployment..." -ForegroundColor Gray
            & ".\scripts\deploy-production.ps1" @deployArgs
            
            if ($LASTEXITCODE -ne 0) {
                Write-Host "❌ Production deployment failed" -ForegroundColor Red
                exit 1
            }
            
            Write-Host "✅ Production deployment successful" -ForegroundColor Green
        } else {
            Write-Host "⏭️  Production deployment skipped" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Running production deployment..." -ForegroundColor Gray
        & ".\scripts\deploy-production.ps1" @deployArgs
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Production deployment failed" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "✅ Production deployment successful" -ForegroundColor Green
    }
} else {
    Write-Host "`n☸️  Step 3: Production Deployment - SKIPPED" -ForegroundColor Yellow
}

# Step 4: Validation
Write-Host "`n✅ Step 4: Production Validation" -ForegroundColor Yellow
Write-Host "=================================" -ForegroundColor Yellow

Write-Host "Running production validation..." -ForegroundColor Gray
& ".\scripts\validate-production.ps1" -Domain $Domain

$validationExitCode = $LASTEXITCODE

# Final Summary
Write-Host "`n🎉 Setup Complete Summary" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green

Write-Host "`n✅ Completed Steps:" -ForegroundColor Cyan
Write-Host "   • Environment configuration with secure secrets" -ForegroundColor White
if (-not $SkipDNS) {
    Write-Host "   • DNS configuration for $Domain" -ForegroundColor White
}
if (-not $SkipDeploy) {
    Write-Host "   • Production deployment to Kubernetes" -ForegroundColor White
}
Write-Host "   • Production validation and health checks" -ForegroundColor White

if ($validationExitCode -eq 0) {
    Write-Host "`n🌟 QuantumMycelium Nexus is now LIVE!" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Green
    
    Write-Host "`n🌐 Your Platform URLs:" -ForegroundColor Cyan
    Write-Host "   Main Platform: https://$Domain" -ForegroundColor White
    Write-Host "   API Gateway: https://api.$Domain" -ForegroundColor White
    Write-Host "   Monitoring: https://grafana.$Domain" -ForegroundColor White
    Write-Host "   Tracing: https://jaeger.$Domain" -ForegroundColor White
    
    Write-Host "`n🚀 Next Steps:" -ForegroundColor Cyan
    Write-Host "   • Share your platform with users!" -ForegroundColor White
    Write-Host "   • Monitor usage via Grafana dashboard" -ForegroundColor White
    Write-Host "   • Check the quickstart guide at /docs/QUICKSTART.md" -ForegroundColor White
    Write-Host "   • Join the community and start building quantum-hybrid applications!" -ForegroundColor White
    
} elseif ($validationExitCode -eq 1) {
    Write-Host "`n⚠️  Platform is Running with Warnings" -ForegroundColor Yellow
    Write-Host "=====================================" -ForegroundColor Yellow
    
    Write-Host "Your platform is functional but has some warnings." -ForegroundColor White
    Write-Host "Check the validation output above for details." -ForegroundColor White
    
} else {
    Write-Host "`n❌ Platform Has Critical Issues" -ForegroundColor Red
    Write-Host "===============================" -ForegroundColor Red
    
    Write-Host "Some critical components are not working properly." -ForegroundColor White
    Write-Host "Please check the validation output and fix issues before going live." -ForegroundColor White
    
    Write-Host "`n🔧 Troubleshooting:" -ForegroundColor Cyan
    Write-Host "   • Check pod logs: kubectl logs -f deployment/orchestrator -n quantum-mycelium-prod" -ForegroundColor White
    Write-Host "   • Check ingress: kubectl get ingress -n quantum-mycelium-prod" -ForegroundColor White
    Write-Host "   • Verify DNS: nslookup api.$Domain" -ForegroundColor White
    Write-Host "   • Re-run validation: ./scripts/validate-production.ps1 -Domain $Domain" -ForegroundColor White
}

Write-Host "`n📚 Documentation:" -ForegroundColor Blue
Write-Host "   • Quickstart Guide: docs/QUICKSTART.md" -ForegroundColor White
Write-Host "   • DNS Configuration: docs/DNS_CONFIGURATION.md" -ForegroundColor White
Write-Host "   • API Documentation: https://api.$Domain/docs" -ForegroundColor White
Write-Host "   • GitHub Repository: https://github.com/MichaelCrowe11/CroweQuantumMyceliumNexus" -ForegroundColor White

Write-Host "`n💬 Support:" -ForegroundColor Blue
Write-Host "   • Issues: https://github.com/MichaelCrowe11/CroweQuantumMyceliumNexus/issues" -ForegroundColor White
Write-Host "   • Community: Join our Discord/discussions" -ForegroundColor White

Write-Host ""
exit $validationExitCode