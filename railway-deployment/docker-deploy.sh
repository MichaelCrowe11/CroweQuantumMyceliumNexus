#!/bin/bash

# QuantumMycelium Nexus - Docker Deployment Script

echo "🧬 QuantumMycelium Nexus - Docker Deployment"
echo "============================================"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.docker .env
    echo "⚠️  Please edit .env file with your actual credentials before proceeding."
    echo "   Required: SUPABASE_URL, SUPABASE_ANON_KEY, STRIPE_SECRET_KEY, etc."
    read -p "   Press Enter when ready to continue..."
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs ssl grafana/dashboards grafana/datasources

# Build and start services
echo "🚀 Building and starting services..."
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 30

# Check service health
echo "🔍 Checking service health..."

# Check API
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ API Server is healthy"
else
    echo "❌ API Server is not responding"
    docker-compose logs api
fi

# Check MCP Server
if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    echo "✅ MCP Server is healthy"
else
    echo "❌ MCP Server is not responding"
    docker-compose logs mcp-server
fi

# Check Redis
if docker-compose exec redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is healthy"
else
    echo "❌ Redis is not responding"
fi

# Check PostgreSQL
if docker-compose exec postgres pg_isready > /dev/null 2>&1; then
    echo "✅ PostgreSQL is healthy"
else
    echo "❌ PostgreSQL is not responding"
fi

echo ""
echo "🎉 Deployment Summary"
echo "===================="
echo "🌐 API Server:      http://localhost:3000"
echo "🧠 MCP Server:      http://localhost:8080"
echo "📊 Grafana:         http://localhost:3001 (admin/quantum123)"
echo "📈 Prometheus:      http://localhost:9090"
echo "🔄 Load Balancer:   http://localhost (nginx)"
echo ""
echo "📚 API Documentation: http://localhost:3000/docs"
echo "🔧 Health Check:      http://localhost:3000/health"
echo ""

# Show logs
read -p "Would you like to view the logs? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose logs -f
fi