import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Tabs,
  Tab,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Timeline as TimelineIcon,
  BubbleChart as BubbleChartIcon,
  Eco as EcoIcon
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface MyceliumStrain {
  id: string;
  name: string;
  species: string;
  status: 'active' | 'dormant' | 'growing';
  growthRate: number;
  temperature: number;
  humidity: number;
  co2Level: number;
  lastUpdated: string;
}

export const Networks: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [strains, setStrains] = useState<MyceliumStrain[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState('all');

  useEffect(() => {
    fetchStrains();
  }, []);

  const fetchStrains = async () => {
    setLoading(true);
    setTimeout(() => {
      setStrains([
        {
          id: '1',
          name: 'Pleurotus ostreatus',
          species: 'Oyster Mushroom',
          status: 'active',
          growthRate: 85,
          temperature: 22,
          humidity: 80,
          co2Level: 1200,
          lastUpdated: '2 minutes ago'
        },
        {
          id: '2',
          name: 'Lentinula edodes',
          species: 'Shiitake',
          status: 'growing',
          growthRate: 65,
          temperature: 20,
          humidity: 75,
          co2Level: 1000,
          lastUpdated: '5 minutes ago'
        },
        {
          id: '3',
          name: 'Ganoderma lucidum',
          species: 'Reishi',
          status: 'dormant',
          growthRate: 30,
          temperature: 25,
          humidity: 70,
          co2Level: 800,
          lastUpdated: '10 minutes ago'
        },
        {
          id: '4',
          name: 'Hericium erinaceus',
          species: 'Lion\'s Mane',
          status: 'active',
          growthRate: 72,
          temperature: 21,
          humidity: 85,
          co2Level: 1100,
          lastUpdated: '1 minute ago'
        }
      ]);
      setLoading(false);
    }, 1000);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'growing': return 'warning';
      case 'dormant': return 'default';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Mycelium Networks
        </Typography>
        <Box>
          <IconButton onClick={fetchStrains} sx={{ mr: 1 }}>
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ backgroundColor: '#059669' }}
          >
            Add Network
          </Button>
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab icon={<BubbleChartIcon />} label="Active Networks" />
          <Tab icon={<TimelineIcon />} label="Growth Analytics" />
          <Tab icon={<EcoIcon />} label="Environmental Control" />
          <Tab icon={<FilterIcon />} label="Strain Advisor" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Species Filter</InputLabel>
              <Select
                value={selectedSpecies}
                onChange={(e) => setSelectedSpecies(e.target.value)}
                label="Species Filter"
              >
                <MenuItem value="all">All Species</MenuItem>
                <MenuItem value="oyster">Oyster Mushroom</MenuItem>
                <MenuItem value="shiitake">Shiitake</MenuItem>
                <MenuItem value="reishi">Reishi</MenuItem>
                <MenuItem value="lionsmane">Lion's Mane</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {loading && <LinearProgress sx={{ mb: 2 }} />}

        <Grid container spacing={3}>
          {strains.map((strain) => (
            <Grid item xs={12} md={6} lg={4} key={strain.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {strain.name}
                    </Typography>
                    <Chip
                      label={strain.status}
                      color={getStatusColor(strain.status)}
                      size="small"
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {strain.species}
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Growth Rate</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {strain.growthRate}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={strain.growthRate}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Temperature
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {strain.temperature}°C
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Humidity
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {strain.humidity}%
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        CO₂ Level
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {strain.co2Level} ppm
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Last Update
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {strain.lastUpdated}
                      </Typography>
                    </Grid>
                  </Grid>

                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Button size="small" variant="outlined" fullWidth>
                      View Details
                    </Button>
                    <Button size="small" variant="contained" fullWidth>
                      Optimize
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Typography variant="h6">Growth Analytics</Typography>
        <Typography variant="body2" color="text.secondary">
          Advanced growth tracking and predictive analytics powered by quantum computing
        </Typography>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Typography variant="h6">Environmental Control</Typography>
        <Typography variant="body2" color="text.secondary">
          Real-time environmental monitoring and automated control systems
        </Typography>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <Typography variant="h6">AI Strain Advisor</Typography>
        <Typography variant="body2" color="text.secondary">
          Get personalized recommendations for optimal strain selection and cultivation
        </Typography>
      </TabPanel>
    </Box>
  );
};