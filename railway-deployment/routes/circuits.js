const express = require('express');
const { body, validationResult } = require('express-validator');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken } = require('./auth');
const router = express.Router();

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

/**
 * @swagger
 * /api/circuits:
 *   post:
 *     summary: Save a quantum circuit
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               gates:
 *                 type: array
 *               qubits:
 *                 type: integer
 *               public:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Circuit saved successfully
 */
router.post('/', authenticateToken, [
    body('name').isLength({ min: 1, max: 100 }),
    body('gates').isArray(),
    body('qubits').isInt({ min: 1, max: 10 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { name, description, gates, qubits, public: isPublic } = req.body;
        
        const circuitData = {
            name,
            description,
            gates,
            qubits,
            public: isPublic || false,
            user_id: req.user.userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Save to Supabase if user is authenticated, otherwise store in memory/redis
        if (!req.user.anonymous) {
            const { data, error } = await supabase
                .from('circuits')
                .insert(circuitData)
                .select()
                .single();

            if (error) {
                console.error('Circuit save error:', error);
                return res.status(500).json({ error: 'Failed to save circuit' });
            }

            res.status(201).json({
                success: true,
                circuit: data,
                message: 'Circuit saved successfully'
            });
        } else {
            // For anonymous users, return circuit with temporary ID
            res.status(201).json({
                success: true,
                circuit: {
                    id: 'temp_' + Date.now(),
                    ...circuitData,
                    temporary: true
                },
                message: 'Circuit created (not saved - login to save permanently)'
            });
        }

    } catch (error) {
        console.error('Circuit creation error:', error);
        res.status(500).json({ error: 'Failed to create circuit' });
    }
});

/**
 * @swagger
 * /api/circuits:
 *   get:
 *     summary: Get user's circuits
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: public
 *         schema:
 *           type: boolean
 *         description: Get public circuits only
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of circuits
 */
router.get('/', async (req, res) => {
    try {
        const { public: publicOnly, limit = 20 } = req.query;
        const token = req.headers['authorization']?.split(' ')[1];
        
        let query = supabase
            .from('circuits')
            .select('*')
            .limit(parseInt(limit));

        if (publicOnly === 'true') {
            query = query.eq('public', true);
        } else if (token) {
            // Try to authenticate and get user's circuits
            try {
                const jwt = require('jsonwebtoken');
                const user = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
                query = query.eq('user_id', user.userId);
            } catch (err) {
                // If token invalid, just get public circuits
                query = query.eq('public', true);
            }
        } else {
            query = query.eq('public', true);
        }

        const { data: circuits, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error('Circuits fetch error:', error);
            return res.status(500).json({ error: 'Failed to fetch circuits' });
        }

        res.json({
            success: true,
            circuits: circuits || [],
            count: circuits?.length || 0
        });

    } catch (error) {
        console.error('Circuits retrieval error:', error);
        res.status(500).json({ error: 'Failed to retrieve circuits' });
    }
});

/**
 * @swagger
 * /api/circuits/{id}:
 *   get:
 *     summary: Get a specific circuit
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Circuit details
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data: circuit, error } = await supabase
            .from('circuits')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !circuit) {
            return res.status(404).json({ error: 'Circuit not found' });
        }

        // Check if circuit is public or user owns it
        const token = req.headers['authorization']?.split(' ')[1];
        let canAccess = circuit.public;

        if (token && !canAccess) {
            try {
                const jwt = require('jsonwebtoken');
                const user = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
                canAccess = circuit.user_id === user.userId;
            } catch (err) {
                // Token invalid, can only access public
            }
        }

        if (!canAccess) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json({
            success: true,
            circuit
        });

    } catch (error) {
        console.error('Circuit fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch circuit' });
    }
});

/**
 * @swagger
 * /api/circuits/examples:
 *   get:
 *     summary: Get example circuits
 *     responses:
 *       200:
 *         description: List of example circuits
 */
router.get('/examples', async (req, res) => {
    const examples = [
        {
            id: 'bell_state',
            name: 'Bell State',
            description: 'Creates an entangled Bell state using Hadamard and CNOT gates',
            qubits: 2,
            gates: [
                { type: 'H', qubit: 0, position: 0 },
                { type: 'CNOT', control: 0, target: 1, position: 1 }
            ],
            category: 'entanglement'
        },
        {
            id: 'superposition',
            name: 'Equal Superposition',
            description: 'Creates equal superposition of all basis states',
            qubits: 3,
            gates: [
                { type: 'H', qubit: 0, position: 0 },
                { type: 'H', qubit: 1, position: 0 },
                { type: 'H', qubit: 2, position: 0 }
            ],
            category: 'superposition'
        },
        {
            id: 'ghz_state',
            name: 'GHZ State',
            description: 'Three-qubit entangled state',
            qubits: 3,
            gates: [
                { type: 'H', qubit: 0, position: 0 },
                { type: 'CNOT', control: 0, target: 1, position: 1 },
                { type: 'CNOT', control: 1, target: 2, position: 2 }
            ],
            category: 'entanglement'
        },
        {
            id: 'quantum_teleportation',
            name: 'Quantum Teleportation',
            description: 'Demonstrates quantum teleportation protocol',
            qubits: 3,
            gates: [
                { type: 'H', qubit: 1, position: 0 },
                { type: 'CNOT', control: 1, target: 2, position: 1 },
                { type: 'CNOT', control: 0, target: 1, position: 2 },
                { type: 'H', qubit: 0, position: 3 }
            ],
            category: 'protocols'
        }
    ];

    res.json({
        success: true,
        circuits: examples,
        count: examples.length
    });
});

module.exports = router;