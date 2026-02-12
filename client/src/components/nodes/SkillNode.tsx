import React, { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { SessionState } from 'shared';

export interface SkillNodeData {
  label: string;
  state: SessionState;
  skillName: string;
  args?: string;
  [key: string]: unknown;
}

export type SkillNodeType = Node<SkillNodeData, 'skill'>;

const STATUS_COLORS: Record<SessionState, { bg: string; border: string; dot: string }> = {
  active: { bg: '#052e16', border: '#16a34a', dot: '#22c55e' },
  waiting: { bg: '#422006', border: '#ca8a04', dot: '#eab308' },
  idle: { bg: '#1f2937', border: '#4b5563', dot: '#6b7280' },
  completed: { bg: '#1e3a5f', border: '#2563eb', dot: '#3b82f6' },
};

const styles = {
  node: {
    padding: '8px 12px',
    borderRadius: '6px',
    minWidth: '130px',
    maxWidth: '170px',
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
  skillName: {
    fontSize: '10px',
    color: '#9ca3af',
    marginTop: '2px',
  },
  args: {
    fontSize: '9px',
    color: '#6b7280',
    marginTop: '2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    fontFamily: 'monospace',
  },
  handle: {
    width: '5px',
    height: '5px',
    background: '#06b6d4',
    border: '1px solid #1a1a2e',
  },
};

function SkillNodeComponent({ data, selected }: NodeProps<SkillNodeType>) {
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
          border: `1px solid ${colors.border}`,
          ...(selected ? styles.nodeSelected : {}),
        }}
      >
        <div style={styles.header}>
          <div style={styles.icon}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
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
        <div style={styles.skillName}>
          Skill: {data.skillName}
        </div>
        {data.args && (
          <div style={styles.args} title={data.args}>
            {data.args}
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={styles.handle}
      />
    </>
  );
}

export const SkillNode = memo(SkillNodeComponent);
