const express = require('express');
const httpProxy = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.GATEWAY_PORT || 8000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Logging
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Service URLs
const services = {
  mycelium: process.env.MYCELIUM_SERVICE_URL || 'http://localhost:8100',
  quantum: process.env.QUANTUM_SERVICE_URL || 'http://localhost:9000',
  crowesense: process.env.CROWESENSE_SERVICE_URL || 'http://localhost:8200'
};

// Create proxy middleware for each service
const createProxyMiddleware = (target) => {
  return httpProxy.createProxyMiddleware({
    target,
    changeOrigin: true,
    onError: (err, req, res) => {
      console.error(`Proxy error: ${err.message}`);
      res.status(502).json({
        error: 'Service temporarily unavailable',
        service: target,
        timestamp: new Date().toISOString()
      });
    },
    onProxyReq: (proxyReq, req, res) => {
      // Add authentication headers if needed
      if (req.headers.authorization) {
        proxyReq.setHeader('Authorization', req.headers.authorization);
      }
      // Add tracking headers
      proxyReq.setHeader('X-Forwarded-By', 'CroweQuantumMyceliumNexus-Gateway');
      proxyReq.setHeader('X-Request-ID', req.id || generateRequestId());
    },
    onProxyRes: (proxyRes, req, res) => {
      // Add CORS headers
      proxyRes.headers['Access-Control-Allow-Origin'] = '*';
      proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    }
  });
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    gateway: 'operational',
    timestamp: new Date().toISOString(),
    services: Object.keys(services)
  });
});

// Service health checks
app.get('/api/health/services', async (req, res) => {
  const healthChecks = {};

  for (const [name, url] of Object.entries(services)) {
    try {
      const response = await fetch(`${url}/health`);
      healthChecks[name] = {
        status: response.ok ? 'healthy' : 'unhealthy',
        statusCode: response.status
      };
    } catch (error) {
      healthChecks[name] = {
        status: 'unreachable',
        error: error.message
      };
    }
  }

  res.json({
    timestamp: new Date().toISOString(),
    services: healthChecks
  });
});

// MyceliumEI routes
app.use('/api/mycelium/environmental', createProxyMiddleware(`${services.mycelium}/environmental`));
app.use('/api/mycelium/ai', createProxyMiddleware(`${services.mycelium}/ai`));
app.use('/api/mycelium/strain-advisor', createProxyMiddleware(`${services.mycelium}/strain-advisor`));
app.use('/api/mycelium/forum', createProxyMiddleware(`${services.mycelium}/forum`));
app.use('/api/mycelium/weather', createProxyMiddleware(`${services.mycelium}/weather`));
app.use('/api/mycelium/data-storytelling', createProxyMiddleware(`${services.mycelium}/data-storytelling`));

// QuantumNexus routes
app.use('/api/quantum/circuits', createProxyMiddleware(`${services.quantum}/api/circuits`));
app.use('/api/quantum/compute', createProxyMiddleware(`${services.quantum}/api/compute`));
app.use('/api/quantum/simulations', createProxyMiddleware(`${services.quantum}/api/simulations`));
app.use('/api/quantum/models', createProxyMiddleware(`${services.quantum}/api/models`));

// CroweSense routes
app.use('/api/crowesense/weather', createProxyMiddleware(`${services.crowesense}/api/weather`));
app.use('/api/crowesense/sensors', createProxyMiddleware(`${services.crowesense}/api/sensors`));
app.use('/api/crowesense/predictions', createProxyMiddleware(`${services.crowesense}/api/predictions`));
app.use('/api/crowesense/alerts', createProxyMiddleware(`${services.crowesense}/api/alerts`));

// Unified dashboard API
app.get('/api/dashboard/overview', async (req, res) => {
  try {
    const dashboardData = {
      mycelium: null,
      quantum: null,
      crowesense: null,
      timestamp: new Date().toISOString()
    };

    // Fetch data from each service in parallel
    const [myceliumData, quantumData, crowesenseData] = await Promise.allSettled([
      fetch(`${services.mycelium}/api/dashboard`).then(r => r.json()),
      fetch(`${services.quantum}/api/dashboard`).then(r => r.json()),
      fetch(`${services.crowesense}/api/dashboard`).then(r => r.json())
    ]);

    if (myceliumData.status === 'fulfilled') dashboardData.mycelium = myceliumData.value;
    if (quantumData.status === 'fulfilled') dashboardData.quantum = quantumData.value;
    if (crowesenseData.status === 'fulfilled') dashboardData.crowesense = crowesenseData.value;

    res.json(dashboardData);
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Catch-all for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Gateway error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Helper function to generate request ID
function generateRequestId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Start server
app.listen(PORT, () => {
  console.log(`
    🚀 CroweQuantumMyceliumNexus Gateway
    =====================================
    Port: ${PORT}
    Environment: ${process.env.NODE_ENV || 'development'}
    Services:
      - MyceliumEI: ${services.mycelium}
      - QuantumNexus: ${services.quantum}
      - CroweSense: ${services.crowesense}
    =====================================
  `);
});

module.exports = app;