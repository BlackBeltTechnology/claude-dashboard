import React, { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';

export interface DirectoryNodeData {
  label: string;
  sessionCount: number;
  cwd: string;
  [key: string]: unknown;
}

export type DirectoryNodeType = Node<DirectoryNodeData, 'directory'>;

const styles = {
  node: {
    padding: '14px 18px',
    borderRadius: '8px',
    minWidth: '190px',
    backgroundColor: '#16213e',
    border: '2px solid #0f3460',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    transition: 'box-shadow 0.2s, transform 0.2s',
  },
  nodeSelected: {
    boxShadow: '0 0 0 2px #93c5fd, 0 4px 12px rgba(0, 0, 0, 0.3)',
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
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#93c5fd',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  count: {
    fontSize: '13px',
    color: '#9ca3af',
    marginTop: '4px',
  },
  handle: {
    width: '8px',
    height: '8px',
    background: '#93c5fd',
    border: '2px solid #1a1a2e',
  },
};

function DirectoryNodeComponent({ data, selected }: NodeProps<DirectoryNodeType>) {
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
          ...(selected ? styles.nodeSelected : {}),
        }}
      >
        <div style={styles.header}>
          <div style={styles.icon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <span style={styles.title}>{data.label}</span>
        </div>
        <div style={styles.count}>
          {data.sessionCount} {data.sessionCount === 1 ? 'session' : 'sessions'}
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

export const DirectoryNode = memo(DirectoryNodeComponent);
