use anyhow::Result;
use serde_json::json;
use std::time::Duration;
use tokio::time::timeout;
use mycelium_ei_integration::*;

#[tokio::test]
async fn test_basic_hybrid_computation() -> Result<()> {
    // Setup
    let config = QuantumMyceliumConfig::default();
    let nexus = QuantumMyceliumNexus::new(config).await?;
    nexus.initialize().await?;
    
    // Simple Mycelium-EI program
    let mycelium_code = r#"
        fn main() {
            let growth_rate = 2.5;
            let nutrient_level = 0.8;
            let result = growth_rate * nutrient_level;
            return result;
        }
    "#;
    
    // Basic quantum circuit
    let quantum_circuit = QuantumCircuit {
        qubits: 2,
        gates: vec![
            QuantumGate::Hadamard(0),
            QuantumGate::CNOT(0, 1),
        ],
        measurements: vec![0, 1],
    };
    
    // Execute hybrid computation
    let result = nexus.execute_hybrid_computation(
        mycelium_code,
        Some(quantum_circuit),
    ).await?;
    
    // Verify results
    assert!(result.mycelium_output.is_some());
    assert!(result.quantum_output.is_some());
    assert!(result.execution_time_ms > 0);
    assert!(result.hybrid_metrics.quantum_speedup >= 1.0);
    
    nexus.shutdown().await?;
    Ok(())
}

#[tokio::test]
async fn test_quantum_enhanced_growth_prediction() -> Result<()> {
    let config = QuantumMyceliumConfig {
        quantum_enabled: true,
        optimization_level: OptimizationLevel::Quantum,
        ..Default::default()
    };
    
    let nexus = QuantumMyceliumNexus::new(config).await?;
    nexus.initialize().await?;
    
    let mycelium_code = r#"
        import quantum.circuits as qc
        import mycelium.network as net
        
        quantum fn predict_growth(params) {
            let qubits = qc.allocate(4);
            qc.amplitude_encode(qubits, params);
            qc.qft(qubits);
            let measurements = qc.measure_all(qubits);
            return decode_growth_pattern(measurements);
        }
        
        fn main() {
            let params = [0.7, 0.3, 0.9, 0.1];
            let growth = predict_growth(params);
            return growth;
        }
    "#;
    
    let quantum_circuit = create_growth_prediction_circuit(4)?;
    
    let result = timeout(
        Duration::from_secs(30),
        nexus.execute_hybrid_computation(mycelium_code, Some(quantum_circuit))
    ).await??;
    
    // Verify quantum enhancement
    assert!(result.hybrid_metrics.quantum_speedup > 1.0);
    assert!(result.hybrid_metrics.accuracy_improvement > 0.0);
    
    // Verify growth prediction output format
    if let Some(output) = result.mycelium_output {
        assert!(output.get("growth_rate").is_some());
        assert!(output.get("direction").is_some());
    }
    
    nexus.shutdown().await?;
    Ok(())
}

#[tokio::test]
async fn test_concurrent_hybrid_computations() -> Result<()> {
    let config = QuantumMyceliumConfig::default();
    let nexus = QuantumMyceliumNexus::new(config).await?;
    nexus.initialize().await?;
    
    let mycelium_code = r#"
        fn main() {
            let id = get_computation_id();
            let result = simulate_mycelial_growth(id);
            return result;
        }
    "#;
    
    // Launch multiple concurrent computations
    let mut handles = Vec::new();
    
    for i in 0..5 {
        let nexus_clone = &nexus;
        let code_clone = mycelium_code.to_string();
        
        let handle = tokio::spawn(async move {
            let circuit = create_simple_circuit(i)?;
            nexus_clone.execute_hybrid_computation(&code_clone, Some(circuit)).await
        });
        
        handles.push(handle);
    }
    
    // Wait for all computations to complete
    let mut results = Vec::new();
    for handle in handles {
        let result = handle.await??;
        results.push(result);
    }
    
    // Verify all computations succeeded
    assert_eq!(results.len(), 5);
    for result in results {
        assert!(result.mycelium_output.is_some());
        assert!(result.execution_time_ms > 0);
    }
    
    nexus.shutdown().await?;
    Ok(())
}

#[tokio::test]
async fn test_error_handling() -> Result<()> {
    let config = QuantumMyceliumConfig::default();
    let nexus = QuantumMyceliumNexus::new(config).await?;
    nexus.initialize().await?;
    
    // Test invalid Mycelium-EI code
    let invalid_code = r#"
        fn main() {
            undefined_function();
        }
    "#;
    
    let result = nexus.execute_hybrid_computation(invalid_code, None).await;
    assert!(result.is_err());
    
    // Test invalid quantum circuit
    let invalid_circuit = QuantumCircuit {
        qubits: 2,
        gates: vec![
            QuantumGate::CNOT(0, 5), // Invalid qubit index
        ],
        measurements: vec![0, 1],
    };
    
    let valid_code = "fn main() { return 42; }";
    let result = nexus.execute_hybrid_computation(valid_code, Some(invalid_circuit)).await;
    assert!(result.is_err());
    
    nexus.shutdown().await?;
    Ok(())
}

#[tokio::test]
async fn test_performance_metrics() -> Result<()> {
    let config = QuantumMyceliumConfig::default();
    let nexus = QuantumMyceliumNexus::new(config).await?;
    nexus.initialize().await?;
    
    let computation_code = r#"
        fn heavy_computation() {
            let matrix = create_matrix(100, 100);
            let result = matrix_multiply(matrix, matrix);
            return result.trace();
        }
        
        fn main() {
            return heavy_computation();
        }
    "#;
    
    // Test without quantum enhancement
    let start = std::time::Instant::now();
    let result_classical = nexus.execute_hybrid_computation(computation_code, None).await?;
    let classical_time = start.elapsed();
    
    // Test with quantum enhancement
    let quantum_circuit = create_optimization_circuit(6)?;
    let start = std::time::Instant::now();
    let result_quantum = nexus.execute_hybrid_computation(
        computation_code,
        Some(quantum_circuit),
    ).await?;
    let quantum_time = start.elapsed();
    
    // Verify performance improvement
    assert!(result_quantum.hybrid_metrics.quantum_speedup > 1.0);
    assert!(quantum_time < classical_time * 2); // Allow some overhead
    
    // Verify resource utilization is reasonable
    let resource_metrics = &result_quantum.hybrid_metrics.resource_utilization;
    assert!(resource_metrics.cpu_usage <= 100.0);
    assert!(resource_metrics.memory_usage <= 100.0);
    assert!(resource_metrics.quantum_coherence_time > 0.0);
    
    nexus.shutdown().await?;
    Ok(())
}

#[tokio::test]
async fn test_data_transformation() -> Result<()> {
    let config = QuantumMyceliumConfig::default();
    let nexus = QuantumMyceliumNexus::new(config).await?;
    nexus.initialize().await?;
    
    let transformation_code = r#"
        import mycelium.data as data
        import quantum.transform as qtrans
        
        hybrid fn transform_network_data(network_data) {
            // Classical preprocessing
            let cleaned_data = data.preprocess(network_data);
            
            // Quantum transformation
            quantum {
                let quantum_state = qtrans.encode(cleaned_data);
                let transformed = qtrans.apply_unitary(quantum_state);
                return qtrans.decode(transformed);
            }
        }
        
        fn main() {
            let network = create_test_network();
            let result = transform_network_data(network);
            return result;
        }
    "#;
    
    let transformation_circuit = create_data_transformation_circuit(8)?;
    
    let result = nexus.execute_hybrid_computation(
        transformation_code,
        Some(transformation_circuit),
    ).await?;
    
    // Verify transformation results
    assert!(result.mycelium_output.is_some());
    assert!(result.quantum_output.is_some());
    
    if let Some(output) = result.mycelium_output {
        assert!(output.get("transformed_data").is_some());
        assert!(output.get("transformation_fidelity").is_some());
    }
    
    nexus.shutdown().await?;
    Ok(())
}

// Helper functions for creating test circuits

fn create_growth_prediction_circuit(qubits: usize) -> Result<QuantumCircuit> {
    let mut gates = Vec::new();
    
    // Initialize superposition
    for i in 0..qubits {
        gates.push(QuantumGate::Hadamard(i));
    }
    
    // Entangling pattern for growth correlation
    for i in 0..(qubits - 1) {
        gates.push(QuantumGate::CNOT(i, i + 1));
    }
    
    // Phase rotations for growth parameters
    for i in 0..qubits {
        gates.push(QuantumGate::Phase(i, std::f64::consts::PI / (2.0 + i as f64)));
    }
    
    Ok(QuantumCircuit {
        qubits,
        gates,
        measurements: (0..qubits).collect(),
    })
}

fn create_simple_circuit(id: usize) -> Result<QuantumCircuit> {
    let qubits = 2;
    let mut gates = vec![
        QuantumGate::Hadamard(0),
        QuantumGate::CNOT(0, 1),
    ];
    
    // Add unique phase based on ID
    gates.push(QuantumGate::Phase(0, std::f64::consts::PI / (id + 1) as f64));
    
    Ok(QuantumCircuit {
        qubits,
        gates,
        measurements: vec![0, 1],
    })
}

fn create_optimization_circuit(qubits: usize) -> Result<QuantumCircuit> {
    let mut gates = Vec::new();
    
    // Variational quantum eigensolver structure
    for layer in 0..3 {
        for i in 0..qubits {
            gates.push(QuantumGate::Custom(
                "ry_rotation".to_string(),
                vec![i],
                vec![std::f64::consts::PI / (2.0 + layer as f64)],
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

fn create_data_transformation_circuit(qubits: usize) -> Result<QuantumCircuit> {
    let mut gates = Vec::new();
    
    // Quantum Fourier Transform for data transformation
    for i in 0..qubits {
        gates.push(QuantumGate::Hadamard(i));
        
        for j in (i + 1)..qubits {
            let angle = std::f64::consts::PI / (2_i32.pow((j - i) as u32) as f64);
            gates.push(QuantumGate::Custom(
                "controlled_phase".to_string(),
                vec![j, i],
                vec![angle],
            ));
        }
    }
    
    // Bit reversal
    for i in 0..(qubits / 2) {
        gates.push(QuantumGate::Custom(
            "swap".to_string(),
            vec![i, qubits - 1 - i],
            vec![],
        ));
    }
    
    Ok(QuantumCircuit {
        qubits,
        gates,
        measurements: (0..qubits).collect(),
    })
}