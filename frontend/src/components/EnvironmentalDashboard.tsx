import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Sphere, Box, Line } from '@react-three/drei';
import * as THREE from 'three';

interface SensorNode {
  id: string;
  position: [number, number, number];
  type: 'temperature' | 'humidity' | 'air_quality' | 'soil_ph' | 'wind_speed' | 'pressure';
  value: number;
  status: 'active' | 'warning' | 'critical' | 'offline';
  lastUpdate: Date;
  trend: 'up' | 'down' | 'stable';
}

interface EnvironmentalData {
  timestamp: Date;
  temperature: number;
  humidity: number;
  airQuality: number;
  windSpeed: number;
  pressure: number;
  soilPh: number;
}

interface TerrainPoint {
  x: number;
  y: number;
  z: number;
  elevation: number;
  temperature: number;
  vegetation: number;
}

const EnvironmentalDashboard: React.FC = () => {
  const [sensorNodes, setSensorNodes] = useState<SensorNode[]>([]);
  const [environmentalData, setEnvironmentalData] = useState<EnvironmentalData[]>([]);
  const [selectedSensor, setSelectedSensor] = useState<SensorNode | null>(null);
  const [view3D, setView3D] = useState(true);
  const [dataStreaming, setDataStreaming] = useState(true);
  const [alertCount, setAlertCount] = useState(0);

  // Generate mock sensor network
  useEffect(() => {
    const generateSensorNetwork = (): SensorNode[] => {
      const nodes: SensorNode[] = [];
      const types: SensorNode['type'][] = ['temperature', 'humidity', 'air_quality', 'soil_ph', 'wind_speed', 'pressure'];

      // Create a grid of sensors
      for (let x = -5; x <= 5; x += 2) {
        for (let z = -5; z <= 5; z += 2) {
          const elevation = Math.sin(x * 0.5) * Math.cos(z * 0.5) * 2;
          nodes.push({
            id: `sensor-${x}-${z}`,
            position: [x, elevation, z],
            type: types[Math.floor(Math.random() * types.length)],
            value: Math.random() * 100,
            status: ['active', 'warning', 'critical', 'offline'][Math.floor(Math.random() * 4)] as any,
            lastUpdate: new Date(),
            trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as any
          });
        }
      }
      return nodes;
    };

    setSensorNodes(generateSensorNetwork());

    // Generate historical data
    const generateHistoricalData = (): EnvironmentalData[] => {
      const data: EnvironmentalData[] = [];
      const now = new Date();

      for (let i = 0; i < 50; i++) {
        const timestamp = new Date(now.getTime() - i * 60000); // Every minute
        data.unshift({
          timestamp,
          temperature: 20 + Math.sin(i * 0.1) * 5 + Math.random() * 2,
          humidity: 50 + Math.cos(i * 0.15) * 20 + Math.random() * 5,
          airQuality: 80 + Math.sin(i * 0.2) * 15 + Math.random() * 5,
          windSpeed: 10 + Math.sin(i * 0.05) * 8 + Math.random() * 2,
          pressure: 1013 + Math.sin(i * 0.08) * 10 + Math.random() * 3,
          soilPh: 6.5 + Math.sin(i * 0.12) * 1 + Math.random() * 0.5
        });
      }
      return data;
    };

    setEnvironmentalData(generateHistoricalData());
  }, []);

  // Real-time data simulation
  useEffect(() => {
    if (!dataStreaming) return;

    const interval = setInterval(() => {
      // Update sensor values
      setSensorNodes(prev => prev.map(sensor => ({
        ...sensor,
        value: Math.max(0, Math.min(100, sensor.value + (Math.random() - 0.5) * 10)),
        lastUpdate: new Date(),
        trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable'
      })));

      // Add new environmental data point
      setEnvironmentalData(prev => {
        const latest = prev[prev.length - 1];
        const newPoint: EnvironmentalData = {
          timestamp: new Date(),
          temperature: Math.max(0, latest.temperature + (Math.random() - 0.5) * 2),
          humidity: Math.max(0, Math.min(100, latest.humidity + (Math.random() - 0.5) * 5)),
          airQuality: Math.max(0, Math.min(100, latest.airQuality + (Math.random() - 0.5) * 3)),
          windSpeed: Math.max(0, latest.windSpeed + (Math.random() - 0.5) * 2),
          pressure: Math.max(950, Math.min(1050, latest.pressure + (Math.random() - 0.5) * 2)),
          soilPh: Math.max(0, Math.min(14, latest.soilPh + (Math.random() - 0.5) * 0.2))
        };
        return [...prev.slice(-49), newPoint]; // Keep last 50 points
      });

      // Update alert count
      setAlertCount(Math.floor(Math.random() * 5));
    }, 2000);

    return () => clearInterval(interval);
  }, [dataStreaming]);

  const getSensorColor = (sensor: SensorNode): string => {
    switch (sensor.status) {
      case 'active': return '#00ff00';
      case 'warning': return '#ffff00';
      case 'critical': return '#ff0000';
      case 'offline': return '#666666';
      default: return '#ffffff';
    }
  };

  const getSensorTypeIcon = (type: SensorNode['type']): string => {
    switch (type) {
      case 'temperature': return '🌡️';
      case 'humidity': return '💧';
      case 'air_quality': return '🌬️';
      case 'soil_ph': return '🌱';
      case 'wind_speed': return '💨';
      case 'pressure': return '⏱️';
      default: return '📊';
    }
  };

  // 3D Sensor Node Component
  const SensorNode3D: React.FC<{ sensor: SensorNode; onClick: () => void }> = ({ sensor, onClick }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    useFrame((state) => {
      if (meshRef.current) {
        meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
        meshRef.current.scale.setScalar(hovered ? 1.2 : 1);
      }
    });

    return (
      <group position={sensor.position}>
        <Sphere
          ref={meshRef}
          args={[0.2, 16, 16]}
          onClick={onClick}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <meshStandardMaterial
            color={getSensorColor(sensor)}
            emissive={getSensorColor(sensor)}
            emissiveIntensity={0.3}
            transparent
            opacity={sensor.status === 'offline' ? 0.3 : 0.8}
          />
        </Sphere>

        {/* Data flow visualization */}
        {sensor.status === 'active' && (
          <Line
            points={[
              new THREE.Vector3(0, 0, 0),
              new THREE.Vector3(0, 2, 0)
            ]}
            color="#00ffff"
            lineWidth={2}
            transparent
            opacity={0.6}
          />
        )}

        {/* Sensor label */}
        <Text
          position={[0, 0.5, 0]}
          fontSize={0.3}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          {sensor.value.toFixed(1)}
        </Text>
      </group>
    );
  };

  // Terrain Visualization Component
  const TerrainMesh: React.FC = () => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [geometry, setGeometry] = useState<THREE.PlaneGeometry | null>(null);

    useEffect(() => {
      const geo = new THREE.PlaneGeometry(20, 20, 32, 32);
      const vertices = geo.attributes.position.array as Float32Array;

      // Create terrain with elevation and temperature data
      for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const z = vertices[i + 2];
        const elevation = Math.sin(x * 0.3) * Math.cos(z * 0.3) * 2;
        vertices[i + 1] = elevation;
      }

      geo.attributes.position.needsUpdate = true;
      geo.computeVertexNormals();
      setGeometry(geo);
    }, []);

    return geometry ? (
      <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]}>
        <meshStandardMaterial
          color="#1a4a3a"
          wireframe={false}
          transparent
          opacity={0.6}
        />
      </mesh>
    ) : null;
  };

  // Data Flow Particles Component
  const DataFlowParticles: React.FC = () => {
    const particlesRef = useRef<THREE.Points>(null);
    const [particles, setParticles] = useState<THREE.BufferGeometry | null>(null);

    useEffect(() => {
      const particleCount = 100;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const velocities = new Float32Array(particleCount * 3);

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        positions[i3] = (Math.random() - 0.5) * 20;
        positions[i3 + 1] = Math.random() * 10;
        positions[i3 + 2] = (Math.random() - 0.5) * 20;

        velocities[i3] = (Math.random() - 0.5) * 0.02;
        velocities[i3 + 1] = Math.random() * 0.05;
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
      setParticles(geometry);
    }, []);

    useFrame(() => {
      if (particlesRef.current && particles) {
        const positions = particles.attributes.position.array as Float32Array;
        const velocities = particles.attributes.velocity.array as Float32Array;

        for (let i = 0; i < positions.length; i += 3) {
          positions[i] += velocities[i];
          positions[i + 1] += velocities[i + 1];
          positions[i + 2] += velocities[i + 2];

          // Reset particles that go too high
          if (positions[i + 1] > 10) {
            positions[i + 1] = 0;
          }
        }

        particles.attributes.position.needsUpdate = true;
      }
    });

    return particles ? (
      <points ref={particlesRef} geometry={particles}>
        <pointsMaterial color="#00ffff" size={0.1} transparent opacity={0.6} />
      </points>
    ) : null;
  };

  return (
    <div className="environmental-dashboard">
      {/* Header */}
      <motion.div
        className="dashboard-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="header-left">
          <h2>Environmental Intelligence Network</h2>
          <div className="network-status">
            <div className={`status-indicator ${dataStreaming ? 'active' : 'inactive'}`} />
            <span>{dataStreaming ? 'Live Monitoring' : 'Offline'}</span>
          </div>
        </div>

        <div className="header-controls">
          <motion.button
            className={`control-btn ${view3D ? 'active' : ''}`}
            onClick={() => setView3D(!view3D)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span>🌐</span> 3D View
          </motion.button>

          <motion.button
            className={`control-btn ${dataStreaming ? 'active' : ''}`}
            onClick={() => setDataStreaming(!dataStreaming)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span>{dataStreaming ? '⏸️' : '▶️'}</span>
            {dataStreaming ? 'Pause' : 'Resume'}
          </motion.button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="dashboard-content">
        {/* Left Sidebar - Metrics */}
        <motion.div
          className="metrics-panel"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3>Real-time Metrics</h3>

          {/* Environmental Metrics */}
          <div className="metrics-grid">
            {environmentalData.length > 0 && (
              <>
                <div className="metric-card temperature">
                  <div className="metric-icon">🌡️</div>
                  <div className="metric-content">
                    <div className="metric-value">
                      {environmentalData[environmentalData.length - 1].temperature.toFixed(1)}°C
                    </div>
                    <div className="metric-label">Temperature</div>
                  </div>
                </div>

                <div className="metric-card humidity">
                  <div className="metric-icon">💧</div>
                  <div className="metric-content">
                    <div className="metric-value">
                      {environmentalData[environmentalData.length - 1].humidity.toFixed(1)}%
                    </div>
                    <div className="metric-label">Humidity</div>
                  </div>
                </div>

                <div className="metric-card air-quality">
                  <div className="metric-icon">🌬️</div>
                  <div className="metric-content">
                    <div className="metric-value">
                      {environmentalData[environmentalData.length - 1].airQuality.toFixed(0)}
                    </div>
                    <div className="metric-label">Air Quality</div>
                  </div>
                </div>

                <div className="metric-card pressure">
                  <div className="metric-icon">⏱️</div>
                  <div className="metric-content">
                    <div className="metric-value">
                      {environmentalData[environmentalData.length - 1].pressure.toFixed(0)}
                    </div>
                    <div className="metric-label">Pressure (hPa)</div>
                  </div>
                </div>

                <div className="metric-card wind">
                  <div className="metric-icon">💨</div>
                  <div className="metric-content">
                    <div className="metric-value">
                      {environmentalData[environmentalData.length - 1].windSpeed.toFixed(1)}
                    </div>
                    <div className="metric-label">Wind (m/s)</div>
                  </div>
                </div>

                <div className="metric-card soil">
                  <div className="metric-icon">🌱</div>
                  <div className="metric-content">
                    <div className="metric-value">
                      {environmentalData[environmentalData.length - 1].soilPh.toFixed(1)}
                    </div>
                    <div className="metric-label">Soil pH</div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Network Status */}
          <div className="network-stats">
            <h4>Network Health</h4>
            <div className="stat-item">
              <span className="stat-label">Active Nodes:</span>
              <span className="stat-value">
                {sensorNodes.filter(s => s.status === 'active').length}/{sensorNodes.length}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Alerts:</span>
              <span className="stat-value alert">{alertCount}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Uptime:</span>
              <span className="stat-value">99.7%</span>
            </div>
          </div>

          {/* Active Alerts */}
          {alertCount > 0 && (
            <motion.div
              className="alerts-panel"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <h4>🚨 Active Alerts</h4>
              {Array.from({ length: alertCount }, (_, i) => (
                <div key={i} className="alert-item">
                  <div className="alert-icon">⚠️</div>
                  <div className="alert-content">
                    <div className="alert-title">Sensor #{i + 1} Critical</div>
                    <div className="alert-time">2 min ago</div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* Center - 3D Visualization */}
        <motion.div
          className="visualization-panel"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          {view3D ? (
            <div className="canvas-container">
              <Canvas camera={{ position: [10, 10, 10], fov: 60 }}>
                <ambientLight intensity={0.4} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                <directionalLight position={[-10, 10, 5]} intensity={0.5} />

                {/* Terrain */}
                <TerrainMesh />

                {/* Sensor Nodes */}
                {sensorNodes.map(sensor => (
                  <SensorNode3D
                    key={sensor.id}
                    sensor={sensor}
                    onClick={() => setSelectedSensor(sensor)}
                  />
                ))}

                {/* Data Flow Particles */}
                <DataFlowParticles />

                <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
              </Canvas>

              {/* 3D Overlay Info */}
              <div className="canvas-overlay">
                <div className="view-controls">
                  <button className="view-btn">Reset View</button>
                  <button className="view-btn">Top View</button>
                  <button className="view-btn">Side View</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid-view">
              <div className="sensor-grid">
                {sensorNodes.map(sensor => (
                  <motion.div
                    key={sensor.id}
                    className={`sensor-card ${sensor.status}`}
                    onClick={() => setSelectedSensor(sensor)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    layout
                  >
                    <div className="sensor-header">
                      <div className="sensor-icon">{getSensorTypeIcon(sensor.type)}</div>
                      <div className="sensor-status-dot" />
                    </div>
                    <div className="sensor-value">{sensor.value.toFixed(1)}</div>
                    <div className="sensor-type">{sensor.type.replace('_', ' ')}</div>
                    <div className="sensor-trend">
                      {sensor.trend === 'up' ? '📈' : sensor.trend === 'down' ? '📉' : '➡️'}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Right Sidebar - Details */}
        <motion.div
          className="details-panel"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3>Sensor Details</h3>

          <AnimatePresence mode="wait">
            {selectedSensor ? (
              <motion.div
                key={selectedSensor.id}
                className="sensor-details"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="detail-header">
                  <div className="detail-icon">{getSensorTypeIcon(selectedSensor.type)}</div>
                  <div className="detail-info">
                    <div className="detail-title">{selectedSensor.type.replace('_', ' ')}</div>
                    <div className="detail-id">{selectedSensor.id}</div>
                  </div>
                </div>

                <div className="detail-metrics">
                  <div className="detail-metric">
                    <span className="metric-label">Current Value:</span>
                    <span className={`metric-value ${selectedSensor.status}`}>
                      {selectedSensor.value.toFixed(2)}
                    </span>
                  </div>

                  <div className="detail-metric">
                    <span className="metric-label">Status:</span>
                    <span className={`status-badge ${selectedSensor.status}`}>
                      {selectedSensor.status}
                    </span>
                  </div>

                  <div className="detail-metric">
                    <span className="metric-label">Trend:</span>
                    <span className="trend-indicator">
                      {selectedSensor.trend === 'up' ? '📈 Rising' :
                       selectedSensor.trend === 'down' ? '📉 Falling' : '➡️ Stable'}
                    </span>
                  </div>

                  <div className="detail-metric">
                    <span className="metric-label">Position:</span>
                    <span className="position-value">
                      ({selectedSensor.position.map(p => p.toFixed(1)).join(', ')})
                    </span>
                  </div>

                  <div className="detail-metric">
                    <span className="metric-label">Last Update:</span>
                    <span className="time-value">
                      {selectedSensor.lastUpdate.toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                <div className="detail-actions">
                  <button className="action-btn primary">Calibrate</button>
                  <button className="action-btn secondary">History</button>
                  <button className="action-btn danger">Reset</button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                className="no-selection"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="no-selection-icon">📡</div>
                <div className="no-selection-text">
                  Select a sensor to view details
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <style jsx>{`
        .environmental-dashboard {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: rgba(10, 10, 15, 0.9);
          border-radius: 12px;
          overflow: hidden;
        }

        .dashboard-header {
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
          background: linear-gradient(45deg, #00ff00, #00ffff);
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
          background: #00ff00;
          box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
          animation: pulse 2s ease-in-out infinite;
        }

        .header-controls {
          display: flex;
          gap: 1rem;
        }

        .control-btn {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(0, 255, 255, 0.3);
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
          background: rgba(0, 255, 255, 0.1);
          border-color: rgba(0, 255, 255, 0.5);
        }

        .control-btn.active {
          background: rgba(0, 255, 255, 0.2);
          border-color: #00ffff;
          box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
        }

        .dashboard-content {
          flex: 1;
          display: flex;
          gap: 1rem;
          padding: 1rem;
          overflow: hidden;
        }

        .metrics-panel {
          width: 300px;
          background: rgba(15, 15, 25, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(0, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1.5rem;
          overflow-y: auto;
        }

        .metrics-panel h3 {
          font-size: 1.1rem;
          color: #fff;
          margin-bottom: 1.5rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid rgba(0, 255, 255, 0.2);
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .metric-card {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 1rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          transition: all 0.3s ease;
        }

        .metric-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .metric-icon {
          font-size: 1.5rem;
        }

        .metric-content {
          flex: 1;
        }

        .metric-value {
          font-size: 1.2rem;
          font-weight: 600;
          color: #00ffff;
          line-height: 1;
        }

        .metric-label {
          font-size: 0.8rem;
          color: #888;
          margin-top: 0.25rem;
        }

        .network-stats {
          margin-bottom: 2rem;
        }

        .network-stats h4 {
          font-size: 1rem;
          color: #fff;
          margin-bottom: 1rem;
        }

        .stat-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .stat-label {
          font-size: 0.9rem;
          color: #888;
        }

        .stat-value {
          font-size: 0.9rem;
          font-weight: 600;
          color: #00ffff;
        }

        .stat-value.alert {
          color: #ff0000;
          text-shadow: 0 0 5px rgba(255, 0, 0, 0.5);
        }

        .alerts-panel {
          background: rgba(255, 0, 0, 0.1);
          border: 1px solid rgba(255, 0, 0, 0.3);
          border-radius: 8px;
          padding: 1rem;
        }

        .alerts-panel h4 {
          font-size: 0.9rem;
          color: #ff0000;
          margin-bottom: 1rem;
        }

        .alert-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 0;
          border-bottom: 1px solid rgba(255, 0, 0, 0.2);
        }

        .alert-icon {
          font-size: 1.2rem;
        }

        .alert-content {
          flex: 1;
        }

        .alert-title {
          font-size: 0.8rem;
          color: #fff;
          font-weight: 600;
        }

        .alert-time {
          font-size: 0.7rem;
          color: #888;
          margin-top: 0.25rem;
        }

        .visualization-panel {
          flex: 1;
          background: rgba(15, 15, 25, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(0, 255, 255, 0.1);
          border-radius: 12px;
          overflow: hidden;
          position: relative;
        }

        .canvas-container {
          width: 100%;
          height: 100%;
          position: relative;
        }

        .canvas-overlay {
          position: absolute;
          top: 1rem;
          right: 1rem;
          z-index: 100;
        }

        .view-controls {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .view-btn {
          background: rgba(0, 0, 0, 0.7);
          border: 1px solid rgba(0, 255, 255, 0.3);
          color: #fff;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.8rem;
          transition: all 0.3s ease;
        }

        .view-btn:hover {
          background: rgba(0, 255, 255, 0.2);
          border-color: #00ffff;
        }

        .grid-view {
          padding: 1.5rem;
          height: 100%;
          overflow-y: auto;
        }

        .sensor-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 1rem;
        }

        .sensor-card {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          text-align: center;
        }

        .sensor-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .sensor-card.active {
          border-color: #00ff00;
          box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
        }

        .sensor-card.warning {
          border-color: #ffff00;
          box-shadow: 0 0 10px rgba(255, 255, 0, 0.3);
        }

        .sensor-card.critical {
          border-color: #ff0000;
          box-shadow: 0 0 10px rgba(255, 0, 0, 0.3);
        }

        .sensor-card.offline {
          opacity: 0.5;
          border-color: #666;
        }

        .sensor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .sensor-icon {
          font-size: 1.5rem;
        }

        .sensor-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: currentColor;
        }

        .sensor-value {
          font-size: 1.5rem;
          font-weight: 600;
          color: #00ffff;
          margin-bottom: 0.5rem;
        }

        .sensor-type {
          font-size: 0.8rem;
          color: #888;
          text-transform: capitalize;
          margin-bottom: 0.5rem;
        }

        .sensor-trend {
          font-size: 1rem;
        }

        .details-panel {
          width: 300px;
          background: rgba(15, 15, 25, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(0, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1.5rem;
          overflow-y: auto;
        }

        .details-panel h3 {
          font-size: 1.1rem;
          color: #fff;
          margin-bottom: 1.5rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid rgba(0, 255, 255, 0.2);
        }

        .sensor-details {
          height: 100%;
        }

        .detail-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
        }

        .detail-icon {
          font-size: 2rem;
        }

        .detail-info {
          flex: 1;
        }

        .detail-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #fff;
          text-transform: capitalize;
        }

        .detail-id {
          font-size: 0.8rem;
          color: #888;
          margin-top: 0.25rem;
        }

        .detail-metrics {
          margin-bottom: 2rem;
        }

        .detail-metric {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .detail-metric .metric-label {
          font-size: 0.9rem;
          color: #888;
        }

        .detail-metric .metric-value {
          font-size: 0.9rem;
          font-weight: 600;
        }

        .detail-metric .metric-value.active {
          color: #00ff00;
        }

        .detail-metric .metric-value.warning {
          color: #ffff00;
        }

        .detail-metric .metric-value.critical {
          color: #ff0000;
        }

        .detail-metric .metric-value.offline {
          color: #666;
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-badge.active {
          background: rgba(0, 255, 0, 0.2);
          color: #00ff00;
          border: 1px solid rgba(0, 255, 0, 0.3);
        }

        .status-badge.warning {
          background: rgba(255, 255, 0, 0.2);
          color: #ffff00;
          border: 1px solid rgba(255, 255, 0, 0.3);
        }

        .status-badge.critical {
          background: rgba(255, 0, 0, 0.2);
          color: #ff0000;
          border: 1px solid rgba(255, 0, 0, 0.3);
        }

        .status-badge.offline {
          background: rgba(102, 102, 102, 0.2);
          color: #666;
          border: 1px solid rgba(102, 102, 102, 0.3);
        }

        .trend-indicator {
          font-size: 0.9rem;
          color: #fff;
        }

        .position-value,
        .time-value {
          font-size: 0.8rem;
          color: #00ffff;
          font-family: 'JetBrains Mono', monospace;
        }

        .detail-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .action-btn {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 0.9rem;
        }

        .action-btn.primary {
          border-color: rgba(0, 255, 255, 0.5);
          color: #00ffff;
        }

        .action-btn.primary:hover {
          background: rgba(0, 255, 255, 0.1);
          border-color: #00ffff;
        }

        .action-btn.secondary {
          border-color: rgba(255, 255, 255, 0.3);
        }

        .action-btn.secondary:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .action-btn.danger {
          border-color: rgba(255, 0, 0, 0.5);
          color: #ff0000;
        }

        .action-btn.danger:hover {
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

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @media (max-width: 1024px) {
          .dashboard-content {
            flex-direction: column;
          }

          .metrics-panel,
          .details-panel {
            width: 100%;
            max-height: 300px;
          }

          .dashboard-header {
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

export default EnvironmentalDashboard;