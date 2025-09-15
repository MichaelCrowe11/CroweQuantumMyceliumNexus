const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const WebSocket = require('ws');
const http = require('http');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 8300;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// Real-time data store
let systemMetrics = {
  myceliumNetworks: 24,
  quantumCircuits: 156,
  environmentalSensors: 48,
  aiModels: 7,
  networkGrowth: 12,
  quantumEfficiency: 8,
  lastUpdated: new Date().toISOString()
};

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('New WebSocket connection established');

  // Send initial data
  ws.send(JSON.stringify({ type: 'metrics', data: systemMetrics }));

  // Send updates every 5 seconds
  const interval = setInterval(() => {
    // Simulate real-time data changes
    systemMetrics.myceliumNetworks += Math.floor(Math.random() * 3) - 1;
    systemMetrics.quantumCircuits += Math.floor(Math.random() * 5) - 2;
    systemMetrics.networkGrowth = Math.floor(Math.random() * 20) + 5;
    systemMetrics.quantumEfficiency = Math.floor(Math.random() * 15) + 5;
    systemMetrics.lastUpdated = new Date().toISOString();

    ws.send(JSON.stringify({ type: 'metrics', data: systemMetrics }));
  }, 5000);

  ws.on('close', () => {
    clearInterval(interval);
    console.log('WebSocket connection closed');
  });
});

// Google API Routes
const googleRoutes = require('./routes/googleRoutes');
app.use('/api/google', googleRoutes);

// API Routes

// Dashboard metrics
app.get('/api/metrics', (req, res) => {
  res.json(systemMetrics);
});

// Mycelium Networks
app.get('/api/networks', (req, res) => {
  res.json({
    networks: [
      {
        id: 1,
        name: 'Oyster Mushroom Colony A',
        status: 'Growing',
        health: 95,
        temperature: 23.5,
        humidity: 78,
        co2: 1200,
        strain: 'Pleurotus ostreatus',
        inoculationDate: '2024-01-15',
        estimatedHarvest: '2024-02-10'
      },
      {
        id: 2,
        name: 'Shiitake Network B',
        status: 'Fruiting',
        health: 88,
        temperature: 22.1,
        humidity: 82,
        co2: 1100,
        strain: 'Lentinula edodes',
        inoculationDate: '2024-01-10',
        estimatedHarvest: '2024-02-05'
      },
      {
        id: 3,
        name: "Lion's Mane Cluster C",
        status: 'Colonizing',
        health: 92,
        temperature: 24.0,
        humidity: 75,
        co2: 1150,
        strain: 'Hericium erinaceus',
        inoculationDate: '2024-01-20',
        estimatedHarvest: '2024-02-15'
      },
      {
        id: 4,
        name: 'Reishi Growth Chamber D',
        status: 'Monitoring',
        health: 97,
        temperature: 25.2,
        humidity: 80,
        co2: 1250,
        strain: 'Ganoderma lucidum',
        inoculationDate: '2024-01-08',
        estimatedHarvest: '2024-03-01'
      }
    ],
    totalYield: '45.2 kg',
    averageGrowthRate: '12.3%',
    contaminationRate: '0.8%'
  });
});

// Quantum Computing
app.get('/api/quantum', (req, res) => {
  res.json({
    circuits: [
      { id: 1, name: 'Molecular Optimization', status: 'running', progress: 98, backend: 'IBM' },
      { id: 2, name: 'Pattern Recognition', status: 'completed', progress: 100, backend: 'Rigetti' },
      { id: 3, name: 'Growth Prediction', status: 'running', progress: 67, backend: 'Local Simulator' },
      { id: 4, name: 'Environmental Correlation', status: 'queued', progress: 0, backend: 'IBM' }
    ],
    backends: [
      { name: 'IBM Quantum', status: 'online', qubits: 127, queue: 3 },
      { name: 'Rigetti', status: 'online', qubits: 80, queue: 1 },
      { name: 'IonQ', status: 'maintenance', qubits: 32, queue: 0 }
    ],
    totalComputations: 1847,
    successRate: '94.3%'
  });
});

// Environmental Monitoring
app.get('/api/environmental', (req, res) => {
  res.json({
    sensors: {
      temperature: { value: 23.5, unit: '°C', status: 'optimal', trend: 'stable' },
      humidity: { value: 78, unit: '%', status: 'ideal', trend: 'rising' },
      co2: { value: 1200, unit: 'ppm', status: 'normal', trend: 'stable' },
      light: { value: 450, unit: 'lux', status: 'optimal', trend: 'stable' },
      ph: { value: 6.5, unit: '', status: 'optimal', trend: 'stable' },
      airflow: { value: 2.3, unit: 'm/s', status: 'good', trend: 'stable' }
    },
    zones: [
      { id: 1, name: 'Zone A', temperature: 23.2, humidity: 77, sensors: 12 },
      { id: 2, name: 'Zone B', temperature: 23.8, humidity: 79, sensors: 12 },
      { id: 3, name: 'Zone C', temperature: 23.5, humidity: 78, sensors: 12 },
      { id: 4, name: 'Zone D', temperature: 23.4, humidity: 78, sensors: 12 }
    ],
    alerts: []
  });
});

// AI Analytics
app.get('/api/analytics', (req, res) => {
  res.json({
    models: [
      {
        id: 1,
        name: 'Growth Rate Predictor',
        accuracy: 94,
        status: 'active',
        lastTrained: '2024-01-25',
        predictions: 1234,
        avgResponseTime: '127ms'
      },
      {
        id: 2,
        name: 'Contamination Detector',
        accuracy: 97,
        status: 'active',
        lastTrained: '2024-01-24',
        predictions: 892,
        avgResponseTime: '89ms'
      },
      {
        id: 3,
        name: 'Yield Optimizer',
        accuracy: 89,
        status: 'training',
        lastTrained: '2024-01-23',
        predictions: 567,
        avgResponseTime: '156ms'
      },
      {
        id: 4,
        name: 'Environmental Correlator',
        accuracy: 91,
        status: 'active',
        lastTrained: '2024-01-26',
        predictions: 2103,
        avgResponseTime: '203ms'
      }
    ],
    insights: [
      { type: 'success', message: 'Yield increased by 23% using optimized parameters' },
      { type: 'info', message: 'New pattern detected in growth cycles' },
      { type: 'warning', message: 'Slight contamination risk in Zone B' }
    ]
  });
});

// System status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'operational',
    services: {
      myceliumEI: { status: 'online', health: 100 },
      quantumBackend: { status: 'online', health: 98 },
      environmentalMonitoring: { status: 'online', health: 100 },
      aiPipeline: { status: 'processing', health: 95 }
    },
    uptime: '99.98%',
    lastIncident: null,
    version: '2.0.0'
  });
});

// Recent activity
app.get('/api/activity', (req, res) => {
  res.json({
    activities: [
      {
        id: 1,
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        type: 'mycelium',
        title: 'New mycelium strain detected',
        description: 'Pleurotus ostreatus variant showing 23% faster growth',
        severity: 'info'
      },
      {
        id: 2,
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        type: 'quantum',
        title: 'Quantum optimization completed',
        description: 'Molecular simulation achieved 94% accuracy',
        severity: 'success'
      },
      {
        id: 3,
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        type: 'environmental',
        title: 'Environmental threshold alert',
        description: 'Humidity levels optimal for growth phase',
        severity: 'info'
      },
      {
        id: 4,
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        type: 'ai',
        title: 'Model training completed',
        description: 'Contamination detector accuracy improved to 97%',
        severity: 'success'
      }
    ]
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'CroweQuantumMyceliumNexus API',
    version: '2.0.0',
    status: 'operational',
    endpoints: [
      '/api/metrics',
      '/api/networks',
      '/api/quantum',
      '/api/environmental',
      '/api/analytics',
      '/api/status',
      '/api/activity'
    ]
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready for connections`);
  console.log(`🚀 API endpoints available at http://localhost:${PORT}/api`);
});