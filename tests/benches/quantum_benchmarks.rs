use criterion::{black_box, criterion_group, criterion_main, BenchmarkId, Criterion, Throughput};
use mycelium_ei_integration::*;
use std::time::Duration;
use tokio::runtime::Runtime;

fn create_runtime() -> Runtime {
    Runtime::new().unwrap()
}

fn benchmark_quantum_circuit_execution(c: &mut Criterion) {
    let rt = create_runtime();
    
    let mut group = c.benchmark_group("quantum_circuit_execution");
    
    // Test different circuit sizes
    for qubits in [2, 4, 6, 8, 10].iter() {
        group.throughput(Throughput::Elements(*qubits as u64));
        
        group.bench_with_input(
            BenchmarkId::new("hadamard_circuit", qubits),
            qubits,
            |b, &qubits| {
                b.to_async(&rt).iter(|| async {
                    let circuit = create_hadamard_circuit(black_box(qubits)).unwrap();
                    let config = QuantumMyceliumConfig::default();
                    let nexus = QuantumMyceliumNexus::new(config).await.unwrap();
                    nexus.initialize().await.unwrap();
                    
                    let result = nexus.execute_hybrid_computation(
                        "fn main() { return 1; }",
                        Some(black_box(circuit))
                    ).await;
                    
                    nexus.shutdown().await.unwrap();
                    result
                });
            },
        );
        
        group.bench_with_input(
            BenchmarkId::new("entangling_circuit", qubits),
            qubits,
            |b, &qubits| {
                b.to_async(&rt).iter(|| async {
                    let circuit = create_entangling_circuit(black_box(qubits)).unwrap();
                    let config = QuantumMyceliumConfig::default();
                    let nexus = QuantumMyceliumNexus::new(config).await.unwrap();
                    nexus.initialize().await.unwrap();
                    
                    let result = nexus.execute_hybrid_computation(
                        "fn main() { return 1; }",
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

fn benchmark_qaoa_optimization(c: &mut Criterion) {
    let rt = create_runtime();
    
    let mut group = c.benchmark_group("qaoa_optimization");
    group.sample_size(10);
    group.measurement_time(Duration::from_secs(30));
    
    for (nodes, depth) in [(4, 2), (6, 3), (8, 4)].iter() {
        group.bench_with_input(
            BenchmarkId::from_parameter(format!("{}nodes_{}depth", nodes, depth)),
            &(nodes, depth),
            |b, &(nodes, depth)| {
                b.to_async(&rt).iter(|| async {
                    let circuit = create_qaoa_circuit(black_box(*nodes), black_box(*depth)).unwrap();
                    let config = QuantumMyceliumConfig {
                        optimization_level: OptimizationLevel::Quantum,
                        ..Default::default()
                    };
                    let nexus = QuantumMyceliumNexus::new(config).await.unwrap();
                    nexus.initialize().await.unwrap();
                    
                    let mycelium_code = r#"
                        fn optimize_network(nodes) {
                            // Network optimization logic
                            return calculate_optimal_topology(nodes);
                        }
                        
                        fn main() {
                            return optimize_network(4);
                        }
                    "#;
                    
                    let result = nexus.execute_hybrid_computation(
                        black_box(mycelium_code),
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

fn benchmark_quantum_vs_classical(c: &mut Criterion) {
    let rt = create_runtime();
    
    let mut group = c.benchmark_group("quantum_vs_classical");
    group.sample_size(20);
    
    let computation_code = r#"
        fn matrix_operation(size) {
            let matrix = create_random_matrix(size, size);
            let result = eigenvalue_decomposition(matrix);
            return result.largest_eigenvalue();
        }
        
        fn main() {
            return matrix_operation(10);
        }
    "#;
    
    // Classical computation
    group.bench_function("classical_computation", |b| {
        b.to_async(&rt).iter(|| async {
            let config = QuantumMyceliumConfig {
                quantum_enabled: false,
                ..Default::default()
            };
            let nexus = QuantumMyceliumNexus::new(config).await.unwrap();
            nexus.initialize().await.unwrap();
            
            let result = nexus.execute_hybrid_computation(
                black_box(computation_code),
                None
            ).await;
            
            nexus.shutdown().await.unwrap();
            result
        });
    });
    
    // Quantum-enhanced computation
    group.bench_function("quantum_enhanced_computation", |b| {
        b.to_async(&rt).iter(|| async {
            let circuit = create_optimization_circuit(6).unwrap();
            let config = QuantumMyceliumConfig {
                quantum_enabled: true,
                optimization_level: OptimizationLevel::Quantum,
                ..Default::default()
            };
            let nexus = QuantumMyceliumNexus::new(config).await.unwrap();
            nexus.initialize().await.unwrap();
            
            let result = nexus.execute_hybrid_computation(
                black_box(computation_code),
                Some(black_box(circuit))
            ).await;
            
            nexus.shutdown().await.unwrap();
            result
        });
    });
    
    group.finish();
}

fn benchmark_quantum_state_preparation(c: &mut Criterion) {
    let rt = create_runtime();
    
    let mut group = c.benchmark_group("quantum_state_preparation");
    
    for n_amplitudes in [4, 8, 16, 32].iter() {
        group.throughput(Throughput::Elements(*n_amplitudes as u64));
        
        group.bench_with_input(
            BenchmarkId::new("amplitude_encoding", n_amplitudes),
            n_amplitudes,
            |b, &n_amplitudes| {
                b.to_async(&rt).iter(|| async {
                    let amplitudes: Vec<f64> = (0..n_amplitudes)
                        .map(|i| (i as f64 + 1.0) / n_amplitudes as f64)
                        .collect();
                    
                    let circuit = create_amplitude_encoding_circuit(
                        black_box(&amplitudes)
                    ).unwrap();
                    
                    let config = QuantumMyceliumConfig::default();
                    let nexus = QuantumMyceliumNexus::new(config).await.unwrap();
                    nexus.initialize().await.unwrap();
                    
                    let result = nexus.execute_hybrid_computation(
                        "fn main() { return encode_data(); }",
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

fn benchmark_error_correction(c: &mut Criterion) {
    let rt = create_runtime();
    
    let mut group = c.benchmark_group("quantum_error_correction");
    group.sample_size(10);
    
    for error_rate in [0.001, 0.01, 0.1].iter() {
        group.bench_with_input(
            BenchmarkId::new("surface_code", error_rate),
            error_rate,
            |b, &error_rate| {
                b.to_async(&rt).iter(|| async {
                    let circuit = create_error_correction_circuit(
                        black_box(9), // 3x3 surface code
                        black_box(error_rate)
                    ).unwrap();
                    
                    let config = QuantumMyceliumConfig {
                        optimization_level: OptimizationLevel::Quantum,
                        ..Default::default()
                    };
                    let nexus = QuantumMyceliumNexus::new(config).await.unwrap();
                    nexus.initialize().await.unwrap();
                    
                    let result = nexus.execute_hybrid_computation(
                        "fn main() { return error_corrected_computation(); }",
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

fn create_hadamard_circuit(qubits: usize) -> anyhow::Result<QuantumCircuit> {
    let gates = (0..qubits)
        .map(|i| QuantumGate::Hadamard(i))
        .collect();
    
    Ok(QuantumCircuit {
        qubits,
        gates,
        measurements: (0..qubits).collect(),
    })
}

fn create_entangling_circuit(qubits: usize) -> anyhow::Result<QuantumCircuit> {
    let mut gates = Vec::new();
    
    // Initial superposition
    for i in 0..qubits {
        gates.push(QuantumGate::Hadamard(i));
    }
    
    // Entangling layers
    for layer in 0..3 {
        for i in 0..qubits {
            let j = (i + 1 + layer) % qubits;
            gates.push(QuantumGate::CNOT(i, j));
        }
    }
    
    Ok(QuantumCircuit {
        qubits,
        gates,
        measurements: (0..qubits).collect(),
    })
}

fn create_qaoa_circuit(nodes: usize, depth: usize) -> anyhow::Result<QuantumCircuit> {
    let qubits = (nodes as f64).log2().ceil() as usize;
    let mut gates = Vec::new();
    
    // Initial superposition
    for i in 0..qubits {
        gates.push(QuantumGate::Hadamard(i));
    }
    
    // QAOA layers
    for p in 0..depth {
        let gamma = std::f64::consts::PI / (4.0 * (p + 1) as f64);
        let beta = std::f64::consts::PI / (2.0 * (p + 1) as f64);
        
        // Cost Hamiltonian
        for i in 0..qubits {
            for j in (i + 1)..qubits {
                gates.push(QuantumGate::CNOT(i, j));
                gates.push(QuantumGate::Phase(j, gamma));
                gates.push(QuantumGate::CNOT(i, j));
            }
        }
        
        // Mixer Hamiltonian
        for i in 0..qubits {
            gates.push(QuantumGate::Custom(
                "rx_rotation".to_string(),
                vec![i],
                vec![beta],
            ));
        }
    }
    
    Ok(QuantumCircuit {
        qubits,
        gates,
        measurements: (0..qubits).collect(),
    })
}

fn create_optimization_circuit(qubits: usize) -> anyhow::Result<QuantumCircuit> {
    let mut gates = Vec::new();
    
    // Variational circuit for optimization
    for layer in 0..4 {
        for i in 0..qubits {
            let theta = std::f64::consts::PI / (2.0 + layer as f64);
            gates.push(QuantumGate::Custom(
                "ry_rotation".to_string(),
                vec![i],
                vec![theta],
            ));
        }
        
        for i in 0..(qubits - 1) {
            gates.push(QuantumGate::CNOT(i, i + 1));
        }
    }
    
    Ok(QuantumCircuit {
        qubits,
        gates,
        measurements: (0..qubits).collect(),
    })
}

fn create_amplitude_encoding_circuit(amplitudes: &[f64]) -> anyhow::Result<QuantumCircuit> {
    let qubits = (amplitudes.len() as f64).log2().ceil() as usize;
    let mut gates = Vec::new();
    
    // Amplitude encoding using rotation gates
    for (i, &amplitude) in amplitudes.iter().enumerate() {
        if i < (1 << qubits) {
            let angle = 2.0 * amplitude.asin();
            let qubit = i % qubits;
            gates.push(QuantumGate::Custom(
                "ry_rotation".to_string(),
                vec![qubit],
                vec![angle],
            ));
        }
    }
    
    Ok(QuantumCircuit {
        qubits,
        gates,
        measurements: (0..qubits).collect(),
    })
}

fn create_error_correction_circuit(
    logical_qubits: usize,
    error_rate: f64,
) -> anyhow::Result<QuantumCircuit> {
    let qubits = logical_qubits * 3; // 3 physical qubits per logical qubit (repetition code)
    let mut gates = Vec::new();
    
    // Encoding
    for i in 0..logical_qubits {
        let q0 = i * 3;
        let q1 = i * 3 + 1;
        let q2 = i * 3 + 2;
        
        gates.push(QuantumGate::CNOT(q0, q1));
        gates.push(QuantumGate::CNOT(q0, q2));
    }
    
    // Syndrome measurement and correction
    for i in 0..logical_qubits {
        let q0 = i * 3;
        let q1 = i * 3 + 1;
        let q2 = i * 3 + 2;
        
        // Add noise
        gates.push(QuantumGate::Custom(
            "depolarizing_noise".to_string(),
            vec![q0, q1, q2],
            vec![error_rate],
        ));
        
        // Error correction
        gates.push(QuantumGate::Custom(
            "majority_vote_correction".to_string(),
            vec![q0, q1, q2],
            vec![],
        ));
    }
    
    Ok(QuantumCircuit {
        qubits,
        gates,
        measurements: (0..logical_qubits).map(|i| i * 3).collect(),
    })
}

criterion_group!(
    quantum_benches,
    benchmark_quantum_circuit_execution,
    benchmark_qaoa_optimization,
    benchmark_quantum_vs_classical,
    benchmark_quantum_state_preparation,
    benchmark_error_correction,
);

criterion_main!(quantum_benches);