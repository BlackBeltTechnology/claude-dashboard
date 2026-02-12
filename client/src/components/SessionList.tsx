import React from 'react';
import type { Session, SessionState } from 'shared';
import { useSessionStore } from '../store/sessionStore';

const STATUS_COLORS: Record<SessionState, string> = {
  active: '#22c55e',   // Green
  waiting: '#eab308',  // Yellow
  idle: '#6b7280',     // Gray
  completed: '#3b82f6', // Blue (for completed sessions)
};

const styles = {
  container: {
    padding: '12px 0',
  },
  sectionTitle: {
    padding: '8px 16px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    color: '#888',
    letterSpacing: '0.5px',
  },
  sessionItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 16px',
    cursor: 'pointer',
    borderLeft: '3px solid transparent',
    transition: 'background-color 0.15s, border-color 0.15s',
  },
  sessionItemHover: {
    backgroundColor: '#1e2a4a',
  },
  sessionItemSelected: {
    backgroundColor: '#1e2a4a',
    borderLeftColor: '#e94560',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginRight: '10px',
    flexShrink: 0,
  },
  sessionInfo: {
    flex: 1,
    minWidth: 0, // Allow text truncation
  },
  sessionTitle: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#eee',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  sessionMeta: {
    fontSize: '11px',
    color: '#888',
    marginTop: '2px',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  emptyState: {
    padding: '20px 16px',
    textAlign: 'center' as const,
    color: '#666',
    fontSize: '13px',
  },
};

interface SessionItemProps {
  session: Session;
  isSelected: boolean;
  onClick: () => void;
}

function SessionItem({ session, isSelected, onClick }: SessionItemProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const itemStyle = {
    ...styles.sessionItem,
    ...(isHovered && !isSelected ? styles.sessionItemHover : {}),
    ...(isSelected ? styles.sessionItemSelected : {}),
  };

  // Format session display
  const displayTitle = session.summary || truncateId(session.id);
  const displayMeta = session.gitBranch
    ? `${session.gitBranch} - ${formatTime(session.lastActivity)}`
    : formatTime(session.lastActivity);

  return (
    <div
      style={itemStyle}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        style={{
          ...styles.statusDot,
          backgroundColor: STATUS_COLORS[session.state],
        }}
        title={session.state}
      />
      <div style={styles.sessionInfo}>
        <div style={styles.sessionTitle}>{displayTitle}</div>
        <div style={styles.sessionMeta}>{displayMeta}</div>
      </div>
    </div>
  );
}

export function SessionList() {
  const sessions = useSessionStore((state) => state.sessions);
  const selectedSessionId = useSessionStore((state) => state.selectedSessionId);
  const setSelectedSession = useSessionStore((state) => state.setSelectedSession);

  // Sort sessions: active first, then by last activity
  const sortedSessions = React.useMemo(() => {
    return [...sessions].sort((a, b) => {
      // Active sessions first
      if (a.state === 'active' && b.state !== 'active') return -1;
      if (a.state !== 'active' && b.state === 'active') return 1;
      // Then waiting
      if (a.state === 'waiting' && b.state !== 'waiting') return -1;
      if (a.state !== 'waiting' && b.state === 'waiting') return 1;
      // Then by most recent activity
      return b.lastActivity - a.lastActivity;
    });
  }, [sessions]);

  if (sessions.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>No active sessions</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.sectionTitle}>Sessions ({sessions.length})</div>
      {sortedSessions.map((session) => (
        <SessionItem
          key={session.id}
          session={session}
          isSelected={selectedSessionId === session.id}
          onClick={() => setSelectedSession(session.id)}
        />
      ))}
    </div>
  );
}

// Helper functions
function truncateId(id: string, length: number = 12): string {
  if (id.length <= length) return id;
  return id.slice(0, length) + '...';
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
