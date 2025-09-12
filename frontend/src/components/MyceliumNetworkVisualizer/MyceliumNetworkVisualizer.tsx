import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import {
  Box,
  Paper,
  Typography,
  Slider,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Button,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  CameraAlt as CameraIcon,
  Fullscreen as FullscreenIcon,
} from '@mui/icons-material';

import { MycelialNetwork, MycelialNode, MycelialEdge } from '../../types/mycelium';

interface MyceliumNetworkVisualizerProps {
  network: MycelialNetwork;
  showGrowthAnimation?: boolean;
  showNutrientFlow?: boolean;
  onNodeSelect?: (node: MycelialNode) => void;
  onEdgeSelect?: (edge: MycelialEdge) => void;
}

interface AnimatedNodeProps {
  node: MycelialNode;
  isSelected: boolean;
  showGrowth: boolean;
  time: number;
  onClick: () => void;
}

interface AnimatedEdgeProps {
  edge: MycelialEdge;
  sourcePos: [number, number, number];
  targetPos: [number, number, number];
  showFlow: boolean;
  time: number;
}

const AnimatedNode: React.FC<AnimatedNodeProps> = ({
  node,
  isSelected,
  showGrowth,
  time,
  onClick,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (meshRef.current && showGrowth) {
      const growthPulse = 1 + 0.3 * Math.sin(time * 2 + node.age * 0.1);
      meshRef.current.scale.setScalar(growthPulse * (0.5 + node.nutrient_level));
    }
  });
  
  const nodeColor = new THREE.Color().setHSL(
    0.3 - node.nutrient_level * 0.2, // Green to yellow based on nutrients
    0.8,
    0.4 + node.growth_rate * 0.4
  );
  
  return (
    <mesh
      ref={meshRef}
      position={node.position as [number, number, number]}
      onClick={onClick}
      scale={isSelected ? 1.5 : 1}
    >
      <sphereGeometry args={[0.1 + node.nutrient_level * 0.2, 16, 16]} />
      <meshStandardMaterial
        color={nodeColor}
        emissive={isSelected ? nodeColor.clone().multiplyScalar(0.3) : undefined}
        transparent
        opacity={0.7 + node.growth_rate * 0.3}
      />
      
      {isSelected && (
        <Html position={[0, 0.5, 0]} center>
          <Card sx={{ minWidth: 200, bgcolor: 'rgba(0,0,0,0.8)', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Node {node.node_id}
              </Typography>
              <Typography variant="body2">
                Nutrient Level: {(node.nutrient_level * 100).toFixed(1)}%
              </Typography>
              <Typography variant="body2">
                Growth Rate: {node.growth_rate.toFixed(2)}
              </Typography>
              <Typography variant="body2">
                Age: {node.age} days
              </Typography>
            </CardContent>
          </Card>
        </Html>
      )}
    </mesh>
  );
};

const AnimatedEdge: React.FC<AnimatedEdgeProps> = ({
  edge,
  sourcePos,
  targetPos,
  showFlow,
  time,
}) => {
  const lineRef = useRef<THREE.Line>(null);
  const [flowParticles, setFlowParticles] = useState<THREE.Vector3[]>([]);
  
  useEffect(() => {
    if (showFlow) {
      const particleCount = Math.ceil(edge.flow_rate * 10);
      const particles = [];
      
      for (let i = 0; i < particleCount; i++) {
        const t = i / particleCount;
        const pos = new THREE.Vector3().lerpVectors(
          new THREE.Vector3(...sourcePos),
          new THREE.Vector3(...targetPos),
          t
        );
        particles.push(pos);
      }
      
      setFlowParticles(particles);
    }
  }, [edge.flow_rate, sourcePos, targetPos, showFlow]);
  
  const edgeColor = new THREE.Color().setHSL(
    0.6 - edge.flow_rate * 0.3, // Blue to cyan based on flow
    0.8,
    0.5
  );
  
  const points = [
    new THREE.Vector3(...sourcePos),
    new THREE.Vector3(...targetPos),
  ];
  
  return (
    <group>
      {/* Main edge */}
      <Line
        points={points}
        color={edgeColor}
        lineWidth={1 + edge.thickness * 3}
        transparent
        opacity={0.6}
      />
      
      {/* Flow particles */}
      {showFlow && flowParticles.map((particle, i) => {
        const animatedPos = particle.clone();
        const flowOffset = (time * edge.flow_rate + i * 0.2) % 1;
        animatedPos.lerp(new THREE.Vector3(...targetPos), flowOffset);
        
        return (
          <mesh key={i} position={animatedPos.toArray()}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshStandardMaterial
              color={edgeColor}
              emissive={edgeColor}
              emissiveIntensity={0.5}
            />
          </mesh>
        );
      })}
    </group>
  );
};

const NetworkScene: React.FC<{
  network: MycelialNetwork;
  showGrowth: boolean;
  showFlow: boolean;
  selectedNode: string | null;
  onNodeSelect: (nodeId: string | null) => void;
  time: number;
}> = ({ network, showGrowth, showFlow, selectedNode, onNodeSelect, time }) => {
  const { camera } = useThree();
  
  useEffect(() => {
    // Auto-fit camera to network bounds
    if (network.nodes.length > 0) {
      const bounds = new THREE.Box3();
      network.nodes.forEach(node => {
        bounds.expandByPoint(new THREE.Vector3(...node.position));
      });
      
      const size = bounds.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const distance = maxDim * 2;
      
      camera.position.set(distance, distance, distance);
      camera.lookAt(bounds.getCenter(new THREE.Vector3()));
    }
  }, [network, camera]);
  
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      <pointLight position={[0, 0, 0]} intensity={0.5} color="#7c3aed" />
      
      {/* Nodes */}
      {network.nodes.map(node => (
        <AnimatedNode
          key={node.node_id}
          node={node}
          isSelected={selectedNode === node.node_id}
          showGrowth={showGrowth}
          time={time}
          onClick={() => onNodeSelect(
            selectedNode === node.node_id ? null : node.node_id
          )}
        />
      ))}
      
      {/* Edges */}
      {network.edges.map((edge, index) => {
        const sourceNode = network.nodes.find(n => n.node_id === edge.source);
        const targetNode = network.nodes.find(n => n.node_id === edge.target);
        
        if (!sourceNode || !targetNode) return null;
        
        return (
          <AnimatedEdge
            key={`${edge.source}-${edge.target}-${index}`}
            edge={edge}
            sourcePos={sourceNode.position as [number, number, number]}
            targetPos={targetNode.position as [number, number, number]}
            showFlow={showFlow}
            time={time}
          />
        );
      })}
      
      {/* Grid helper */}
      <gridHelper args={[20, 20]} opacity={0.2} />
      
      {/* Coordinate axes */}
      <axesHelper args={[2]} />
      
      {/* Network center indicator */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#059669" emissive="#059669" />
      </mesh>
      
      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        dampingFactor={0.1}
        enableDamping
      />
    </>
  );
};

export const MyceliumNetworkVisualizer: React.FC<MyceliumNetworkVisualizerProps> = ({
  network,
  showGrowthAnimation = true,
  showNutrientFlow = true,
  onNodeSelect,
  onEdgeSelect,
}) => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [showGrowth, setShowGrowth] = useState(showGrowthAnimation);
  const [showFlow, setShowFlow] = useState(showNutrientFlow);
  const [isPlaying, setIsPlaying] = useState(true);
  const [time, setTime] = useState(0);
  
  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setTime(prevTime => prevTime + 0.016 * animationSpeed); // ~60fps
    }, 16);
    
    return () => clearInterval(interval);
  }, [isPlaying, animationSpeed]);
  
  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setSelectedNode(nodeId);
    if (nodeId && onNodeSelect) {
      const node = network.nodes.find(n => n.node_id === nodeId);
      if (node) {
        onNodeSelect(node);
      }
    }
  }, [network.nodes, onNodeSelect]);
  
  const takeScreenshot = useCallback(() => {
    // This would be implemented with html2canvas or similar
    console.log('Screenshot functionality would be implemented here');
  }, []);
  
  const networkStats = {
    totalNodes: network.nodes.length,
    totalEdges: network.edges.length,
    avgNutrientLevel: network.nodes.reduce((sum, node) => sum + node.nutrient_level, 0) / network.nodes.length,
    avgGrowthRate: network.nodes.reduce((sum, node) => sum + node.growth_rate, 0) / network.nodes.length,
    totalFlow: network.edges.reduce((sum, edge) => sum + edge.flow_rate, 0),
  };
  
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Control Panel */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              {network.name || 'Mycelial Network'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip label={`${networkStats.totalNodes} Nodes`} size="small" />
              <Chip label={`${networkStats.totalEdges} Edges`} size="small" />
              <Chip 
                label={`Avg Nutrients: ${(networkStats.avgNutrientLevel * 100).toFixed(1)}%`} 
                size="small" 
              />
              <Chip 
                label={`Growth Rate: ${networkStats.avgGrowthRate.toFixed(2)}`} 
                size="small" 
              />
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showGrowth}
                    onChange={(e) => setShowGrowth(e.target.checked)}
                  />
                }
                label="Growth Animation"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={showFlow}
                    onChange={(e) => setShowFlow(e.target.checked)}
                  />
                }
                label="Nutrient Flow"
              />
              
              <Tooltip title={isPlaying ? 'Pause' : 'Play'}>
                <IconButton
                  onClick={() => setIsPlaying(!isPlaying)}
                  color="primary"
                >
                  {isPlaying ? <PauseIcon /> : <PlayIcon />}
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Stop">
                <IconButton
                  onClick={() => {
                    setIsPlaying(false);
                    setTime(0);
                  }}
                >
                  <StopIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Take Screenshot">
                <IconButton onClick={takeScreenshot}>
                  <CameraIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
          
          <Grid item xs={12}>
            <Typography gutterBottom>Animation Speed</Typography>
            <Slider
              value={animationSpeed}
              onChange={(_, value) => setAnimationSpeed(value as number)}
              min={0.1}
              max={3}
              step={0.1}
              marks={[
                { value: 0.5, label: '0.5x' },
                { value: 1, label: '1x' },
                { value: 2, label: '2x' },
              ]}
              valueLabelDisplay="auto"
            />
          </Grid>
        </Grid>
      </Paper>
      
      {/* 3D Visualization */}
      <Paper sx={{ flexGrow: 1, position: 'relative' }}>
        <Canvas
          camera={{ position: [10, 10, 10], fov: 45 }}
          style={{ height: '100%' }}
          gl={{ preserveDrawingBuffer: true }} // For screenshots
        >
          <NetworkScene
            network={network}
            showGrowth={showGrowth}
            showFlow={showFlow}
            selectedNode={selectedNode}
            onNodeSelect={handleNodeSelect}
            time={time}
          />
        </Canvas>
        
        {/* Fullscreen button */}
        <IconButton
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            bgcolor: 'rgba(0,0,0,0.5)',
            color: 'white',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
          }}
          onClick={() => {
            // Fullscreen functionality would be implemented here
            console.log('Fullscreen functionality would be implemented here');
          }}
        >
          <FullscreenIcon />
        </IconButton>
      </Paper>
    </Box>
  );
};