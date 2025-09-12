use crate::{QuantumCircuit, QuantumGate};
use anyhow::Result;
use ndarray::{Array1, Array2};

/// Quantum machine learning circuits for mycelial intelligence
pub struct QuantumMLCircuits;

impl QuantumMLCircuits {
    /// Quantum Support Vector Machine circuit
    pub fn qsvm_circuit(
        feature_dim: usize,
        training_size: usize,
        kernel_type: KernelType,
    ) -> Result<QuantumCircuit> {
        let n_qubits = feature_dim + (training_size as f64).log2().ceil() as usize;
        let mut gates = Vec::new();
        
        match kernel_type {
            KernelType::Linear => {
                // Linear kernel feature map
                for i in 0..feature_dim {
                    gates.push(QuantumGate::Custom(
                        "linear_feature_map".to_string(),
                        vec![i],
                        vec![1.0],
                    ));
                }
            },
            KernelType::RBF { gamma } => {
                // RBF kernel feature map using ZZFeatureMap
                for i in 0..feature_dim {
                    gates.push(QuantumGate::Hadamard(i));
                    gates.push(QuantumGate::Custom(
                        "data_encoding".to_string(),
                        vec![i],
                        vec![gamma],
                    ));
                }
                
                // Entangling layers for RBF kernel
                for depth in 0..2 {
                    for i in 0..feature_dim {
                        for j in (i + 1)..feature_dim {
                            gates.push(QuantumGate::Custom(
                                "zz_feature_map".to_string(),
                                vec![i, j],
                                vec![gamma * 2.0 / (depth + 1) as f64],
                            ));
                        }
                    }
                }
            },
            KernelType::Polynomial { degree } => {
                // Polynomial kernel feature map
                for d in 1..=degree {
                    for i in 0..feature_dim {
                        gates.push(QuantumGate::Custom(
                            "poly_feature_map".to_string(),
                            vec![i],
                            vec![d as f64],
                        ));
                    }
                    
                    if d > 1 {
                        for i in 0..feature_dim {
                            for j in (i + 1)..feature_dim {
                                gates.push(QuantumGate::CNOT(i, j));
                                gates.push(QuantumGate::Phase(j, std::f64::consts::PI / d as f64));
                                gates.push(QuantumGate::CNOT(i, j));
                            }
                        }
                    }
                }
            }
        }
        
        Ok(QuantumCircuit {
            qubits: n_qubits,
            gates,
            measurements: (0..feature_dim).collect(),
        })
    }
    
    /// Variational Quantum Classifier (VQC)
    pub fn vqc_circuit(
        n_features: usize,
        n_layers: usize,
        entanglement: EntanglementType,
    ) -> Result<QuantumCircuit> {
        let n_qubits = n_features;
        let mut gates = Vec::new();
        
        // Data encoding layer
        for i in 0..n_qubits {
            gates.push(QuantumGate::Custom(
                "data_encoding".to_string(),
                vec![i],
                vec![1.0], // will be replaced with actual data
            ));
        }
        
        // Variational layers
        for layer in 0..n_layers {
            // Parameterized single-qubit rotations
            for i in 0..n_qubits {
                let theta = std::f64::consts::PI / (layer + 1) as f64;
                let phi = std::f64::consts::PI / (2.0 * (layer + 1) as f64);
                
                gates.push(QuantumGate::Custom(
                    "ry_rotation".to_string(),
                    vec![i],
                    vec![theta],
                ));
                gates.push(QuantumGate::Custom(
                    "rz_rotation".to_string(),
                    vec![i],
                    vec![phi],
                ));
            }
            
            // Entangling gates
            match entanglement {
                EntanglementType::Linear => {
                    for i in 0..(n_qubits - 1) {
                        gates.push(QuantumGate::CNOT(i, i + 1));
                    }
                },
                EntanglementType::Circular => {
                    for i in 0..n_qubits {
                        gates.push(QuantumGate::CNOT(i, (i + 1) % n_qubits));
                    }
                },
                EntanglementType::Full => {
                    for i in 0..n_qubits {
                        for j in (i + 1)..n_qubits {
                            gates.push(QuantumGate::CNOT(i, j));
                        }
                    }
                }
            }
        }
        
        Ok(QuantumCircuit {
            qubits: n_qubits,
            gates,
            measurements: vec![0], // measure first qubit for classification
        })
    }
    
    /// Quantum Generative Adversarial Network (QGAN) generator
    pub fn qgan_generator(
        latent_dim: usize,
        output_dim: usize,
        depth: usize,
    ) -> Result<QuantumCircuit> {
        let n_qubits = latent_dim.max(output_dim);
        let mut gates = Vec::new();
        
        // Initialize latent variables in superposition
        for i in 0..latent_dim {
            gates.push(QuantumGate::Hadamard(i));
        }
        
        // Generator layers
        for layer in 0..depth {
            // Mix latent variables
            for i in 0..latent_dim {
                let angle = std::f64::consts::PI / (2.0 + layer as f64);
                gates.push(QuantumGate::Custom(
                    "ry_rotation".to_string(),
                    vec![i],
                    vec![angle],
                ));
            }
            
            // Entangle latent and output qubits
            for i in 0..latent_dim {
                for j in latent_dim..n_qubits.min(latent_dim + output_dim) {
                    gates.push(QuantumGate::CNOT(i, j));
                    gates.push(QuantumGate::Custom(
                        "controlled_ry".to_string(),
                        vec![i, j],
                        vec![std::f64::consts::PI / (4.0 * (layer + 1) as f64)],
                    ));
                }
            }
            
            // Non-linear transformations
            for i in latent_dim..n_qubits.min(latent_dim + output_dim) {
                gates.push(QuantumGate::Custom(
                    "rz_rotation".to_string(),
                    vec![i],
                    vec![std::f64::consts::PI / (3.0 + layer as f64)],
                ));
            }
        }
        
        Ok(QuantumCircuit {
            qubits: n_qubits,
            gates,
            measurements: (latent_dim..n_qubits.min(latent_dim + output_dim)).collect(),
        })
    }
    
    /// Quantum Neural Network layer
    pub fn qnn_layer(
        n_qubits: usize,
        weights: &[f64],
        layer_type: QNNLayerType,
    ) -> Result<QuantumCircuit> {
        let mut gates = Vec::new();
        let mut weight_idx = 0;
        
        match layer_type {
            QNNLayerType::Entangling => {
                // Entangling layer with parameterized gates
                for i in 0..n_qubits {
                    if weight_idx < weights.len() {
                        gates.push(QuantumGate::Custom(
                            "ry_rotation".to_string(),
                            vec![i],
                            vec![weights[weight_idx]],
                        ));
                        weight_idx += 1;
                    }
                }
                
                for i in 0..n_qubits {
                    for j in (i + 1)..n_qubits {
                        gates.push(QuantumGate::CNOT(i, j));
                        if weight_idx < weights.len() {
                            gates.push(QuantumGate::Custom(
                                "rz_rotation".to_string(),
                                vec![j],
                                vec![weights[weight_idx]],
                            ));
                            weight_idx += 1;
                        }
                        gates.push(QuantumGate::CNOT(i, j));
                    }
                }
            },
            QNNLayerType::Pooling => {
                // Quantum pooling layer
                for i in (0..n_qubits).step_by(2) {
                    if i + 1 < n_qubits {
                        gates.push(QuantumGate::CNOT(i, i + 1));
                        if weight_idx < weights.len() {
                            gates.push(QuantumGate::Custom(
                                "controlled_ry".to_string(),
                                vec![i, i + 1],
                                vec![weights[weight_idx]],
                            ));
                            weight_idx += 1;
                        }
                    }
                }
            },
            QNNLayerType::Convolutional { kernel_size } => {
                // Quantum convolutional layer
                for start in 0..(n_qubits - kernel_size + 1) {
                    for i in start..(start + kernel_size) {
                        if weight_idx < weights.len() {
                            gates.push(QuantumGate::Custom(
                                "ry_rotation".to_string(),
                                vec![i],
                                vec![weights[weight_idx]],
                            ));
                            weight_idx += 1;
                        }
                    }
                    
                    // Local entangling within kernel
                    for i in start..(start + kernel_size - 1) {
                        gates.push(QuantumGate::CNOT(i, i + 1));
                    }
                }
            }
        }
        
        Ok(QuantumCircuit {
            qubits: n_qubits,
            gates,
            measurements: (0..n_qubits).collect(),
        })
    }
    
    /// Quantum Reinforcement Learning circuit for ecological decision making
    pub fn qrl_policy_circuit(
        state_dim: usize,
        action_dim: usize,
        exploration_rate: f64,
    ) -> Result<QuantumCircuit> {
        let n_qubits = state_dim + action_dim;
        let mut gates = Vec::new();
        
        // Encode state
        for i in 0..state_dim {
            gates.push(QuantumGate::Custom(
                "state_encoding".to_string(),
                vec![i],
                vec![1.0], // will be replaced with state values
            ));
        }
        
        // Policy network layers
        for layer in 0..3 {
            // State processing
            for i in 0..state_dim {
                let angle = std::f64::consts::PI / (2.0 + layer as f64);
                gates.push(QuantumGate::Custom(
                    "ry_rotation".to_string(),
                    vec![i],
                    vec![angle],
                ));
            }
            
            // State-action entanglement
            for i in 0..state_dim {
                for j in state_dim..(state_dim + action_dim) {
                    gates.push(QuantumGate::CNOT(i, j));
                    gates.push(QuantumGate::Custom(
                        "controlled_ry".to_string(),
                        vec![i, j],
                        vec![std::f64::consts::PI / (4.0 * (layer + 1) as f64)],
                    ));
                }
            }
        }
        
        // Exploration noise
        for i in state_dim..(state_dim + action_dim) {
            gates.push(QuantumGate::Custom(
                "exploration_noise".to_string(),
                vec![i],
                vec![exploration_rate],
            ));
        }
        
        Ok(QuantumCircuit {
            qubits: n_qubits,
            gates,
            measurements: (state_dim..(state_dim + action_dim)).collect(),
        })
    }
    
    /// Quantum autoencoder for mycelial pattern compression
    pub fn quantum_autoencoder(
        input_dim: usize,
        latent_dim: usize,
        depth: usize,
    ) -> Result<QuantumCircuit> {
        let n_qubits = input_dim;
        let mut gates = Vec::new();
        
        // Data encoding
        for i in 0..input_dim {
            gates.push(QuantumGate::Custom(
                "data_encoding".to_string(),
                vec![i],
                vec![1.0],
            ));
        }
        
        // Encoder layers (compress to latent space)
        for layer in 0..depth {
            let compression_ratio = (input_dim - latent_dim) as f64 / depth as f64;
            let active_qubits = input_dim - (layer as f64 * compression_ratio) as usize;
            
            // Variational parameters for compression
            for i in 0..active_qubits {
                let theta = std::f64::consts::PI / (2.0 + layer as f64);
                gates.push(QuantumGate::Custom(
                    "ry_rotation".to_string(),
                    vec![i],
                    vec![theta],
                ));
            }
            
            // Entangling gates for information mixing
            for i in 0..(active_qubits - 1) {
                gates.push(QuantumGate::CNOT(i, i + 1));
                gates.push(QuantumGate::Custom(
                    "rz_rotation".to_string(),
                    vec![i + 1],
                    vec![std::f64::consts::PI / (4.0 * (layer + 1) as f64)],
                ));
            }
        }
        
        // Decoder layers (reconstruct from latent space)
        for layer in 0..depth {
            let expansion_ratio = (input_dim - latent_dim) as f64 / depth as f64;
            let active_qubits = latent_dim + (layer as f64 * expansion_ratio) as usize;
            
            // Reverse entangling
            for i in (0..(active_qubits - 1)).rev() {
                gates.push(QuantumGate::Custom(
                    "rz_rotation".to_string(),
                    vec![i + 1],
                    vec![-std::f64::consts::PI / (4.0 * (depth - layer) as f64)],
                ));
                gates.push(QuantumGate::CNOT(i, i + 1));
            }
            
            // Variational parameters for reconstruction
            for i in 0..active_qubits {
                let theta = -std::f64::consts::PI / (2.0 + (depth - layer - 1) as f64);
                gates.push(QuantumGate::Custom(
                    "ry_rotation".to_string(),
                    vec![i],
                    vec![theta],
                ));
            }
        }
        
        Ok(QuantumCircuit {
            qubits: n_qubits,
            gates,
            measurements: (0..input_dim).collect(),
        })
    }
}

#[derive(Clone, Debug)]
pub enum KernelType {
    Linear,
    RBF { gamma: f64 },
    Polynomial { degree: usize },
}

#[derive(Clone, Debug)]
pub enum EntanglementType {
    Linear,
    Circular,
    Full,
}

#[derive(Clone, Debug)]
pub enum QNNLayerType {
    Entangling,
    Pooling,
    Convolutional { kernel_size: usize },
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_qsvm_linear_kernel() {
        let circuit = QuantumMLCircuits::qsvm_circuit(
            4, 10, KernelType::Linear
        ).unwrap();
        assert!(circuit.qubits >= 4);
    }
    
    #[test]
    fn test_vqc_circuit() {
        let circuit = QuantumMLCircuits::vqc_circuit(
            6, 3, EntanglementType::Circular
        ).unwrap();
        assert_eq!(circuit.qubits, 6);
    }
    
    #[test]
    fn test_quantum_autoencoder() {
        let circuit = QuantumMLCircuits::quantum_autoencoder(8, 3, 2).unwrap();
        assert_eq!(circuit.qubits, 8);
    }
}