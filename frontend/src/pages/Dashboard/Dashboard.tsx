import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  Science as ScienceIcon,
  Memory as MemoryIcon,
  Eco as EcoIcon,
  CloudQueue as CloudIcon,
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  color: string;
  route: string;
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<MetricCard[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setMetrics([
          {
            title: 'Active Mycelium Networks',
            value: 24,
            change: 12,
            icon: <EcoIcon />,
            color: '#059669',
            route: '/networks'
          },
          {
            title: 'Quantum Circuits Running',
            value: 7,
            change: -5,
            icon: <MemoryIcon />,
            color: '#7c3aed',
            route: '/quantum-circuits'
          },
          {
            title: 'Environmental Sensors',
            value: 156,
            change: 8,
            icon: <CloudIcon />,
            color: '#0891b2',
            route: '/monitoring'
          },
          {
            title: 'Research Experiments',
            value: 31,
            change: 15,
            icon: <ScienceIcon />,
            color: '#dc2626',
            route: '/computations'
          },
          {
            title: 'System Performance',
            value: '98.5%',
            change: 2.3,
            icon: <SpeedIcon />,
            color: '#f59e0b',
            route: '/monitoring'
          },
          {
            title: 'Growth Predictions',
            value: 142,
            change: 23,
            icon: <TrendingUpIcon />,
            color: '#8b5cf6',
            route: '/networks'
          }
        ]);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleCardClick = (route: string) => {
    navigate(route);
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 600 }}>
        CroweQuantumMyceliumNexus Dashboard
      </Typography>

      <Grid container spacing={3}>
        {metrics.map((metric, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card
              sx={{
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
              onClick={() => handleCardClick(metric.route)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{
                    p: 1.5,
                    borderRadius: 2,
                    backgroundColor: `${metric.color}20`,
                    color: metric.color,
                    mr: 2
                  }}>
                    {metric.icon}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {metric.title}
                  </Typography>
                </Box>

                <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                  {metric.value}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography
                    variant="body2"
                    sx={{
                      color: metric.change > 0 ? 'success.main' : 'error.main',
                      fontWeight: 500
                    }}
                  >
                    {metric.change > 0 ? '+' : ''}{metric.change}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    from last week
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Recent Activity
            </Typography>
            <Box sx={{ minHeight: 300 }}>
              <Typography variant="body2" color="text.secondary">
                Activity timeline will be displayed here
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              System Status
            </Typography>
            <Box sx={{ minHeight: 300 }}>
              <Typography variant="body2" color="text.secondary">
                All systems operational
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};