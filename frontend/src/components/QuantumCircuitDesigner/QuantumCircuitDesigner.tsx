import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Toolbar,
  IconButton,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  PlayArrow as PlayIcon,
  Save as SaveIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Delete as DeleteIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
} from '@mui/icons-material';

import { QuantumCircuit, QuantumGate, GateType } from '../../types/quantum';
import { QuantumGateComponent } from './QuantumGateComponent';
import { QubitWire } from './QubitWire';
import { GatePalette } from './GatePalette';
import { CircuitExecutionResults } from './CircuitExecutionResults';

interface QuantumCircuitDesignerProps {
  initialCircuit?: QuantumCircuit;
  onCircuitChange?: (circuit: QuantumCircuit) => void;
  onExecute?: (circuit: QuantumCircuit) => Promise<any>;
  readOnly?: boolean;
}

interface DraggedGate {
  gateType: GateType;
  position: { x: number; y: number };
}

export const QuantumCircuitDesigner: React.FC<QuantumCircuitDesignerProps> = ({
  initialCircuit,
  onCircuitChange,
  onExecute,
  readOnly = false,
}) => {
  const [circuit, setCircuit] = useState<QuantumCircuit>(
    initialCircuit || {
      circuit_id: '',
      name: 'New Circuit',
      qubits: 4,
      gates: [],
      measurements: [],
    }
  );
  
  const [draggedGate, setDraggedGate] = useState<DraggedGate | null>(null);
  const [selectedGate, setSelectedGate] = useState<string | null>(null);
  const [executionResults, setExecutionResults] = useState<any>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [history, setHistory] = useState<QuantumCircuit[]>([circuit]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const circuitRef = useRef<HTMLDivElement>(null);
  const QUBIT_HEIGHT = 80;
  const GATE_WIDTH = 60;
  
  // Update parent when circuit changes
  useEffect(() => {
    onCircuitChange?.(circuit);
  }, [circuit, onCircuitChange]);
  
  const addToHistory = useCallback((newCircuit: QuantumCircuit) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newCircuit);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);
  
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setCircuit(history[historyIndex - 1]);
    }
  }, [historyIndex, history]);
  
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setCircuit(history[historyIndex + 1]);
    }
  }, [historyIndex, history]);
  
  const addQubit = useCallback(() => {
    const newCircuit = {
      ...circuit,
      qubits: circuit.qubits + 1,
    };
    setCircuit(newCircuit);
    addToHistory(newCircuit);
  }, [circuit, addToHistory]);
  
  const removeQubit = useCallback(() => {
    if (circuit.qubits > 1) {
      const newCircuit = {
        ...circuit,
        qubits: circuit.qubits - 1,
        gates: circuit.gates.filter(gate => 
          gate.qubits.every(q => q < circuit.qubits - 1)
        ),
        measurements: circuit.measurements.filter(m => m < circuit.qubits - 1),
      };
      setCircuit(newCircuit);
      addToHistory(newCircuit);
    }
  }, [circuit, addToHistory]);
  
  const addGate = useCallback(
    (gateType: GateType, qubits: number[], position: number, parameters?: number[]) => {
      if (readOnly) return;
      
      const newGate: QuantumGate = {
        type: gateType,
        qubits,
        parameters: parameters || [],
      };
      
      const newGates = [...circuit.gates];
      newGates.splice(position, 0, newGate);
      
      const newCircuit = {
        ...circuit,
        gates: newGates,
      };
      
      setCircuit(newCircuit);
      addToHistory(newCircuit);
    },
    [circuit, readOnly, addToHistory]
  );
  
  const removeGate = useCallback((index: number) => {
    if (readOnly) return;
    
    const newGates = circuit.gates.filter((_, i) => i !== index);
    const newCircuit = {
      ...circuit,
      gates: newGates,
    };
    
    setCircuit(newCircuit);
    addToHistory(newCircuit);
  }, [circuit, readOnly, addToHistory]);
  
  const handleDragStart = useCallback((gateType: GateType, event: React.DragEvent) => {
    setDraggedGate({
      gateType,
      position: { x: event.clientX, y: event.clientY },
    });
  }, []);
  
  const handleDrop = useCallback(
    (event: React.DragEvent, qubit: number, position: number) => {
      event.preventDefault();
      
      if (!draggedGate || readOnly) return;
      
      const gateInfo = getGateInfo(draggedGate.gateType);
      const qubits = gateInfo.requiresTarget 
        ? [qubit, Math.min(qubit + 1, circuit.qubits - 1)]
        : [qubit];
      
      addGate(draggedGate.gateType, qubits, position);
      setDraggedGate(null);
    },
    [draggedGate, addGate, circuit.qubits, readOnly]
  );
  
  const executeCircuit = useCallback(async () => {
    if (!onExecute) return;
    
    setIsExecuting(true);
    try {
      const results = await onExecute(circuit);
      setExecutionResults(results);
    } catch (error) {
      console.error('Circuit execution failed:', error);
    } finally {
      setIsExecuting(false);
    }
  }, [circuit, onExecute]);
  
  const saveCircuit = useCallback(() => {
    setSaveDialogOpen(true);
  }, []);
  
  const exportCircuit = useCallback(() => {
    const dataStr = JSON.stringify(circuit, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${circuit.name || 'quantum-circuit'}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [circuit]);
  
  const renderQubitWires = () => {
    return Array.from({ length: circuit.qubits }, (_, qubit) => (
      <QubitWire
        key={qubit}
        qubit={qubit}
        gates={circuit.gates}
        measurements={circuit.measurements}
        onDropGate={(position) => handleDrop as any}
        onGateClick={(index) => setSelectedGate(String(index))}
        onGateRemove={removeGate}
        readOnly={readOnly}
        style={{
          transform: `translateY(${qubit * QUBIT_HEIGHT}px)`,
        }}
      />
    ));
  };
  
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <Paper sx={{ mb: 2 }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {circuit.name}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Undo">
              <IconButton 
                onClick={undo} 
                disabled={historyIndex <= 0 || readOnly}
              >
                <UndoIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Redo">
              <IconButton 
                onClick={redo} 
                disabled={historyIndex >= history.length - 1 || readOnly}
              >
                <RedoIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Add Qubit">
              <IconButton onClick={addQubit} disabled={readOnly}>
                <AddIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Execute Circuit">
              <Button
                startIcon={<PlayIcon />}
                onClick={executeCircuit}
                disabled={isExecuting || !onExecute}
                variant="contained"
                color="primary"
              >
                {isExecuting ? 'Executing...' : 'Execute'}
              </Button>
            </Tooltip>
            
            <Tooltip title="Save Circuit">
              <IconButton onClick={saveCircuit} disabled={readOnly}>
                <SaveIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Export Circuit">
              <IconButton onClick={exportCircuit}>
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </Paper>
      
      <Grid container spacing={2} sx={{ flexGrow: 1 }}>
        {/* Gate Palette */}
        <Grid item xs={12} md={3}>
          <GatePalette
            onDragStart={handleDragStart}
            disabled={readOnly}
          />
        </Grid>
        
        {/* Circuit Designer */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%', overflow: 'auto' }}>
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6">Circuit Designer</Typography>
              <Chip label={`${circuit.qubits} Qubits`} size="small" />
              <Chip label={`${circuit.gates.length} Gates`} size="small" />
            </Box>
            
            <Box
              ref={circuitRef}
              sx={{
                position: 'relative',
                minHeight: circuit.qubits * QUBIT_HEIGHT + 100,
                border: '1px dashed',
                borderColor: 'divider',
                borderRadius: 1,
                p: 2,
              }}
              onDragOver={(e) => e.preventDefault()}
            >
              {renderQubitWires()}
              
              {/* Measurement indicators */}
              {circuit.measurements.map(qubit => (
                <Box
                  key={`measurement-${qubit}`}
                  sx={{
                    position: 'absolute',
                    right: 20,
                    top: qubit * QUBIT_HEIGHT + QUBIT_HEIGHT / 2 - 15,
                    width: 30,
                    height: 30,
                    border: 2,
                    borderColor: 'secondary.main',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'background.paper',
                  }}
                >
                  M
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
        
        {/* Execution Results */}
        <Grid item xs={12} md={3}>
          <CircuitExecutionResults
            results={executionResults}
            isExecuting={isExecuting}
          />
        </Grid>
      </Grid>
      
      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
        <DialogTitle>Save Quantum Circuit</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Circuit Name"
            fullWidth
            variant="outlined"
            value={circuit.name}
            onChange={(e) => setCircuit({ ...circuit, name: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button onClick={() => setSaveDialogOpen(false)} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Helper function to get gate information
const getGateInfo = (gateType: GateType) => {
  const gateInfoMap: Record<GateType, { requiresTarget: boolean; parameterCount: number }> = {
    'H': { requiresTarget: false, parameterCount: 0 },
    'X': { requiresTarget: false, parameterCount: 0 },
    'Y': { requiresTarget: false, parameterCount: 0 },
    'Z': { requiresTarget: false, parameterCount: 0 },
    'CNOT': { requiresTarget: true, parameterCount: 0 },
    'Toffoli': { requiresTarget: true, parameterCount: 0 },
    'Phase': { requiresTarget: false, parameterCount: 1 },
    'Custom': { requiresTarget: false, parameterCount: 0 },
  };
  
  return gateInfoMap[gateType] || { requiresTarget: false, parameterCount: 0 };
};