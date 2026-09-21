import { useEffect, useRef, useState } from 'react';

export interface TraccarPosition {
  id: number;
  deviceId: number;
  valid: boolean;
  latitude: number;
  longitude: number;
  altitude?: number;
  speed: number;
  course: number;
  address?: string | null;
  fixTime: string;
  serverTime?: string;
  attributes?: Record<string, unknown>;
}

export interface TraccarDeviceStatus {
  id: number;
  name: string;
  status: 'online' | 'offline' | 'unknown';
  lastUpdate: string | null;
}

export interface TraccarMessage {
  positions?: TraccarPosition[];
  devices?: TraccarDeviceStatus[];
}

type SocketStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';

const getSocketUrl = () => {
  const token = String((import.meta as any).env?.VITE_TRACCAR_TOKEN || '').trim();
  const base = String(
    (import.meta as any).env?.VITE_TRACCAR_SOCKET_URL || 'wss://tracking.prohpharmacy.com/api/socket'
  ).replace(/\/+$/, '');
  return `${base}?token=${encodeURIComponent(token)}`;
};

export const useTraccarSocket = (
  onMessage: (message: TraccarMessage) => void,
  enabled = true
) => {
  const [status, setStatus] = useState<SocketStatus>('disconnected');
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null);
  const [connectionVersion, setConnectionVersion] = useState(0);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!enabled) return;

    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;
    let hasConnected = false;

    const connect = () => {
      if (stopped) return;
      setStatus(hasConnected ? 'reconnecting' : 'connecting');
      socket = new WebSocket(getSocketUrl());

      socket.onopen = () => {
        hasConnected = true;
        setStatus('connected');
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as TraccarMessage;
          setLastEventTime(new Date());
          onMessageRef.current(message);
        } catch {
          // Ignore malformed frames from the socket.
        }
      };

      socket.onerror = () => {
        // onclose schedules the reconnect so we do not create two timers.
      };

      socket.onclose = () => {
        socket = null;
        if (stopped) return;
        setStatus('reconnecting');
        reconnectTimer = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
      setStatus('disconnected');
    };
  }, [enabled, connectionVersion]);

  return {
    status,
    lastEventTime,
    reconnect: () => setConnectionVersion((version) => version + 1),
  };
};
