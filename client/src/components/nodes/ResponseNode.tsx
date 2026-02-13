import React, { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { SessionState } from 'shared';

export interface ResponseNodeData {
  label: string;
  state: SessionState;
  summary: string;
  agentType: string;
  agentColor: string;
  hooks?: Array<{ event: string; hookName: string; command: string; timestamp: number }>;
  [key: string]: unknown;
}

export type ResponseNodeType = Node<ResponseNodeData, 'response'>;

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
    width: '160px',
    minHeight: '60px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
    transition: 'box-shadow 0.2s, transform 0.2s',
    position: 'relative' as const,
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
    width: '14px',
    height: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    flexShrink: 0,
    position: 'absolute' as const,
    top: '8px',
    right: '8px',
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
  summaryText: {
    fontSize: '9px',
    color: '#9ca3af',
    marginTop: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  handle: {
    width: '6px',
    height: '6px',
    border: '2px solid #1a1a2e',
  },
};

function ResponseNodeComponent({ data, selected }: NodeProps<ResponseNodeType>) {
  const colors = STATUS_COLORS[data.state] ?? DEFAULT_STATUS_COLORS;
  const truncatedSummary = data.summary.length > 60 ? data.summary.slice(0, 60) + '...' : data.summary;

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        style={{ ...styles.handle, background: data.agentColor }}
      />
      <div
        style={{
          ...styles.node,
          backgroundColor: 'rgba(59, 130, 246, 0.15)',
          border: `1px solid ${colors.border}`,
          borderLeft: `3px solid ${data.agentColor}`,
          ...(selected ? styles.nodeSelected : {}),
        }}
      >
        <div
          style={{
            ...styles.statusDot,
            backgroundColor: colors.dot,
          }}
          title={data.state}
        />
        <div style={styles.header}>
          <div style={styles.icon}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <span style={styles.title}>{data.label}</span>
          {data.hooks && data.hooks.length > 0 && (
            <span style={{ fontSize: '9px', color: '#fbbf24', whiteSpace: 'nowrap' as const }}>🪝 {data.hooks.length}</span>
          )}
        </div>
        {truncatedSummary && (
          <div style={styles.summaryText} title={data.summary}>
            {truncatedSummary}
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={{ ...styles.handle, background: data.agentColor }}
      />
    </>
  );
}

export const ResponseNode = memo(ResponseNodeComponent);
