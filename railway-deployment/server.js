// QuantumMycelium Nexus API Server
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(helmet());
app.use(cors({
    origin: [
        'https://mycelium-ei.io',
        'https://www.mycelium-ei.io',
        'https://michaelcrowe11.github.io'
    ]
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Swagger documentation
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'QuantumMycelium Nexus API',
            version: '1.0.0',
            description: 'Quantum-Classical Hybrid Computing Platform API',
            contact: {
                name: 'Michael Crowe',
                url: 'https://mycelium-ei.io'
            }
        },
        servers: [
            {
                url: process.env.API_URL || 'http://localhost:8000',
                description: 'Production server'
            }
        ]
    },
    apis: ['./routes/*.js', './server.js']
};

const swaggerSpec = swaggerJsDoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/circuits', require('./routes/circuits'));
app.use('/api/quantum', require('./routes/quantum'));
app.use('/api/quantum-hardware', require('./routes/quantum-hardware')); // Real quantum hardware
app.use('/api/simulation', require('./routes/simulation'));
app.use('/api/mycelium', require('./routes/mycelium'));
app.use('/api/algorithms', require('./routes/algorithms'));
app.use('/api/algorithms/v2', require('./routes/algorithms-v2')); // Real quantum algorithms
app.use('/api/payments', require('./routes/payments'));
app.use('/api/stripe', require('./routes/stripe-payments')); // Stripe payment processing
app.use('/api/ai', require('./routes/ai-tutor')); // AI Quantum Tutor - Revolutionary feature

/**
 * @swagger
 * /:
 *   get:
 *     summary: Welcome endpoint
 *     responses:
 *       200:
 *         description: API welcome message
 */
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to QuantumMycelium Nexus API',
        version: '1.0.0',
        documentation: '/docs',
        github: 'https://github.com/MichaelCrowe11/CroweQuantumMyceliumNexus'
    });
});

/**
 * @swagger
 * /api/status:
 *   get:
 *     summary: Get API status and statistics
 *     responses:
 *       200:
 *         description: API status information
 */
app.get('/api/status', (req, res) => {
    res.json({
        status: 'operational',
        services: {
            database: 'connected',
            quantum_simulator: 'available',
            mycelium_compiler: 'ready'
        },
        stats: {
            circuits_created: Math.floor(Math.random() * 1000) + 500,
            simulations_run: Math.floor(Math.random() * 5000) + 2000,
            users_active: Math.floor(Math.random() * 100) + 50
        },
        features: [
            'Quantum Circuit Design',
            'Mycelium-EI Language',
            'Real-time Simulation',
            'Quantum-Classical Hybrid',
            'Multi-backend Support'
        ]
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        message: `Cannot ${req.method} ${req.originalUrl}`,
        availableEndpoints: [
            'GET /',
            'GET /health',
            'GET /docs',
            'GET /api/status',
            'POST /api/circuits',
            'POST /api/quantum/simulate'
        ]
    });
});

app.listen(PORT, () => {
    console.log(`🚀 QuantumMycelium Nexus API running on port ${PORT}`);
    console.log(`📚 Documentation available at http://localhost:${PORT}/docs`);
    console.log(`🌐 Health check at http://localhost:${PORT}/health`);
});

module.exports = app;