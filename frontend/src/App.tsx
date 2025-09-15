import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GeospatialMap from './components/GeospatialMap';
import EnvironmentalDashboard from './components/EnvironmentalDashboard';
import QuantumVisualizer from './components/QuantumVisualizer';
import MyceliumAnalytics from './components/MyceliumAnalytics';
import SatelliteMonitor from './components/SatelliteMonitor';
import './App.css';

interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  component: React.ComponentType;
  gradient: string;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('geospatial');
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');

  const navigationItems: NavigationItem[] = [
    {
      id: 'geospatial',
      label: 'Geospatial Analytics',
      icon: '🌍',
      component: GeospatialMap,
      gradient: 'from-cyan-400 to-blue-600'
    },
    {
      id: 'environmental',
      label: 'Environmental Monitor',
      icon: '🌿',
      component: EnvironmentalDashboard,
      gradient: 'from-green-400 to-emerald-600'
    },
    {
      id: 'quantum',
      label: 'Quantum Systems',
      icon: '⚛️',
      component: QuantumVisualizer,
      gradient: 'from-purple-400 to-indigo-600'
    },
    {
      id: 'mycelium',
      label: 'Mycelium Networks',
      icon: '🍄',
      component: MyceliumAnalytics,
      gradient: 'from-orange-400 to-red-600'
    },
    {
      id: 'satellite',
      label: 'Satellite Monitor',
      icon: '🛰️',
      component: SatelliteMonitor,
      gradient: 'from-pink-400 to-purple-600'
    }
  ];

  useEffect(() => {
    // Simulate initial loading and connection establishment
    const initializeSystem = async () => {
      setConnectionStatus('connecting');
      await new Promise(resolve => setTimeout(resolve, 2000));
      setConnectionStatus('connected');
      setIsLoading(false);
    };

    initializeSystem();
  }, []);

  const ActiveComponent = navigationItems.find(item => item.id === activeTab)?.component || GeospatialMap;

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-animation">
          <div className="quantum-loader">
            <div className="quantum-ring"></div>
            <div className="quantum-ring"></div>
            <div className="quantum-ring"></div>
          </div>
          <motion.div
            className="loading-text"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Initializing CroweQuantumMyceliumNexus
          </motion.div>
          <motion.div
            className="loading-subtitle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            Establishing quantum connections...
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Background with animated particles */}
      <div className="background-layer">
        <div className="particle-field">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              className="particle"
              initial={{
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                opacity: 0
              }}
              animate={{
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: Math.random() * 10 + 5,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          ))}
        </div>
      </div>

      {/* Header */}
      <motion.header
        className="app-header"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="header-content">
          <motion.div
            className="logo-section"
            whileHover={{ scale: 1.05 }}
          >
            <div className="logo-icon">🌌</div>
            <div className="logo-text">
              <h1>CroweQuantumMyceliumNexus</h1>
              <p>Advanced Geospatial & Environmental Intelligence</p>
            </div>
          </motion.div>

          <div className="status-indicators">
            <motion.div
              className={`connection-status ${connectionStatus}`}
              animate={{ scale: connectionStatus === 'connected' ? [1, 1.1, 1] : 1 }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="status-dot"></div>
              <span>{connectionStatus === 'connected' ? 'QUANTUM LINK ACTIVE' : 'CONNECTING...'}</span>
            </motion.div>

            <div className="system-metrics">
              <div className="metric">
                <span className="metric-label">UPTIME</span>
                <span className="metric-value">99.97%</span>
              </div>
              <div className="metric">
                <span className="metric-label">NODES</span>
                <span className="metric-value">2,847</span>
              </div>
              <div className="metric">
                <span className="metric-label">LATENCY</span>
                <span className="metric-value">12ms</span>
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Navigation */}
      <motion.nav
        className="main-navigation"
        initial={{ x: -300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <div className="nav-container">
          {navigationItems.map((item, index) => (
            <motion.button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
              whileHover={{ scale: 1.05, x: 10 }}
              whileTap={{ scale: 0.95 }}
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 + index * 0.1 }}
            >
              <div className="nav-icon">{item.icon}</div>
              <div className="nav-content">
                <span className="nav-label">{item.label}</span>
                <div className={`nav-indicator bg-gradient-to-r ${item.gradient}`}></div>
              </div>
              {activeTab === item.id && (
                <motion.div
                  className="active-indicator"
                  layoutId="activeIndicator"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          ))}
        </div>
      </motion.nav>

      {/* Main Content */}
      <main className="main-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            className="content-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <ActiveComponent />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer Status Bar */}
      <motion.footer
        className="status-bar"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.4 }}
      >
        <div className="status-content">
          <div className="status-left">
            <div className="status-item">
              <span className="status-label">SYSTEM:</span>
              <span className="status-value online">OPERATIONAL</span>
            </div>
            <div className="status-item">
              <span className="status-label">DATA STREAM:</span>
              <span className="status-value active">ACTIVE</span>
            </div>
            <div className="status-item">
              <span className="status-label">SECURITY:</span>
              <span className="status-value secure">ENCRYPTED</span>
            </div>
          </div>

          <div className="status-center">
            <motion.div
              className="data-flow"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="flow-indicator"></div>
              <span>Real-time Data Flow</span>
            </motion.div>
          </div>

          <div className="status-right">
            <div className="timestamp">
              {new Date().toLocaleString()} UTC
            </div>
          </div>
        </div>
      </motion.footer>
    </div>
  );
};

export default App;