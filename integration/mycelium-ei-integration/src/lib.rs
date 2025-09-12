use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;

pub mod quantum_bridge;
pub mod mycelium_executor;
pub mod data_transformer;
pub mod orchestrator;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuantumMyceliumConfig {
    pub quantum_enabled: bool,
    pub mycelium_runtime_threads: usize,
    pub quantum_compute_nodes: Vec<String>,
    pub data_pipeline_config: PipelineConfig,
    pub optimization_level: OptimizationLevel,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineConfig {
    pub batch_size: usize,
    pub buffer_size: usize,
    pub timeout_ms: u64,
    pub retry_attempts: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OptimizationLevel {
    None,
    Basic,
    Aggressive,
    Quantum,
}

pub struct QuantumMyceliumNexus {
    config: Arc<RwLock<QuantumMyceliumConfig>>,
    quantum_bridge: Arc<quantum_bridge::QuantumBridge>,
    mycelium_executor: Arc<mycelium_executor::MyceliumExecutor>,
    orchestrator: Arc<orchestrator::Orchestrator>,
}

impl QuantumMyceliumNexus {
    pub async fn new(config: QuantumMyceliumConfig) -> Result<Self> {
        let config = Arc::new(RwLock::new(config));
        
        let quantum_bridge = Arc::new(
            quantum_bridge::QuantumBridge::new(config.clone()).await?
        );
        
        let mycelium_executor = Arc::new(
            mycelium_executor::MyceliumExecutor::new(config.clone()).await?
        );
        
        let orchestrator = Arc::new(
            orchestrator::Orchestrator::new(
                config.clone(),
                quantum_bridge.clone(),
                mycelium_executor.clone()
            ).await?
        );
        
        Ok(Self {
            config,
            quantum_bridge,
            mycelium_executor,
            orchestrator,
        })
    }
    
    pub async fn initialize(&self) -> Result<()> {
        self.quantum_bridge.initialize().await?;
        self.mycelium_executor.initialize().await?;
        self.orchestrator.start().await?;
        Ok(())
    }
    
    pub async fn execute_hybrid_computation(
        &self,
        mycelium_code: &str,
        quantum_circuit: Option<QuantumCircuit>,
    ) -> Result<ComputationResult> {
        self.orchestrator.execute_hybrid(mycelium_code, quantum_circuit).await
    }
    
    pub async fn shutdown(&self) -> Result<()> {
        self.orchestrator.stop().await?;
        self.mycelium_executor.shutdown().await?;
        self.quantum_bridge.shutdown().await?;
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuantumCircuit {
    pub qubits: usize,
    pub gates: Vec<QuantumGate>,
    pub measurements: Vec<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum QuantumGate {
    Hadamard(usize),
    PauliX(usize),
    PauliY(usize),
    PauliZ(usize),
    CNOT(usize, usize),
    Toffoli(usize, usize, usize),
    Phase(usize, f64),
    Custom(String, Vec<usize>, Vec<f64>),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComputationResult {
    pub mycelium_output: Option<serde_json::Value>,
    pub quantum_output: Option<QuantumResult>,
    pub hybrid_metrics: HybridMetrics,
    pub execution_time_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuantumResult {
    pub state_vector: Option<Vec<f64>>,
    pub measurements: Vec<u8>,
    pub probabilities: Vec<f64>,
    pub entanglement_entropy: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HybridMetrics {
    pub quantum_speedup: f64,
    pub accuracy_improvement: f64,
    pub resource_utilization: ResourceMetrics,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceMetrics {
    pub cpu_usage: f64,
    pub memory_usage: f64,
    pub quantum_coherence_time: f64,
    pub network_latency_ms: f64,
}

impl Default for QuantumMyceliumConfig {
    fn default() -> Self {
        Self {
            quantum_enabled: true,
            mycelium_runtime_threads: 4,
            quantum_compute_nodes: vec!["localhost:9000".to_string()],
            data_pipeline_config: PipelineConfig {
                batch_size: 100,
                buffer_size: 1000,
                timeout_ms: 5000,
                retry_attempts: 3,
            },
            optimization_level: OptimizationLevel::Basic,
        }
    }
}