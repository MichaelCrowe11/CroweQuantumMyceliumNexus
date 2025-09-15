const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { QuantumCircuitExecutor, QuantumGates } = require('../quantum-backend/quantum-engine');
const QuantumAlgorithms = require('../quantum-backend/quantum-algorithms');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_ANON_KEY || 'placeholder'
);

// Legacy simulator for backward compatibility
class QuantumSimulator {
    constructor(qubits) {
        this.qubits = qubits;
        this.state = new Array(Math.pow(2, qubits)).fill(0);
        this.state[0] = 1; // |00...0⟩ initial state
        this.gates = [];
    }

    // Apply Hadamard gate
    hadamard(qubit) {
        this.gates.push({ type: 'H', qubit });
        const newState = new Array(this.state.length).fill(0);
        
        for (let i = 0; i < this.state.length; i++) {
            if (this.state[i] !== 0) {
                const bit = (i >> qubit) & 1;
                const i0 = i & ~(1 << qubit); // Clear qubit bit
                const i1 = i | (1 << qubit);  // Set qubit bit
                
                if (bit === 0) {
                    newState[i0] += this.state[i] / Math.sqrt(2);
                    newState[i1] += this.state[i] / Math.sqrt(2);
                } else {
                    newState[i0] += this.state[i] / Math.sqrt(2);
                    newState[i1] -= this.state[i] / Math.sqrt(2);
                }
            }
        }
        this.state = newState;
    }

    // Apply Pauli-X gate
    pauliX(qubit) {
        this.gates.push({ type: 'X', qubit });
        const newState = new Array(this.state.length).fill(0);
        
        for (let i = 0; i < this.state.length; i++) {
            if (this.state[i] !== 0) {
                const flipped = i ^ (1 << qubit);
                newState[flipped] = this.state[i];
            }
        }
        this.state = newState;
    }

    // Apply CNOT gate
    cnot(control, target) {
        this.gates.push({ type: 'CNOT', control, target });
        const newState = new Array(this.state.length).fill(0);
        
        for (let i = 0; i < this.state.length; i++) {
            if (this.state[i] !== 0) {
                const controlBit = (i >> control) & 1;
                if (controlBit === 1) {
                    const flipped = i ^ (1 << target);
                    newState[flipped] = this.state[i];
                } else {
                    newState[i] = this.state[i];
                }
            }
        }
        this.state = newState;
    }

    // Measure all qubits
    measure(shots = 1000) {
        const probabilities = this.state.map(amp => Math.pow(Math.abs(amp), 2));
        const results = {};
        
        for (let shot = 0; shot < shots; shot++) {
            const random = Math.random();
            let cumulative = 0;
            
            for (let i = 0; i < probabilities.length; i++) {
                cumulative += probabilities[i];
                if (random <= cumulative) {
                    const bitstring = i.toString(2).padStart(this.qubits, '0');
                    results[bitstring] = (results[bitstring] || 0) + 1;
                    break;
                }
            }
        }
        
        return results;
    }

    getStateProbabilities() {
        return this.state.map((amp, i) => ({
            state: i.toString(2).padStart(this.qubits, '0'),
            amplitude: amp,
            probability: Math.pow(Math.abs(amp), 2)
        })).filter(s => s.probability > 1e-10);
    }
}

/**
 * @swagger
 * /api/quantum/simulate:
 *   post:
 *     summary: Simulate a quantum circuit
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               qubits:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *               gates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [H, X, Y, Z, CNOT]
 *                     qubit:
 *                       type: integer
 *                     control:
 *                       type: integer
 *                     target:
 *                       type: integer
 *               shots:
 *                 type: integer
 *                 default: 1000
 *     responses:
 *       200:
 *         description: Simulation results
 */
router.post('/simulate', [
    body('qubits').isInt({ min: 1, max: 20 }),
    body('gates').isArray(),
    body('shots').optional().isInt({ min: 1, max: 10000 }),
    body('backend').optional().isIn(['local', 'ibm', 'aws', 'azure'])
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { qubits, gates, shots = 1024, backend = 'local' } = req.body;
        
        // Use real quantum engine
        const circuit = new QuantumCircuitExecutor(qubits);

        // Apply gates to circuit
        for (const gate of gates) {
            try {
                circuit.addGate(gate);
            } catch (error) {
                return res.status(400).json({ 
                    error: `Invalid gate: ${gate.type}`,
                    details: error.message 
                });
            }
        }

        // Execute circuit
        const results = circuit.execute(shots);
        
        // Save simulation to database if user is authenticated
        const token = req.headers['authorization']?.split(' ')[1];
        if (token) {
            try {
                const jwt = require('jsonwebtoken');
                const user = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
                
                await supabase.from('simulations').insert({
                    user_id: user.userId,
                    circuit_config: { qubits, gates, shots },
                    results: results.counts,
                    backend,
                    created_at: new Date().toISOString()
                });
            } catch (err) {
                // Continue without saving
            }
        }

        // Analyze results
        const analysis = {
            entangled: results.entropy > 0.5,
            superposition: Object.keys(results.counts).length > 1,
            dominantStates: Object.entries(results.counts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([state, count]) => ({
                    state,
                    probability: count / shots
                })),
            entropy: results.entropy,
            circuitDepth: results.circuit_depth
        };

        res.json({
            success: true,
            backend,
            results: {
                measurements: results.counts,
                stateProbabilities: results.probabilities,
                analysis,
                circuitInfo: {
                    qubits,
                    gates: gates.length,
                    depth: results.circuit_depth,
                    shots
                },
                qasm: circuit.toQASM()
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Simulation error:', error);
        res.status(500).json({ error: 'Simulation failed' });
    }
});

/**
 * @swagger
 * /api/quantum/bell-state:
 *   post:
 *     summary: Create and simulate a Bell state
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [phi_plus, phi_minus, psi_plus, psi_minus]
 *                 default: phi_plus
 *               shots:
 *                 type: integer
 *                 default: 1000
 *     responses:
 *       200:
 *         description: Bell state simulation results
 */
router.post('/bell-state', async (req, res) => {
    try {
        const { type = 'phi_plus', shots = 1000 } = req.body;
        const simulator = new QuantumSimulator(2);

        // Create Bell state based on type
        simulator.hadamard(0);
        simulator.cnot(0, 1);

        switch (type) {
            case 'phi_minus':
                simulator.pauliX(1);
                break;
            case 'psi_plus':
                simulator.pauliX(0);
                break;
            case 'psi_minus':
                simulator.pauliX(0);
                simulator.pauliX(1);
                break;
        }

        const measurements = simulator.measure(shots);
        const stateProbabilities = simulator.getStateProbabilities();

        res.json({
            success: true,
            bellState: type,
            results: {
                measurements,
                stateProbabilities,
                entanglement: calculateEntanglement(stateProbabilities),
                fidelity: calculateBellStateFidelity(stateProbabilities, type)
            }
        });

    } catch (error) {
        console.error('Bell state error:', error);
        res.status(500).json({ error: 'Bell state creation failed' });
    }
});

// Helper functions
function analyzeQuantumState(stateProbabilities, gates) {
    const analysis = {
        entangled: false,
        superposition: false,
        dominant_states: [],
        gate_effects: []
    };

    // Check for superposition
    const significantStates = stateProbabilities.filter(s => s.probability > 0.01);
    analysis.superposition = significantStates.length > 1;

    // Check for entanglement (simplified)
    analysis.entangled = gates.some(g => g.type === 'CNOT') && analysis.superposition;

    // Find dominant states
    analysis.dominant_states = stateProbabilities
        .filter(s => s.probability > 0.1)
        .sort((a, b) => b.probability - a.probability)
        .slice(0, 3);

    return analysis;
}

function calculateCircuitDepth(gates) {
    const qubitLastUsed = {};
    let maxDepth = 0;

    for (const gate of gates) {
        const qubits = gate.type === 'CNOT' ? [gate.control, gate.target] : [gate.qubit];
        const currentDepth = Math.max(...qubits.map(q => qubitLastUsed[q] || 0)) + 1;
        
        qubits.forEach(q => qubitLastUsed[q] = currentDepth);
        maxDepth = Math.max(maxDepth, currentDepth);
    }

    return maxDepth;
}

function calculateEntanglement(stateProbabilities) {
    // Simplified entanglement measure
    const maxProbability = Math.max(...stateProbabilities.map(s => s.probability));
    return maxProbability < 0.9 ? 0.8 : 0.1;
}

function calculateBellStateFidelity(stateProbabilities, bellType) {
    // Expected states for each Bell state
    const expectedStates = {
        phi_plus: ['00', '11'],
        phi_minus: ['00', '11'],
        psi_plus: ['01', '10'],
        psi_minus: ['01', '10']
    };

    const expected = expectedStates[bellType];
    const totalExpectedProbability = stateProbabilities
        .filter(s => expected.includes(s.state))
        .reduce((sum, s) => sum + s.probability, 0);

    return totalExpectedProbability;
}

module.exports = router;