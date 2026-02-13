import React, { useEffect, useState, useCallback } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useNotifications } from './hooks/useNotifications';
import { useFaviconBadge } from './hooks/useFaviconBadge';
import { useSessionStore } from './store/sessionStore';
import { Layout } from './components/Layout';
import { GraphView } from './components/GraphView';
import { DirectoryOverview } from './components/DirectoryOverview';
import { Settings } from './components/Settings';
import { GroupDrillDownPanel } from './components/GroupDrillDownPanel';
import { ErrorBoundary } from './components/ErrorBoundary';

const API_BASE = 'http://localhost:3847/api';

function MainView() {
  const navigationView = useSessionStore((state) => state.navigationView);

  if (navigationView === 'session-timeline') {
    return (
      <ErrorBoundary>
        <GraphView />
      </ErrorBoundary>
    );
  }

  // navigationView === 'directory'
  return (
    <ErrorBoundary>
      <DirectoryOverview />
    </ErrorBoundary>
  );
}

function App() {
  const { connected, lastMessage } = useWebSocket();
  const handleWebSocketMessage = useSessionStore((state) => state.handleWebSocketMessage);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tmuxAvailable, setTmuxAvailable] = useState(true);

  // Process WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      handleWebSocketMessage(lastMessage);
    }
  }, [lastMessage, handleWebSocketMessage]);

  // Browser notifications for 'waiting' state changes
  useNotifications(lastMessage);

  // Favicon badge showing count of waiting sessions
  useFaviconBadge();

  // Check tmux availability via health endpoint
  useEffect(() => {
    let cancelled = false;

    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_BASE}/health`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            // If the health response includes tmux info, use it;
            // otherwise assume available if the server is reachable
            if (typeof data.tmuxAvailable === 'boolean') {
              setTmuxAvailable(data.tmuxAvailable);
            } else {
              setTmuxAvailable(true);
            }
          }
        }
      } catch {
        // Server unreachable -- tmux status unknown, degrade gracefully
        if (!cancelled) {
          setTmuxAvailable(false);
        }
      }
    };

    checkHealth();
    // Re-check every 30 seconds
    const interval = setInterval(checkHealth, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const handleOpenSettings = useCallback(() => setSettingsOpen(true), []);
  const handleCloseSettings = useCallback(() => setSettingsOpen(false), []);

  return (
    <ErrorBoundary>
      <Layout connected={connected} onOpenSettings={handleOpenSettings}>
        <MainView />
      </Layout>
      <Settings
        isOpen={settingsOpen}
        onClose={handleCloseSettings}
        connected={connected}
        tmuxAvailable={tmuxAvailable}
      />
      <GroupDrillDownPanel />
    </ErrorBoundary>
  );
}

export default App;
