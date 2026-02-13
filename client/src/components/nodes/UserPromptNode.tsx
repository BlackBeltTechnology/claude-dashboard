import React, { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { SessionState } from 'shared';

export interface UserPromptNodeData {
  label: string;          // Truncated prompt text
  state: SessionState;
  promptText: string;     // Full prompt text
  isCommand: boolean;     // Whether this is a slash command
  commandName?: string;   // Slash command name if applicable
  hooks?: Array<{ event: string; hookName: string; command: string; timestamp: number }>;
  [key: string]: unknown;
}

export type UserPromptNodeType = Node<UserPromptNodeData, 'user-prompt'>;

const DEFAULT_STATUS_COLORS = { bg: '#374151', border: '#6b7280', dot: '#9ca3af' };
const STATUS_COLORS: Record<SessionState, { bg: string; border: string; dot: string }> = {
  active: { bg: '#052e16', border: '#16a34a', dot: '#22c55e' },
  waiting: { bg: '#422006', border: '#ca8a04', dot: '#fbbf24' },
  idle: { bg: '#1f2937', border: '#4b5563', dot: '#9ca3af' },
  completed: { bg: '#1e3a5f', border: '#2563eb', dot: '#3b82f6' },
};

const styles = {
  node: {
    padding: '8px 12px',
    borderRadius: '6px',
    minWidth: '150px',
    maxWidth: '180px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
    transition: 'box-shadow 0.2s, transform 0.2s',
  },
  nodeSelected: {
    boxShadow: '0 0 0 2px #e94560, 0 2px 8px rgba(0, 0, 0, 0.2)',
    transform: 'scale(1.02)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  icon: {
    width: '16px',
    height: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  title: {
    fontSize: '11px',
    fontWeight: 500,
    color: '#fff',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  commandBadge: {
    fontSize: '9px',
    color: '#9ca3af',
    marginTop: '4px',
    fontFamily: 'monospace',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  handle: {
    width: '5px',
    height: '5px',
    background: '#10b981',
    border: '1px solid #1a1a2e',
  },
  hookBadge: {
    fontSize: '9px',
    backgroundColor: '#374151',
    color: '#9ca3af',
    padding: '1px 4px',
    borderRadius: '3px',
    marginTop: '4px',
  },
};

function UserPromptNodeComponent({ data, selected }: NodeProps<UserPromptNodeType>) {
  const colors = STATUS_COLORS[data.state] ?? DEFAULT_STATUS_COLORS;

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
          border: `1px solid ${colors.border}`,
          ...(selected ? styles.nodeSelected : {}),
        }}
      >
        <div style={styles.header}>
          <div style={styles.icon}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <span style={styles.title}>{data.label}</span>
          <div
            style={{
              ...styles.statusDot,
              backgroundColor: colors.dot,
            }}
            title={data.state}
          />
        </div>
        {data.isCommand && data.commandName && (
          <div style={styles.commandBadge} title={`Command: ${data.commandName}`}>
            cmd: {data.commandName}
          </div>
        )}
        {data.hooks && data.hooks.length > 0 && (
          <div style={styles.hookBadge}>
            🪝 {data.hooks.length} hook{data.hooks.length > 1 ? 's' : ''}
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={styles.handle}
      />
    </>
  );
}

export const UserPromptNode = memo(UserPromptNodeComponent);
