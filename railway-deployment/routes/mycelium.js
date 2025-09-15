const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const MyceliumInterpreter = require('../mycelium-interpreter/interpreter');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_ANON_KEY || 'placeholder'
);

// Legacy compiler for backward compatibility
class MyceliumCompiler {
    constructor() {
        this.keywords = [
            'network', 'node', 'quantum', 'fn', 'let', 'viz', 'simulate',
            'qc', 'allocate', 'hadamard', 'cnot', 'measure', 'for', 'in'
        ];
    }

    tokenize(code) {
        const tokens = [];
        const lines = code.split('\n');
        
        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            const line = lines[lineNum].trim();
            if (line === '' || line.startsWith('//')) continue;

            const words = line.match(/\w+|[{}();,\[\]\.]/g) || [];
            
            for (const word of words) {
                tokens.push({
                    value: word,
                    type: this.getTokenType(word),
                    line: lineNum + 1
                });
            }
        }
        
        return tokens;
    }

    getTokenType(token) {
        if (this.keywords.includes(token)) return 'keyword';
        if (/^\d+$/.test(token)) return 'number';
        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(token)) return 'identifier';
        if (['(', ')', '{', '}', '[', ']'].includes(token)) return 'bracket';
        if ([';', ',', '.'].includes(token)) return 'punctuation';
        return 'unknown';
    }

    parse(code) {
        const tokens = this.tokenize(code);
        const ast = {
            type: 'program',
            networks: [],
            errors: []
        };

        let currentNetwork = null;
        let currentFunction = null;
        
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            
            switch (token.value) {
                case 'network':
                    const networkName = tokens[i + 1];
                    if (networkName) {
                        currentNetwork = {
                            type: 'network',
                            name: networkName.value,
                            nodes: [],
                            functions: [],
                            simulations: []
                        };
                        ast.networks.push(currentNetwork);
                        i++; // Skip network name token
                    }
                    break;

                case 'node':
                    if (currentNetwork && tokens[i + 1] && tokens[i + 2]) {
                        const nodeName = tokens[i + 1].value;
                        currentNetwork.nodes.push({
                            type: 'node',
                            name: nodeName,
                            line: token.line
                        });
                        i += 2; // Skip assignment
                    }
                    break;

                case 'quantum':
                    if (tokens[i + 1]?.value === 'fn') {
                        const funcName = tokens[i + 2]?.value;
                        if (funcName && currentNetwork) {
                            currentFunction = {
                                type: 'quantum_function',
                                name: funcName,
                                operations: [],
                                line: token.line
                            };
                            currentNetwork.functions.push(currentFunction);
                            i += 2;
                        }
                    }
                    break;

                case 'simulate':
                    if (currentNetwork && tokens[i + 1]) {
                        currentNetwork.simulations.push({
                            type: 'simulation',
                            target: tokens[i + 1].value,
                            line: token.line
                        });
                        i++;
                    }
                    break;
            }
        }

        return ast;
    }

    compile(code) {
        const ast = this.parse(code);
        const result = {
            ast,
            executable: this.generateExecutable(ast),
            analysis: this.analyzeCode(ast)
        };

        return result;
    }

    generateExecutable(ast) {
        const executable = {
            networks: [],
            quantumOperations: [],
            visualizations: []
        };

        for (const network of ast.networks) {
            const execNetwork = {
                name: network.name,
                nodes: network.nodes.length,
                hasQuantumFunctions: network.functions.length > 0,
                operations: []
            };

            // Convert quantum functions to operations
            for (const func of network.functions) {
                execNetwork.operations.push({
                    type: 'quantum_function',
                    name: func.name,
                    gates: this.extractQuantumGates(func)
                });
            }

            executable.networks.push(execNetwork);
        }

        return executable;
    }

    extractQuantumGates(quantumFunction) {
        // Simplified gate extraction
        const gates = [];
        
        // This would normally parse the function body for quantum operations
        // For now, return some example gates
        if (quantumFunction.name.includes('hadamard') || quantumFunction.name.includes('superposition')) {
            gates.push({ type: 'H', qubit: 0 });
        }
        if (quantumFunction.name.includes('entangle') || quantumFunction.name.includes('cnot')) {
            gates.push({ type: 'CNOT', control: 0, target: 1 });
        }

        return gates;
    }

    analyzeCode(ast) {
        const analysis = {
            networks: ast.networks.length,
            totalNodes: ast.networks.reduce((sum, n) => sum + n.nodes.length, 0),
            quantumFunctions: ast.networks.reduce((sum, n) => sum + n.functions.length, 0),
            simulations: ast.networks.reduce((sum, n) => sum + n.simulations.length, 0),
            complexity: 'basic'
        };

        // Determine complexity
        if (analysis.quantumFunctions > 2 || analysis.networks > 1) {
            analysis.complexity = 'intermediate';
        }
        if (analysis.quantumFunctions > 5 || analysis.totalNodes > 10) {
            analysis.complexity = 'advanced';
        }

        return analysis;
    }
}

/**
 * @swagger
 * /api/mycelium/compile:
 *   post:
 *     summary: Compile Mycelium-EI code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 description: Mycelium-EI source code
 *     responses:
 *       200:
 *         description: Compilation results
 */
router.post('/compile', [
    body('code').isString().isLength({ min: 1, max: 10000 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { code } = req.body;
        const compiler = new MyceliumCompiler();
        
        const startTime = Date.now();
        const result = compiler.compile(code);
        const compilationTime = Date.now() - startTime;

        res.json({
            success: true,
            result: {
                ...result,
                metadata: {
                    compilationTime,
                    timestamp: new Date().toISOString(),
                    language: 'Mycelium-EI',
                    version: '1.0.0'
                }
            }
        });

    } catch (error) {
        console.error('Compilation error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Compilation failed',
            details: error.message 
        });
    }
});

/**
 * @swagger
 * /api/mycelium/examples:
 *   get:
 *     summary: Get Mycelium-EI code examples
 *     responses:
 *       200:
 *         description: List of code examples
 */
router.get('/examples', (req, res) => {
    const examples = [
        {
            id: 'basic_network',
            title: 'Basic Mycelial Network',
            description: 'Simple network with quantum-enhanced growth',
            difficulty: 'beginner',
            code: `// Basic mycelial network simulation
network SimpleGrowth {
    // Create initial spore node
    node origin = net.create("spore", [0.0, 0.0, 0.0]);
    
    // Quantum function for growth prediction
    quantum fn predict_growth(current: Node) -> [Connection] {
        let qubits = qc.allocate(2);
        qc.hadamard(qubits[0]);
        qc.cnot(qubits[0], qubits[1]);
        
        let results = qc.measure_all(qubits);
        return generate_connections(current, results);
    }
    
    // Execute simulation
    let growth_paths = predict_growth(origin);
    origin.connect_many(growth_paths);
    
    // Visualize network
    viz.render_3d(SimpleGrowth);
}

// Run simulation
simulate SimpleGrowth for 10.steps;`
        },
        {
            id: 'bell_state_network',
            title: 'Entangled Network Nodes',
            description: 'Demonstrates quantum entanglement in biological networks',
            difficulty: 'intermediate',
            code: `// Quantum entangled mycelial network
network EntangledGrowth {
    node node_a = net.create("primary", [0.0, 0.0, 0.0]);
    node node_b = net.create("secondary", [10.0, 0.0, 0.0]);
    
    // Create Bell state between nodes
    quantum fn entangle_nodes(n1: Node, n2: Node) -> QuantumState {
        let qubits = qc.allocate(2);
        
        // Create Bell state |00⟩ + |11⟩
        qc.hadamard(qubits[0]);
        qc.cnot(qubits[0], qubits[1]);
        
        // Measure and create entangled connection
        let state = qc.get_state(qubits);
        return state;
    }
    
    // Entangle the nodes
    let entangled_state = entangle_nodes(node_a, node_b);
    
    // Visualize entanglement
    viz.render_entanglement(node_a, node_b, entangled_state);
}

simulate EntangledGrowth for realtime;`
        },
        {
            id: 'optimization_network',
            title: 'Resource Optimization',
            description: 'Uses quantum algorithms for optimal resource distribution',
            difficulty: 'advanced',
            code: `// Quantum-optimized resource distribution
network OptimalDistribution {
    // Create network nodes
    node hub = net.create("hub", [0.0, 0.0, 0.0]);
    nodes branches = net.create_grid(3, 3, spacing: 5.0);
    
    // QAOA for resource optimization
    quantum fn optimize_distribution(source: Node, targets: [Node]) -> OptimalPaths {
        let n_qubits = targets.length;
        let qubits = qc.allocate(n_qubits);
        
        // Initialize superposition
        for i in 0..n_qubits {
            qc.hadamard(qubits[i]);
        }
        
        // Apply QAOA layers
        for layer in 0..3 {
            // Problem Hamiltonian
            apply_cost_function(qubits, targets);
            
            // Mixer Hamiltonian  
            for i in 0..n_qubits {
                qc.rx(qubits[i], PI/4);
            }
        }
        
        let measurements = qc.measure_all(qubits);
        return decode_optimal_paths(measurements, source, targets);
    }
    
    // Find optimal distribution
    let optimal = optimize_distribution(hub, branches);
    
    // Apply optimal connections
    hub.connect_optimal(optimal);
    
    // Visualize with efficiency metrics
    viz.render_with_metrics(OptimalDistribution, optimal);
}

simulate OptimalDistribution for analysis;`
        }
    ];

    res.json({
        success: true,
        examples,
        count: examples.length,
        categories: ['beginner', 'intermediate', 'advanced']
    });
});

/**
 * @swagger
 * /api/mycelium/syntax-highlight:
 *   post:
 *     summary: Get syntax highlighted code
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Syntax highlighted HTML
 */
router.post('/syntax-highlight', async (req, res) => {
    try {
        const { code } = req.body;
        const compiler = new MyceliumCompiler();
        const tokens = compiler.tokenize(code);
        
        let highlightedHTML = '';
        const lines = code.split('\n');
        
        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            const line = lines[lineNum];
            let highlightedLine = line;
            
            // Apply syntax highlighting
            highlightedLine = highlightedLine
                .replace(/\b(network|node|quantum|fn|let|viz|simulate)\b/g, '<span class="keyword">$1</span>')
                .replace(/\b(\d+)\b/g, '<span class="number">$1</span>')
                .replace(/"([^"]*)"/g, '<span class="string">"$1"</span>')
                .replace(/\/\/(.*)$/g, '<span class="comment">//$1</span>');
            
            highlightedHTML += `<div class="line" data-line="${lineNum + 1}">${highlightedLine}</div>`;
        }

        res.json({
            success: true,
            highlighted: highlightedHTML,
            tokens: tokens.length
        });

    } catch (error) {
        console.error('Syntax highlighting error:', error);
        res.status(500).json({ error: 'Syntax highlighting failed' });
    }
});

module.exports = router;