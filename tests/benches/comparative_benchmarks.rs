use criterion::{black_box, criterion_group, criterion_main, BenchmarkId, Criterion, Throughput};
use tokio::runtime::Runtime;
use mycelium_ei_integration::*;
use std::time::Duration;
use serde_json::json;

/// Comprehensive benchmarking suite comparing quantum vs classical approaches
pub struct ComparativeBenchmarks {
    quantum_config: QuantumMyceliumConfig,
    classical_config: QuantumMyceliumConfig,
}

impl ComparativeBenchmarks {
    pub fn new() -> Self {
        let quantum_config = QuantumMyceliumConfig {
            quantum_enabled: true,
            optimization_level: OptimizationLevel::Quantum,
            ..Default::default()
        };
        
        let classical_config = QuantumMyceliumConfig {
            quantum_enabled: false,
            optimization_level: OptimizationLevel::Basic,
            ..Default::default()
        };
        
        Self {
            quantum_config,
            classical_config,
        }
    }
}

fn create_runtime() -> Runtime {
    Runtime::new().unwrap()
}

/// Benchmark matrix operations: Classical vs Quantum
fn benchmark_matrix_operations(c: &mut Criterion) {
    let rt = create_runtime();
    let benchmarks = ComparativeBenchmarks::new();
    
    let mut group = c.benchmark_group("matrix_operations");
    group.sample_size(20);
    group.measurement_time(Duration::from_secs(30));
    
    // Test different matrix sizes
    for size in [32, 64, 128, 256].iter() {
        group.throughput(Throughput::Elements(*size as u64 * *size as u64));
        
        let matrix_code = format!(r#"
            fn matrix_benchmark() -> f64 {{
                let a = create_random_matrix({}, {});
                let b = create_random_matrix({}, {});
                
                let start = get_time();
                let result = matrix_multiply(a, b);
                let eigenvalues = compute_eigenvalues(result);
                let end = get_time();
                
                return eigenvalues[0];
            }}
            
            fn main() {{
                return matrix_benchmark();
            }}
        "#, size, size, size, size);
        
        let quantum_matrix_code = format!(r#"
            quantum fn quantum_matrix_benchmark() -> f64 {{
                let qubits = allocate_qubits({});
                
                let start = get_time();
                encode_matrices(qubits, {});
                apply_quantum_matrix_operations(qubits);
                let result = measure_result_matrix(qubits);
                let eigenvalues = quantum_eigenvalue_algorithm(qubits);
                let end = get_time();
                
                return eigenvalues[0];
            }}
            
            fn main() {{
                return quantum_matrix_benchmark();
            }}
        "#, (size * size) as f32).log2().ceil() as usize, size);
        
        // Classical benchmark
        group.bench_with_input(
            BenchmarkId::new("classical", size),
            size,
            |b, &size| {
                b.to_async(&rt).iter(|| async {
                    let nexus = QuantumMyceliumNexus::new(benchmarks.classical_config.clone()).await.unwrap();
                    nexus.initialize().await.unwrap();
                    
                    let result = nexus.execute_hybrid_computation(
                        black_box(&matrix_code),
                        None
                    ).await;
                    
                    nexus.shutdown().await.unwrap();
                    result
                });
            },
        );
        
        // Quantum benchmark
        group.bench_with_input(
            BenchmarkId::new("quantum", size),
            size,
            |b, &size| {
                b.to_async(&rt).iter(|| async {
                    let nexus = QuantumMyceliumNexus::new(benchmarks.quantum_config.clone()).await.unwrap();
                    nexus.initialize().await.unwrap();
                    
                    let circuit = create_matrix_quantum_circuit((size as f32).log2().ceil() as usize);
                    let result = nexus.execute_hybrid_computation(
                        black_box(&quantum_matrix_code),
                        Some(black_box(circuit))
                    ).await;
                    
                    nexus.shutdown().await.unwrap();
                    result
                });
            },
        );
    }
    
    group.finish();
}

/// Benchmark optimization problems: Classical vs QAOA
fn benchmark_optimization_problems(c: &mut Criterion) {
    let rt = create_runtime();
    let benchmarks = ComparativeBenchmarks::new();
    
    let mut group = c.benchmark_group("optimization_problems");
    group.sample_size(10);
    group.measurement_time(Duration::from_secs(60));
    
    // Test different problem sizes
    for problem_size in [8, 12, 16, 20].iter() {
        group.throughput(Throughput::Elements(2_u64.pow(*problem_size as u32)));
        
        let classical_opt_code = format!(r#"
            fn optimization_benchmark() -> f64 {{
                let problem = generate_max_cut_problem({});
                
                let start = get_time();
                let solution = simulated_annealing(problem, max_iterations: 10000);
                let end = get_time();
                
                return evaluate_solution(problem, solution);
            }}
            
            fn main() {{
                return optimization_benchmark();
            }}
        "#, problem_size);
        
        let qaoa_code = format!(r#"
            quantum fn qaoa_optimization_benchmark() -> f64 {{
                let qubits = allocate({});
                let problem = generate_max_cut_problem({});
                
                let start = get_time();
                let solution = qaoa_solve(qubits, problem, p_layers: 5);
                let end = get_time();
                
                return evaluate_solution(problem, solution);
            }}
            
            fn main() {{
                return qaoa_optimization_benchmark();
            }}
        "#, problem_size, problem_size);
        
        // Classical optimization (Simulated Annealing)
        group.bench_with_input(
            BenchmarkId::new("classical_sa", problem_size),
            problem_size,
            |b, &problem_size| {
                b.to_async(&rt).iter(|| async {
                    let nexus = QuantumMyceliumNexus::new(benchmarks.classical_config.clone()).await.unwrap();
                    nexus.initialize().await.unwrap();
                    
                    let result = nexus.execute_hybrid_computation(
                        black_box(&classical_opt_code),
                        None
                    ).await;
                    
                    nexus.shutdown().await.unwrap();
                    result
                });
            },
        );
        
        // QAOA optimization
        group.bench_with_input(
            BenchmarkId::new("qaoa", problem_size),
            problem_size,
            |b, &problem_size| {
                b.to_async(&rt).iter(|| async {
                    let nexus = QuantumMyceliumNexus::new(benchmarks.quantum_config.clone()).await.unwrap();
                    nexus.initialize().await.unwrap();
                    
                    let circuit = create_qaoa_circuit(*problem_size, 5);
                    let result = nexus.execute_hybrid_computation(
                        black_box(&qaoa_code),
                        Some(black_box(circuit))
                    ).await;
                    
                    nexus.shutdown().await.unwrap();
                    result
                });
            },
        );
    }
    
    group.finish();
}

/// Benchmark machine learning: Classical SVM vs Quantum SVM
fn benchmark_machine_learning(c: &mut Criterion) {
    let rt = create_runtime();
    let benchmarks = ComparativeBenchmarks::new();
    
    let mut group = c.benchmark_group("machine_learning");
    group.sample_size(15);
    group.measurement_time(Duration::from_secs(45));
    
    // Test different dataset sizes
    for dataset_size in [100, 500, 1000, 2000].iter() {
        group.throughput(Throughput::Elements(*dataset_size as u64));
        
        let classical_ml_code = format!(r#"
            fn ml_benchmark() -> f64 {{
                let (features, labels) = generate_classification_dataset({}, dimensions: 10);
                
                let start = get_time();
                let model = train_svm(features, labels);
                let accuracy = cross_validate(model, features, labels, folds: 5);
                let end = get_time();
                
                return accuracy;
            }}
            
            fn main() {{
                return ml_benchmark();
            }}
        "#, dataset_size);
        
        let quantum_ml_code = format!(r#"
            quantum fn quantum_ml_benchmark() -> f64 {{
                let (features, labels) = generate_classification_dataset({}, dimensions: 10);
                let qubits = allocate({});
                
                let start = get_time();
                let quantum_model = train_qsvm(qubits, features, labels);
                let accuracy = quantum_cross_validate(quantum_model, features, labels, folds: 5);
                let end = get_time();
                
                return accuracy;
            }}
            
            fn main() {{
                return quantum_ml_benchmark();
            }}
        "#, dataset_size, (*dataset_size as f64).log2().ceil() as usize + 10);
        
        // Classical SVM
        group.bench_with_input(
            BenchmarkId::new("classical_svm", dataset_size),
            dataset_size,
            |b, &dataset_size| {
                b.to_async(&rt).iter(|| async {
                    let nexus = QuantumMyceliumNexus::new(benchmarks.classical_config.clone()).await.unwrap();
                    nexus.initialize().await.unwrap();
                    
                    let result = nexus.execute_hybrid_computation(
                        black_box(&classical_ml_code),
                        None
                    ).await;
                    
                    nexus.shutdown().await.unwrap();
                    result
                });
            },
        );
        
        // Quantum SVM
        group.bench_with_input(
            BenchmarkId::new("quantum_svm", dataset_size),
            dataset_size,
            |b, &dataset_size| {
                b.to_async(&rt).iter(|| async {
                    let nexus = QuantumMyceliumNexus::new(benchmarks.quantum_config.clone()).await.unwrap();
                    nexus.initialize().await.unwrap();
                    
                    let qubits = (*dataset_size as f64).log2().ceil() as usize + 10;
                    let circuit = create_qsvm_circuit(qubits, crate::quantum_ml::KernelType::RBF { gamma: 0.1 });
                    let result = nexus.execute_hybrid_computation(
                        black_box(&quantum_ml_code),
                        Some(black_box(circuit))
                    ).await;
                    
                    nexus.shutdown().await.unwrap();
                    result
                });
            },
        );
    }
    
    group.finish();
}

/// Benchmark mycelial network modeling
fn benchmark_mycelial_modeling(c: &mut Criterion) {
    let rt = create_runtime();
    let benchmarks = ComparativeBenchmarks::new();
    
    let mut group = c.benchmark_group("mycelial_modeling");
    group.sample_size(12);
    group.measurement_time(Duration::from_secs(45));
    
    // Test different network sizes
    for network_size in [100, 500, 1000, 2000].iter() {
        group.throughput(Throughput::Elements(*network_size as u64));
        
        let classical_mycelial_code = format!(r#"
            fn mycelial_benchmark() -> f64 {{
                let network = create_mycelial_network({});
                let environment = setup_environment();
                
                let start = get_time();
                let growth_simulation = simulate_growth(network, environment, time_steps: 1000);
                let nutrient_flow = calculate_nutrient_distribution(network);
                let stability_analysis = analyze_network_stability(network);
                let end = get_time();
                
                return calculate_complexity_measure(network);
            }}
            
            fn main() {{
                return mycelial_benchmark();
            }}
        "#, network_size);
        
        let quantum_mycelial_code = format!(r#"
            quantum fn quantum_mycelial_benchmark() -> f64 {{
                let network = create_mycelial_network({});
                let environment = setup_environment();
                let qubits = allocate({});
                
                let start = get_time();
                let quantum_state = encode_network_topology(qubits, network);
                let growth_patterns = quantum_simulate_growth(qubits, environment, time_steps: 1000);
                let optimal_flow = quantum_optimize_nutrient_flow(qubits);
                let end = get_time();
                
                return calculate_quantum_efficiency(qubits);
            }}
            
            fn main() {{
                return quantum_mycelial_benchmark();
            }}
        "#, network_size, (*network_size as f64).log2().ceil() as usize + 8);
        
        // Classical modeling
        group.bench_with_input(
            BenchmarkId::new("classical_modeling", network_size),
            network_size,
            |b, &network_size| {
                b.to_async(&rt).iter(|| async {
                    let nexus = QuantumMyceliumNexus::new(benchmarks.classical_config.clone()).await.unwrap();
                    nexus.initialize().await.unwrap();
                    
                    let result = nexus.execute_hybrid_computation(
                        black_box(&classical_mycelial_code),
                        None
                    ).await;
                    
                    nexus.shutdown().await.unwrap();
                    result
                });
            },
        );
        
        // Quantum-enhanced modeling
        group.bench_with_input(
            BenchmarkId::new("quantum_modeling", network_size),
            network_size,
            |b, &network_size| {
                b.to_async(&rt).iter(|| async {
                    let nexus = QuantumMyceliumNexus::new(benchmarks.quantum_config.clone()).await.unwrap();
                    nexus.initialize().await.unwrap();
                    
                    let qubits = (*network_size as f64).log2().ceil() as usize + 8;
                    let circuit = create_mycelial_optimization_circuit(qubits);
                    let result = nexus.execute_hybrid_computation(
                        black_box(&quantum_mycelial_code),
                        Some(black_box(circuit))
                    ).await;
                    
                    nexus.shutdown().await.unwrap();
                    result
                });
            },
        );
    }
    
    group.finish();
}

/// Benchmark hybrid quantum-classical algorithms
fn benchmark_hybrid_algorithms(c: &mut Criterion) {
    let rt = create_runtime();
    let benchmarks = ComparativeBenchmarks::new();
    
    let mut group = c.benchmark_group("hybrid_algorithms");
    group.sample_size(10);
    group.measurement_time(Duration::from_secs(60));
    
    // Test different problem complexities
    for complexity in [8, 12, 16].iter() {
        let hybrid_code = format!(r#"
            hybrid fn quantum_classical_optimization() -> f64 {{
                // Classical preprocessing
                let problem = generate_complex_problem({});
                let simplified = classical_preprocess(problem);
                
                // Quantum computation core
                quantum {{
                    let qubits = allocate({});
                    let quantum_state = encode_problem(qubits, simplified);
                    let quantum_result = apply_quantum_algorithm(qubits);
                    return extract_classical_result(quantum_result);
                }}
                
                // Classical postprocessing
                let final_result = classical_postprocess(quantum_result, problem);
                return final_result;
            }}
            
            fn main() {{
                return quantum_classical_optimization();
            }}
        "#, complexity, complexity);
        
        group.bench_with_input(
            BenchmarkId::new("hybrid_optimization", complexity),
            complexity,
            |b, &complexity| {
                b.to_async(&rt).iter(|| async {
                    let nexus = QuantumMyceliumNexus::new(benchmarks.quantum_config.clone()).await.unwrap();
                    nexus.initialize().await.unwrap();
                    
                    let circuit = create_hybrid_optimization_circuit(*complexity);
                    let result = nexus.execute_hybrid_computation(
                        black_box(&hybrid_code),
                        Some(black_box(circuit))
                    ).await;
                    
                    nexus.shutdown().await.unwrap();
                    result
                });
            },
        );
    }
    
    group.finish();
}

/// Benchmark quantum error correction overhead
fn benchmark_error_correction(c: &mut Criterion) {
    let rt = create_runtime();
    let benchmarks = ComparativeBenchmarks::new();
    
    let mut group = c.benchmark_group("error_correction");
    group.sample_size(8);
    group.measurement_time(Duration::from_secs(45));
    
    // Test different error rates
    for error_rate in [0.001, 0.01, 0.1].iter() {
        let error_correction_code = format!(r#"
            quantum fn error_corrected_computation() -> f64 {{
                let logical_qubits = allocate_logical(5);  // 5 logical qubits
                let data = generate_test_data(32);
                
                let start = get_time();
                
                // Encode with surface code
                let encoded_state = encode_with_surface_code(logical_qubits, data);
                
                // Apply noise
                apply_noise_model(encoded_state, error_rate: {});
                
                // Error correction cycle
                for cycle in 0..10 {{
                    let syndrome = measure_error_syndrome(encoded_state);
                    let corrections = calculate_corrections(syndrome);
                    apply_corrections(encoded_state, corrections);
                }}
                
                // Computation on error-corrected state
                let result = quantum_computation(encoded_state);
                
                // Decode result
                let final_result = decode_surface_code(result);
                
                let end = get_time();
                return final_result[0];
            }}
            
            fn main() {{
                return error_corrected_computation();
            }}
        "#, error_rate);
        
        group.bench_with_input(
            BenchmarkId::new("with_error_correction", (error_rate * 1000.0) as u32),
            error_rate,
            |b, &error_rate| {
                b.to_async(&rt).iter(|| async {
                    let nexus = QuantumMyceliumNexus::new(benchmarks.quantum_config.clone()).await.unwrap();
                    nexus.initialize().await.unwrap();
                    
                    let circuit = create_error_correction_circuit(15, *error_rate); // 3x5 surface code
                    let result = nexus.execute_hybrid_computation(
                        black_box(&error_correction_code),
                        Some(black_box(circuit))
                    ).await;
                    
                    nexus.shutdown().await.unwrap();
                    result
                });
            },
        );
    }
    
    group.finish();
}

// Helper functions for creating benchmark circuits
fn create_matrix_quantum_circuit(qubits: usize) -> QuantumCircuit {
    let mut gates = Vec::new();
    
    // Matrix encoding gates
    for i in 0..qubits {
        gates.push(QuantumGate::Hadamard(i));
    }
    
    // Matrix multiplication simulation
    for i in 0..(qubits - 1) {
        gates.push(QuantumGate::CNOT(i, i + 1));
    }
    
    // QFT for eigenvalue extraction
    gates.push(QuantumGate::Custom("qft".to_string(), (0..qubits).collect(), vec![]));
    
    QuantumCircuit {
        circuit_id: "matrix_benchmark".to_string(),
        name: "Matrix Operations".to_string(),
        qubits,
        gates,
        measurements: (0..qubits).collect(),
    }
}

fn create_qaoa_circuit(nodes: usize, p_layers: usize) -> QuantumCircuit {
    let mut gates = Vec::new();
    
    // Initial superposition
    for i in 0..nodes {
        gates.push(QuantumGate::Hadamard(i));
    }
    
    // QAOA layers
    for p in 0..p_layers {
        let gamma = std::f64::consts::PI / (4.0 * (p + 1) as f64);
        let beta = std::f64::consts::PI / (2.0 * (p + 1) as f64);
        
        // Cost Hamiltonian
        for i in 0..nodes {
            for j in (i + 1)..nodes {
                gates.push(QuantumGate::CNOT(i, j));
                gates.push(QuantumGate::Phase(j, gamma));
                gates.push(QuantumGate::CNOT(i, j));
            }
        }
        
        // Mixer Hamiltonian
        for i in 0..nodes {
            gates.push(QuantumGate::Custom("rx".to_string(), vec![i], vec![beta]));
        }
    }
    
    QuantumCircuit {
        circuit_id: "qaoa_benchmark".to_string(),
        name: "QAOA Optimization".to_string(),
        qubits: nodes,
        gates,
        measurements: (0..nodes).collect(),
    }
}

fn create_qsvm_circuit(qubits: usize, kernel_type: crate::quantum_ml::KernelType) -> QuantumCircuit {
    let mut gates = Vec::new();
    
    // Feature encoding
    for i in 0..qubits {
        gates.push(QuantumGate::Custom("feature_encode".to_string(), vec![i], vec![1.0]));
    }
    
    // Kernel-specific gates
    match kernel_type {
        crate::quantum_ml::KernelType::RBF { gamma } => {
            for i in 0..qubits {
                for j in (i + 1)..qubits {
                    gates.push(QuantumGate::Custom("zz_feature".to_string(), vec![i, j], vec![gamma]));
                }
            }
        },
        _ => {}
    }
    
    QuantumCircuit {
        circuit_id: "qsvm_benchmark".to_string(),
        name: "Quantum SVM".to_string(),
        qubits,
        gates,
        measurements: vec![0],
    }
}

fn create_mycelial_optimization_circuit(qubits: usize) -> QuantumCircuit {
    let mut gates = Vec::new();
    
    // Network topology encoding
    for i in 0..qubits {
        gates.push(QuantumGate::Custom("topology_encode".to_string(), vec![i], vec![1.0]));
    }
    
    // Growth simulation gates
    for layer in 0..3 {
        for i in 0..qubits {
            gates.push(QuantumGate::Custom("ry".to_string(), vec![i], vec![std::f64::consts::PI / (layer + 1) as f64]));
        }
        
        for i in 0..(qubits - 1) {
            gates.push(QuantumGate::CNOT(i, i + 1));
        }
    }
    
    QuantumCircuit {
        circuit_id: "mycelial_benchmark".to_string(),
        name: "Mycelial Network Optimization".to_string(),
        qubits,
        gates,
        measurements: (0..qubits).collect(),
    }
}

fn create_hybrid_optimization_circuit(complexity: usize) -> QuantumCircuit {
    let qubits = complexity;
    let mut gates = Vec::new();
    
    // Hybrid algorithm structure
    for layer in 0..complexity {
        // Variational layer
        for i in 0..qubits {
            gates.push(QuantumGate::Custom("ry".to_string(), vec![i], vec![std::f64::consts::PI / (layer + 1) as f64]));
        }
        
        // Classical feedback simulation
        for i in 0..(qubits - 1) {
            gates.push(QuantumGate::CNOT(i, i + 1));
        }
    }
    
    QuantumCircuit {
        circuit_id: "hybrid_benchmark".to_string(),
        name: "Hybrid Optimization".to_string(),
        qubits,
        gates,
        measurements: (0..qubits).collect(),
    }
}

fn create_error_correction_circuit(physical_qubits: usize, error_rate: f64) -> QuantumCircuit {
    let mut gates = Vec::new();
    
    // Surface code encoding (simplified)
    for i in (0..physical_qubits).step_by(3) {
        if i + 2 < physical_qubits {
            gates.push(QuantumGate::CNOT(i, i + 1));
            gates.push(QuantumGate::CNOT(i, i + 2));
        }
    }
    
    // Error injection
    for i in 0..physical_qubits {
        gates.push(QuantumGate::Custom("noise".to_string(), vec![i], vec![error_rate]));
    }
    
    // Error correction cycle
    for _ in 0..5 {
        for i in (0..physical_qubits).step_by(3) {
            if i + 2 < physical_qubits {
                gates.push(QuantumGate::Custom("syndrome_measure".to_string(), vec![i + 1, i + 2], vec![]));
            }
        }
    }
    
    QuantumCircuit {
        circuit_id: "error_correction_benchmark".to_string(),
        name: "Error Correction".to_string(),
        qubits: physical_qubits,
        gates,
        measurements: (0..physical_qubits / 3).map(|i| i * 3).collect(),
    }
}

criterion_group!(
    comparative_benches,
    benchmark_matrix_operations,
    benchmark_optimization_problems,
    benchmark_machine_learning,
    benchmark_mycelial_modeling,
    benchmark_hybrid_algorithms,
    benchmark_error_correction
);

criterion_main!(comparative_benches);