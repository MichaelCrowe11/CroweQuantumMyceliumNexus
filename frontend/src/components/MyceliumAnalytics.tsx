import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Sphere, Line, Cylinder, Plane } from '@react-three/drei';
import * as THREE from 'three';

interface MyceliumNode {
  id: string;
  position: [number, number, number];
  strain: 'shiitake' | 'oyster' | 'portobello' | 'reishi' | 'cordyceps';
  health: number; // 0-100
  age: number; // days
  size: number;
  growth_rate: number;
  connections: string[];
  yield_potential: number;
  temperature: number;
  humidity: number;
  ph_level: number;
  nutrients: number;
}

interface MyceliumNetwork {
  id: string;
  name: string;
  nodes: MyceliumNode[];
  total_biomass: number;
  network_density: number;
  growth_efficiency: number;
  harvest_readiness: number;
}

interface GrowthData {
  timestamp: Date;
  biomass: number;
  node_count: number;
  avg_health: number;
  yield_projection: number;
}

const MyceliumAnalytics: React.FC = () => {
  const [networks, setNetworks] = useState<MyceliumNetwork[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<MyceliumNetwork | null>(null);
  const [selectedNode, setSelectedNode] = useState<MyceliumNode | null>(null);
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [showConnections, setShowConnections] = useState(true);
  const [view3D, setView3D] = useState(true);
  const [analyticsRunning, setAnalyticsRunning] = useState(true);

  // Generate sample mycelium networks
  useEffect(() => {
    const generateMyceliumNetworks = (): MyceliumNetwork[] => {
      const strains: MyceliumNode['strain'][] = ['shiitake', 'oyster', 'portobello', 'reishi', 'cordyceps'];

      const network1: MyceliumNetwork = {
        id: 'forest-network-1',
        name: 'Forest Floor Network Alpha',
        nodes: [],
        total_biomass: 0,
        network_density: 0,
        growth_efficiency: 0,
        harvest_readiness: 0
      };

      // Generate nodes in a natural network pattern
      for (let i = 0; i < 25; i++) {
        const angle = (i / 25) * Math.PI * 2;
        const radius = 2 + Math.random() * 3;
        const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 2;
        const z = Math.sin(angle) * radius + (Math.random() - 0.5) * 2;
        const y = Math.sin(x * 0.5) * Math.cos(z * 0.5) * 0.5;

        const node: MyceliumNode = {
          id: `node-${i}`,
          position: [x, y, z],
          strain: strains[Math.floor(Math.random() * strains.length)],
          health: 60 + Math.random() * 40,
          age: Math.floor(Math.random() * 30),
          size: 0.1 + Math.random() * 0.3,
          growth_rate: 0.05 + Math.random() * 0.1,
          connections: [],
          yield_potential: 50 + Math.random() * 50,
          temperature: 18 + Math.random() * 8,
          humidity: 70 + Math.random() * 25,
          ph_level: 6.0 + Math.random() * 2.0,
          nutrients: 40 + Math.random() * 60
        };

        network1.nodes.push(node);
      }

      // Create connections based on proximity
      network1.nodes.forEach((node, index) => {
        const nearby = network1.nodes.filter((other, otherIndex) => {
          if (index === otherIndex) return false;
          const distance = Math.sqrt(
            Math.pow(node.position[0] - other.position[0], 2) +
            Math.pow(node.position[1] - other.position[1], 2) +
            Math.pow(node.position[2] - other.position[2], 2)
          );
          return distance < 2.5;
        });

        node.connections = nearby.slice(0, 3).map(n => n.id);
      });

      // Calculate network metrics
      network1.total_biomass = network1.nodes.reduce((sum, node) => sum + node.size * node.health, 0);
      network1.network_density = network1.nodes.reduce((sum, node) => sum + node.connections.length, 0) / network1.nodes.length;
      network1.growth_efficiency = network1.nodes.reduce((sum, node) => sum + node.growth_rate, 0) / network1.nodes.length * 100;
      network1.harvest_readiness = network1.nodes.reduce((sum, node) => sum + node.yield_potential, 0) / network1.nodes.length;

      const network2: MyceliumNetwork = {
        id: 'cultivation-lab-1',
        name: 'Controlled Environment Lab',
        nodes: [],
        total_biomass: 0,
        network_density: 0,
        growth_efficiency: 0,
        harvest_readiness: 0
      };

      // Generate nodes in a more organized pattern
      for (let x = -2; x <= 2; x += 1) {
        for (let z = -2; z <= 2; z += 1) {
          const node: MyceliumNode = {
            id: `lab-${x}-${z}`,
            position: [x, 0, z],
            strain: 'shiitake', // Controlled environment uses single strain
            health: 80 + Math.random() * 20,
            age: 10 + Math.floor(Math.random() * 15),
            size: 0.15 + Math.random() * 0.2,
            growth_rate: 0.08 + Math.random() * 0.05,
            connections: [],
            yield_potential: 70 + Math.random() * 30,
            temperature: 22 + Math.random() * 2,
            humidity: 85 + Math.random() * 10,
            ph_level: 6.5 + Math.random() * 0.5,
            nutrients: 80 + Math.random() * 20
          };

          network2.nodes.push(node);
        }
      }

      // Create grid-like connections
      network2.nodes.forEach(node => {
        const [x, y, z] = node.position;
        const connections = network2.nodes.filter(other => {
          const [ox, oy, oz] = other.position;
          const distance = Math.sqrt((x - ox) ** 2 + (z - oz) ** 2);
          return distance > 0 && distance <= 1.5;
        });
        node.connections = connections.slice(0, 4).map(n => n.id);
      });

      // Calculate metrics
      network2.total_biomass = network2.nodes.reduce((sum, node) => sum + node.size * node.health, 0);
      network2.network_density = network2.nodes.reduce((sum, node) => sum + node.connections.length, 0) / network2.nodes.length;
      network2.growth_efficiency = network2.nodes.reduce((sum, node) => sum + node.growth_rate, 0) / network2.nodes.length * 100;
      network2.harvest_readiness = network2.nodes.reduce((sum, node) => sum + node.yield_potential, 0) / network2.nodes.length;

      return [network1, network2];
    };

    const initialNetworks = generateMyceliumNetworks();
    setNetworks(initialNetworks);
    setSelectedNetwork(initialNetworks[0]);

    // Generate historical growth data
    const generateGrowthData = (): GrowthData[] => {
      const data: GrowthData[] = [];
      const now = new Date();

      for (let i = 0; i < 30; i++) {
        const timestamp = new Date(now.getTime() - i * 24 * 60 * 60 * 1000); // Daily data
        data.unshift({
          timestamp,
          biomass: 50 + i * 2 + Math.sin(i * 0.2) * 10 + Math.random() * 5,
          node_count: 15 + Math.floor(i * 0.5) + Math.floor(Math.random() * 3),
          avg_health: 70 + Math.sin(i * 0.15) * 15 + Math.random() * 5,
          yield_projection: 100 + i * 5 + Math.cos(i * 0.1) * 20 + Math.random() * 10
        });
      }
      return data;
    };

    setGrowthData(generateGrowthData());
  }, []);

  // Simulation loop
  useEffect(() => {
    if (!analyticsRunning || !selectedNetwork) return;

    const interval = setInterval(() => {
      // Update node properties
      setSelectedNetwork(prev => {
        if (!prev) return prev;

        const updatedNodes = prev.nodes.map(node => ({
          ...node,
          size: Math.min(0.5, node.size + node.growth_rate * simulationSpeed * 0.01),
          age: node.age + simulationSpeed * 0.1,
          health: Math.max(0, Math.min(100, node.health + (Math.random() - 0.48) * simulationSpeed)),
          yield_potential: Math.max(0, Math.min(100, node.yield_potential + (Math.random() - 0.49) * simulationSpeed * 2))
        }));

        // Recalculate network metrics
        const total_biomass = updatedNodes.reduce((sum, node) => sum + node.size * node.health, 0);
        const network_density = updatedNodes.reduce((sum, node) => sum + node.connections.length, 0) / updatedNodes.length;
        const growth_efficiency = updatedNodes.reduce((sum, node) => sum + node.growth_rate, 0) / updatedNodes.length * 100;
        const harvest_readiness = updatedNodes.reduce((sum, node) => sum + node.yield_potential, 0) / updatedNodes.length;

        return {
          ...prev,
          nodes: updatedNodes,
          total_biomass,
          network_density,
          growth_efficiency,
          harvest_readiness
        };
      });

      // Add new growth data point
      setGrowthData(prev => {
        const latest = prev[prev.length - 1];
        const newPoint: GrowthData = {
          timestamp: new Date(),
          biomass: Math.max(0, latest.biomass + (Math.random() - 0.48) * simulationSpeed),
          node_count: latest.node_count + (Math.random() > 0.95 ? 1 : 0),
          avg_health: Math.max(0, Math.min(100, latest.avg_health + (Math.random() - 0.48) * simulationSpeed)),
          yield_projection: Math.max(0, latest.yield_projection + (Math.random() - 0.47) * simulationSpeed * 2)
        };
        return [...prev.slice(-29), newPoint]; // Keep last 30 days
      });
    }, 1000 / simulationSpeed);

    return () => clearInterval(interval);
  }, [analyticsRunning, simulationSpeed, selectedNetwork]);

  const getStrainColor = (strain: MyceliumNode['strain']): string => {
    switch (strain) {
      case 'shiitake': return '#8B4513';
      case 'oyster': return '#F5F5DC';
      case 'portobello': return '#A0522D';
      case 'reishi': return '#DC143C';
      case 'cordyceps': return '#FF8C00';
      default: return '#FFFFFF';
    }
  };

  const getHealthColor = (health: number): string => {
    if (health > 80) return '#00FF00';
    if (health > 60) return '#FFFF00';
    if (health > 40) return '#FFA500';
    return '#FF0000';
  };

  // 3D Mycelium Node Component
  const MyceliumNode3D: React.FC<{ node: MyceliumNode; onClick: () => void }> = ({ node, onClick }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    useFrame((state) => {
      if (meshRef.current) {
        meshRef.current.rotation.y = state.clock.elapsedTime * 0.2;
        meshRef.current.scale.setScalar(
          node.size * (1 + Math.sin(state.clock.elapsedTime * 2 + node.position[0]) * 0.1)
        );
      }
    });

    return (
      <group position={node.position}>
        <Sphere
          ref={meshRef}
          args={[0.5, 16, 16]}
          onClick={onClick}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <meshStandardMaterial
            color={getStrainColor(node.strain)}
            emissive={getHealthColor(node.health)}
            emissiveIntensity={0.2}
            transparent
            opacity={node.health / 100}
          />
        </Sphere>

        {/* Growth rings */}
        {node.health > 70 && (
          <Sphere args={[0.7, 16, 16]}>
            <meshStandardMaterial
              color={getStrainColor(node.strain)}
              transparent
              opacity={0.1}
              wireframe
            />
          </Sphere>
        )}

        {/* Health indicator */}
        <Text
          position={[0, 0.8, 0]}
          fontSize={0.2}
          color={getHealthColor(node.health)}
          anchorX="center"
          anchorY="middle"
        >
          {node.health.toFixed(0)}%
        </Text>

        {/* Strain label */}
        <Text
          position={[0, -0.8, 0]}
          fontSize={0.15}
          color="#FFFFFF"
          anchorX="center"
          anchorY="middle"
        >
          {node.strain}
        </Text>

        {hovered && (
          <Text
            position={[0, 1.2, 0]}
            fontSize={0.15}
            color="#00FFFF"
            anchorX="center"
            anchorY="middle"
          >
            Age: {node.age.toFixed(1)} days
          </Text>
        )}
      </group>
    );
  };

  // Network Connection Component
  const NetworkConnection: React.FC<{ from: [number, number, number]; to: [number, number, number]; strength: number }> = ({ from, to, strength }) => {
    const lineRef = useRef<THREE.Line>(null);

    useFrame((state) => {
      if (lineRef.current) {
        const material = lineRef.current.material as THREE.LineBasicMaterial;
        material.opacity = 0.3 + Math.sin(state.clock.elapsedTime * 3) * 0.2 * strength;
      }
    });

    return (
      <Line
        ref={lineRef}
        points={[new THREE.Vector3(...from), new THREE.Vector3(...to)]}
        color="#00FF00"
        lineWidth={strength * 2}
        transparent
        opacity={0.4}
      />
    );
  };

  // Substrate/Growing Medium Component
  const GrowingMedium: React.FC = () => {
    return (
      <Plane args={[20, 20]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
        <meshStandardMaterial
          color="#2F1B14"
          transparent
          opacity={0.6}
        />
      </Plane>
    );
  };

  return (
    <div className="mycelium-analytics">
      {/* Header */}
      <motion.div
        className="analytics-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="header-left">
          <h2>Mycelium Network Analytics</h2>
          <div className="network-status">
            <div className={`status-indicator ${analyticsRunning ? 'active' : 'inactive'}`} />
            <span>{analyticsRunning ? 'Real-time Monitoring' : 'Analysis Paused'}</span>
          </div>
        </div>

        <div className="header-controls">
          <div className="speed-control">
            <label>Simulation Speed:</label>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={simulationSpeed}
              onChange={(e) => setSimulationSpeed(parseFloat(e.target.value))}
            />
            <span>{simulationSpeed.toFixed(1)}x</span>
          </div>

          <motion.button
            className={`control-btn ${analyticsRunning ? 'active' : ''}`}
            onClick={() => setAnalyticsRunning(!analyticsRunning)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span>{analyticsRunning ? '⏸️' : '▶️'}</span>
            {analyticsRunning ? 'Pause' : 'Resume'}
          </motion.button>

          <motion.button
            className={`control-btn ${showConnections ? 'active' : ''}`}
            onClick={() => setShowConnections(!showConnections)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span>🔗</span> Connections
          </motion.button>

          <motion.button
            className={`control-btn ${view3D ? 'active' : ''}`}
            onClick={() => setView3D(!view3D)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span>🌐</span> 3D View
          </motion.button>
        </div>
      </motion.div>

      <div className="analytics-content">
        {/* Network Selection & Metrics */}
        <motion.div
          className="networks-panel"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3>Mycelium Networks</h3>
          <div className="network-list">
            {networks.map(network => (
              <motion.div
                key={network.id}
                className={`network-card ${selectedNetwork?.id === network.id ? 'selected' : ''}`}
                onClick={() => setSelectedNetwork(network)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="network-name">{network.name}</div>
                <div className="network-stats">
                  <div className="stat">
                    <span className="stat-label">Nodes:</span>
                    <span className="stat-value">{network.nodes.length}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Biomass:</span>
                    <span className="stat-value">{network.total_biomass.toFixed(1)}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Density:</span>
                    <span className="stat-value">{network.network_density.toFixed(1)}</span>
                  </div>
                </div>
                <div className="readiness-bar">
                  <div
                    className="readiness-fill"
                    style={{ width: `${network.harvest_readiness}%` }}
                  />
                </div>
                <div className="readiness-label">
                  Harvest Ready: {network.harvest_readiness.toFixed(0)}%
                </div>
              </motion.div>
            ))}
          </div>

          {/* Growth Metrics */}
          <div className="growth-metrics">
            <h4>Growth Analytics</h4>
            {growthData.length > 0 && (
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-icon">🍄</div>
                  <div className="metric-content">
                    <div className="metric-value">
                      {growthData[growthData.length - 1].biomass.toFixed(1)}kg
                    </div>
                    <div className="metric-label">Total Biomass</div>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon">📊</div>
                  <div className="metric-content">
                    <div className="metric-value">
                      {growthData[growthData.length - 1].yield_projection.toFixed(0)}%
                    </div>
                    <div className="metric-label">Yield Projection</div>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon">🌱</div>
                  <div className="metric-content">
                    <div className="metric-value">
                      {growthData[growthData.length - 1].node_count}
                    </div>
                    <div className="metric-label">Active Nodes</div>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon">💚</div>
                  <div className="metric-content">
                    <div className="metric-value">
                      {growthData[growthData.length - 1].avg_health.toFixed(0)}%
                    </div>
                    <div className="metric-label">Avg Health</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Strain Distribution */}
          {selectedNetwork && (
            <div className="strain-distribution">
              <h4>Strain Distribution</h4>
              {['shiitake', 'oyster', 'portobello', 'reishi', 'cordyceps'].map(strain => {
                const count = selectedNetwork.nodes.filter(n => n.strain === strain).length;
                const percentage = (count / selectedNetwork.nodes.length) * 100;

                return count > 0 ? (
                  <div key={strain} className="strain-item">
                    <div className="strain-info">
                      <span className="strain-name">{strain}</span>
                      <span className="strain-count">{count}</span>
                    </div>
                    <div className="strain-bar">
                      <div
                        className="strain-fill"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: getStrainColor(strain as MyceliumNode['strain'])
                        }}
                      />
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          )}
        </motion.div>

        {/* 3D Visualization */}
        <motion.div
          className="visualization-container"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          {view3D ? (
            <div className="canvas-wrapper">
              <Canvas camera={{ position: [8, 8, 8], fov: 60 }}>
                <ambientLight intensity={0.4} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                <directionalLight position={[-10, 10, 5]} intensity={0.5} />

                {/* Growing Medium */}
                <GrowingMedium />

                {selectedNetwork && (
                  <>
                    {/* Render Mycelium Nodes */}
                    {selectedNetwork.nodes.map(node => (
                      <MyceliumNode3D
                        key={node.id}
                        node={node}
                        onClick={() => setSelectedNode(node)}
                      />
                    ))}

                    {/* Render Network Connections */}
                    {showConnections && selectedNetwork.nodes.map(node =>
                      node.connections.map(connectionId => {
                        const connectedNode = selectedNetwork.nodes.find(n => n.id === connectionId);
                        if (!connectedNode) return null;

                        const strength = Math.min(node.health, connectedNode.health) / 100;
                        return (
                          <NetworkConnection
                            key={`${node.id}-${connectionId}`}
                            from={node.position}
                            to={connectedNode.position}
                            strength={strength}
                          />
                        );
                      })
                    )}
                  </>
                )}

                <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
              </Canvas>

              {/* Canvas Overlay */}
              <div className="canvas-overlay">
                <div className="network-info">
                  <div className="info-item">
                    <span className="info-label">Network:</span>
                    <span className="info-value">{selectedNetwork?.name || 'None'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Efficiency:</span>
                    <span className="info-value">
                      {selectedNetwork?.growth_efficiency.toFixed(1)}%
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Density:</span>
                    <span className="info-value">
                      {selectedNetwork?.network_density.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid-view">
              <div className="node-grid">
                {selectedNetwork?.nodes.map(node => (
                  <motion.div
                    key={node.id}
                    className={`node-card ${node.strain}`}
                    onClick={() => setSelectedNode(node)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      borderColor: getHealthColor(node.health),
                      backgroundColor: `${getStrainColor(node.strain)}20`
                    }}
                  >
                    <div className="node-header">
                      <div className="node-strain">{node.strain}</div>
                      <div className="node-health" style={{ color: getHealthColor(node.health) }}>
                        {node.health.toFixed(0)}%
                      </div>
                    </div>
                    <div className="node-metrics">
                      <div className="node-metric">
                        <span>Age:</span>
                        <span>{node.age.toFixed(1)}d</span>
                      </div>
                      <div className="node-metric">
                        <span>Size:</span>
                        <span>{(node.size * 100).toFixed(0)}%</span>
                      </div>
                      <div className="node-metric">
                        <span>Yield:</span>
                        <span>{node.yield_potential.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="growth-rate">
                      Growth: {(node.growth_rate * 100).toFixed(1)}%/h
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Node Details Panel */}
        <motion.div
          className="details-panel"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3>Node Analysis</h3>

          <AnimatePresence mode="wait">
            {selectedNode ? (
              <motion.div
                key={selectedNode.id}
                className="node-details"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="detail-header">
                  <div className="node-id">{selectedNode.id}</div>
                  <div
                    className="strain-badge"
                    style={{ backgroundColor: getStrainColor(selectedNode.strain) }}
                  >
                    {selectedNode.strain}
                  </div>
                </div>

                <div className="environmental-conditions">
                  <h4>Environmental Conditions</h4>
                  <div className="condition-grid">
                    <div className="condition-item">
                      <span className="condition-label">Temperature:</span>
                      <span className="condition-value">{selectedNode.temperature.toFixed(1)}°C</span>
                    </div>
                    <div className="condition-item">
                      <span className="condition-label">Humidity:</span>
                      <span className="condition-value">{selectedNode.humidity.toFixed(1)}%</span>
                    </div>
                    <div className="condition-item">
                      <span className="condition-label">pH Level:</span>
                      <span className="condition-value">{selectedNode.ph_level.toFixed(1)}</span>
                    </div>
                    <div className="condition-item">
                      <span className="condition-label">Nutrients:</span>
                      <span className="condition-value">{selectedNode.nutrients.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>

                <div className="growth-analysis">
                  <h4>Growth Analysis</h4>
                  <div className="analysis-metrics">
                    <div className="analysis-item">
                      <span className="analysis-label">Health Status:</span>
                      <div className="health-bar">
                        <div
                          className="health-fill"
                          style={{
                            width: `${selectedNode.health}%`,
                            backgroundColor: getHealthColor(selectedNode.health)
                          }}
                        />
                      </div>
                      <span className="analysis-value">{selectedNode.health.toFixed(0)}%</span>
                    </div>

                    <div className="analysis-item">
                      <span className="analysis-label">Yield Potential:</span>
                      <div className="yield-bar">
                        <div
                          className="yield-fill"
                          style={{ width: `${selectedNode.yield_potential}%` }}
                        />
                      </div>
                      <span className="analysis-value">{selectedNode.yield_potential.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>

                <div className="network-connections">
                  <h4>Network Connections</h4>
                  <div className="connections-count">
                    Connected to {selectedNode.connections.length} nodes
                  </div>
                  <div className="connections-list">
                    {selectedNode.connections.slice(0, 5).map(connectionId => (
                      <div key={connectionId} className="connection-item">
                        <span className="connection-icon">🔗</span>
                        <span className="connection-id">{connectionId}</span>
                      </div>
                    ))}
                    {selectedNode.connections.length > 5 && (
                      <div className="connection-more">
                        +{selectedNode.connections.length - 5} more
                      </div>
                    )}
                  </div>
                </div>

                <div className="node-actions">
                  <button className="action-btn harvest">
                    <span>🌾</span> Harvest
                  </button>
                  <button className="action-btn optimize">
                    <span>⚡</span> Optimize
                  </button>
                  <button className="action-btn isolate">
                    <span>🔬</span> Isolate
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                className="no-selection"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="no-selection-icon">🍄</div>
                <div className="no-selection-text">
                  Select a mycelium node to view detailed analysis
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <style jsx>{`
        .mycelium-analytics {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: rgba(10, 10, 15, 0.9);
          border-radius: 12px;
          overflow: hidden;
        }

        .analytics-header {
          padding: 1.5rem 2rem;
          background: rgba(15, 15, 25, 0.9);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 165, 0, 0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .header-left h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #ffffff;
          margin: 0 0 0.5rem 0;
          background: linear-gradient(45deg, #ff8c00, #ffa500);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .network-status {
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
          background: #ff8c00;
          box-shadow: 0 0 10px rgba(255, 140, 0, 0.5);
          animation: mycelium-pulse 2s ease-in-out infinite;
        }

        .header-controls {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .speed-control {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: #888;
        }

        .speed-control input[type="range"] {
          width: 80px;
          accent-color: #ff8c00;
        }

        .control-btn {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 140, 0, 0.3);
          color: #fff;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
          font-size: 0.9rem;
        }

        .control-btn:hover {
          background: rgba(255, 140, 0, 0.1);
          border-color: rgba(255, 140, 0, 0.5);
        }

        .control-btn.active {
          background: rgba(255, 140, 0, 0.2);
          border-color: #ff8c00;
          box-shadow: 0 0 10px rgba(255, 140, 0, 0.3);
        }

        .analytics-content {
          flex: 1;
          display: flex;
          gap: 1rem;
          padding: 1rem;
          overflow: hidden;
        }

        .networks-panel {
          width: 300px;
          background: rgba(15, 15, 25, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 140, 0, 0.1);
          border-radius: 12px;
          padding: 1.5rem;
          overflow-y: auto;
        }

        .networks-panel h3 {
          font-size: 1.1rem;
          color: #fff;
          margin-bottom: 1.5rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid rgba(255, 140, 0, 0.2);
        }

        .network-list {
          margin-bottom: 2rem;
        }

        .network-card {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 0.75rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .network-card:hover {
          background: rgba(255, 140, 0, 0.05);
          border-color: rgba(255, 140, 0, 0.3);
        }

        .network-card.selected {
          background: rgba(255, 140, 0, 0.1);
          border-color: #ff8c00;
          box-shadow: 0 0 10px rgba(255, 140, 0, 0.3);
        }

        .network-name {
          font-size: 1rem;
          font-weight: 600;
          color: #fff;
          margin-bottom: 0.75rem;
        }

        .network-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .stat {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
        }

        .stat-label {
          color: #888;
        }

        .stat-value {
          color: #ff8c00;
          font-weight: 600;
        }

        .readiness-bar {
          width: 100%;
          height: 4px;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 0.25rem;
        }

        .readiness-fill {
          height: 100%;
          background: linear-gradient(90deg, #ff8c00, #ffa500);
          border-radius: 2px;
          transition: width 0.3s ease;
        }

        .readiness-label {
          font-size: 0.7rem;
          color: #888;
          text-align: center;
        }

        .growth-metrics {
          margin-bottom: 2rem;
        }

        .growth-metrics h4 {
          font-size: 1rem;
          color: #fff;
          margin-bottom: 1rem;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }

        .metric-card {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 140, 0, 0.2);
          border-radius: 8px;
          padding: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .metric-icon {
          font-size: 1.2rem;
        }

        .metric-content {
          flex: 1;
        }

        .metric-value {
          font-size: 1rem;
          font-weight: 600;
          color: #ff8c00;
          line-height: 1;
        }

        .metric-label {
          font-size: 0.7rem;
          color: #888;
          margin-top: 0.25rem;
        }

        .strain-distribution h4 {
          font-size: 1rem;
          color: #fff;
          margin-bottom: 1rem;
        }

        .strain-item {
          margin-bottom: 0.75rem;
        }

        .strain-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.25rem;
        }

        .strain-name {
          font-size: 0.8rem;
          color: #fff;
          text-transform: capitalize;
        }

        .strain-count {
          font-size: 0.8rem;
          color: #888;
        }

        .strain-bar {
          width: 100%;
          height: 4px;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 2px;
          overflow: hidden;
        }

        .strain-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.3s ease;
        }

        .visualization-container {
          flex: 1;
          background: rgba(15, 15, 25, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 140, 0, 0.1);
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
          border: 1px solid rgba(255, 140, 0, 0.3);
          border-radius: 8px;
          padding: 1rem;
        }

        .network-info {
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
          color: #ff8c00;
          font-weight: 600;
        }

        .grid-view {
          padding: 1.5rem;
          height: 100%;
          overflow-y: auto;
        }

        .node-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
        }

        .node-card {
          background: rgba(0, 0, 0, 0.3);
          border: 2px solid;
          border-radius: 8px;
          padding: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .node-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .node-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .node-strain {
          font-size: 0.9rem;
          font-weight: 600;
          color: #fff;
          text-transform: capitalize;
        }

        .node-health {
          font-size: 0.9rem;
          font-weight: 600;
        }

        .node-metrics {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          margin-bottom: 0.75rem;
        }

        .node-metric {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          color: #888;
        }

        .growth-rate {
          font-size: 0.8rem;
          color: #ff8c00;
          text-align: center;
          font-weight: 600;
        }

        .details-panel {
          width: 300px;
          background: rgba(15, 15, 25, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 140, 0, 0.1);
          border-radius: 12px;
          padding: 1.5rem;
          overflow-y: auto;
        }

        .details-panel h3 {
          font-size: 1.1rem;
          color: #fff;
          margin-bottom: 1.5rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid rgba(255, 140, 0, 0.2);
        }

        .node-details {
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

        .node-id {
          font-size: 1.1rem;
          font-weight: 600;
          color: #fff;
        }

        .strain-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
          color: #fff;
          text-transform: capitalize;
        }

        .environmental-conditions {
          margin-bottom: 2rem;
        }

        .environmental-conditions h4 {
          font-size: 1rem;
          color: #fff;
          margin-bottom: 1rem;
        }

        .condition-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
        }

        .condition-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .condition-label {
          font-size: 0.8rem;
          color: #888;
        }

        .condition-value {
          font-size: 0.9rem;
          color: #ff8c00;
          font-weight: 600;
        }

        .growth-analysis {
          margin-bottom: 2rem;
        }

        .growth-analysis h4 {
          font-size: 1rem;
          color: #fff;
          margin-bottom: 1rem;
        }

        .analysis-metrics {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .analysis-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .analysis-label {
          font-size: 0.8rem;
          color: #888;
        }

        .health-bar,
        .yield-bar {
          width: 100%;
          height: 6px;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 3px;
          overflow: hidden;
        }

        .health-fill,
        .yield-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .yield-fill {
          background: linear-gradient(90deg, #ff8c00, #ffa500);
        }

        .analysis-value {
          font-size: 0.8rem;
          color: #fff;
          font-weight: 600;
          align-self: flex-end;
        }

        .network-connections {
          margin-bottom: 2rem;
        }

        .network-connections h4 {
          font-size: 1rem;
          color: #fff;
          margin-bottom: 1rem;
        }

        .connections-count {
          font-size: 0.9rem;
          color: #888;
          margin-bottom: 0.75rem;
        }

        .connections-list {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .connection-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: #ccc;
        }

        .connection-icon {
          font-size: 0.7rem;
        }

        .connection-more {
          font-size: 0.8rem;
          color: #888;
          font-style: italic;
          margin-top: 0.25rem;
        }

        .node-actions {
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

        .action-btn.harvest {
          border-color: rgba(0, 255, 0, 0.5);
          color: #00ff00;
        }

        .action-btn.harvest:hover {
          background: rgba(0, 255, 0, 0.1);
          border-color: #00ff00;
        }

        .action-btn.optimize {
          border-color: rgba(255, 255, 0, 0.5);
          color: #ffff00;
        }

        .action-btn.optimize:hover {
          background: rgba(255, 255, 0, 0.1);
          border-color: #ffff00;
        }

        .action-btn.isolate {
          border-color: rgba(0, 255, 255, 0.5);
          color: #00ffff;
        }

        .action-btn.isolate:hover {
          background: rgba(0, 255, 255, 0.1);
          border-color: #00ffff;
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

        @keyframes mycelium-pulse {
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
          .analytics-content {
            flex-direction: column;
          }

          .networks-panel,
          .details-panel {
            width: 100%;
            max-height: 300px;
          }

          .analytics-header {
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

export default MyceliumAnalytics;