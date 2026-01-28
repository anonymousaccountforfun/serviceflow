'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export function useWebSocket(url: string) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const wasConnectedRef = useRef(false);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setStatus('connecting');

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setStatus('connected');
        reconnectAttemptsRef.current = 0;
        if (wasConnectedRef.current) {
          toast.success('Reconnected');
        }
        wasConnectedRef.current = true;
      };

      ws.onclose = () => {
        setStatus('disconnected');
        wsRef.current = null;

        if (wasConnectedRef.current) {
          toast.error('Connection lost. Trying to reconnect...');
        }

        // Auto-reconnect with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      ws.onerror = () => {
        // Error handling is done in onclose
      };

      wsRef.current = ws;
    } catch {
      setStatus('disconnected');
    }
  }, [url]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    disconnect();
    connect();
  }, [connect, disconnect]);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return { status, reconnect };
}
