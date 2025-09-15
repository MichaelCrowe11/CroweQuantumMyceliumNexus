import React, { createContext, useContext, useEffect, useState } from 'react';

interface WebSocketContextType {
  connected: boolean;
  sendMessage: (message: any) => void;
  lastMessage: any;
}

const WebSocketContext = createContext<WebSocketContextType>({
  connected: false,
  sendMessage: () => {},
  lastMessage: null,
});

export const useWebSocket = () => useContext(WebSocketContext);

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    // WebSocket connection will be established when backend is running
    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws';

    // Commented out for now since backend might not be running
    // const websocket = new WebSocket(wsUrl);
    // websocket.onopen = () => setConnected(true);
    // websocket.onclose = () => setConnected(false);
    // websocket.onmessage = (event) => {
    //   setLastMessage(JSON.parse(event.data));
    // };
    // setWs(websocket);

    // return () => {
    //   websocket.close();
    // };
  }, []);

  const sendMessage = (message: any) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  };

  return (
    <WebSocketContext.Provider value={{ connected, sendMessage, lastMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
};