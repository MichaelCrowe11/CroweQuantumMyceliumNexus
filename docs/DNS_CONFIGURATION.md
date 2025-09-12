# DNS Configuration for mycelium-ei.io

## Current DNS Records
- **A Record**: `@` → `34.111.179.208` (Main domain)
- **A Record**: `weather` → `34.111.179.208` (Weather subdomain)

## Required DNS Records for Production Deployment

### Core Application Records
```
Type        Host                Value                       TTL
A           @                  [Load Balancer IP]          Automatic
A           www                [Load Balancer IP]          Automatic
A           api                [Load Balancer IP]          Automatic
```

### Monitoring & Management Records
```
Type        Host                Value                       TTL
A           grafana            [Load Balancer IP]          Automatic
A           prometheus         [Load Balancer IP]          Automatic
A           jaeger             [Load Balancer IP]          Automatic
```

### Development & Staging Records
```
Type        Host                Value                       TTL
A           staging            [Staging Load Balancer IP]  Automatic
A           dev                [Dev Load Balancer IP]      Automatic
```

### SSL/TLS Certificate Records
```
Type        Host                Value                                           TTL
CNAME       _acme-challenge    [Let's Encrypt Challenge]                       Automatic
```

## Setup Instructions

1. **Get Load Balancer IP from Kubernetes:**
   ```bash
   kubectl get service nginx-ingress-controller -n quantum-mycelium-prod -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
   ```

2. **Add DNS Records in Namecheap:**
   - Login to Namecheap dashboard
   - Navigate to Domain List → mycelium-ei.io → Advanced DNS
   - Add the A records listed above

3. **Verify DNS Propagation:**
   ```bash
   nslookup api.mycelium-ei.io
   nslookup grafana.mycelium-ei.io
   ```

## Post-Deployment Verification

After adding DNS records, verify each endpoint:
- ✅ https://mycelium-ei.io (Main application)
- ✅ https://api.mycelium-ei.io (API gateway)
- ✅ https://grafana.mycelium-ei.io (Monitoring dashboard)
- ✅ https://jaeger.mycelium-ei.io (Tracing interface)

## Notes
- DNS propagation can take 5-15 minutes
- Use `Automatic` TTL for production flexibility
- Consider adding CAA records for enhanced security