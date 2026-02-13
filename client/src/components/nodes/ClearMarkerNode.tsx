import React, { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { SessionState } from 'shared';

export interface ClearMarkerNodeData {
  label: string;          // "/clear" or "/clear #N"
  state: SessionState;
  clearIndex: number;
  [key: string]: unknown;
}

export type ClearMarkerNodeType = Node<ClearMarkerNodeData, 'clear-marker'>;

const DEFAULT_STATUS_COLORS = { bg: '#374151', border: '#6b7280', dot: '#9ca3af' };
const STATUS_COLORS: Record<SessionState, { bg: string; border: string; dot: string }> = {
  active: { bg: '#451a03', border: '#dc2626', dot: '#ef4444' },
  waiting: { bg: '#451a03', border: '#ea580c', dot: '#fb923c' },
  idle: { bg: '#374151', border: '#6b7280', dot: '#9ca3af' },
  completed: { bg: '#451a03', border: '#dc2626', dot: '#ef4444' },
};

const styles = {
  node: {
    padding: '6px 10px',
    borderRadius: '4px',
    width: '120px',
    height: '40px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
    transition: 'box-shadow 0.2s, transform 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    borderStyle: 'dashed',
    borderWidth: '1.5px',
  },
  nodeSelected: {
    boxShadow: '0 0 0 2px #e94560, 0 2px 8px rgba(0, 0, 0, 0.2)',
    transform: 'scale(1.02)',
  },
  icon: {
    width: '12px',
    height: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: '10px',
    fontWeight: 600,
    color: '#dc2626',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  handle: {
    width: '5px',
    height: '5px',
    background: '#dc2626',
    border: '1px solid #1a1a2e',
  },
};

function ClearMarkerNodeComponent({ data, selected }: NodeProps<ClearMarkerNodeType>) {
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
          borderColor: colors.border,
          ...(selected ? styles.nodeSelected : {}),
        }}
      >
        <div style={styles.icon}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" />
            <path d="M3.5 12.5l6 6 10-10" />
          </svg>
        </div>
        <span style={styles.label}>{data.label}</span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={styles.handle}
      />
    </>
  );
}

export const ClearMarkerNode = memo(ClearMarkerNodeComponent);
