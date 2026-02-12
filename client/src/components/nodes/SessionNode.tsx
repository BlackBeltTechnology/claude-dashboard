import React, { memo, useState, useEffect } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { SessionState } from 'shared';

export interface SessionNodeData {
  label: string;
  state: SessionState;
  projectHash: string;
  gitBranch?: string;
  tmuxTarget?: string;
  subagentCount: number;
  nodeCount: number;
  sessionId?: string;
  lastCommand?: string;
  hasClearPrefix?: boolean;
  lastActivity?: number;  // Timestamp in ms for relative time display
  [key: string]: unknown;
}

export type SessionNodeType = Node<SessionNodeData, 'session'>;

const DEFAULT_STATUS_COLORS = { bg: '#374151', border: '#6b7280', dot: '#9ca3af' };
const STATUS_COLORS: Record<SessionState, { bg: string; border: string; dot: string }> = {
  active: { bg: '#052e16', border: '#16a34a', dot: '#22c55e' },
  waiting: { bg: '#422006', border: '#ca8a04', dot: '#fbbf24' },
  idle: { bg: '#1f2937', border: '#4b5563', dot: '#9ca3af' },
  completed: { bg: '#1e3a5f', border: '#2563eb', dot: '#3b82f6' },
};

const styles = {
  node: {
    padding: '12px 16px',
    borderRadius: '8px',
    minWidth: '180px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    transition: 'box-shadow 0.2s, transform 0.2s',
  },
  nodeSelected: {
    boxShadow: '0 0 0 2px #e94560, 0 4px 12px rgba(0, 0, 0, 0.3)',
    transform: 'scale(1.02)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  icon: {
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#fff',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  meta: {
    fontSize: '11px',
    color: '#9ca3af',
    marginTop: '4px',
  },
  lastCommand: {
    fontSize: '13px',
    color: '#9ca3af',
    marginTop: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    maxWidth: '160px',
  },
  clearBadge: {
    display: 'inline-block',
    fontSize: '9px',
    color: '#dc2626',
    border: '1px dashed #dc2626',
    borderRadius: '3px',
    padding: '1px 4px',
    marginLeft: '6px',
    verticalAlign: 'middle',
  },
  stats: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
    fontSize: '11px',
    color: '#6b7280',
  },
  stat: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  handle: {
    width: '8px',
    height: '8px',
    background: '#e94560',
    border: '2px solid #1a1a2e',
  },
};

/**
 * Format a timestamp to a relative time string (e.g., "2m ago", "1h ago")
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);

  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function SessionNodeComponent({ data, selected }: NodeProps<SessionNodeType>) {
  const colors = STATUS_COLORS[data.state] ?? DEFAULT_STATUS_COLORS;

  // Live ticking for relative timestamp updates
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        style={styles.handle}
      />
      <div
        style={{
          ...styles.node,
          backgroundColor: colors.bg,
          border: `2px ${data.hasClearPrefix ? 'dashed' : 'solid'} ${colors.border}`,
          ...(selected ? styles.nodeSelected : {}),
        }}
      >
        <div style={styles.header}>
          <div style={styles.icon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e94560" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 9h6M9 13h6M9 17h4" />
            </svg>
          </div>
          <span style={styles.title}>{data.label}</span>
          {data.hasClearPrefix && (
            <span style={styles.clearBadge} title="Session started after /clear">CLR</span>
          )}
          <div
            style={{
              ...styles.statusDot,
              backgroundColor: colors.dot,
            }}
            title={data.state}
          />
        </div>
        {data.lastCommand && (
          <div style={styles.lastCommand} title={data.lastCommand}>
            {data.lastCommand.length > 40 ? data.lastCommand.slice(0, 40) + '...' : data.lastCommand}
          </div>
        )}
        {data.lastActivity && (
          <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
            {formatRelativeTime(data.lastActivity)}
          </div>
        )}
        {data.gitBranch && (
          <div style={styles.meta}>
            <span style={{ marginRight: '4px' }}>branch:</span>
            {data.gitBranch}
          </div>
        )}
        <div style={styles.stats}>
          <span style={styles.stat}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            {data.nodeCount} nodes
          </span>
          <span style={styles.stat}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            {data.subagentCount} agents
          </span>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={styles.handle}
      />
    </>
  );
}

export const SessionNode = memo(SessionNodeComponent);
