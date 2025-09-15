#!/bin/bash

# QuantumMycelium Nexus - Quick Server Deployment
# This script deploys the platform to your server at 34.111.179.208

set -e

echo "🚀 QuantumMycelium Nexus Server Deployment"
echo "=========================================="

# Configuration
SERVER_IP="34.111.179.208"
DOMAIN="mycelium-ei.io"
DEPLOY_USER="root"  # Change if different

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Deploying to: $SERVER_IP${NC}"
echo -e "${YELLOW}Domain: $DOMAIN${NC}"

# Step 1: Install Docker and Docker Compose if needed
echo -e "\n${BLUE}Step 1: Installing Dependencies${NC}"
ssh $DEPLOY_USER@$SERVER_IP << 'EOF'
    # Update system
    apt-get update -y
    
    # Install Docker if not present
    if ! command -v docker &> /dev/null; then
        echo "Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        rm get-docker.sh
    fi
    
    # Install Docker Compose if not present
    if ! command -v docker-compose &> /dev/null; then
        echo "Installing Docker Compose..."
        curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
    fi
    
    # Install nginx if not present
    if ! command -v nginx &> /dev/null; then
        echo "Installing Nginx..."
        apt-get install -y nginx certbot python3-certbot-nginx
    fi
    
    echo "✅ Dependencies installed"
EOF

# Step 2: Create deployment directory and copy files
echo -e "\n${BLUE}Step 2: Setting up application directory${NC}"
ssh $DEPLOY_USER@$SERVER_IP "mkdir -p /opt/quantum-mycelium"

# Create docker-compose.yml for the server
cat > /tmp/docker-compose.yml << 'EODC'
version: '3.8'

services:
  frontend:
    image: ghcr.io/michaelcrowe11/quantum-mycelium/frontend:latest
    container_name: qm-frontend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - REACT_APP_API_URL=https://api.mycelium-ei.io
    restart: unless-stopped

  api:
    image: ghcr.io/michaelcrowe11/quantum-mycelium/api:latest
    container_name: qm-api
    ports:
      - "8000:8000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/quantum_mycelium
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=your-jwt-secret-here
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: postgres:14-alpine
    container_name: qm-postgres
    environment:
      - POSTGRES_DB=quantum_mycelium
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=your-secure-password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: qm-redis
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: qm-grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_SERVER_ROOT_URL=https://grafana.mycelium-ei.io
    volumes:
      - grafana_data:/var/lib/grafana
    restart: unless-stopped

volumes:
  postgres_data:
  grafana_data:
EODC

# Copy docker-compose to server
scp /tmp/docker-compose.yml $DEPLOY_USER@$SERVER_IP:/opt/quantum-mycelium/

# Step 3: Configure Nginx
echo -e "\n${BLUE}Step 3: Configuring Nginx${NC}"
cat > /tmp/nginx.conf << 'EONX'
# Main site
server {
    listen 80;
    server_name mycelium-ei.io www.mycelium-ei.io;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# API
server {
    listen 80;
    server_name api.mycelium-ei.io;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Grafana
server {
    listen 80;
    server_name grafana.mycelium-ei.io;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Staging
server {
    listen 80;
    server_name staging.mycelium-ei.io;
    
    location / {
        return 200 "Staging environment coming soon!";
        add_header Content-Type text/plain;
    }
}
EONX

# Copy nginx config to server
scp /tmp/nginx.conf $DEPLOY_USER@$SERVER_IP:/etc/nginx/sites-available/quantum-mycelium

# Enable the site
ssh $DEPLOY_USER@$SERVER_IP << 'EOF'
    ln -sf /etc/nginx/sites-available/quantum-mycelium /etc/nginx/sites-enabled/
    nginx -t && systemctl reload nginx
    echo "✅ Nginx configured"
EOF

# Step 4: Start the application
echo -e "\n${BLUE}Step 4: Starting application${NC}"
ssh $DEPLOY_USER@$SERVER_IP << 'EOF'
    cd /opt/quantum-mycelium
    docker-compose pull
    docker-compose up -d
    echo "✅ Application started"
    
    # Show running containers
    echo -e "\n📦 Running containers:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
EOF

# Step 5: Set up SSL certificates
echo -e "\n${BLUE}Step 5: Setting up SSL certificates${NC}"
ssh $DEPLOY_USER@$SERVER_IP << 'EOF'
    # Get SSL certificates for all domains
    certbot --nginx -d mycelium-ei.io -d www.mycelium-ei.io -d api.mycelium-ei.io -d grafana.mycelium-ei.io -d staging.mycelium-ei.io --non-interactive --agree-tos --email admin@mycelium-ei.io
    
    echo "✅ SSL certificates configured"
EOF

echo -e "\n${GREEN}✨ Deployment Complete!${NC}"
echo -e "${GREEN}=======================\n${NC}"
echo -e "Your platform is now live at:"
echo -e "  🌐 Main: ${BLUE}https://mycelium-ei.io${NC}"
echo -e "  📡 API: ${BLUE}https://api.mycelium-ei.io${NC}"
echo -e "  📊 Grafana: ${BLUE}https://grafana.mycelium-ei.io${NC}"
echo -e "\nDefault credentials:"
echo -e "  Grafana: admin/admin (change on first login)"