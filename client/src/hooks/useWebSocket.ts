import { useEffect, useRef, useState, useCallback } from 'react';
import type { WSMessage } from 'shared';

interface UseWebSocketResult {
  connected: boolean;
  lastMessage: WSMessage | null;
}

const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;
const RECONNECT_MULTIPLIER = 2;

export function useWebSocket(url: string = 'ws://localhost:3847'): UseWebSocketResult {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      console.log('[WebSocket] Connected to', url);
      setConnected(true);
      // Reset reconnect delay on successful connection
      reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const message: WSMessage = JSON.parse(event.data);
        setLastMessage(message);
      } catch (err) {
        console.error('[WebSocket] Failed to parse message:', err);
      }
    };

    ws.onclose = (event) => {
      if (!mountedRef.current) return;
      console.log('[WebSocket] Disconnected, code:', event.code);
      setConnected(false);

      // Schedule reconnect with exponential backoff
      const delay = reconnectDelayRef.current;
      console.log(`[WebSocket] Reconnecting in ${delay}ms...`);

      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectDelayRef.current = Math.min(
          reconnectDelayRef.current * RECONNECT_MULTIPLIER,
          MAX_RECONNECT_DELAY
        );
        connect();
      }, delay);
    };

    ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
      // onclose will be called after onerror, which handles reconnection
    };
  }, [url]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;

      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      // Close WebSocket
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { connected, lastMessage };
}
