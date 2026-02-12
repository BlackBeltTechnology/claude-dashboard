import { WebSocketServer, WebSocket, RawData } from 'ws';
import { Server as HTTPServer, IncomingMessage } from 'http';
import { Socket } from 'net';
import {
  WSMessage,
  WSMessageType,
  Session,
  SnapshotPayload,
  SessionUpdatePayload,
  SubagentUpdatePayload,
  StateChangePayload,
} from 'shared';

// Type guard for connection address validation
interface ConnectionAddress {
  address: string;
  family: string;
  port: number;
}

/**
 * WebSocketManager handles WebSocket connections for the Claude Session Dashboard.
 *
 * Features:
 * - Localhost-only restriction (rejects non-127.0.0.1/::1 connections)
 * - Broadcasts state updates to all connected clients
 * - Sends full state snapshot on client connect
 */
export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  private getSessionsCallback: (() => Session[]) | null = null;

  constructor(server: HTTPServer) {
    // Create WebSocket server attached to HTTP server
    // noServer: true allows us to handle the upgrade manually for security checks
    this.wss = new WebSocketServer({ noServer: true });

    // Handle HTTP upgrade requests manually for localhost validation
    server.on('upgrade', (request: IncomingMessage, socket: Socket, head: Buffer) => {
      this.handleUpgrade(request, socket, head);
    });

    // Handle new WebSocket connections
    this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
      this.handleConnection(ws, request);
    });
  }

  /**
   * Handle HTTP upgrade requests with localhost validation
   */
  private handleUpgrade(request: IncomingMessage, socket: Socket, head: Buffer): void {
    const clientAddress = this.getClientAddress(request, socket);

    if (!this.isLocalhostAddress(clientAddress)) {
      console.warn(`[WebSocket] Rejected connection from non-localhost: ${clientAddress}`);
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    this.wss.handleUpgrade(request, socket, head, (ws) => {
      this.wss.emit('connection', ws, request);
    });
  }

  /**
   * Get the client's IP address from request or socket
   */
  private getClientAddress(request: IncomingMessage, socket: Socket): string {
    // Check X-Forwarded-For header (but we should still validate the actual connection)
    // For security, we primarily rely on the socket's remote address
    const socketAddress = socket.remoteAddress || '';

    return socketAddress;
  }

  /**
   * Check if an address is localhost (IPv4 or IPv6)
   */
  private isLocalhostAddress(address: string): boolean {
    // IPv4 localhost
    if (address === '127.0.0.1') return true;

    // IPv6 localhost (various formats)
    if (address === '::1') return true;
    if (address === '::ffff:127.0.0.1') return true;

    // Sometimes socket addresses come with prefix
    if (address.endsWith('127.0.0.1')) return true;
    if (address.endsWith('::1')) return true;

    return false;
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, request: IncomingMessage): void {
    const clientAddress = request.socket.remoteAddress || 'unknown';
    console.log(`[WebSocket] Client connected from ${clientAddress}`);

    this.clients.add(ws);

    // Send initial state snapshot
    this.sendSnapshot(ws);

    // Handle incoming messages from client
    ws.on('message', (data: RawData) => {
      this.handleMessage(ws, data);
    });

    // Handle client disconnect
    ws.on('close', () => {
      console.log(`[WebSocket] Client disconnected from ${clientAddress}`);
      this.clients.delete(ws);
    });

    // Handle errors
    ws.on('error', (error: Error) => {
      console.error(`[WebSocket] Error from ${clientAddress}:`, error.message);
      this.clients.delete(ws);
    });
  }

  /**
   * Handle incoming message from client
   */
  private handleMessage(ws: WebSocket, data: RawData): void {
    try {
      const message = JSON.parse(data.toString());

      // Currently, clients don't send commands, but we can add support later
      // For now, just log received messages
      console.log('[WebSocket] Received message:', message.type);

      // Handle ping/pong for keepalive if needed
      if (message.type === 'ping') {
        this.send(ws, { type: 'error' as WSMessageType, payload: { pong: true }, timestamp: Date.now() });
      }
    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', error);
    }
  }

  /**
   * Register callback to get current sessions for snapshots
   */
  setSessionsProvider(callback: () => Session[]): void {
    this.getSessionsCallback = callback;
  }

  /**
   * Send full state snapshot to a specific client
   */
  private sendSnapshot(ws: WebSocket): void {
    const sessions = this.getSessionsCallback ? this.getSessionsCallback() : [];

    const payload: SnapshotPayload = { sessions };
    const message: WSMessage = {
      type: 'snapshot',
      payload,
      timestamp: Date.now(),
    };

    this.send(ws, message);
  }

  /**
   * Send message to a specific client
   */
  private send(ws: WebSocket, message: WSMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: WSMessage): void {
    const data = JSON.stringify(message);

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  /**
   * Broadcast session update event
   */
  broadcastSessionUpdate(sessionId: string, session: Session): void {
    const payload: SessionUpdatePayload = { sessionId, session };
    this.broadcast({
      type: 'session-update',
      payload,
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast subagent update event
   */
  broadcastSubagentUpdate(parentSessionId: string, agentId: string, subagent: Session): void {
    const payload: SubagentUpdatePayload = { parentSessionId, agentId, subagent };
    this.broadcast({
      type: 'subagent-update',
      payload,
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast state change event
   */
  broadcastStateChange(
    sessionId: string,
    previousState: Session['state'],
    newState: Session['state'],
    agentId?: string
  ): void {
    const payload: StateChangePayload = {
      sessionId,
      agentId,
      previousState,
      newState,
    };
    this.broadcast({
      type: 'state-change',
      payload,
      timestamp: Date.now(),
    });
  }

  /**
   * Get current number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Close all connections and shut down the WebSocket server
   */
  close(): void {
    for (const client of this.clients) {
      client.close();
    }
    this.clients.clear();
    this.wss.close();
  }
}
