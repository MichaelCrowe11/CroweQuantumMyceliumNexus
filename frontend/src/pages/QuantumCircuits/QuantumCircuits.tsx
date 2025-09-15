import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Paper,
  IconButton,
  Chip,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Code as CodeIcon,
  Assessment as AssessmentIcon,
  Memory as MemoryIcon
} from '@mui/icons-material';

interface QuantumCircuit {
  id: string;
  name: string;
  qubits: number;
  gates: number;
  depth: number;
  status: 'running' | 'completed' | 'idle' | 'error';
  fidelity: number;
  executionTime: string;
}

export const QuantumCircuits: React.FC = () => {
  const [circuits, setCircuits] = useState<QuantumCircuit[]>([
    {
      id: '1',
      name: 'Growth Optimization Circuit',
      qubits: 8,
      gates: 24,
      depth: 12,
      status: 'running',
      fidelity: 98.5,
      executionTime: '2.3s'
    },
    {
      id: '2',
      name: 'Environmental Prediction',
      qubits: 12,
      gates: 36,
      depth: 18,
      status: 'completed',
      fidelity: 96.2,
      executionTime: '4.1s'
    },
    {
      id: '3',
      name: 'Molecular Simulation',
      qubits: 16,
      gates: 48,
      depth: 24,
      status: 'idle',
      fidelity: 94.8,
      executionTime: '0s'
    },
    {
      id: '4',
      name: 'Pattern Recognition',
      qubits: 10,
      gates: 30,
      depth: 15,
      status: 'error',
      fidelity: 0,
      executionTime: 'N/A'
    }
  ]);

  const [selectedBackend, setSelectedBackend] = useState('simulator');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'primary';
      case 'completed': return 'success';
      case 'idle': return 'default';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const handleRunCircuit = (circuitId: string) => {
    setCircuits(prev => prev.map(c =>
      c.id === circuitId ? { ...c, status: 'running' } : c
    ));
  };

  const handleStopCircuit = (circuitId: string) => {
    setCircuits(prev => prev.map(c =>
      c.id === circuitId ? { ...c, status: 'idle' } : c
    ));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Quantum Circuits
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Backend</InputLabel>
            <Select
              value={selectedBackend}
              onChange={(e) => setSelectedBackend(e.target.value)}
              label="Backend"
            >
              <MenuItem value="simulator">Simulator</MenuItem>
              <MenuItem value="ibm-quantum">IBM Quantum</MenuItem>
              <MenuItem value="rigetti">Rigetti</MenuItem>
              <MenuItem value="ionq">IonQ</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<CodeIcon />}
            sx={{ backgroundColor: '#7c3aed' }}
          >
            New Circuit
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <MemoryIcon sx={{ mr: 1, color: '#7c3aed' }} />
                <Typography variant="body2" color="text.secondary">
                  Total Circuits
                </Typography>
              </Box>
              <Typography variant="h4">{circuits.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PlayIcon sx={{ mr: 1, color: '#10b981' }} />
                <Typography variant="body2" color="text.secondary">
                  Running
                </Typography>
              </Box>
              <Typography variant="h4">
                {circuits.filter(c => c.status === 'running').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AssessmentIcon sx={{ mr: 1, color: '#f59e0b' }} />
                <Typography variant="body2" color="text.secondary">
                  Avg Fidelity
                </Typography>
              </Box>
              <Typography variant="h4">
                {(circuits.reduce((acc, c) => acc + c.fidelity, 0) / circuits.length).toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <MemoryIcon sx={{ mr: 1, color: '#8b5cf6' }} />
                <Typography variant="body2" color="text.secondary">
                  Total Qubits
                </Typography>
              </Box>
              <Typography variant="h4">
                {circuits.reduce((acc, c) => acc + c.qubits, 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {circuits.map((circuit) => (
          <Grid item xs={12} md={6} key={circuit.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {circuit.name}
                  </Typography>
                  <Chip
                    label={circuit.status}
                    color={getStatusColor(circuit.status)}
                    size="small"
                  />
                </Box>

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary">
                      Qubits
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {circuit.qubits}
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary">
                      Gates
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {circuit.gates}
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary">
                      Depth
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {circuit.depth}
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary">
                      Time
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {circuit.executionTime}
                    </Typography>
                  </Grid>
                </Grid>

                {circuit.status === 'running' && (
                  <LinearProgress sx={{ mb: 2 }} />
                )}

                {circuit.fidelity > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Fidelity</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {circuit.fidelity}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={circuit.fidelity}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: '#e5e7eb',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: circuit.fidelity > 95 ? '#10b981' :
                                          circuit.fidelity > 90 ? '#f59e0b' : '#ef4444'
                        }
                      }}
                    />
                  </Box>
                )}

                <Box sx={{ display: 'flex', gap: 1 }}>
                  {circuit.status === 'idle' ? (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<PlayIcon />}
                      onClick={() => handleRunCircuit(circuit.id)}
                      fullWidth
                    >
                      Run
                    </Button>
                  ) : circuit.status === 'running' ? (
                    <Button
                      size="small"
                      variant="contained"
                      color="error"
                      startIcon={<StopIcon />}
                      onClick={() => handleStopCircuit(circuit.id)}
                      fullWidth
                    >
                      Stop
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<RefreshIcon />}
                      onClick={() => handleRunCircuit(circuit.id)}
                      fullWidth
                    >
                      Rerun
                    </Button>
                  )}
                  <Button size="small" variant="outlined" fullWidth>
                    View Details
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Circuit Composer
        </Typography>
        <Box sx={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Visual circuit composer will be displayed here
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};