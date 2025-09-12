"""
Main client for QuantumMycelium Nexus platform
"""

import json
import time
from typing import Dict, List, Optional, Union, Any
import requests
import websocket
from urllib.parse import urljoin

from .models import (
    MycelialNetwork,
    QuantumCircuit,
    HybridComputation,
    ComputationResult,
    GrowthSimulation,
    EnvironmentalFactors,
)
from .exceptions import (
    QuantumMyceliumError,
    ComputationError,
    NetworkError,
    CircuitError,
)


class QuantumMyceliumClient:
    """
    Main client for interacting with QuantumMycelium Nexus platform
    
    Example:
        >>> client = QuantumMyceliumClient("http://localhost:8300")
        >>> client.authenticate(api_key="your_api_key")
        >>> 
        >>> # Create mycelial network
        >>> network = client.create_network("Test Network", species="Pleurotus ostreatus")
        >>> 
        >>> # Execute hybrid computation
        >>> mycelium_code = '''
        ... fn main() {
        ...     let growth = predict_growth(network, params);
        ...     return growth;
        ... }
        ... '''
        >>> result = client.execute_hybrid(mycelium_code, quantum_circuit=None)
    """
    
    def __init__(
        self,
        base_url: str = "http://localhost:8300",
        api_version: str = "v1",
        timeout: int = 30,
    ):
        """
        Initialize QuantumMycelium client
        
        Args:
            base_url: Base URL of the platform API
            api_version: API version to use
            timeout: Request timeout in seconds
        """
        self.base_url = base_url.rstrip("/")
        self.api_version = api_version
        self.timeout = timeout
        self.session = requests.Session()
        self._ws = None
        
        # Default headers
        self.session.headers.update({
            "Content-Type": "application/json",
            "Accept": "application/json",
        })
    
    def authenticate(self, api_key: Optional[str] = None, token: Optional[str] = None):
        """
        Authenticate with the platform
        
        Args:
            api_key: API key for authentication
            token: JWT token for authentication
        """
        if api_key:
            self.session.headers["X-API-Key"] = api_key
        elif token:
            self.session.headers["Authorization"] = f"Bearer {token}"
        else:
            raise ValueError("Either api_key or token must be provided")
    
    def _make_url(self, endpoint: str) -> str:
        """Construct full URL for endpoint"""
        return urljoin(f"{self.base_url}/api/{self.api_version}/", endpoint.lstrip("/"))
    
    def _request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None,
        params: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """Make HTTP request to API"""
        url = self._make_url(endpoint)
        
        try:
            response = self.session.request(
                method=method,
                url=url,
                json=data,
                params=params,
                timeout=self.timeout,
            )
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            raise QuantumMyceliumError(f"API request failed: {e}")
    
    # Computation Methods
    
    def execute_hybrid(
        self,
        mycelium_code: str,
        quantum_circuit: Optional[QuantumCircuit] = None,
        parameters: Optional[Dict[str, Any]] = None,
        optimization_level: str = "basic",
        wait_for_result: bool = True,
    ) -> Union[ComputationResult, str]:
        """
        Execute hybrid quantum-mycelium computation
        
        Args:
            mycelium_code: Mycelium-EI program code
            quantum_circuit: Optional quantum circuit
            parameters: Computation parameters
            optimization_level: Optimization level (none, basic, aggressive, quantum)
            wait_for_result: Whether to wait for computation to complete
            
        Returns:
            ComputationResult if wait_for_result=True, else computation_id
        """
        data = {
            "mycelium_code": mycelium_code,
            "parameters": parameters or {},
            "optimization_level": optimization_level,
        }
        
        if quantum_circuit:
            data["quantum_circuit"] = quantum_circuit.to_dict()
        
        result = self._request("POST", "/compute/hybrid", data=data)
        computation_id = result["computation_id"]
        
        if not wait_for_result:
            return computation_id
        
        # Poll for result
        while True:
            status = self.get_computation_status(computation_id)
            
            if status["status"] == "completed":
                return self.get_computation_result(computation_id)
            elif status["status"] == "failed":
                raise ComputationError(f"Computation failed: {status.get('message')}")
            
            time.sleep(1)
    
    def get_computation_status(self, computation_id: str) -> Dict[str, Any]:
        """Get computation status"""
        return self._request("GET", f"/compute/status/{computation_id}")
    
    def get_computation_result(self, computation_id: str) -> ComputationResult:
        """Get computation result"""
        result = self._request("GET", f"/compute/result/{computation_id}")
        return ComputationResult.from_dict(result)
    
    # Network Methods
    
    def list_networks(
        self,
        limit: int = 100,
        offset: int = 0
    ) -> List[MycelialNetwork]:
        """List mycelial networks"""
        params = {"limit": limit, "offset": offset}
        result = self._request("GET", "/networks", params=params)
        
        return [MycelialNetwork.from_dict(net) for net in result["networks"]]
    
    def create_network(
        self,
        name: str,
        species: str,
        substrate: Optional[str] = None,
        environmental_factors: Optional[EnvironmentalFactors] = None,
    ) -> MycelialNetwork:
        """Create new mycelial network"""
        data = {
            "name": name,
            "species": species,
        }
        
        if substrate:
            data["substrate"] = substrate
        if environmental_factors:
            data["environmental_factors"] = environmental_factors.to_dict()
        
        result = self._request("POST", "/networks", data=data)
        return MycelialNetwork.from_dict(result)
    
    def get_network(self, network_id: str) -> MycelialNetwork:
        """Get mycelial network by ID"""
        result = self._request("GET", f"/networks/{network_id}")
        return MycelialNetwork.from_dict(result)
    
    def simulate_growth(
        self,
        network_id: str,
        time_steps: int = 100,
        environmental_factors: Optional[EnvironmentalFactors] = None,
        use_quantum: bool = True,
    ) -> GrowthSimulation:
        """Simulate network growth"""
        data = {
            "time_steps": time_steps,
            "use_quantum": use_quantum,
        }
        
        if environmental_factors:
            data["environmental_factors"] = environmental_factors.to_dict()
        
        result = self._request("POST", f"/networks/{network_id}/simulate", data=data)
        return GrowthSimulation.from_dict(result)
    
    # Quantum Methods
    
    def list_circuits(self) -> List[QuantumCircuit]:
        """List available quantum circuits"""
        result = self._request("GET", "/quantum/circuits")
        return [QuantumCircuit.from_dict(circuit) for circuit in result]
    
    def create_circuit(self, circuit: QuantumCircuit) -> QuantumCircuit:
        """Create quantum circuit"""
        result = self._request("POST", "/quantum/circuits", data=circuit.to_dict())
        return QuantumCircuit.from_dict(result)
    
    def execute_circuit(
        self,
        circuit: QuantumCircuit,
        shots: int = 1024,
        backend: str = "simulator",
    ) -> Dict[str, Any]:
        """Execute quantum circuit"""
        data = {
            "circuit": circuit.to_dict(),
            "shots": shots,
            "backend": backend,
        }
        
        return self._request("POST", "/quantum/execute", data=data)
    
    # Monitoring Methods
    
    def get_metrics(
        self,
        metric_type: Optional[str] = None,
        time_range: str = "1h",
    ) -> Dict[str, Any]:
        """Get system metrics"""
        params = {"time_range": time_range}
        if metric_type:
            params["metric_type"] = metric_type
        
        return self._request("GET", "/metrics", params=params)
    
    def health_check(self) -> Dict[str, Any]:
        """Check system health"""
        return self._request("GET", "/health")
    
    # WebSocket Methods
    
    def connect_websocket(self, on_message=None, on_error=None, on_close=None):
        """Connect to WebSocket for real-time updates"""
        ws_url = self.base_url.replace("http", "ws") + "/ws"
        
        def on_ws_message(ws, message):
            if on_message:
                data = json.loads(message)
                on_message(data)
        
        def on_ws_error(ws, error):
            if on_error:
                on_error(error)
        
        def on_ws_close(ws, close_status_code, close_msg):
            if on_close:
                on_close(close_status_code, close_msg)
        
        self._ws = websocket.WebSocketApp(
            ws_url,
            on_message=on_ws_message,
            on_error=on_ws_error,
            on_close=on_ws_close,
        )
        
        # Add auth headers
        headers = {}
        if "X-API-Key" in self.session.headers:
            headers["X-API-Key"] = self.session.headers["X-API-Key"]
        elif "Authorization" in self.session.headers:
            headers["Authorization"] = self.session.headers["Authorization"]
        
        self._ws.run_forever(header=headers)
    
    def disconnect_websocket(self):
        """Disconnect WebSocket"""
        if self._ws:
            self._ws.close()
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.disconnect_websocket()