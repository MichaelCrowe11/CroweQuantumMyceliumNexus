import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Sphere, Line, Cylinder } from '@react-three/drei';
import * as THREE from 'three';

interface Satellite {
  id: string;
  name: string;
  position: [number, number, number];
  velocity: [number, number, number];
  orbit_altitude: number;
  orbit_period: number;
  satellite_type: 'earth_observation' | 'communications' | 'weather' | 'navigation' | 'military';
  status: 'active' | 'inactive' | 'maintenance' | 'lost';
  signal_strength: number;
  power_level: number;
  temperature: number;
  mission: string;
  launch_date: Date;
  operator: string;
}

interface GroundStation {
  id: string;
  name: string;
  position: [number, number, number];
  coordinates: [number, number]; // lat, lon
  status: 'online' | 'offline' | 'maintenance';
  tracked_satellites: string[];
  uplink_frequency: number;
  downlink_frequency: number;
}

interface SatelliteData {
  timestamp: Date;
  satellite_id: string;
  telemetry: {
    position: [number, number, number];
    velocity: [number, number, number];
    orientation: [number, number, number];
    power: number;
    temperature: number;
    fuel: number;
  };
  mission_data: {
    images_captured: number;
    data_transmitted: number;
    coverage_area: number;
  };
}

interface Anomaly {
  id: string;
  satellite_id: string;
  type: 'debris' | 'solar_storm' | 'equipment_failure' | 'orbital_decay';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  description: string;
  resolved: boolean;
}

const SatelliteMonitor: React.FC = () => {
  const [satellites, setSatellites] = useState<Satellite[]>([]);
  const [groundStations, setGroundStations] = useState<GroundStation[]>([]);
  const [satelliteData, setSatelliteData] = useState<SatelliteData[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [selectedSatellite, setSelectedSatellite] = useState<Satellite | null>(null);
  const [selectedStation, setSelectedStation] = useState<GroundStation | null>(null);
  const [trackingMode, setTrackingMode] = useState<'all' | 'single' | 'coverage'>('all');
  const [showOrbits, setShowOrbits] = useState(true);
  const [showSignals, setShowSignals] = useState(true);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [monitoringActive, setMonitoringActive] = useState(true);

  // Earth component
  const Earth: React.FC = () => {
    const earthRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
      if (earthRef.current) {
        earthRef.current.rotation.y = state.clock.elapsedTime * 0.1;
      }
    });

    return (
      <Sphere ref={earthRef} args={[1, 64, 64]} position={[0, 0, 0]}>
        <meshStandardMaterial
          color="#4A90E2"
          map={undefined} // In a real app, you'd load an Earth texture
          transparent
          opacity={0.8}
        />
      </Sphere>
    );
  };

  // Satellite component
  const Satellite3D: React.FC<{ satellite: Satellite; onClick: () => void }> = ({ satellite, onClick }) => {
    const satelliteRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);

    useFrame((state) => {
      if (satelliteRef.current) {
        // Update orbital position
        const time = state.clock.elapsedTime * simulationSpeed;
        const orbital_speed = 2 * Math.PI / satellite.orbit_period;

        const x = satellite.orbit_altitude * Math.cos(time * orbital_speed);
        const z = satellite.orbit_altitude * Math.sin(time * orbital_speed);
        const y = satellite.position[1];

        satelliteRef.current.position.set(x, y, z);
        satelliteRef.current.rotation.y = time * 0.5;

        // Update satellite position in state
        satellite.position = [x, y, z];
      }
    });

    const getSatelliteColor = () => {
      switch (satellite.status) {
        case 'active': return '#00ff00';
        case 'inactive': return '#888888';
        case 'maintenance': return '#ffff00';
        case 'lost': return '#ff0000';
        default: return '#ffffff';
      }
    };

    const getSatelliteIcon = () => {
      switch (satellite.satellite_type) {
        case 'earth_observation': return '🌍';
        case 'communications': return '📡';
        case 'weather': return '🌤️';
        case 'navigation': return '🧭';
        case 'military': return '🛡️';
        default: return '🛰️';
      }
    };

    return (
      <group
        ref={satelliteRef}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        {/* Satellite body */}
        <Box args={[0.1, 0.1, 0.2]}>
          <meshStandardMaterial
            color={getSatelliteColor()}
            emissive={getSatelliteColor()}
            emissiveIntensity={0.3}
          />
        </Box>

        {/* Solar panels */}
        <Box args={[0.3, 0.02, 0.1]} position={[-0.15, 0, 0]}>
          <meshStandardMaterial color="#1a1a1a" />
        </Box>
        <Box args={[0.3, 0.02, 0.1]} position={[0.15, 0, 0]}>
          <meshStandardMaterial color="#1a1a1a" />
        </Box>

        {/* Antenna */}
        <Cylinder args={[0.01, 0.01, 0.2]} position={[0, 0.15, 0]}>
          <meshStandardMaterial color="#cccccc" />
        </Cylinder>

        {/* Satellite label */}
        <Text
          position={[0, 0.3, 0]}
          fontSize={0.05}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          {satellite.name}
        </Text>

        {/* Status indicator */}
        {hovered && (
          <Text
            position={[0, -0.2, 0]}
            fontSize={0.03}
            color={getSatelliteColor()}
            anchorX="center"
            anchorY="middle"
          >
            {satellite.status} | {satellite.signal_strength}%
          </Text>
        )}

        {/* Mission indicator */}
        <Text
          position={[0, 0.4, 0]}
          fontSize={0.04}
          color="#00ffff"
          anchorX="center"
          anchorY="middle"
        >
          {getSatelliteIcon()}
        </Text>
      </group>
    );
  };

  // Ground Station component
  const GroundStation3D: React.FC<{ station: GroundStation; onClick: () => void }> = ({ station, onClick }) => {
    const stationRef = useRef<THREE.Group>(null);

    const getStationColor = () => {
      switch (station.status) {
        case 'online': return '#00ff00';
        case 'offline': return '#ff0000';
        case 'maintenance': return '#ffff00';
        default: return '#888888';
      }
    };

    return (
      <group ref={stationRef} position={station.position} onClick={onClick}>
        {/* Station base */}
        <Cylinder args={[0.05, 0.05, 0.1]} position={[0, 0.05, 0]}>
          <meshStandardMaterial
            color={getStationColor()}
            emissive={getStationColor()}
            emissiveIntensity={0.3}
          />
        </Cylinder>

        {/* Dish */}
        <Sphere args={[0.08, 16, 8]} position={[0, 0.12, 0]}>
          <meshStandardMaterial color="#cccccc" />
        </Sphere>

        {/* Support */}
        <Cylinder args={[0.01, 0.01, 0.1]} position={[0, 0.1, 0]} rotation={[0, 0, Math.PI / 6]}>
          <meshStandardMaterial color="#888888" />
        </Cylinder>

        <Text
          position={[0, 0.2, 0]}
          fontSize={0.03}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          {station.name}
        </Text>
      </group>
    );
  };

  // Orbital path component
  const OrbitalPath: React.FC<{ satellite: Satellite }> = ({ satellite }) => {
    const points = [];
    const segments = 100;

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = satellite.orbit_altitude * Math.cos(angle);
      const z = satellite.orbit_altitude * Math.sin(angle);
      const y = satellite.position[1];
      points.push(new THREE.Vector3(x, y, z));
    }

    return (
      <Line
        points={points}
        color="#ffffff"
        lineWidth={1}
        transparent
        opacity={0.3}
      />
    );
  };

  // Signal beam component
  const SignalBeam: React.FC<{ from: [number, number, number]; to: [number, number, number]; strength: number }> = ({ from, to, strength }) => {
    const lineRef = useRef<THREE.Line>(null);

    useFrame((state) => {
      if (lineRef.current) {
        const material = lineRef.current.material as THREE.LineBasicMaterial;
        material.opacity = 0.5 + Math.sin(state.clock.elapsedTime * 5) * 0.3 * strength;
      }
    });

    return (
      <Line
        ref={lineRef}
        points={[new THREE.Vector3(...from), new THREE.Vector3(...to)]}
        color="#00ffff"
        lineWidth={2}
        transparent
        opacity={0.6}
      />
    );
  };

  // Generate sample data
  useEffect(() => {
    const generateSatellites = (): Satellite[] => {
      const types: Satellite['satellite_type'][] = ['earth_observation', 'communications', 'weather', 'navigation', 'military'];
      const operators = ['NASA', 'ESA', 'SpaceX', 'Boeing', 'Lockheed Martin', 'NOAA', 'DoD'];

      return Array.from({ length: 15 }, (_, i) => {
        const altitude = 1.5 + Math.random() * 1.5;
        const angle = (i / 15) * Math.PI * 2;

        return {
          id: `sat-${i}`,
          name: `SAT-${String(i + 1).padStart(3, '0')}`,
          position: [
            altitude * Math.cos(angle),
            (Math.random() - 0.5) * 0.5,
            altitude * Math.sin(angle)
          ],
          velocity: [0, 0, 0],
          orbit_altitude: altitude,
          orbit_period: 90 + Math.random() * 60,
          satellite_type: types[Math.floor(Math.random() * types.length)],
          status: ['active', 'inactive', 'maintenance'][Math.floor(Math.random() * 3)] as any,
          signal_strength: 60 + Math.random() * 40,
          power_level: 70 + Math.random() * 30,
          temperature: -50 + Math.random() * 100,
          mission: `Mission ${i + 1}`,
          launch_date: new Date(2020 + Math.random() * 4, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)),
          operator: operators[Math.floor(Math.random() * operators.length)]
        };
      });
    };

    const generateGroundStations = (): GroundStation[] => {
      const stations = [
        { name: 'ESOC Darmstadt', lat: 49.87, lon: 8.65 },
        { name: 'JPL Goldstone', lat: 35.25, lon: -116.89 },
        { name: 'CNES Toulouse', lat: 43.61, lon: 1.44 },
        { name: 'JAXA Tanegashima', lat: 30.39, lon: 130.97 },
        { name: 'Roscosmos Baikonur', lat: 45.96, lon: 63.31 }
      ];

      return stations.map((station, i) => {
        // Convert lat/lon to 3D position on sphere
        const lat = (station.lat * Math.PI) / 180;
        const lon = (station.lon * Math.PI) / 180;
        const radius = 1.02; // Slightly above Earth surface

        const x = radius * Math.cos(lat) * Math.cos(lon);
        const y = radius * Math.sin(lat);
        const z = radius * Math.cos(lat) * Math.sin(lon);

        return {
          id: `station-${i}`,
          name: station.name,
          position: [x, y, z] as [number, number, number],
          coordinates: [station.lat, station.lon],
          status: ['online', 'offline', 'maintenance'][Math.floor(Math.random() * 3)] as any,
          tracked_satellites: [],
          uplink_frequency: 2000 + Math.random() * 1000,
          downlink_frequency: 8000 + Math.random() * 2000
        };
      });
    };

    const generateAnomalies = (): Anomaly[] => {
      const types: Anomaly['type'][] = ['debris', 'solar_storm', 'equipment_failure', 'orbital_decay'];
      const severities: Anomaly['severity'][] = ['low', 'medium', 'high', 'critical'];

      return Array.from({ length: 5 }, (_, i) => ({
        id: `anomaly-${i}`,
        satellite_id: `sat-${Math.floor(Math.random() * 15)}`,
        type: types[Math.floor(Math.random() * types.length)],
        severity: severities[Math.floor(Math.random() * severities.length)],
        timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
        description: `Anomaly detected: ${types[Math.floor(Math.random() * types.length)]}`,
        resolved: Math.random() > 0.3
      }));
    };

    const initialSatellites = generateSatellites();
    const initialStations = generateGroundStations();

    setSatellites(initialSatellites);
    setGroundStations(initialStations);
    setSelectedSatellite(initialSatellites[0]);
    setAnomalies(generateAnomalies());

    // Generate historical telemetry data
    const generateTelemetryData = (): SatelliteData[] => {
      const data: SatelliteData[] = [];
      const now = new Date();

      for (let i = 0; i < 50; i++) {
        const timestamp = new Date(now.getTime() - i * 60000); // Every minute
        const satellite = initialSatellites[Math.floor(Math.random() * initialSatellites.length)];

        data.unshift({
          timestamp,
          satellite_id: satellite.id,
          telemetry: {
            position: satellite.position,
            velocity: [Math.random() * 10, Math.random() * 10, Math.random() * 10],
            orientation: [Math.random() * 360, Math.random() * 360, Math.random() * 360],
            power: 70 + Math.random() * 30,
            temperature: -50 + Math.random() * 100,
            fuel: 60 + Math.random() * 40
          },
          mission_data: {
            images_captured: Math.floor(Math.random() * 100),
            data_transmitted: Math.random() * 1000,
            coverage_area: Math.random() * 10000
          }
        });
      }
      return data;
    };

    setSatelliteData(generateTelemetryData());
  }, []);

  // Real-time simulation
  useEffect(() => {
    if (!monitoringActive) return;

    const interval = setInterval(() => {
      // Update satellite telemetry
      setSatellites(prev => prev.map(satellite => ({
        ...satellite,
        signal_strength: Math.max(0, Math.min(100, satellite.signal_strength + (Math.random() - 0.5) * 5)),
        power_level: Math.max(0, Math.min(100, satellite.power_level + (Math.random() - 0.5) * 2)),
        temperature: satellite.temperature + (Math.random() - 0.5) * 5
      })));

      // Add new telemetry data
      setSatelliteData(prev => {
        if (prev.length === 0) return prev;

        const selectedSat = satellites.find(s => s.id === selectedSatellite?.id);
        if (!selectedSat) return prev;

        const newData: SatelliteData = {
          timestamp: new Date(),
          satellite_id: selectedSat.id,
          telemetry: {
            position: selectedSat.position,
            velocity: [Math.random() * 10, Math.random() * 10, Math.random() * 10],
            orientation: [Math.random() * 360, Math.random() * 360, Math.random() * 360],
            power: selectedSat.power_level,
            temperature: selectedSat.temperature,
            fuel: 60 + Math.random() * 40
          },
          mission_data: {
            images_captured: Math.floor(Math.random() * 10),
            data_transmitted: Math.random() * 100,
            coverage_area: Math.random() * 1000
          }
        };

        return [...prev.slice(-49), newData];
      });

      // Occasionally add new anomalies
      if (Math.random() > 0.95) {
        const types: Anomaly['type'][] = ['debris', 'solar_storm', 'equipment_failure', 'orbital_decay'];
        const severities: Anomaly['severity'][] = ['low', 'medium', 'high', 'critical'];

        const newAnomaly: Anomaly = {
          id: `anomaly-${Date.now()}`,
          satellite_id: satellites[Math.floor(Math.random() * satellites.length)]?.id || 'sat-0',
          type: types[Math.floor(Math.random() * types.length)],
          severity: severities[Math.floor(Math.random() * severities.length)],
          timestamp: new Date(),
          description: `New anomaly detected`,
          resolved: false
        };

        setAnomalies(prev => [newAnomaly, ...prev.slice(0, 9)]);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [monitoringActive, satellites, selectedSatellite]);

  const getSatelliteTypeIcon = (type: Satellite['satellite_type']): string => {
    switch (type) {
      case 'earth_observation': return '🌍';
      case 'communications': return '📡';
      case 'weather': return '🌤️';
      case 'navigation': return '🧭';
      case 'military': return '🛡️';
      default: return '🛰️';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active':
      case 'online': return '#00ff00';
      case 'inactive':
      case 'offline': return '#ff0000';
      case 'maintenance': return '#ffff00';
      case 'lost': return '#ff0066';
      default: return '#888888';
    }
  };

  const getSeverityColor = (severity: Anomaly['severity']): string => {
    switch (severity) {
      case 'low': return '#00ff00';
      case 'medium': return '#ffff00';
      case 'high': return '#ff8800';
      case 'critical': return '#ff0000';
      default: return '#888888';
    }
  };

  return (
    <div className="satellite-monitor">
      {/* Header */}
      <motion.div
        className="monitor-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="header-left">
          <h2>Global Satellite Monitoring System</h2>
          <div className="monitor-status">
            <div className={`status-indicator ${monitoringActive ? 'active' : 'inactive'}`} />
            <span>{monitoringActive ? 'Live Tracking Active' : 'Monitoring Paused'}</span>
          </div>
        </div>

        <div className="header-controls">
          <div className="speed-control">
            <label>Simulation:</label>
            <input
              type="range"
              min="0.1"
              max="10"
              step="0.1"
              value={simulationSpeed}
              onChange={(e) => setSimulationSpeed(parseFloat(e.target.value))}
            />
            <span>{simulationSpeed.toFixed(1)}x</span>
          </div>

          <motion.button
            className={`control-btn ${monitoringActive ? 'active' : ''}`}
            onClick={() => setMonitoringActive(!monitoringActive)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span>{monitoringActive ? '⏸️' : '▶️'}</span>
            {monitoringActive ? 'Pause' : 'Resume'}
          </motion.button>

          <motion.button
            className={`control-btn ${showOrbits ? 'active' : ''}`}
            onClick={() => setShowOrbits(!showOrbits)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span>🌌</span> Orbits
          </motion.button>

          <motion.button
            className={`control-btn ${showSignals ? 'active' : ''}`}
            onClick={() => setShowSignals(!showSignals)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span>📡</span> Signals
          </motion.button>
        </div>
      </motion.div>

      <div className="monitor-content">
        {/* Satellite List & Controls */}
        <motion.div
          className="satellites-panel"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3>Active Satellites</h3>
          <div className="satellite-list">
            {satellites.map(satellite => (
              <motion.div
                key={satellite.id}
                className={`satellite-card ${selectedSatellite?.id === satellite.id ? 'selected' : ''} ${satellite.status}`}
                onClick={() => setSelectedSatellite(satellite)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="satellite-header">
                  <div className="satellite-icon">{getSatelliteTypeIcon(satellite.satellite_type)}</div>
                  <div className="satellite-info">
                    <div className="satellite-name">{satellite.name}</div>
                    <div className="satellite-mission">{satellite.mission}</div>
                  </div>
                  <div className="satellite-status" style={{ color: getStatusColor(satellite.status) }}>
                    {satellite.status}
                  </div>
                </div>

                <div className="satellite-metrics">
                  <div className="metric">
                    <span>Signal:</span>
                    <span>{satellite.signal_strength.toFixed(0)}%</span>
                  </div>
                  <div className="metric">
                    <span>Power:</span>
                    <span>{satellite.power_level.toFixed(0)}%</span>
                  </div>
                  <div className="metric">
                    <span>Altitude:</span>
                    <span>{(satellite.orbit_altitude * 6371).toFixed(0)}km</span>
                  </div>
                </div>

                <div className="operator-info">
                  <span className="operator-label">Operator:</span>
                  <span className="operator-name">{satellite.operator}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Ground Stations */}
          <div className="ground-stations">
            <h4>Ground Stations</h4>
            <div className="station-list">
              {groundStations.map(station => (
                <motion.div
                  key={station.id}
                  className={`station-card ${selectedStation?.id === station.id ? 'selected' : ''} ${station.status}`}
                  onClick={() => setSelectedStation(station)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="station-header">
                    <div className="station-icon">🏢</div>
                    <div className="station-name">{station.name}</div>
                    <div className="station-status" style={{ color: getStatusColor(station.status) }}>
                      {station.status}
                    </div>
                  </div>
                  <div className="station-coordinates">
                    {station.coordinates[0].toFixed(2)}°, {station.coordinates[1].toFixed(2)}°
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Current Anomalies */}
          <div className="anomalies-section">
            <h4>🚨 Current Anomalies</h4>
            <div className="anomalies-list">
              {anomalies.filter(a => !a.resolved).slice(0, 5).map(anomaly => (
                <motion.div
                  key={anomaly.id}
                  className={`anomaly-card ${anomaly.severity}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <div className="anomaly-header">
                    <div className="anomaly-type">{anomaly.type.replace('_', ' ')}</div>
                    <div
                      className="anomaly-severity"
                      style={{ color: getSeverityColor(anomaly.severity) }}
                    >
                      {anomaly.severity}
                    </div>
                  </div>
                  <div className="anomaly-satellite">SAT: {anomaly.satellite_id}</div>
                  <div className="anomaly-time">
                    {anomaly.timestamp.toLocaleTimeString()}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* 3D Earth and Satellite Visualization */}
        <motion.div
          className="visualization-container"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="canvas-wrapper">
            <Canvas camera={{ position: [5, 3, 5], fov: 60 }}>
              <ambientLight intensity={0.4} />
              <pointLight position={[10, 10, 10]} intensity={1} />
              <directionalLight position={[-10, 10, 5]} intensity={0.5} />

              {/* Earth */}
              <Earth />

              {/* Satellites */}
              {satellites.map(satellite => (
                <Satellite3D
                  key={satellite.id}
                  satellite={satellite}
                  onClick={() => setSelectedSatellite(satellite)}
                />
              ))}

              {/* Ground Stations */}
              {groundStations.map(station => (
                <GroundStation3D
                  key={station.id}
                  station={station}
                  onClick={() => setSelectedStation(station)}
                />
              ))}

              {/* Orbital Paths */}
              {showOrbits && satellites.map(satellite => (
                <OrbitalPath key={`orbit-${satellite.id}`} satellite={satellite} />
              ))}

              {/* Signal Beams */}
              {showSignals && selectedSatellite && groundStations
                .filter(station => station.status === 'online')
                .map(station => (
                  <SignalBeam
                    key={`signal-${selectedSatellite.id}-${station.id}`}
                    from={selectedSatellite.position}
                    to={station.position}
                    strength={selectedSatellite.signal_strength / 100}
                  />
                ))}

              <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
            </Canvas>

            {/* Canvas Overlay */}
            <div className="canvas-overlay">
              <div className="tracking-info">
                <div className="info-item">
                  <span className="info-label">Tracked:</span>
                  <span className="info-value">{satellites.filter(s => s.status === 'active').length}/{satellites.length}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Stations:</span>
                  <span className="info-value">{groundStations.filter(s => s.status === 'online').length}/{groundStations.length}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Anomalies:</span>
                  <span className="info-value alert">{anomalies.filter(a => !a.resolved).length}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Telemetry Details Panel */}
        <motion.div
          className="telemetry-panel"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3>Telemetry Data</h3>

          <AnimatePresence mode="wait">
            {selectedSatellite ? (
              <motion.div
                key={selectedSatellite.id}
                className="telemetry-details"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="telemetry-header">
                  <div className="satellite-name">{selectedSatellite.name}</div>
                  <div className="satellite-type">{selectedSatellite.satellite_type.replace('_', ' ')}</div>
                </div>

                <div className="live-metrics">
                  <h4>Live Metrics</h4>
                  <div className="metrics-grid">
                    <div className="metric-card">
                      <div className="metric-label">Signal Strength</div>
                      <div className="metric-value">{selectedSatellite.signal_strength.toFixed(1)}%</div>
                      <div className="metric-bar">
                        <div
                          className="metric-fill signal"
                          style={{ width: `${selectedSatellite.signal_strength}%` }}
                        />
                      </div>
                    </div>

                    <div className="metric-card">
                      <div className="metric-label">Power Level</div>
                      <div className="metric-value">{selectedSatellite.power_level.toFixed(1)}%</div>
                      <div className="metric-bar">
                        <div
                          className="metric-fill power"
                          style={{ width: `${selectedSatellite.power_level}%` }}
                        />
                      </div>
                    </div>

                    <div className="metric-card">
                      <div className="metric-label">Temperature</div>
                      <div className="metric-value">{selectedSatellite.temperature.toFixed(1)}°C</div>
                    </div>

                    <div className="metric-card">
                      <div className="metric-label">Orbit Period</div>
                      <div className="metric-value">{selectedSatellite.orbit_period.toFixed(1)}min</div>
                    </div>
                  </div>
                </div>

                <div className="mission-info">
                  <h4>Mission Information</h4>
                  <div className="mission-details">
                    <div className="detail-item">
                      <span className="detail-label">Mission:</span>
                      <span className="detail-value">{selectedSatellite.mission}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Operator:</span>
                      <span className="detail-value">{selectedSatellite.operator}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Launch Date:</span>
                      <span className="detail-value">{selectedSatellite.launch_date.toLocaleDateString()}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Status:</span>
                      <span
                        className="detail-value status"
                        style={{ color: getStatusColor(selectedSatellite.status) }}
                      >
                        {selectedSatellite.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="orbital-data">
                  <h4>Orbital Parameters</h4>
                  <div className="orbital-details">
                    <div className="detail-item">
                      <span className="detail-label">Altitude:</span>
                      <span className="detail-value">{(selectedSatellite.orbit_altitude * 6371).toFixed(0)} km</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Position:</span>
                      <span className="detail-value coordinate">
                        ({selectedSatellite.position.map(p => p.toFixed(2)).join(', ')})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="telemetry-actions">
                  <button className="action-btn command">
                    <span>📡</span> Send Command
                  </button>
                  <button className="action-btn maneuver">
                    <span>🚀</span> Plan Maneuver
                  </button>
                  <button className="action-btn download">
                    <span>📥</span> Download Data
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                className="no-selection"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="no-selection-icon">🛰️</div>
                <div className="no-selection-text">
                  Select a satellite to view telemetry data
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <style jsx>{`
        .satellite-monitor {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: rgba(10, 10, 15, 0.9);
          border-radius: 12px;
          overflow: hidden;
        }

        .monitor-header {
          padding: 1.5rem 2rem;
          background: rgba(15, 15, 25, 0.9);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(0, 255, 255, 0.1);
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
          background: linear-gradient(45deg, #00bfff, #1e90ff);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .monitor-status {
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
          background: #00bfff;
          box-shadow: 0 0 10px rgba(0, 191, 255, 0.5);
          animation: satellite-pulse 2s ease-in-out infinite;
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
          accent-color: #00bfff;
        }

        .control-btn {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(0, 191, 255, 0.3);
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
          background: rgba(0, 191, 255, 0.1);
          border-color: rgba(0, 191, 255, 0.5);
        }

        .control-btn.active {
          background: rgba(0, 191, 255, 0.2);
          border-color: #00bfff;
          box-shadow: 0 0 10px rgba(0, 191, 255, 0.3);
        }

        .monitor-content {
          flex: 1;
          display: flex;
          gap: 1rem;
          padding: 1rem;
          overflow: hidden;
        }

        .satellites-panel {
          width: 300px;
          background: rgba(15, 15, 25, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(0, 191, 255, 0.1);
          border-radius: 12px;
          padding: 1.5rem;
          overflow-y: auto;
        }

        .satellites-panel h3 {
          font-size: 1.1rem;
          color: #fff;
          margin-bottom: 1.5rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid rgba(0, 191, 255, 0.2);
        }

        .satellite-list {
          margin-bottom: 2rem;
        }

        .satellite-card {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 0.75rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .satellite-card:hover {
          background: rgba(0, 191, 255, 0.05);
          border-color: rgba(0, 191, 255, 0.3);
        }

        .satellite-card.selected {
          background: rgba(0, 191, 255, 0.1);
          border-color: #00bfff;
          box-shadow: 0 0 10px rgba(0, 191, 255, 0.3);
        }

        .satellite-card.active {
          border-left: 3px solid #00ff00;
        }

        .satellite-card.inactive {
          border-left: 3px solid #ff0000;
          opacity: 0.7;
        }

        .satellite-card.maintenance {
          border-left: 3px solid #ffff00;
        }

        .satellite-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .satellite-icon {
          font-size: 1.5rem;
        }

        .satellite-info {
          flex: 1;
        }

        .satellite-name {
          font-size: 1rem;
          font-weight: 600;
          color: #fff;
        }

        .satellite-mission {
          font-size: 0.8rem;
          color: #888;
          margin-top: 0.25rem;
        }

        .satellite-status {
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .satellite-metrics {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .metric {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
        }

        .metric span:first-child {
          color: #888;
        }

        .metric span:last-child {
          color: #00bfff;
          font-weight: 600;
        }

        .operator-info {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          padding-top: 0.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .operator-label {
          color: #888;
        }

        .operator-name {
          color: #fff;
          font-weight: 600;
        }

        .ground-stations {
          margin-bottom: 2rem;
        }

        .ground-stations h4 {
          font-size: 1rem;
          color: #fff;
          margin-bottom: 1rem;
        }

        .station-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .station-card {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          padding: 0.75rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .station-card:hover {
          background: rgba(0, 191, 255, 0.05);
          border-color: rgba(0, 191, 255, 0.3);
        }

        .station-card.selected {
          background: rgba(0, 191, 255, 0.1);
          border-color: #00bfff;
        }

        .station-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
        }

        .station-icon {
          font-size: 1rem;
        }

        .station-name {
          flex: 1;
          font-size: 0.9rem;
          font-weight: 600;
          color: #fff;
        }

        .station-status {
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .station-coordinates {
          font-size: 0.8rem;
          color: #888;
          font-family: 'JetBrains Mono', monospace;
        }

        .anomalies-section h4 {
          font-size: 1rem;
          color: #fff;
          margin-bottom: 1rem;
        }

        .anomalies-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .anomaly-card {
          background: rgba(255, 0, 0, 0.1);
          border: 1px solid rgba(255, 0, 0, 0.3);
          border-radius: 6px;
          padding: 0.75rem;
        }

        .anomaly-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.25rem;
        }

        .anomaly-type {
          font-size: 0.8rem;
          color: #fff;
          font-weight: 600;
          text-transform: capitalize;
        }

        .anomaly-severity {
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .anomaly-satellite {
          font-size: 0.8rem;
          color: #888;
          margin-bottom: 0.25rem;
        }

        .anomaly-time {
          font-size: 0.7rem;
          color: #888;
          font-family: 'JetBrains Mono', monospace;
        }

        .visualization-container {
          flex: 1;
          background: rgba(15, 15, 25, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(0, 191, 255, 0.1);
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
          border: 1px solid rgba(0, 191, 255, 0.3);
          border-radius: 8px;
          padding: 1rem;
        }

        .tracking-info {
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
          color: #00bfff;
          font-weight: 600;
        }

        .info-value.alert {
          color: #ff0000;
          text-shadow: 0 0 5px rgba(255, 0, 0, 0.5);
        }

        .telemetry-panel {
          width: 300px;
          background: rgba(15, 15, 25, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(0, 191, 255, 0.1);
          border-radius: 12px;
          padding: 1.5rem;
          overflow-y: auto;
        }

        .telemetry-panel h3 {
          font-size: 1.1rem;
          color: #fff;
          margin-bottom: 1.5rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid rgba(0, 191, 255, 0.2);
        }

        .telemetry-details {
          height: 100%;
        }

        .telemetry-header {
          text-align: center;
          margin-bottom: 2rem;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
        }

        .satellite-name {
          font-size: 1.3rem;
          font-weight: 600;
          color: #00bfff;
          margin-bottom: 0.5rem;
        }

        .satellite-type {
          font-size: 0.9rem;
          color: #888;
          text-transform: capitalize;
        }

        .live-metrics {
          margin-bottom: 2rem;
        }

        .live-metrics h4 {
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
          border: 1px solid rgba(0, 191, 255, 0.2);
          border-radius: 6px;
          padding: 0.75rem;
          text-align: center;
        }

        .metric-label {
          font-size: 0.8rem;
          color: #888;
          margin-bottom: 0.25rem;
        }

        .metric-value {
          font-size: 1rem;
          font-weight: 600;
          color: #00bfff;
          margin-bottom: 0.5rem;
        }

        .metric-bar {
          width: 100%;
          height: 4px;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 2px;
          overflow: hidden;
        }

        .metric-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.3s ease;
        }

        .metric-fill.signal {
          background: linear-gradient(90deg, #00bfff, #87ceeb);
        }

        .metric-fill.power {
          background: linear-gradient(90deg, #00ff00, #90ee90);
        }

        .mission-info,
        .orbital-data {
          margin-bottom: 2rem;
        }

        .mission-info h4,
        .orbital-data h4 {
          font-size: 1rem;
          color: #fff;
          margin-bottom: 1rem;
        }

        .mission-details,
        .orbital-details {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .detail-label {
          font-size: 0.8rem;
          color: #888;
        }

        .detail-value {
          font-size: 0.8rem;
          color: #fff;
          font-weight: 600;
        }

        .detail-value.status {
          text-transform: uppercase;
        }

        .detail-value.coordinate {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.7rem;
        }

        .telemetry-actions {
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

        .action-btn.command {
          border-color: rgba(0, 191, 255, 0.5);
          color: #00bfff;
        }

        .action-btn.command:hover {
          background: rgba(0, 191, 255, 0.1);
          border-color: #00bfff;
        }

        .action-btn.maneuver {
          border-color: rgba(255, 165, 0, 0.5);
          color: #ffa500;
        }

        .action-btn.maneuver:hover {
          background: rgba(255, 165, 0, 0.1);
          border-color: #ffa500;
        }

        .action-btn.download {
          border-color: rgba(0, 255, 0, 0.5);
          color: #00ff00;
        }

        .action-btn.download:hover {
          background: rgba(0, 255, 0, 0.1);
          border-color: #00ff00;
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

        @keyframes satellite-pulse {
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
          .monitor-content {
            flex-direction: column;
          }

          .satellites-panel,
          .telemetry-panel {
            width: 100%;
            max-height: 300px;
          }

          .monitor-header {
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

export default SatelliteMonitor;