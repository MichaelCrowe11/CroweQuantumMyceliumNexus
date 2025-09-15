const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8300/api';

export interface NetworkData {
  id: number;
  name: string;
  status: string;
  health: number;
  temperature: number;
  humidity: number;
  co2: number;
  strain: string;
  inoculationDate: string;
  estimatedHarvest: string;
}

export interface QuantumCircuit {
  id: number;
  name: string;
  status: string;
  progress: number;
  backend: string;
}

export interface EnvironmentalSensor {
  value: number;
  unit: string;
  status: string;
  trend: string;
}

export interface AIModel {
  id: number;
  name: string;
  accuracy: number;
  status: string;
  lastTrained: string;
  predictions: number;
  avgResponseTime: string;
}

class ApiService {
  private async fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 8000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(id);
      console.error('API call failed:', error);
      throw error;
    }
  }

  async getMetrics() {
    try {
      return await this.fetchWithTimeout(`${API_BASE_URL}/metrics`);
    } catch (error) {
      return {
        myceliumNetworks: 24,
        quantumCircuits: 156,
        environmentalSensors: 48,
        aiModels: 7,
        networkGrowth: 12,
        quantumEfficiency: 8
      };
    }
  }

  async getNetworks(): Promise<{ networks: NetworkData[] }> {
    try {
      return await this.fetchWithTimeout(`${API_BASE_URL}/networks`);
    } catch (error) {
      return {
        networks: [
          {
            id: 1,
            name: 'Oyster Mushroom Colony A',
            status: 'Growing',
            health: 95,
            temperature: 23.5,
            humidity: 78,
            co2: 1200,
            strain: 'Pleurotus ostreatus',
            inoculationDate: '2024-01-15',
            estimatedHarvest: '2024-02-10'
          },
          {
            id: 2,
            name: 'Shiitake Network B',
            status: 'Fruiting',
            health: 88,
            temperature: 22.1,
            humidity: 82,
            co2: 1100,
            strain: 'Lentinula edodes',
            inoculationDate: '2024-01-10',
            estimatedHarvest: '2024-02-05'
          },
          {
            id: 3,
            name: "Lion's Mane Cluster C",
            status: 'Colonizing',
            health: 92,
            temperature: 24.0,
            humidity: 75,
            co2: 1150,
            strain: 'Hericium erinaceus',
            inoculationDate: '2024-01-20',
            estimatedHarvest: '2024-02-15'
          },
          {
            id: 4,
            name: 'Reishi Growth Chamber D',
            status: 'Monitoring',
            health: 97,
            temperature: 25.2,
            humidity: 80,
            co2: 1250,
            strain: 'Ganoderma lucidum',
            inoculationDate: '2024-01-08',
            estimatedHarvest: '2024-03-01'
          }
        ]
      };
    }
  }

  async getQuantum(): Promise<{ circuits: QuantumCircuit[] }> {
    try {
      return await this.fetchWithTimeout(`${API_BASE_URL}/quantum`);
    } catch (error) {
      return {
        circuits: [
          { id: 1, name: 'Molecular Optimization', status: 'running', progress: 98, backend: 'IBM' },
          { id: 2, name: 'Pattern Recognition', status: 'completed', progress: 100, backend: 'Rigetti' },
          { id: 3, name: 'Growth Prediction', status: 'running', progress: 67, backend: 'Local Simulator' }
        ]
      };
    }
  }

  async getEnvironmental() {
    try {
      return await this.fetchWithTimeout(`${API_BASE_URL}/environmental`);
    } catch (error) {
      return {
        sensors: {
          temperature: { value: 23.5, unit: '°C', status: 'optimal', trend: 'stable' },
          humidity: { value: 78, unit: '%', status: 'ideal', trend: 'rising' },
          co2: { value: 1200, unit: 'ppm', status: 'normal', trend: 'stable' }
        }
      };
    }
  }

  async getAnalytics(): Promise<{ models: AIModel[] }> {
    try {
      return await this.fetchWithTimeout(`${API_BASE_URL}/analytics`);
    } catch (error) {
      return {
        models: [
          {
            id: 1,
            name: 'Growth Rate Predictor',
            accuracy: 94,
            status: 'active',
            lastTrained: '2024-01-25',
            predictions: 1234,
            avgResponseTime: '127ms'
          },
          {
            id: 2,
            name: 'Contamination Detector',
            accuracy: 97,
            status: 'active',
            lastTrained: '2024-01-24',
            predictions: 892,
            avgResponseTime: '89ms'
          },
          {
            id: 3,
            name: 'Yield Optimizer',
            accuracy: 89,
            status: 'training',
            lastTrained: '2024-01-23',
            predictions: 567,
            avgResponseTime: '156ms'
          },
          {
            id: 4,
            name: 'Environmental Correlator',
            accuracy: 91,
            status: 'active',
            lastTrained: '2024-01-26',
            predictions: 2103,
            avgResponseTime: '203ms'
          }
        ]
      };
    }
  }

  async getStatus() {
    try {
      return await this.fetchWithTimeout(`${API_BASE_URL}/status`);
    } catch (error) {
      return {
        status: 'operational',
        services: {
          myceliumEI: { status: 'online', health: 100 },
          quantumBackend: { status: 'online', health: 98 },
          environmentalMonitoring: { status: 'online', health: 100 },
          aiPipeline: { status: 'processing', health: 95 }
        }
      };
    }
  }

  async getActivity() {
    try {
      return await this.fetchWithTimeout(`${API_BASE_URL}/activity`);
    } catch (error) {
      return {
        activities: [
          {
            id: 1,
            timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
            type: 'mycelium',
            title: 'New mycelium strain detected',
            description: 'Pleurotus ostreatus variant showing 23% faster growth'
          }
        ]
      };
    }
  }

  connectWebSocket(onMessage: (data: any) => void): WebSocket | null {
    try {
      const wsUrl = API_BASE_URL.replace('http', 'ws').replace('/api', '');
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
      };

      return ws;
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      return null;
    }
  }
}

export default new ApiService();