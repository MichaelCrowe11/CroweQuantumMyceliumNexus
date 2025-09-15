import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Sphere, Box, Line, Cylinder } from '@react-three/drei';
import * as THREE from 'three';

interface QubitState {
  id: string;
  position: [number, number, number];
  alpha: number; // Amplitude for |0⟩ state
  beta: number;  // Amplitude for |1⟩ state
  phase: number; // Phase
  entangled: boolean;
  entangledWith?: string[];
}

interface QuantumGate {
  id: string;
  type: 'hadamard' | 'pauli_x' | 'pauli_y' | 'pauli_z' | 'cnot' | 'phase' | 'rotation';
  qubits: string[];
  position: [number, number, number];
  angle?: number; // For rotation gates
  color: string;
}

interface QuantumCircuit {
  id: string;
  name: string;
  qubits: QubitState[];
  gates: QuantumGate[];
  connections: Array<{ from: string; to: string }>;
  isExecuting: boolean;
}

const QuantumVisualizer: React.FC = () => {
  const [circuits, setCircuits] = useState<QuantumCircuit[]>([]);
  const [selectedCircuit, setSelectedCircuit] = useState<QuantumCircuit | null>(null);
  const [selectedQubit, setSelectedQubit] = useState<QubitState | null>(null);
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [quantumMetrics, setQuantumMetrics] = useState({
    entanglement: 0,
    coherence: 0,
    fidelity: 0,
    decoherence: 0
  });

  // Generate sample quantum circuits
  useEffect(() => {
    const generateSampleCircuits = (): QuantumCircuit[] => {
      const circuit1: QuantumCircuit = {
        id: 'bell-state',
        name: 'Bell State Generator',
        qubits: [
          {
            id: 'q0',
            position: [-2, 0, 0],
            alpha: 1,
            beta: 0,
            phase: 0,
            entangled: false
          },
          {
            id: 'q1',
            position: [2, 0, 0],
            alpha: 1,
            beta: 0,
            phase: 0,
            entangled: false
          }
        ],
        gates: [
          {
            id: 'h1',
            type: 'hadamard',
            qubits: ['q0'],
            position: [-1, 0, 0],
            color: '#00ffff'
          },
          {
            id: 'cnot1',
            type: 'cnot',
            qubits: ['q0', 'q1'],
            position: [0, 0, 0],
            color: '#ff00ff'
          }
        ],
        connections: [
          { from: 'q0', to: 'h1' },
          { from: 'h1', to: 'cnot1' },
          { from: 'q1', to: 'cnot1' }
        ],
        isExecuting: false
      };

      const circuit2: QuantumCircuit = {
        id: 'grover-search',
        name: 'Grover Search',
        qubits: [
          { id: 'q0', position: [-3, 1, 0], alpha: 1, beta: 0, phase: 0, entangled: false },
          { id: 'q1', position: [-1, 1, 0], alpha: 1, beta: 0, phase: 0, entangled: false },
          { id: 'q2', position: [1, 1, 0], alpha: 1, beta: 0, phase: 0, entangled: false },
          { id: 'q3', position: [3, 1, 0], alpha: 1, beta: 0, phase: 0, entangled: false }
        ],
        gates: [
          { id: 'h1', type: 'hadamard', qubits: ['q0'], position: [-2.5, 1, 0], color: '#00ffff' },
          { id: 'h2', type: 'hadamard', qubits: ['q1'], position: [-0.5, 1, 0], color: '#00ffff' },
          { id: 'h3', type: 'hadamard', qubits: ['q2'], position: [1.5, 1, 0], color: '#00ffff' },
          { id: 'h4', type: 'hadamard', qubits: ['q3'], position: [3.5, 1, 0], color: '#00ffff' }
        ],
        connections: [],
        isExecuting: false
      };

      const circuit3: QuantumCircuit = {
        id: 'shor-algorithm',
        name: 'Shor\'s Algorithm',
        qubits: Array.from({ length: 6 }, (_, i) => ({
          id: `q${i}`,
          position: [-5 + i * 2, -1, 0] as [number, number, number],
          alpha: 1,
          beta: 0,
          phase: 0,
          entangled: false
        })),
        gates: [
          { id: 'qft1', type: 'rotation', qubits: ['q0'], position: [-4, -1, 0], color: '#ffff00', angle: Math.PI / 4 },
          { id: 'qft2', type: 'rotation', qubits: ['q1'], position: [-2, -1, 0], color: '#ffff00', angle: Math.PI / 2 },
          { id: 'qft3', type: 'rotation', qubits: ['q2'], position: [0, -1, 0], color: '#ffff00', angle: Math.PI },
        ],
        connections: [],
        isExecuting: false
      };

      return [circuit1, circuit2, circuit3];
    };

    setCircuits(generateSampleCircuits());
    setSelectedCircuit(generateSampleCircuits()[0]);
  }, []);

  // Quantum simulation
  useEffect(() => {
    if (!simulationRunning) return;

    const interval = setInterval(() => {
      // Update quantum metrics
      setQuantumMetrics(prev => ({
        entanglement: Math.min(100, prev.entanglement + Math.random() * 5),
        coherence: Math.max(0, prev.coherence - Math.random() * 2),
        fidelity: 85 + Math.sin(Date.now() * 0.001) * 10,
        decoherence: Math.min(50, prev.decoherence + Math.random() * 1)
      }));

      // Update qubit states
      if (selectedCircuit) {
        setSelectedCircuit(prev => {
          if (!prev) return prev;

          return {
            ...prev,
            qubits: prev.qubits.map(qubit => {
              const newAlpha = Math.cos(Date.now() * 0.001 + qubit.position[0]);
              const newBeta = Math.sin(Date.now() * 0.001 + qubit.position[0]);
              const normalization = Math.sqrt(newAlpha * newAlpha + newBeta * newBeta);

              return {
                ...qubit,
                alpha: newAlpha / normalization,
                beta: newBeta / normalization,
                phase: (qubit.phase + 0.01) % (2 * Math.PI),
                entangled: Math.random() > 0.7
              };
            })
          };
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [simulationRunning, selectedCircuit]);

  // Bloch Sphere Component
  const BlochSphere: React.FC<{ qubit: QubitState; onClick: () => void }> = ({ qubit, onClick }) => {
    const sphereRef = useRef<THREE.Mesh>(null);
    const vectorRef = useRef<THREE.Group>(null);

    useFrame((state) => {
      if (sphereRef.current) {
        sphereRef.current.rotation.y = state.clock.elapsedTime * 0.2;
      }

      if (vectorRef.current) {
        // Calculate Bloch vector components
        const theta = 2 * Math.acos(Math.abs(qubit.alpha));
        const phi = Math.atan2(qubit.beta, qubit.alpha) + qubit.phase;

        const x = Math.sin(theta) * Math.cos(phi);
        const y = Math.sin(theta) * Math.sin(phi);
        const z = Math.cos(theta);

        vectorRef.current.lookAt(new THREE.Vector3(x, y, z));
      }
    });

    const sphereColor = qubit.entangled ? '#ff00ff' : '#00ffff';

    return (
      <group position={qubit.position} onClick={onClick}>
        {/* Bloch Sphere */}
        <Sphere ref={sphereRef} args={[0.8, 32, 32]}>
          <meshStandardMaterial
            color={sphereColor}
            transparent
            opacity={0.3}
            wireframe
          />
        </Sphere>

        {/* Coordinate axes */}
        <Line
          points={[new THREE.Vector3(-1, 0, 0), new THREE.Vector3(1, 0, 0)]}
          color="#ff0000"
          lineWidth={2}
        />
        <Line
          points={[new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 1, 0)]}
          color="#00ff00"
          lineWidth={2}
        />
        <Line
          points={[new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, 1)]}
          color="#0000ff"
          lineWidth={2}
        />

        {/* State vector */}
        <group ref={vectorRef}>
          <Cylinder args={[0.02, 0.02, 0.8]} rotation={[Math.PI / 2, 0, 0]}>
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} />
          </Cylinder>

          {/* Arrowhead */}
          <Box args={[0.1, 0.1, 0.1]} position={[0, 0, 0.5]}>
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
          </Box>
        </group>

        {/* Qubit label */}
        <Text
          position={[0, -1.2, 0]}
          fontSize={0.3}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          {qubit.id}
        </Text>

        {/* State probabilities */}
        <Text
          position={[0, -1.6, 0]}
          fontSize={0.2}
          color="#00ffff"
          anchorX="center"
          anchorY="middle"
        >
          |0⟩: {(qubit.alpha * qubit.alpha * 100).toFixed(1)}%
        </Text>

        <Text
          position={[0, -1.9, 0]}
          fontSize={0.2}
          color="#ff00ff"
          anchorX="center"
          anchorY="middle"
        >
          |1⟩: {(qubit.beta * qubit.beta * 100).toFixed(1)}%
        </Text>
      </group>
    );
  };

  // Quantum Gate Component
  const QuantumGate3D: React.FC<{ gate: QuantumGate }> = ({ gate }) => {
    const gateRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
      if (gateRef.current) {
        gateRef.current.rotation.y = state.clock.elapsedTime * 0.5;
        gateRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2) * 0.1);
      }
    });

    const getGateSymbol = () => {
      switch (gate.type) {
        case 'hadamard': return 'H';
        case 'pauli_x': return 'X';
        case 'pauli_y': return 'Y';
        case 'pauli_z': return 'Z';
        case 'cnot': return '⊕';
        case 'phase': return 'P';
        case 'rotation': return 'R';
        default: return '?';
      }
    };

    return (
      <group position={gate.position}>
        <Box ref={gateRef} args={[0.6, 0.6, 0.2]}>
          <meshStandardMaterial
            color={gate.color}
            emissive={gate.color}
            emissiveIntensity={0.3}
            transparent
            opacity={0.8}
          />
        </Box>

        <Text
          position={[0, 0, 0.2]}
          fontSize={0.4}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          {getGateSymbol()}
        </Text>
      </group>
    );
  };

  // Entanglement Connection Component
  const EntanglementConnection: React.FC<{ from: [number, number, number]; to: [number, number, number] }> = ({ from, to }) => {
    const lineRef = useRef<THREE.Line>(null);

    useFrame((state) => {
      if (lineRef.current) {
        const material = lineRef.current.material as THREE.LineBasicMaterial;
        material.opacity = 0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.3;
      }
    });

    return (
      <Line
        ref={lineRef}
        points={[new THREE.Vector3(...from), new THREE.Vector3(...to)]}
        color="#ff00ff"
        lineWidth={3}
        transparent
        opacity={0.6}
      />
    );
  };

  return (
    <div className="quantum-visualizer">
      {/* Header */}
      <motion.div
        className="quantum-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="header-left">
          <h2>Quantum Circuit Visualizer</h2>
          <div className="quantum-status">
            <div className={`status-indicator ${simulationRunning ? 'active' : 'inactive'}`} />
            <span>{simulationRunning ? 'Quantum Simulation Active' : 'Simulation Paused'}</span>
          </div>
        </div>

        <div className="header-controls">
          <motion.button
            className={`control-btn ${simulationRunning ? 'active' : ''}`}
            onClick={() => setSimulationRunning(!simulationRunning)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span>{simulationRunning ? '⏸️' : '▶️'}</span>
            {simulationRunning ? 'Pause' : 'Simulate'}
          </motion.button>

          <motion.button
            className="control-btn"
            onClick={() => {
              // Reset quantum state
              if (selectedCircuit) {
                setSelectedCircuit({
                  ...selectedCircuit,
                  qubits: selectedCircuit.qubits.map(q => ({
                    ...q,
                    alpha: 1,
                    beta: 0,
                    phase: 0,
                    entangled: false
                  }))
                });
              }
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span>🔄</span> Reset
          </motion.button>
        </div>
      </motion.div>

      <div className="quantum-content">
        {/* Circuit Selection Sidebar */}
        <motion.div
          className="circuits-panel"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3>Quantum Circuits</h3>
          <div className="circuit-list">
            {circuits.map(circuit => (
              <motion.div
                key={circuit.id}
                className={`circuit-card ${selectedCircuit?.id === circuit.id ? 'selected' : ''}`}
                onClick={() => setSelectedCircuit(circuit)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="circuit-name">{circuit.name}</div>
                <div className="circuit-info">
                  <span>{circuit.qubits.length} qubits</span>
                  <span>{circuit.gates.length} gates</span>
                </div>
                <div className="circuit-status">
                  {circuit.isExecuting ? '🔄 Running' : '⏸️ Ready'}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Quantum Metrics */}
          <div className="quantum-metrics">
            <h4>System Metrics</h4>
            <div className="metric-item">
              <span className="metric-label">Entanglement:</span>
              <div className="metric-bar">
                <div
                  className="metric-fill entanglement"
                  style={{ width: `${quantumMetrics.entanglement}%` }}
                />
              </div>
              <span className="metric-value">{quantumMetrics.entanglement.toFixed(1)}%</span>
            </div>

            <div className="metric-item">
              <span className="metric-label">Coherence:</span>
              <div className="metric-bar">
                <div
                  className="metric-fill coherence"
                  style={{ width: `${quantumMetrics.coherence}%` }}
                />
              </div>
              <span className="metric-value">{quantumMetrics.coherence.toFixed(1)}%</span>
            </div>

            <div className="metric-item">
              <span className="metric-label">Fidelity:</span>
              <div className="metric-bar">
                <div
                  className="metric-fill fidelity"
                  style={{ width: `${quantumMetrics.fidelity}%` }}
                />
              </div>
              <span className="metric-value">{quantumMetrics.fidelity.toFixed(1)}%</span>
            </div>

            <div className="metric-item">
              <span className="metric-label">Decoherence:</span>
              <div className="metric-bar">
                <div
                  className="metric-fill decoherence"
                  style={{ width: `${quantumMetrics.decoherence}%` }}
                />
              </div>
              <span className="metric-value">{quantumMetrics.decoherence.toFixed(1)}%</span>
            </div>
          </div>
        </motion.div>

        {/* 3D Visualization */}
        <motion.div
          className="visualization-container"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="canvas-wrapper">
            <Canvas camera={{ position: [0, 5, 10], fov: 60 }}>
              <ambientLight intensity={0.4} />
              <pointLight position={[10, 10, 10]} intensity={1} />
              <directionalLight position={[-10, 10, 5]} intensity={0.5} />

              {selectedCircuit && (
                <>
                  {/* Render Qubits as Bloch Spheres */}
                  {selectedCircuit.qubits.map(qubit => (
                    <BlochSphere
                      key={qubit.id}
                      qubit={qubit}
                      onClick={() => setSelectedQubit(qubit)}
                    />
                  ))}

                  {/* Render Quantum Gates */}
                  {selectedCircuit.gates.map(gate => (
                    <QuantumGate3D key={gate.id} gate={gate} />
                  ))}

                  {/* Render Entanglement Connections */}
                  {selectedCircuit.qubits
                    .filter(q => q.entangled)
                    .map((qubit, index, entangledQubits) =>
                      entangledQubits.slice(index + 1).map(otherQubit => (
                        <EntanglementConnection
                          key={`${qubit.id}-${otherQubit.id}`}
                          from={qubit.position}
                          to={otherQubit.position}
                        />
                      ))
                    )}
                </>
              )}

              <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
            </Canvas>

            {/* Canvas Overlay */}
            <div className="canvas-overlay">
              <div className="quantum-info">
                <div className="info-item">
                  <span className="info-label">Circuit:</span>
                  <span className="info-value">{selectedCircuit?.name || 'None'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Qubits:</span>
                  <span className="info-value">{selectedCircuit?.qubits.length || 0}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Gates:</span>
                  <span className="info-value">{selectedCircuit?.gates.length || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Qubit Details Panel */}
        <motion.div
          className="details-panel"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3>Qubit Details</h3>

          <AnimatePresence mode="wait">
            {selectedQubit ? (
              <motion.div
                key={selectedQubit.id}
                className="qubit-details"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="detail-header">
                  <div className="qubit-id">{selectedQubit.id}</div>
                  <div className={`qubit-status ${selectedQubit.entangled ? 'entangled' : 'pure'}`}>
                    {selectedQubit.entangled ? 'Entangled' : 'Pure State'}
                  </div>
                </div>

                <div className="state-visualization">
                  <h4>State Vector</h4>
                  <div className="state-equation">
                    |ψ⟩ = {selectedQubit.alpha.toFixed(3)}|0⟩ + {selectedQubit.beta.toFixed(3)}|1⟩
                  </div>
                </div>

                <div className="probability-bars">
                  <div className="prob-item">
                    <span className="prob-label">|0⟩ Probability:</span>
                    <div className="prob-bar">
                      <div
                        className="prob-fill state-0"
                        style={{ width: `${selectedQubit.alpha * selectedQubit.alpha * 100}%` }}
                      />
                    </div>
                    <span className="prob-value">
                      {(selectedQubit.alpha * selectedQubit.alpha * 100).toFixed(1)}%
                    </span>
                  </div>

                  <div className="prob-item">
                    <span className="prob-label">|1⟩ Probability:</span>
                    <div className="prob-bar">
                      <div
                        className="prob-fill state-1"
                        style={{ width: `${selectedQubit.beta * selectedQubit.beta * 100}%` }}
                      />
                    </div>
                    <span className="prob-value">
                      {(selectedQubit.beta * selectedQubit.beta * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="phase-info">
                  <div className="phase-item">
                    <span className="phase-label">Phase:</span>
                    <span className="phase-value">
                      {(selectedQubit.phase * 180 / Math.PI).toFixed(1)}°
                    </span>
                  </div>
                </div>

                <div className="qubit-actions">
                  <button className="action-btn measure">
                    <span>📊</span> Measure
                  </button>
                  <button className="action-btn rotate">
                    <span>🔄</span> Rotate
                  </button>
                  <button className="action-btn reset">
                    <span>↩️</span> Reset
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                className="no-selection"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="no-selection-icon">⚛️</div>
                <div className="no-selection-text">
                  Click on a qubit to view its quantum state
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <style jsx>{`
        .quantum-visualizer {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: rgba(10, 10, 15, 0.9);
          border-radius: 12px;
          overflow: hidden;
        }

        .quantum-header {
          padding: 1.5rem 2rem;
          background: rgba(15, 15, 25, 0.9);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(0, 255, 255, 0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-left h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #ffffff;
          margin: 0 0 0.5rem 0;
          background: linear-gradient(45deg, #ff00ff, #00ffff);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .quantum-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          color: #888;
        }

        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #666;
        }

        .status-indicator.active {
          background: #ff00ff;
          box-shadow: 0 0 10px rgba(255, 0, 255, 0.5);
          animation: quantum-pulse 2s ease-in-out infinite;
        }

        .header-controls {
          display: flex;
          gap: 1rem;
        }

        .control-btn {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 0, 255, 0.3);
          color: #fff;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
          font-size: 0.9rem;
        }

        .control-btn:hover {
          background: rgba(255, 0, 255, 0.1);
          border-color: rgba(255, 0, 255, 0.5);
        }

        .control-btn.active {
          background: rgba(255, 0, 255, 0.2);
          border-color: #ff00ff;
          box-shadow: 0 0 10px rgba(255, 0, 255, 0.3);
        }

        .quantum-content {
          flex: 1;
          display: flex;
          gap: 1rem;
          padding: 1rem;
          overflow: hidden;
        }

        .circuits-panel {
          width: 300px;
          background: rgba(15, 15, 25, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 0, 255, 0.1);
          border-radius: 12px;
          padding: 1.5rem;
          overflow-y: auto;
        }

        .circuits-panel h3 {
          font-size: 1.1rem;
          color: #fff;
          margin-bottom: 1.5rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid rgba(255, 0, 255, 0.2);
        }

        .circuit-list {
          margin-bottom: 2rem;
        }

        .circuit-card {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 0.75rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .circuit-card:hover {
          background: rgba(255, 0, 255, 0.05);
          border-color: rgba(255, 0, 255, 0.3);
        }

        .circuit-card.selected {
          background: rgba(255, 0, 255, 0.1);
          border-color: #ff00ff;
          box-shadow: 0 0 10px rgba(255, 0, 255, 0.3);
        }

        .circuit-name {
          font-size: 1rem;
          font-weight: 600;
          color: #fff;
          margin-bottom: 0.5rem;
        }

        .circuit-info {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          color: #888;
          margin-bottom: 0.5rem;
        }

        .circuit-status {
          font-size: 0.8rem;
          color: #ff00ff;
        }

        .quantum-metrics {
          border-top: 1px solid rgba(255, 0, 255, 0.2);
          padding-top: 1.5rem;
        }

        .quantum-metrics h4 {
          font-size: 1rem;
          color: #fff;
          margin-bottom: 1rem;
        }

        .metric-item {
          margin-bottom: 1rem;
        }

        .metric-label {
          font-size: 0.8rem;
          color: #888;
          display: block;
          margin-bottom: 0.25rem;
        }

        .metric-bar {
          width: 100%;
          height: 6px;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 0.25rem;
        }

        .metric-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .metric-fill.entanglement {
          background: linear-gradient(90deg, #ff00ff, #ff66ff);
        }

        .metric-fill.coherence {
          background: linear-gradient(90deg, #00ffff, #66ffff);
        }

        .metric-fill.fidelity {
          background: linear-gradient(90deg, #00ff00, #66ff66);
        }

        .metric-fill.decoherence {
          background: linear-gradient(90deg, #ff0000, #ff6666);
        }

        .metric-value {
          font-size: 0.8rem;
          color: #fff;
          font-weight: 600;
        }

        .visualization-container {
          flex: 1;
          background: rgba(15, 15, 25, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 0, 255, 0.1);
          border-radius: 12px;
          overflow: hidden;
          position: relative;
        }

        .canvas-wrapper {
          width: 100%;
          height: 100%;
          position: relative;
        }

        .canvas-overlay {
          position: absolute;
          top: 1rem;
          left: 1rem;
          z-index: 100;
          background: rgba(0, 0, 0, 0.7);
          border: 1px solid rgba(255, 0, 255, 0.3);
          border-radius: 8px;
          padding: 1rem;
        }

        .quantum-info {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .info-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }

        .info-label {
          font-size: 0.8rem;
          color: #888;
        }

        .info-value {
          font-size: 0.8rem;
          color: #ff00ff;
          font-weight: 600;
        }

        .details-panel {
          width: 300px;
          background: rgba(15, 15, 25, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 0, 255, 0.1);
          border-radius: 12px;
          padding: 1.5rem;
          overflow-y: auto;
        }

        .details-panel h3 {
          font-size: 1.1rem;
          color: #fff;
          margin-bottom: 1.5rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid rgba(255, 0, 255, 0.2);
        }

        .qubit-details {
          height: 100%;
        }

        .detail-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
        }

        .qubit-id {
          font-size: 1.5rem;
          font-weight: 600;
          color: #ff00ff;
        }

        .qubit-status {
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .qubit-status.entangled {
          background: rgba(255, 0, 255, 0.2);
          color: #ff00ff;
          border: 1px solid rgba(255, 0, 255, 0.3);
        }

        .qubit-status.pure {
          background: rgba(0, 255, 255, 0.2);
          color: #00ffff;
          border: 1px solid rgba(0, 255, 255, 0.3);
        }

        .state-visualization {
          margin-bottom: 2rem;
        }

        .state-visualization h4 {
          font-size: 1rem;
          color: #fff;
          margin-bottom: 1rem;
        }

        .state-equation {
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 0, 255, 0.3);
          border-radius: 8px;
          padding: 1rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.9rem;
          color: #fff;
          text-align: center;
        }

        .probability-bars {
          margin-bottom: 2rem;
        }

        .prob-item {
          margin-bottom: 1rem;
        }

        .prob-label {
          font-size: 0.8rem;
          color: #888;
          display: block;
          margin-bottom: 0.25rem;
        }

        .prob-bar {
          width: 100%;
          height: 8px;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 0.25rem;
        }

        .prob-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .prob-fill.state-0 {
          background: linear-gradient(90deg, #00ffff, #66ffff);
        }

        .prob-fill.state-1 {
          background: linear-gradient(90deg, #ff00ff, #ff66ff);
        }

        .prob-value {
          font-size: 0.8rem;
          color: #fff;
          font-weight: 600;
        }

        .phase-info {
          margin-bottom: 2rem;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
        }

        .phase-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .phase-label {
          font-size: 0.9rem;
          color: #888;
        }

        .phase-value {
          font-size: 0.9rem;
          color: #ffff00;
          font-weight: 600;
          font-family: 'JetBrains Mono', monospace;
        }

        .qubit-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .action-btn {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .action-btn.measure {
          border-color: rgba(0, 255, 255, 0.5);
          color: #00ffff;
        }

        .action-btn.measure:hover {
          background: rgba(0, 255, 255, 0.1);
          border-color: #00ffff;
        }

        .action-btn.rotate {
          border-color: rgba(255, 255, 0, 0.5);
          color: #ffff00;
        }

        .action-btn.rotate:hover {
          background: rgba(255, 255, 0, 0.1);
          border-color: #ffff00;
        }

        .action-btn.reset {
          border-color: rgba(255, 0, 0, 0.5);
          color: #ff0000;
        }

        .action-btn.reset:hover {
          background: rgba(255, 0, 0, 0.1);
          border-color: #ff0000;
        }

        .no-selection {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #888;
          text-align: center;
        }

        .no-selection-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .no-selection-text {
          font-size: 1rem;
        }

        @keyframes quantum-pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.1);
          }
        }

        @media (max-width: 1024px) {
          .quantum-content {
            flex-direction: column;
          }

          .circuits-panel,
          .details-panel {
            width: 100%;
            max-height: 300px;
          }

          .quantum-header {
            flex-direction: column;
            gap: 1rem;
          }

          .header-controls {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default QuantumVisualizer;