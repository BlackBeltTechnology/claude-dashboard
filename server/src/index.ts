import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketManager } from './websocket.js';
import { createApiRouter } from './api.js';
import { SessionManager } from './watcher.js';
import { NotificationManager } from './notifications.js';

const PORT = parseInt(process.env.CLAUDE_DASHBOARD_PORT || '3847', 10);
const CLAUDE_DIR = process.env.HOME + '/.claude';

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Initialize SessionManager for file watching
const sessionManager = new SessionManager(CLAUDE_DIR);

// Initialize NotificationManager and wire to SessionManager
const notificationManager = new NotificationManager();
notificationManager.attach(sessionManager);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', claudeDir: CLAUDE_DIR });
});

// Mount the API router
app.use('/api', createApiRouter());

const server = createServer(app);

// Initialize WebSocket manager
const wsManager = new WebSocketManager(server);

// Provide sessions to WebSocket manager for snapshots
wsManager.setSessionsProvider(() => sessionManager.getSessions());

// Wire up SessionManager events to WebSocket broadcasts
sessionManager.on('session-update', (sessionId, session) => {
  wsManager.broadcastSessionUpdate(sessionId, session);
});

sessionManager.on('subagent-update', (parentSessionId, agentId, subagent) => {
  wsManager.broadcastSubagentUpdate(parentSessionId, agentId, subagent);
});

sessionManager.on('state-change', (sessionId, agentId, previousState, newState) => {
  wsManager.broadcastStateChange(sessionId, previousState, newState, agentId);
});

sessionManager.on('error', (error) => {
  console.error('[Server] SessionManager error:', error);
});

// API endpoint to get WebSocket client count
app.get('/api/ws/clients', (_req, res) => {
  res.json({ count: wsManager.getClientCount() });
});

// API endpoint to get sessions (for REST clients)
app.get('/api/sessions', (_req, res) => {
  res.json({ sessions: sessionManager.getSessions() });
});

// API endpoint to refresh sessions
app.post('/api/sessions/refresh', async (_req, res) => {
  try {
    await sessionManager.refresh();
    res.json({ success: true, count: sessionManager.getSessions().length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to refresh sessions' });
  }
});

// GET notification preferences
app.get('/api/notifications/preferences', (_req, res) => {
  res.json(notificationManager.getPreferences());
});

// PUT notification preferences
app.put('/api/notifications/preferences', (req, res) => {
  const { desktop, browser } = req.body as { desktop?: unknown; browser?: unknown };

  // Validate that at least one valid boolean field is present
  if (
    (desktop !== undefined && typeof desktop !== 'boolean') ||
    (browser !== undefined && typeof browser !== 'boolean')
  ) {
    res.status(400).json({ error: 'INVALID_REQUEST', message: 'desktop and browser must be booleans' });
    return;
  }

  const updated = notificationManager.setPreferences({
    desktop: typeof desktop === 'boolean' ? desktop : undefined,
    browser: typeof browser === 'boolean' ? browser : undefined,
  });
  res.json(updated);
});

// Export sessionManager for use by other modules
export { wsManager, sessionManager, notificationManager };

// Start the server and session manager
async function start() {
  try {
    // Start session manager first
    await sessionManager.start();

    // Then start HTTP server
    server.listen(PORT, '127.0.0.1', () => {
      console.log(`Claude Session Dashboard server running on http://127.0.0.1:${PORT}`);
      console.log(`WebSocket server ready on ws://127.0.0.1:${PORT}`);
      console.log(`Watching: ${CLAUDE_DIR}`);
    });
  } catch (error) {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[Server] Shutting down...');
  notificationManager.detach();
  await sessionManager.stop();
  server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[Server] Shutting down...');
  notificationManager.detach();
  await sessionManager.stop();
  server.close();
  process.exit(0);
});

start();
