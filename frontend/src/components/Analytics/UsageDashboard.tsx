import React, { useState, useEffect } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface UsageMetrics {
  totalUsers: number;
  activeUsers: number;
  quantumExecutions: number;
  myceliumPrograms: number;
  visualizations: number;
  averageSessionDuration: number;
  topFeatures: { name: string; usage: number }[];
  quantumBackends: { name: string; executions: number }[];
  dailyActivity: { date: string; users: number; executions: number }[];
  errorRate: number;
  performance: {
    avgQuantumExecutionTime: number;
    avgVisualizationRenderTime: number;
    avgProgramCompileTime: number;
  };
}

const UsageDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<UsageMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  useEffect(() => {
    fetchUsageMetrics();
  }, [timeRange]);

  const fetchUsageMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/usage?range=${timeRange}`);
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to fetch usage metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load usage metrics</p>
      </div>
    );
  }

  // Chart configurations
  const activityChartData = {
    labels: metrics.dailyActivity.map(d => new Date(d.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Active Users',
        data: metrics.dailyActivity.map(d => d.users),
        borderColor: 'rgb(139, 92, 246)',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        tension: 0.3
      },
      {
        label: 'Quantum Executions',
        data: metrics.dailyActivity.map(d => d.executions),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.3,
        yAxisID: 'y1'
      }
    ]
  };

  const activityChartOptions = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'Platform Activity Over Time'
      }
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
      }
    }
  };

  const featuresChartData = {
    labels: metrics.topFeatures.map(f => f.name),
    datasets: [{
      label: 'Usage Count',
      data: metrics.topFeatures.map(f => f.usage),
      backgroundColor: [
        'rgba(139, 92, 246, 0.8)',
        'rgba(34, 197, 94, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(251, 191, 36, 0.8)',
        'rgba(239, 68, 68, 0.8)'
      ]
    }]
  };

  const backendsChartData = {
    labels: metrics.quantumBackends.map(b => b.name),
    datasets: [{
      data: metrics.quantumBackends.map(b => b.executions),
      backgroundColor: [
        '#8B5CF6',
        '#22C55E',
        '#3B82F6',
        '#FB923C',
        '#EF4444'
      ]
    }]
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Usage Analytics</h1>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as '24h' | '7d' | '30d')}
          className="px-4 py-2 border border-gray-300 rounded-md bg-white"
        >
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
        </select>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalUsers.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"></path>
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Active Users</h3>
              <p className="text-2xl font-bold text-gray-900">{metrics.activeUsers.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"></path>
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Quantum Executions</h3>
              <p className="text-2xl font-bold text-gray-900">{metrics.quantumExecutions.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"></path>
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Mycelium Programs</h3>
              <p className="text-2xl font-bold text-gray-900">{metrics.myceliumPrograms.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Avg Quantum Execution</span>
                <span className="text-gray-900">{metrics.performance.avgQuantumExecutionTime}ms</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div 
                  className="bg-purple-600 h-2 rounded-full" 
                  style={{width: `${Math.min(metrics.performance.avgQuantumExecutionTime / 1000 * 100, 100)}%`}}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Avg Visualization Render</span>
                <span className="text-gray-900">{metrics.performance.avgVisualizationRenderTime}ms</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{width: `${Math.min(metrics.performance.avgVisualizationRenderTime / 500 * 100, 100)}%`}}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Error Rate</span>
                <span className="text-gray-900">{metrics.errorRate.toFixed(2)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div 
                  className="bg-red-600 h-2 rounded-full" 
                  style={{width: `${metrics.errorRate}%`}}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Features</h3>
          <div className="h-64">
            <Bar data={featuresChartData} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false
                }
              }
            }} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quantum Backends</h3>
          <div className="h-64">
            <Doughnut data={backendsChartData} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'bottom'
                }
              }
            }} />
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Activity</h3>
        <div className="h-80">
          <Line data={activityChartData} options={activityChartOptions} />
        </div>
      </div>
    </div>
  );
};

export default UsageDashboard;