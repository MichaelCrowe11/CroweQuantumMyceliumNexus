const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Advanced Quantum Algorithm Library
class QuantumAlgorithmLibrary {
    constructor() {
        this.algorithms = new Map();
        this.initializeAlgorithms();
    }

    initializeAlgorithms() {
        // Register available quantum algorithms
        this.algorithms.set('grover', new GroverSearch());
        this.algorithms.set('shor', new ShorFactoring());
        this.algorithms.set('qaoa', new QAOA());
        this.algorithms.set('vqe', new VQE());
        this.algorithms.set('quantum_walk', new QuantumWalk());
        this.algorithms.set('hhl', new HHL());
        this.algorithms.set('phase_estimation', new PhaseEstimation());
    }

    getAlgorithm(name) {
        return this.algorithms.get(name.toLowerCase());
    }

    listAlgorithms() {
        return Array.from(this.algorithms.keys()).map(key => {
            const algorithm = this.algorithms.get(key);
            return {
                name: key,
                displayName: algorithm.getDisplayName(),
                description: algorithm.getDescription(),
                category: algorithm.getCategory(),
                difficulty: algorithm.getDifficulty(),
                qubitsRequired: algorithm.getQubitRequirement(),
                examples: algorithm.getExamples()
            };
        });
    }
}

// Base class for quantum algorithms
class QuantumAlgorithm {
    constructor() {
        this.name = '';
        this.description = '';
        this.category = 'general';
        this.difficulty = 'intermediate';
        this.qubitRequirement = { min: 1, max: 10, optimal: 3 };
    }

    getDisplayName() { return this.name; }
    getDescription() { return this.description; }
    getCategory() { return this.category; }
    getDifficulty() { return this.difficulty; }
    getQubitRequirement() { return this.qubitRequirement; }
    
    getExamples() { return []; }
    execute(parameters) { throw new Error('Not implemented'); }
    getMyceliumCode() { throw new Error('Not implemented'); }
}

// Grover's Algorithm Implementation
class GroverSearch extends QuantumAlgorithm {
    constructor() {
        super();
        this.name = "Grover's Search Algorithm";
        this.description = "Quantum search algorithm for unsorted databases with quadratic speedup";
        this.category = 'search';
        this.difficulty = 'intermediate';
        this.qubitRequirement = { min: 2, max: 10, optimal: 4 };
    }

    getExamples() {
        return [
            {
                title: "2-qubit Search",
                description: "Search for |11⟩ in 2-qubit space",
                myceliumCode: `network GroverSearch2 {
    quantum fn oracle_11(qubits: [Qubit]) -> Void {
        qc.cz(qubits[0], qubits[1]);
    }
    
    quantum fn diffusion(qubits: [Qubit]) -> Void {
        for qubit in qubits {
            qc.hadamard(qubit);
            qc.x(qubit);
        }
        qc.cz(qubits[0], qubits[1]);
        for qubit in qubits {
            qc.x(qubit);
            qc.hadamard(qubit);
        }
    }
    
    quantum fn grover_search() -> [Float] {
        let qubits = qc.allocate(2);
        
        // Initialize superposition
        for qubit in qubits {
            qc.hadamard(qubit);
        }
        
        // Grover iteration (optimal = 1 for 2 qubits)
        oracle_11(qubits);
        diffusion(qubits);
        
        return qc.measure_all(qubits);
    }
    
    let results = grover_search();
    viz.show_probability_distribution(results);
}`,
                parameters: { target_state: "11", iterations: 1 }
            },
            {
                title: "Database Search",
                description: "Search in larger database with multiple iterations",
                myceliumCode: `network DatabaseSearch {
    quantum fn search_database(target: String, size: Int) -> String {
        let n_qubits = log2(size);
        let qubits = qc.allocate(n_qubits);
        let iterations = floor(PI * sqrt(size) / 4);
        
        // Initialize superposition
        for qubit in qubits {
            qc.hadamard(qubit);
        }
        
        // Grover iterations
        for i in 0..iterations {
            oracle_function(qubits, target);
            diffusion_operator(qubits);
        }
        
        let measurement = qc.measure_all(qubits);
        return binary_to_string(measurement);
    }
}`,
                parameters: { database_size: 16, target: "item_7" }
            }
        ];
    }

    execute(parameters) {
        const { qubits = 2, target_state = "11", iterations = null } = parameters;
        
        // Calculate optimal iterations
        const optimal_iterations = iterations || Math.floor(Math.PI * Math.sqrt(Math.pow(2, qubits)) / 4);
        
        // Simulate Grover's algorithm
        const results = {
            algorithm: "grover",
            qubits,
            target_state,
            iterations: optimal_iterations,
            success_probability: this.calculateSuccessProbability(qubits, optimal_iterations),
            quantum_advantage: Math.sqrt(Math.pow(2, qubits)) / Math.pow(2, qubits),
            steps: [
                {
                    step: 1,
                    operation: "superposition",
                    state_description: "Equal superposition of all states"
                },
                {
                    step: 2,
                    operation: "grover_iterations",
                    iterations: optimal_iterations,
                    state_description: "Amplitude amplification of target state"
                },
                {
                    step: 3,
                    operation: "measurement",
                    state_description: "Measure to find target with high probability"
                }
            ]
        };

        return results;
    }

    calculateSuccessProbability(qubits, iterations) {
        const N = Math.pow(2, qubits);
        const theta = Math.asin(1 / Math.sqrt(N));
        return Math.pow(Math.sin((2 * iterations + 1) * theta), 2);
    }
}

// Shor's Algorithm Implementation
class ShorFactoring extends QuantumAlgorithm {
    constructor() {
        super();
        this.name = "Shor's Factoring Algorithm";
        this.description = "Quantum algorithm for integer factorization with exponential speedup";
        this.category = 'cryptography';
        this.difficulty = 'advanced';
        this.qubitRequirement = { min: 4, max: 20, optimal: 8 };
    }

    getExamples() {
        return [
            {
                title: "Factor 15",
                description: "Factor N=15 using quantum period finding",
                myceliumCode: `network ShorFactoring {
    quantum fn quantum_period_finding(a: Int, N: Int) -> Int {
        let n = ceil(log2(N));
        let counting_qubits = qc.allocate(2 * n);
        let work_qubits = qc.allocate(n);
        
        // Initialize counting register
        for qubit in counting_qubits {
            qc.hadamard(qubit);
        }
        
        // Controlled modular exponentiation
        controlled_mod_exp(counting_qubits, work_qubits, a, N);
        
        // Quantum Fourier Transform
        qft_inverse(counting_qubits);
        
        let measurement = qc.measure_all(counting_qubits);
        return extract_period(measurement, a, N);
    }
    
    fn classical_post_processing(period: Int, a: Int, N: Int) -> [Int] {
        if period % 2 == 0 {
            let factor1 = gcd(power_mod(a, period/2) - 1, N);
            let factor2 = gcd(power_mod(a, period/2) + 1, N);
            return [factor1, factor2];
        }
        return [];
    }
    
    let N = 15;
    let a = 7; // Random base coprime to N
    let period = quantum_period_finding(a, N);
    let factors = classical_post_processing(period, a, N);
    
    viz.show_factorization(N, factors);
}`,
                parameters: { N: 15, base: 7 }
            }
        ];
    }

    execute(parameters) {
        const { N = 15, base = 7 } = parameters;
        
        // Simplified simulation of Shor's algorithm
        const results = {
            algorithm: "shor",
            input_number: N,
            base: base,
            quantum_phase: "Period finding via quantum phase estimation",
            classical_processing: "GCD computation to extract factors",
            factors: this.simulateFactorization(N),
            quantum_advantage: "Exponential speedup over classical factoring",
            steps: [
                {
                    step: 1,
                    operation: "superposition",
                    description: "Prepare counting register in superposition"
                },
                {
                    step: 2,
                    operation: "controlled_modular_exponentiation",
                    description: `Apply controlled U|x⟩ = |ax mod ${N}⟩`
                },
                {
                    step: 3,
                    operation: "quantum_fourier_transform",
                    description: "Extract period information"
                },
                {
                    step: 4,
                    operation: "classical_post_processing",
                    description: "Use period to find factors via GCD"
                }
            ]
        };

        return results;
    }

    simulateFactorization(N) {
        // Simple factorization for demonstration
        for (let i = 2; i <= Math.sqrt(N); i++) {
            if (N % i === 0) {
                return [i, N / i];
            }
        }
        return [1, N];
    }
}

// Quantum Approximate Optimization Algorithm (QAOA)
class QAOA extends QuantumAlgorithm {
    constructor() {
        super();
        this.name = "Quantum Approximate Optimization Algorithm";
        this.description = "Variational quantum algorithm for combinatorial optimization problems";
        this.category = 'optimization';
        this.difficulty = 'advanced';
        this.qubitRequirement = { min: 2, max: 16, optimal: 6 };
    }

    getExamples() {
        return [
            {
                title: "Max-Cut Problem",
                description: "Find maximum cut in a graph using QAOA",
                myceliumCode: `network MaxCutQAOA {
    quantum fn problem_hamiltonian(qubits: [Qubit], edges: [[Int, Int]], gamma: Float) -> Void {
        for edge in edges {
            let [i, j] = edge;
            qc.rzz(gamma, qubits[i], qubits[j]);
        }
    }
    
    quantum fn mixer_hamiltonian(qubits: [Qubit], beta: Float) -> Void {
        for qubit in qubits {
            qc.rx(2 * beta, qubit);
        }
    }
    
    quantum fn qaoa_circuit(qubits: [Qubit], params: [[Float]], edges: [[Int, Int]]) -> [Float] {
        // Initialize superposition
        for qubit in qubits {
            qc.hadamard(qubit);
        }
        
        // QAOA layers
        for layer in params {
            let [gamma, beta] = layer;
            problem_hamiltonian(qubits, edges, gamma);
            mixer_hamiltonian(qubits, beta);
        }
        
        return qc.measure_all(qubits);
    }
    
    // 4-node graph optimization
    let edges = [[0,1], [1,2], [2,3], [3,0], [0,2]];
    let qubits = qc.allocate(4);
    let params = [[PI/4, PI/8], [PI/3, PI/6]]; // 2 layers
    
    let result = qaoa_circuit(qubits, params, edges);
    let cut_value = calculate_cut_value(result, edges);
    
    viz.show_graph_cut(edges, result, cut_value);
}`,
                parameters: { layers: 2, graph_size: 4 }
            }
        ];
    }

    execute(parameters) {
        const { layers = 2, graph_size = 4, problem_type = "max_cut" } = parameters;
        
        const results = {
            algorithm: "qaoa",
            problem_type,
            layers,
            graph_size,
            approximation_ratio: 0.7 + (layers * 0.05), // Simplified
            quantum_advantage: "Potential advantage for combinatorial optimization",
            variational_parameters: Array.from({ length: layers }, (_, i) => ({
                layer: i + 1,
                gamma: (Math.PI / 4) * (i + 1),
                beta: (Math.PI / 8) * (i + 1)
            })),
            steps: [
                {
                    step: 1,
                    operation: "initialization",
                    description: "Prepare uniform superposition state"
                },
                {
                    step: 2,
                    operation: "qaoa_layers",
                    description: `Apply ${layers} alternating problem and mixer layers`
                },
                {
                    step: 3,
                    operation: "measurement",
                    description: "Sample solution candidates"
                },
                {
                    step: 4,
                    operation: "classical_optimization",
                    description: "Optimize variational parameters"
                }
            ]
        };

        return results;
    }
}

// Variational Quantum Eigensolver (VQE)
class VQE extends QuantumAlgorithm {
    constructor() {
        super();
        this.name = "Variational Quantum Eigensolver";
        this.description = "Find ground state energies of quantum systems";
        this.category = 'chemistry';
        this.difficulty = 'advanced';
        this.qubitRequirement = { min: 2, max: 12, optimal: 4 };
    }

    execute(parameters) {
        const { molecule = "H2", basis = "sto-3g", ansatz = "UCCSD" } = parameters;
        
        return {
            algorithm: "vqe",
            molecule,
            basis_set: basis,
            ansatz,
            estimated_energy: -1.137 + Math.random() * 0.01, // Simplified H2 energy
            quantum_advantage: "Exponential scaling for large molecules",
            convergence_steps: Math.floor(Math.random() * 100) + 50
        };
    }
}

// Quantum Walk Algorithm
class QuantumWalk extends QuantumAlgorithm {
    constructor() {
        super();
        this.name = "Quantum Walk";
        this.description = "Quantum analog of classical random walks with quadratic speedup";
        this.category = 'graph_algorithms';
        this.difficulty = 'intermediate';
        this.qubitRequirement = { min: 3, max: 10, optimal: 5 };
    }

    execute(parameters) {
        const { steps = 10, graph_type = "line", size = 8 } = parameters;
        
        return {
            algorithm: "quantum_walk",
            steps,
            graph_type,
            size,
            spreading_rate: "Quadratic improvement over classical",
            mixing_time: Math.log2(size) + Math.random() * 2
        };
    }
}

// HHL Algorithm for Linear Systems
class HHL extends QuantumAlgorithm {
    constructor() {
        super();
        this.name = "HHL Linear System Solver";
        this.description = "Solve linear systems of equations with exponential speedup";
        this.category = 'linear_algebra';
        this.difficulty = 'advanced';
        this.qubitRequirement = { min: 4, max: 16, optimal: 8 };
    }

    execute(parameters) {
        const { matrix_size = 4, condition_number = 10 } = parameters;
        
        return {
            algorithm: "hhl",
            matrix_size,
            condition_number,
            quantum_advantage: "Exponential speedup for sparse matrices",
            precision: 0.01,
            success_probability: 1 / condition_number
        };
    }
}

// Quantum Phase Estimation
class PhaseEstimation extends QuantumAlgorithm {
    constructor() {
        super();
        this.name = "Quantum Phase Estimation";
        this.description = "Estimate eigenvalues of unitary operators with high precision";
        this.category = 'fundamental';
        this.difficulty = 'intermediate';
        this.qubitRequirement = { min: 3, max: 15, optimal: 6 };
    }

    execute(parameters) {
        const { precision_bits = 4, eigenvalue = 0.25 } = parameters;
        
        return {
            algorithm: "phase_estimation",
            precision_bits,
            true_eigenvalue: eigenvalue,
            estimated_eigenvalue: eigenvalue + (Math.random() - 0.5) * 0.01,
            error: Math.abs(eigenvalue - (eigenvalue + (Math.random() - 0.5) * 0.01)),
            quantum_advantage: "Exponential precision improvement"
        };
    }
}

// API Routes
const algorithmLibrary = new QuantumAlgorithmLibrary();

/**
 * @swagger
 * /api/algorithms:
 *   get:
 *     summary: Get list of available quantum algorithms
 *     responses:
 *       200:
 *         description: List of quantum algorithms with metadata
 */
router.get('/', (req, res) => {
    try {
        const algorithms = algorithmLibrary.listAlgorithms();
        
        res.json({
            success: true,
            algorithms,
            count: algorithms.length,
            categories: [...new Set(algorithms.map(a => a.category))],
            difficulties: [...new Set(algorithms.map(a => a.difficulty))]
        });
        
    } catch (error) {
        console.error('Algorithm list error:', error);
        res.status(500).json({ error: 'Failed to retrieve algorithms' });
    }
});

/**
 * @swagger
 * /api/algorithms/{name}:
 *   get:
 *     summary: Get detailed information about a specific algorithm
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detailed algorithm information
 */
router.get('/:name', (req, res) => {
    try {
        const algorithmName = req.params.name.toLowerCase();
        const algorithm = algorithmLibrary.getAlgorithm(algorithmName);
        
        if (!algorithm) {
            return res.status(404).json({ 
                error: 'Algorithm not found',
                available: Array.from(algorithmLibrary.algorithms.keys())
            });
        }
        
        const details = {
            name: algorithmName,
            displayName: algorithm.getDisplayName(),
            description: algorithm.getDescription(),
            category: algorithm.getCategory(),
            difficulty: algorithm.getDifficulty(),
            qubitsRequired: algorithm.getQubitRequirement(),
            examples: algorithm.getExamples(),
            myceliumCode: algorithm.getExamples().length > 0 ? 
                         algorithm.getExamples()[0].myceliumCode : null
        };
        
        res.json({
            success: true,
            algorithm: details
        });
        
    } catch (error) {
        console.error('Algorithm details error:', error);
        res.status(500).json({ error: 'Failed to retrieve algorithm details' });
    }
});

/**
 * @swagger
 * /api/algorithms/{name}/execute:
 *   post:
 *     summary: Execute a quantum algorithm with specified parameters
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               parameters:
 *                 type: object
 *                 description: Algorithm-specific parameters
 *     responses:
 *       200:
 *         description: Algorithm execution results
 */
router.post('/:name/execute', [
    body('parameters').optional().isObject()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const algorithmName = req.params.name.toLowerCase();
        const { parameters = {} } = req.body;
        
        const algorithm = algorithmLibrary.getAlgorithm(algorithmName);
        
        if (!algorithm) {
            return res.status(404).json({ 
                error: 'Algorithm not found',
                available: Array.from(algorithmLibrary.algorithms.keys())
            });
        }
        
        const startTime = Date.now();
        const results = algorithm.execute(parameters);
        const executionTime = Date.now() - startTime;
        
        res.json({
            success: true,
            algorithm: algorithmName,
            parameters,
            results: {
                ...results,
                metadata: {
                    executionTime,
                    timestamp: new Date().toISOString(),
                    quantumAdvantage: results.quantum_advantage || "Potential quantum speedup"
                }
            }
        });
        
    } catch (error) {
        console.error('Algorithm execution error:', error);
        res.status(500).json({ 
            error: 'Algorithm execution failed',
            details: error.message 
        });
    }
});

/**
 * @swagger
 * /api/algorithms/category/{category}:
 *   get:
 *     summary: Get algorithms by category
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Algorithms in the specified category
 */
router.get('/category/:category', (req, res) => {
    try {
        const category = req.params.category.toLowerCase();
        const algorithms = algorithmLibrary.listAlgorithms()
            .filter(alg => alg.category.toLowerCase() === category);
        
        if (algorithms.length === 0) {
            return res.status(404).json({ 
                error: 'Category not found or empty',
                availableCategories: [...new Set(algorithmLibrary.listAlgorithms().map(a => a.category))]
            });
        }
        
        res.json({
            success: true,
            category,
            algorithms,
            count: algorithms.length
        });
        
    } catch (error) {
        console.error('Category filter error:', error);
        res.status(500).json({ error: 'Failed to filter by category' });
    }
});

module.exports = router;