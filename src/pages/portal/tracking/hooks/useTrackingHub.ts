import { useEffect, useRef, useState, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import {
  getAccessToken,
  getTrackingHubUrl,
  type PositionUpdateEvent,
} from '../../../../api-client';

export type HubConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';

interface UseTrackingHubOptions {
  branchId?: string | null;
  onPositionUpdated: (event: PositionUpdateEvent) => void;
  enabled?: boolean;
}

export const useTrackingHub = ({
  branchId,
  onPositionUpdated,
  enabled = true,
}: UseTrackingHubOptions) => {
  const [status, setStatus] = useState<HubConnectionStatus>('disconnected');
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const currentBranchRef = useRef<string | null>(null);
  const onPositionUpdatedRef = useRef(onPositionUpdated);
  onPositionUpdatedRef.current = onPositionUpdated;

  // Handle branch subscription changes
  useEffect(() => {
    const connection = connectionRef.current;
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
      currentBranchRef.current = branchId || null;
      return;
    }

    const prevBranch = currentBranchRef.current;
    const newBranch = branchId || null;

    if (prevBranch === newBranch) return;

    const switchBranch = async () => {
      try {
        if (prevBranch) {
          await connection.invoke('LeaveBranch', prevBranch);
        }
        if (newBranch) {
          await connection.invoke('JoinBranch', newBranch);
        }
        currentBranchRef.current = newBranch;
      } catch (err) {
        console.error('Failed to update branch subscription on Tracking Hub:', err);
      }
    };

    switchBranch();
  }, [branchId]);

  // Establish and manage connection lifecycle
  useEffect(() => {
    if (!enabled) {
      if (connectionRef.current) {
        connectionRef.current.stop();
        connectionRef.current = null;
        setStatus('disconnected');
      }
      return;
    }

    let isCancelled = false;
    const hubUrl = getTrackingHubUrl();

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => getAccessToken() || '',
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connectionRef.current = connection;
    setStatus('connecting');
    setError(null);

    // Event listener for PositionUpdated
    connection.on('PositionUpdated', (event: PositionUpdateEvent) => {
      if (!isCancelled) {
        setLastEventTime(new Date());
        onPositionUpdatedRef.current(event);
      }
    });

    // Reconnection events
    connection.onreconnecting((err) => {
      if (!isCancelled) {
        setStatus('reconnecting');
        setError(err?.message || 'Reconnecting to live telemetry...');
      }
    });

    connection.onreconnected(async () => {
      if (!isCancelled) {
        setStatus('connected');
        setError(null);
        // Resubscribe to current branch if set
        if (currentBranchRef.current) {
          try {
            await connection.invoke('JoinBranch', currentBranchRef.current);
          } catch (err) {
            console.error('Failed to re-join branch after reconnect:', err);
          }
        }
      }
    });

    connection.onclose((err) => {
      if (!isCancelled) {
        setStatus('disconnected');
        if (err) {
          setError(err.message || 'SignalR connection lost');
        }
      }
    });

    // Start connection
    const startConnection = async () => {
      try {
        await connection.start();
        if (!isCancelled) {
          setStatus('connected');
          setError(null);
          // If branch already selected at start time, join it
          if (currentBranchRef.current) {
            await connection.invoke('JoinBranch', currentBranchRef.current);
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.warn('TrackingHub connection failed:', err);
          setStatus('disconnected');
          setError(err?.message || 'Could not connect to live telemetry hub');
        }
      }
    };

    startConnection();

    return () => {
      isCancelled = true;
      connection.stop().catch(() => {});
      connectionRef.current = null;
    };
  }, [enabled]);

  const reconnect = useCallback(async () => {
    if (connectionRef.current) {
      try {
        setStatus('connecting');
        await connectionRef.current.start();
        setStatus('connected');
        setError(null);
      } catch (err: any) {
        setStatus('disconnected');
        setError(err?.message || 'Manual reconnect failed');
      }
    }
  }, []);

  return {
    status,
    error,
    lastEventTime,
    reconnect,
  };
};
