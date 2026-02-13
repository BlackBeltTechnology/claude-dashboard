import React, { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { SessionState } from 'shared';
import { useIsGroupExpanded } from '../../store/sessionStore';

export interface ModelOutputNodeData {
  label: string;
  state: SessionState;
  content: string;
  count?: number;
  agentColor: string;
  nodeData: any;
  groupId?: string;  // For tracking expansion state of grouped model outputs
  [key: string]: unknown;
}

export type ModelOutputNodeType = Node<ModelOutputNodeData, 'model-output'>;

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
    cursor: 'pointer' as const,
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
    fontSize: '12px',
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
  contentText: {
    fontSize: '9px',
    color: '#9ca3af',
    marginTop: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  chevron: {
    fontSize: '10px',
    color: '#9ca3af',
    lineHeight: 1,
  },
  handle: {
    width: '6px',
    height: '6px',
    border: '2px solid #1a1a2e',
  },
};

function ModelOutputNodeComponent({ data, selected }: NodeProps<ModelOutputNodeType>) {
  const colors = STATUS_COLORS[data.state] ?? DEFAULT_STATUS_COLORS;
  const truncatedContent = data.content.length > 60 ? data.content.slice(0, 60) + '...' : data.content;
  const isGroup = data.count && data.count > 1;
  const displayLabel = isGroup ? `Model Output (${data.count})` : 'Model Output';
  const isExpanded = data.groupId ? useIsGroupExpanded(data.groupId) : false;

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
          backgroundColor: 'rgba(139, 92, 246, 0.15)',
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
            🤖
          </div>
          <span style={styles.title}>{displayLabel}</span>
          {isGroup && (
            <span style={styles.chevron}>{isExpanded ? '▼' : '▶'}</span>
          )}
        </div>
        {truncatedContent && (
          <div style={styles.contentText} title={data.content}>
            {truncatedContent}
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

export const ModelOutputNode = memo(ModelOutputNodeComponent);
