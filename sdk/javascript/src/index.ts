/**
 * QuantumMycelium Nexus JavaScript/TypeScript SDK
 * 
 * A comprehensive SDK for interacting with the QuantumMycelium Nexus platform,
 * enabling quantum-enhanced mycelial intelligence computations.
 */

export { QuantumMyceliumClient } from './client';
export { QuantumBridge } from './quantum';
export { MyceliumNetwork } from './mycelium';
export { WebSocketClient } from './websocket';

export * from './types';
export * from './errors';
export * from './utils';

// Version info
export const VERSION = '1.0.0';

// Default configuration
export const DEFAULT_CONFIG = {
  baseUrl: 'http://localhost:8300',
  apiVersion: 'v1',
  timeout: 30000,
  retries: 3,
} as const;