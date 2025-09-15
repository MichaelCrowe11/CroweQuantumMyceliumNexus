# 🍄 Mycelium-EI (Environmental Intelligence)

> **Advanced Environmental Intelligence Platform** integrating ecological monitoring, satellite analytics, and quantum computing

[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![EPA Compliant](https://img.shields.io/badge/EPA-Compliant-green)](docs/compliance.md)
[![Google Cloud](https://img.shields.io/badge/Google_Cloud-Integrated-4285F4)](docs/google.md)
[![Quantum Ready](https://img.shields.io/badge/Quantum-Enabled-purple)](docs/quantum.md)

## 🌟 Overview

**Mycelium-EI** is a cutting-edge environmental intelligence platform that combines:
- **Ecological Monitoring**: Real-time mycelium network analysis and growth optimization
- **Satellite Integration**: Live satellite tracking and environmental hotspot detection
- **Google Cloud Services**: Full integration with Maps, Vision, BigQuery, IoT Core, and more
- **Quantum Computing**: Advanced predictive modeling using quantum algorithms
- **AI Analytics**: Machine learning models for contamination detection and yield optimization

## 🚀 Key Features

### Environmental Intelligence
- 🌍 **Geospatial Analytics** - Satellite imagery and terrain mapping
- 📡 **Real-time Monitoring** - IoT sensor networks with live data streaming
- 🛰️ **Satellite Tracking** - LANDSAT, SENTINEL, TERRA-MODIS integration
- 🔥 **Hotspot Detection** - Environmental anomaly identification
- 📊 **Predictive Analytics** - AI-powered growth and yield predictions

### Mycelium Research
- 🧬 **Strain Analysis** - Multi-species tracking and optimization
- 📈 **Growth Monitoring** - Real-time biomass evolution
- 🌡️ **Environmental Control** - Automated climate management
- 🔬 **Contamination Detection** - ML-based early warning system
- 📱 **Mobile Access** - Field research companion app

### Google Cloud Integration
- 🗺️ **Google Maps** - Geocoding, elevation, and place data
- 👁️ **Vision API** - Image analysis for lab samples
- 💾 **BigQuery** - Environmental data analytics
- ☁️ **Cloud Storage** - Secure data archival
- 🔥 **Firestore** - Real-time database sync
- 📨 **Pub/Sub** - Sensor data messaging
- 🤖 **IoT Core** - Device management

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Material-UI, Three.js, Mapbox GL
- **Backend**: Node.js, Express, WebSocket
- **Database**: Firestore, BigQuery, PostgreSQL
- **Cloud**: Google Cloud Platform, Fly.io
- **Quantum**: IBM Quantum, Rigetti, IonQ
- **Monitoring**: Prometheus, Grafana

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/mycelium-ei.git
cd mycelium-ei

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Set up environment variables
cp backend/.env.example backend/.env
# Edit .env with your Google Cloud credentials

# Start the platform
npm run start:all
```

## 🔧 Configuration

### Google Cloud Setup
1. Create a project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable required APIs (Maps, Vision, BigQuery, IoT Core, etc.)
3. Create service account and download credentials
4. Set `GOOGLE_APPLICATION_CREDENTIALS` in `.env`

### API Keys Required
- `GOOGLE_MAPS_API_KEY` - For mapping services
- `GOOGLE_CLOUD_PROJECT` - Your GCP project ID

## 🖥️ CLI Usage

```bash
# Run the Google API CLI
node google-cli.js

# Available commands:
status              # Check API status
satellite-tracking  # Track satellites
hotspots           # Get environmental hotspots
analyze-zone <lat> <lng>  # Analyze location
geocode <address>   # Get coordinates
```

## 📡 API Endpoints

### Core Services
- `GET /api/metrics` - System metrics
- `GET /api/networks` - Mycelium networks
- `GET /api/quantum` - Quantum computations
- `GET /api/environmental` - Sensor data
- `GET /api/analytics` - AI model status

### Google Services
- `POST /api/google/geocode` - Address geocoding
- `GET /api/google/satellite/tracking` - Satellite positions
- `POST /api/google/analyze/zone` - Environmental analysis
- `GET /api/google/hotspots` - Environmental hotspots

## 🌐 Deployment

### Fly.io Deployment
```bash
fly deploy
fly open
```

### Docker Deployment
```bash
docker build -t mycelium-ei .
docker run -p 8300:8300 mycelium-ei
```

## 📊 Monitoring

Access the monitoring dashboard at:
- **Grafana**: http://localhost:3000
- **Prometheus**: http://localhost:9090

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file.

## 🔗 Links

- **Live Demo**: https://mycelium-ei.fly.dev
- **Documentation**: https://docs.mycelium-ei.com
- **API Reference**: https://api.mycelium-ei.com/docs
- **Support**: support@mycelium-ei.com

## 👥 Team

- **Michael Crowe** - Platform Architect
- **AI Assistant Claude** - Development Partner

---

*Mycelium-EI: Growing the future of environmental intelligence* 🌱