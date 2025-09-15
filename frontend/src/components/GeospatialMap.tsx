import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Temporary public token for demo - replace with your token
mapboxgl.accessToken = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';

interface HotspotData {
  id: string;
  coordinates: [number, number];
  intensity: number;
  type: 'environmental' | 'mycelium' | 'quantum';
  temperature: number;
  humidity: number;
  elevation: number;
}

interface SensorReading {
  id: string;
  coordinates: [number, number];
  value: number;
  type: 'temperature' | 'humidity' | 'air_quality' | 'soil_ph';
  status: 'active' | 'warning' | 'critical';
}

const GeospatialMap: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapStyle, setMapStyle] = useState('satellite-v9');
  const [activeLayer, setActiveLayer] = useState('hotspots');
  const [sensorData, setSensorData] = useState<SensorReading[]>([]);
  const [hotspotData, setHotspotData] = useState<HotspotData[]>([]);
  const [weatherOverlay, setWeatherOverlay] = useState(false);
  const [elevationProfile, setElevationProfile] = useState(false);

  // Generate mock data
  useEffect(() => {
    const generateMockSensors = (): SensorReading[] => {
      const sensors: SensorReading[] = [];
      for (let i = 0; i < 50; i++) {
        sensors.push({
          id: `sensor-${i}`,
          coordinates: [
            -122.4194 + (Math.random() - 0.5) * 0.1,
            37.7749 + (Math.random() - 0.5) * 0.1
          ],
          value: Math.random() * 100,
          type: ['temperature', 'humidity', 'air_quality', 'soil_ph'][Math.floor(Math.random() * 4)] as any,
          status: ['active', 'warning', 'critical'][Math.floor(Math.random() * 3)] as any
        });
      }
      return sensors;
    };

    const generateMockHotspots = (): HotspotData[] => {
      const hotspots: HotspotData[] = [];
      for (let i = 0; i < 20; i++) {
        hotspots.push({
          id: `hotspot-${i}`,
          coordinates: [
            -122.4194 + (Math.random() - 0.5) * 0.2,
            37.7749 + (Math.random() - 0.5) * 0.2
          ],
          intensity: Math.random() * 100,
          type: ['environmental', 'mycelium', 'quantum'][Math.floor(Math.random() * 3)] as any,
          temperature: 15 + Math.random() * 25,
          humidity: 30 + Math.random() * 40,
          elevation: Math.random() * 1000
        });
      }
      return hotspots;
    };

    setSensorData(generateMockSensors());
    setHotspotData(generateMockHotspots());
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: `mapbox://styles/mapbox/${mapStyle}`,
      center: [-122.4194, 37.7749], // San Francisco
      zoom: 12,
      pitch: 45,
      bearing: -17.6,
      antialias: true
    });

    map.current.on('load', () => {
      if (!map.current) return;

      // Add 3D buildings layer
      map.current.addLayer({
        id: '3d-buildings',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion',
        minzoom: 15,
        paint: {
          'fill-extrusion-color': '#aaa',
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'height']
          ],
          'fill-extrusion-base': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'min_height']
          ],
          'fill-extrusion-opacity': 0.6
        }
      });

      // Add heat map source
      map.current.addSource('hotspots', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: hotspotData.map(hotspot => ({
            type: 'Feature',
            properties: {
              intensity: hotspot.intensity,
              type: hotspot.type,
              temperature: hotspot.temperature,
              humidity: hotspot.humidity,
              elevation: hotspot.elevation
            },
            geometry: {
              type: 'Point',
              coordinates: hotspot.coordinates
            }
          }))
        }
      });

      // Add heatmap layer
      map.current.addLayer({
        id: 'hotspots-heat',
        type: 'heatmap',
        source: 'hotspots',
        maxzoom: 9,
        paint: {
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['get', 'intensity'],
            0, 0,
            6, 1
          ],
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 1,
            9, 3
          ],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0, 0, 255, 0)',
            0.1, 'rgb(0, 255, 255)',
            0.3, 'rgb(0, 255, 0)',
            0.5, 'rgb(255, 255, 0)',
            0.7, 'rgb(255, 128, 0)',
            1, 'rgb(255, 0, 255)'
          ],
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 2,
            9, 20
          ],
          'heatmap-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            7, 1,
            9, 0
          ]
        }
      });

      // Add hotspot points layer
      map.current.addLayer({
        id: 'hotspots-point',
        type: 'circle',
        source: 'hotspots',
        minzoom: 7,
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            7, ['interpolate', ['linear'], ['get', 'intensity'], 1, 1, 6, 4],
            16, ['interpolate', ['linear'], ['get', 'intensity'], 1, 5, 6, 50]
          ],
          'circle-color': [
            'case',
            ['==', ['get', 'type'], 'environmental'], '#00ff00',
            ['==', ['get', 'type'], 'mycelium'], '#ff6600',
            ['==', ['get', 'type'], 'quantum'], '#ff00ff',
            '#ffffff'
          ],
          'circle-stroke-color': 'white',
          'circle-stroke-width': 1,
          'circle-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            7, 0,
            8, 1
          ]
        }
      });

      // Add sensors layer
      map.current.addSource('sensors', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: sensorData.map(sensor => ({
            type: 'Feature',
            properties: {
              value: sensor.value,
              type: sensor.type,
              status: sensor.status
            },
            geometry: {
              type: 'Point',
              coordinates: sensor.coordinates
            }
          }))
        }
      });

      map.current.addLayer({
        id: 'sensors',
        type: 'circle',
        source: 'sensors',
        paint: {
          'circle-radius': 6,
          'circle-color': [
            'case',
            ['==', ['get', 'status'], 'active'], '#00ff00',
            ['==', ['get', 'status'], 'warning'], '#ffff00',
            ['==', ['get', 'status'], 'critical'], '#ff0000',
            '#888888'
          ],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-opacity': 0.8
        }
      });

      // Add click events for interactive popups
      map.current.on('click', 'hotspots-point', (e) => {
        if (!e.features || !e.features[0]) return;
        const properties = e.features[0].properties;

        new mapboxgl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="color: #000; padding: 10px;">
              <h3>${properties?.type} Hotspot</h3>
              <p><strong>Intensity:</strong> ${properties?.intensity}%</p>
              <p><strong>Temperature:</strong> ${properties?.temperature}°C</p>
              <p><strong>Humidity:</strong> ${properties?.humidity}%</p>
              <p><strong>Elevation:</strong> ${properties?.elevation}m</p>
            </div>
          `)
          .addTo(map.current!);
      });

      map.current.on('click', 'sensors', (e) => {
        if (!e.features || !e.features[0]) return;
        const properties = e.features[0].properties;

        new mapboxgl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="color: #000; padding: 10px;">
              <h3>${properties?.type} Sensor</h3>
              <p><strong>Value:</strong> ${properties?.value}</p>
              <p><strong>Status:</strong> ${properties?.status}</p>
            </div>
          `)
          .addTo(map.current!);
      });
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [mapStyle, hotspotData, sensorData]);

  const changeMapStyle = (style: string) => {
    setMapStyle(style);
    if (map.current) {
      map.current.setStyle(`mapbox://styles/mapbox/${style}`);
    }
  };

  const toggleLayer = (layerId: string) => {
    if (!map.current) return;

    const visibility = map.current.getLayoutProperty(layerId, 'visibility');
    if (visibility === 'visible') {
      map.current.setLayoutProperty(layerId, 'visibility', 'none');
    } else {
      map.current.setLayoutProperty(layerId, 'visibility', 'visible');
    }
  };

  return (
    <div className="geospatial-container">
      <motion.div
        className="map-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="map-title">Geospatial Intelligence Network</h2>
        <div className="map-stats">
          <div className="stat-item">
            <span className="stat-value">{hotspotData.length}</span>
            <span className="stat-label">Active Hotspots</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{sensorData.length}</span>
            <span className="stat-label">Sensor Nodes</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">98.7%</span>
            <span className="stat-label">Network Health</span>
          </div>
        </div>
      </motion.div>

      <div className="map-container-wrapper">
        {/* Map Controls */}
        <motion.div
          className="map-controls"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="control-group">
            <h3>Map Style</h3>
            <div className="style-buttons">
              {[
                { id: 'satellite-v9', label: 'Satellite', icon: '🛰️' },
                { id: 'streets-v11', label: 'Streets', icon: '🗺️' },
                { id: 'dark-v10', label: 'Dark', icon: '🌙' },
                { id: 'outdoors-v11', label: 'Terrain', icon: '⛰️' }
              ].map(style => (
                <motion.button
                  key={style.id}
                  className={`style-btn ${mapStyle === style.id ? 'active' : ''}`}
                  onClick={() => changeMapStyle(style.id)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="btn-icon">{style.icon}</span>
                  <span className="btn-label">{style.label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <h3>Data Layers</h3>
            <div className="layer-toggles">
              {[
                { id: 'hotspots-heat', label: 'Heat Map', icon: '🔥' },
                { id: 'hotspots-point', label: 'Hotspots', icon: '📍' },
                { id: 'sensors', label: 'Sensors', icon: '📡' },
                { id: '3d-buildings', label: '3D Buildings', icon: '🏢' }
              ].map(layer => (
                <motion.button
                  key={layer.id}
                  className="layer-toggle"
                  onClick={() => toggleLayer(layer.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="toggle-icon">{layer.icon}</span>
                  <span className="toggle-label">{layer.label}</span>
                  <div className="toggle-switch"></div>
                </motion.button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <h3>Analysis Tools</h3>
            <div className="analysis-tools">
              <motion.button
                className={`tool-btn ${weatherOverlay ? 'active' : ''}`}
                onClick={() => setWeatherOverlay(!weatherOverlay)}
                whileHover={{ scale: 1.05 }}
              >
                <span className="tool-icon">🌤️</span>
                <span className="tool-label">Weather</span>
              </motion.button>
              <motion.button
                className={`tool-btn ${elevationProfile ? 'active' : ''}`}
                onClick={() => setElevationProfile(!elevationProfile)}
                whileHover={{ scale: 1.05 }}
              >
                <span className="tool-icon">📊</span>
                <span className="tool-label">Elevation</span>
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Main Map */}
        <motion.div
          className="map-main"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <div ref={mapContainer} className="map-container" />

          {/* Real-time Data Overlay */}
          <div className="data-overlay">
            <motion.div
              className="live-feed"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="feed-indicator"></div>
              <span>LIVE DATA STREAM</span>
            </motion.div>
          </div>
        </motion.div>

        {/* Legend */}
        <motion.div
          className="map-legend"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h3>Legend</h3>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-color environmental"></div>
              <span>Environmental</span>
            </div>
            <div className="legend-item">
              <div className="legend-color mycelium"></div>
              <span>Mycelium Network</span>
            </div>
            <div className="legend-item">
              <div className="legend-color quantum"></div>
              <span>Quantum Nodes</span>
            </div>
            <div className="legend-item">
              <div className="legend-color sensor-active"></div>
              <span>Active Sensors</span>
            </div>
            <div className="legend-item">
              <div className="legend-color sensor-warning"></div>
              <span>Warning Status</span>
            </div>
            <div className="legend-item">
              <div className="legend-color sensor-critical"></div>
              <span>Critical Status</span>
            </div>
          </div>
        </motion.div>
      </div>

      <style jsx>{`
        .geospatial-container {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: rgba(10, 10, 15, 0.9);
          border-radius: 12px;
          overflow: hidden;
        }

        .map-header {
          padding: 1.5rem 2rem;
          background: rgba(15, 15, 25, 0.9);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(0, 255, 255, 0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .map-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #ffffff;
          margin: 0;
          background: linear-gradient(45deg, #00ffff, #ff00ff);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .map-stats {
          display: flex;
          gap: 2rem;
        }

        .stat-item {
          text-align: center;
        }

        .stat-value {
          display: block;
          font-size: 1.2rem;
          font-weight: 600;
          color: #00ffff;
          text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
        }

        .stat-label {
          display: block;
          font-size: 0.8rem;
          color: #888;
          margin-top: 0.25rem;
        }

        .map-container-wrapper {
          flex: 1;
          display: flex;
          position: relative;
        }

        .map-controls {
          width: 250px;
          background: rgba(15, 15, 25, 0.95);
          backdrop-filter: blur(20px);
          border-right: 1px solid rgba(0, 255, 255, 0.1);
          padding: 1.5rem;
          overflow-y: auto;
        }

        .control-group {
          margin-bottom: 2rem;
        }

        .control-group h3 {
          font-size: 0.9rem;
          color: #888;
          margin-bottom: 1rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .style-buttons {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .style-btn {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(0, 255, 255, 0.2);
          color: #fff;
          padding: 0.75rem;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
        }

        .style-btn:hover {
          background: rgba(0, 255, 255, 0.1);
          border-color: rgba(0, 255, 255, 0.5);
        }

        .style-btn.active {
          background: rgba(0, 255, 255, 0.2);
          border-color: #00ffff;
          box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
        }

        .btn-icon {
          font-size: 1rem;
        }

        .btn-label {
          font-size: 0.9rem;
        }

        .layer-toggles {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .layer-toggle {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(0, 255, 255, 0.2);
          color: #fff;
          padding: 0.75rem;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
        }

        .layer-toggle:hover {
          background: rgba(0, 255, 255, 0.1);
        }

        .toggle-icon {
          font-size: 1rem;
        }

        .toggle-label {
          flex: 1;
          font-size: 0.9rem;
          text-align: left;
        }

        .toggle-switch {
          width: 20px;
          height: 10px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          position: relative;
        }

        .toggle-switch::after {
          content: '';
          width: 8px;
          height: 8px;
          background: #00ffff;
          border-radius: 50%;
          position: absolute;
          top: 1px;
          left: 1px;
          transition: transform 0.3s ease;
        }

        .analysis-tools {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .tool-btn {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(0, 255, 255, 0.2);
          color: #fff;
          padding: 0.75rem;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
        }

        .tool-btn:hover {
          background: rgba(0, 255, 255, 0.1);
        }

        .tool-btn.active {
          background: rgba(0, 255, 255, 0.2);
          border-color: #00ffff;
        }

        .tool-icon {
          font-size: 1rem;
        }

        .tool-label {
          font-size: 0.9rem;
        }

        .map-main {
          flex: 1;
          position: relative;
        }

        .map-container {
          width: 100%;
          height: 100%;
        }

        .data-overlay {
          position: absolute;
          top: 1rem;
          left: 1rem;
          z-index: 1000;
        }

        .live-feed {
          background: rgba(0, 0, 0, 0.8);
          border: 1px solid rgba(0, 255, 0, 0.5);
          border-radius: 20px;
          padding: 0.5rem 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: #00ff00;
          font-weight: 600;
        }

        .feed-indicator {
          width: 8px;
          height: 8px;
          background: #00ff00;
          border-radius: 50%;
          animation: pulse 1s ease-in-out infinite;
        }

        .map-legend {
          width: 200px;
          background: rgba(15, 15, 25, 0.95);
          backdrop-filter: blur(20px);
          border-left: 1px solid rgba(0, 255, 255, 0.1);
          padding: 1.5rem;
        }

        .map-legend h3 {
          font-size: 0.9rem;
          color: #888;
          margin-bottom: 1rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .legend-items {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.8rem;
          color: #ccc;
        }

        .legend-color {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          box-shadow: 0 0 6px currentColor;
        }

        .legend-color.environmental {
          background: #00ff00;
          color: #00ff00;
        }

        .legend-color.mycelium {
          background: #ff6600;
          color: #ff6600;
        }

        .legend-color.quantum {
          background: #ff00ff;
          color: #ff00ff;
        }

        .legend-color.sensor-active {
          background: #00ff00;
          color: #00ff00;
        }

        .legend-color.sensor-warning {
          background: #ffff00;
          color: #ffff00;
        }

        .legend-color.sensor-critical {
          background: #ff0000;
          color: #ff0000;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @media (max-width: 1024px) {
          .map-container-wrapper {
            flex-direction: column;
          }

          .map-controls,
          .map-legend {
            width: 100%;
            max-height: 200px;
          }

          .map-header {
            flex-direction: column;
            gap: 1rem;
          }

          .map-stats {
            flex-direction: row;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default GeospatialMap;