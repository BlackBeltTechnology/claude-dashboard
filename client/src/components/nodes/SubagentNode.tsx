import React, { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { SessionState } from 'shared';

export interface SubagentNodeData {
  label: string;
  state: SessionState;
  agentType: string;
  description?: string;
  [key: string]: unknown;
}

export type SubagentNodeType = Node<SubagentNodeData, 'subagent'>;

const STATUS_COLORS: Record<SessionState, { bg: string; border: string; dot: string }> = {
  active: { bg: '#052e16', border: '#16a34a', dot: '#22c55e' },
  waiting: { bg: '#422006', border: '#ca8a04', dot: '#eab308' },
  idle: { bg: '#1f2937', border: '#4b5563', dot: '#6b7280' },
  completed: { bg: '#1e3a5f', border: '#2563eb', dot: '#3b82f6' },
};

const styles = {
  node: {
    padding: '10px 14px',
    borderRadius: '8px',
    minWidth: '160px',
    maxWidth: '200px',
    boxShadow: '0 3px 10px rgba(0, 0, 0, 0.25)',
    transition: 'box-shadow 0.2s, transform 0.2s',
  },
  nodeSelected: {
    boxShadow: '0 0 0 2px #e94560, 0 3px 10px rgba(0, 0, 0, 0.25)',
    transform: 'scale(1.02)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  icon: {
    width: '18px',
    height: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  title: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#fff',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  description: {
    fontSize: '10px',
    color: '#9ca3af',
    marginTop: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  agentType: {
    fontSize: '10px',
    color: '#6b7280',
    marginTop: '2px',
    fontStyle: 'italic',
  },
  handle: {
    width: '6px',
    height: '6px',
    background: '#8b5cf6',
    border: '2px solid #1a1a2e',
  },
};

function SubagentNodeComponent({ data, selected }: NodeProps<SubagentNodeType>) {
  const colors = STATUS_COLORS[data.state];

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        style={styles.handle}
      />
      <div
        style={{
          ...styles.node,
          backgroundColor: colors.bg,
          border: `2px solid ${colors.border}`,
          ...(selected ? styles.nodeSelected : {}),
        }}
      >
        <div style={styles.header}>
          <div style={styles.icon}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
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
        {data.description && (
          <div style={styles.description} title={data.description}>
            {data.description}
          </div>
        )}
        <div style={styles.agentType}>
          Task: {data.agentType}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={styles.handle}
      />
    </>
  );
}

export const SubagentNode = memo(SubagentNodeComponent);
