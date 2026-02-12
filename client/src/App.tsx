import React, { useEffect, useState, useCallback } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useNotifications } from './hooks/useNotifications';
import { useFaviconBadge } from './hooks/useFaviconBadge';
import { useSessionStore } from './store/sessionStore';
import { Layout } from './components/Layout';
import { SessionList } from './components/SessionList';
import { FilterBar } from './components/FilterBar';
import { TreeView } from './components/TreeView';
import { GraphView } from './components/GraphView';
import { NodeDetail } from './components/NodeDetail';
import { ViewToggle } from './components/ViewToggle';
import { Settings } from './components/Settings';
import { ErrorBoundary } from './components/ErrorBoundary';
import type { TreeNodeData } from './components/TreeNode';

const API_BASE = 'http://localhost:3847/api';

const styles = {
  connectionStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    borderBottom: '1px solid #0f3460',
    fontSize: '12px',
    color: '#888',
  },
  statusDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
  },
  detailPanel: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#666',
    fontSize: '14px',
  },
  detailContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
  },
  detailContent: {
    flex: 1,
    overflow: 'auto',
  },
  promptSection: {
    flexShrink: 0,
  },
  sessionDetail: {
    padding: '20px',
  },
  sessionHeader: {
    marginBottom: '20px',
  },
  sessionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#eee',
    marginBottom: '8px',
  },
  sessionMeta: {
    fontSize: '13px',
    color: '#888',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    gap: '8px 16px',
    fontSize: '13px',
  },
  infoLabel: {
    color: '#888',
  },
  infoValue: {
    color: '#eee',
  },
  stateBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  settingsButton: {
    padding: '6px 10px',
    fontSize: '16px',
    background: 'none',
    border: '1px solid #0f3460',
    borderRadius: '6px',
    color: '#888',
    cursor: 'pointer',
    transition: 'color 0.15s, border-color 0.15s',
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tmuxBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderBottom: '1px solid rgba(234, 179, 8, 0.2)',
    fontSize: '12px',
    color: '#eab308',
  },
};

const STATE_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: '#166534', text: '#22c55e' },
  waiting: { bg: '#854d0e', text: '#eab308' },
  idle: { bg: '#374151', text: '#9ca3af' },
  completed: { bg: '#1e40af', text: '#60a5fa' },
};

function SessionDetail() {
  const sessions = useSessionStore((state) => state.sessions);
  const selectedSessionId = useSessionStore((state) => state.selectedSessionId);

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);

  if (!selectedSession) {
    return (
      <div style={styles.detailPanel}>
        <p>Select a session to view details</p>
      </div>
    );
  }

  const badgeColors = STATE_BADGE_COLORS[selectedSession.state] || STATE_BADGE_COLORS.idle;

  return (
    <div style={styles.sessionDetail}>
      <div style={styles.sessionHeader}>
        <div style={styles.sessionTitle}>
          {selectedSession.summary || `Session ${selectedSession.id.slice(0, 12)}...`}
        </div>
        <div style={styles.sessionMeta}>
          <span
            style={{
              ...styles.stateBadge,
              backgroundColor: badgeColors.bg,
              color: badgeColors.text,
            }}
          >
            {selectedSession.state}
          </span>
        </div>
      </div>

      <div style={styles.infoGrid}>
        <span style={styles.infoLabel}>Session ID:</span>
        <span style={styles.infoValue}>{selectedSession.id}</span>

        <span style={styles.infoLabel}>Project Hash:</span>
        <span style={styles.infoValue}>{selectedSession.projectHash}</span>

        {selectedSession.gitBranch && (
          <>
            <span style={styles.infoLabel}>Git Branch:</span>
            <span style={styles.infoValue}>{selectedSession.gitBranch}</span>
          </>
        )}

        {selectedSession.tmuxTarget && (
          <>
            <span style={styles.infoLabel}>Tmux Target:</span>
            <span style={styles.infoValue}>{selectedSession.tmuxTarget}</span>
          </>
        )}

        <span style={styles.infoLabel}>Created:</span>
        <span style={styles.infoValue}>
          {new Date(selectedSession.createdAt).toLocaleString()}
        </span>

        <span style={styles.infoLabel}>Last Activity:</span>
        <span style={styles.infoValue}>
          {new Date(selectedSession.lastActivity).toLocaleString()}
        </span>

        <span style={styles.infoLabel}>Nodes:</span>
        <span style={styles.infoValue}>{selectedSession.nodes.length}</span>

        <span style={styles.infoLabel}>Subagents:</span>
        <span style={styles.infoValue}>{selectedSession.subagents.length}</span>
      </div>
    </div>
  );
}

function MainView() {
  const viewMode = useSessionStore((state) => state.viewMode);

  if (viewMode === 'graph') {
    return (
      <ErrorBoundary>
        <GraphView />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <SessionDetail />
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

  const headerActions = (
    <>
      <ViewToggle />
      <button
        style={styles.settingsButton}
        onClick={handleOpenSettings}
        title="Settings"
        onMouseEnter={(e) => {
          const btn = e.currentTarget;
          btn.style.color = '#eee';
          btn.style.borderColor = '#e94560';
        }}
        onMouseLeave={(e) => {
          const btn = e.currentTarget;
          btn.style.color = '#888';
          btn.style.borderColor = '#0f3460';
        }}
      >
        {/* Gear icon using Unicode */}
        {'\u2699'}
      </button>
    </>
  );

  const sidebar = (
    <>
      <div style={styles.connectionStatus}>
        <div
          style={{
            ...styles.statusDot,
            backgroundColor: connected ? '#22c55e' : '#ef4444',
          }}
        />
        {connected ? 'Connected' : 'Disconnected'}
      </div>
      {!tmuxAvailable && (
        <div style={styles.tmuxBanner}>
          Tmux unavailable - prompt injection disabled
        </div>
      )}
      <FilterBar />
      <SessionList />
    </>
  );

  return (
    <ErrorBoundary>
      <Layout sidebar={sidebar} headerActions={headerActions}>
        <MainView />
      </Layout>
      <Settings
        isOpen={settingsOpen}
        onClose={handleCloseSettings}
        connected={connected}
        tmuxAvailable={tmuxAvailable}
      />
    </ErrorBoundary>
  );
}

export default App;
