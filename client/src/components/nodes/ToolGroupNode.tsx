import React, { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { SessionState } from 'shared';
import { useIsGroupExpanded } from '../../store/sessionStore';

export interface ToolGroupNodeData {
  label: string;          // "Bash (12)"
  state: SessionState;
  toolName: string;
  count: number;
  groupId: string;        // For expansion state lookup
  hooks?: Array<{ event: string; hookName: string; command: string; timestamp: number }>;
  [key: string]: unknown;
}

export type ToolGroupNodeType = Node<ToolGroupNodeData, 'tool-group'>;

const DEFAULT_STATUS_COLORS = { bg: '#374151', border: '#6b7280', dot: '#9ca3af' };
const STATUS_COLORS: Record<SessionState, { bg: string; border: string; dot: string }> = {
  active: { bg: '#052e16', border: '#16a34a', dot: '#22c55e' },
  waiting: { bg: '#422006', border: '#ca8a04', dot: '#fbbf24' },
  idle: { bg: '#1f2937', border: '#4b5563', dot: '#9ca3af' },
  completed: { bg: '#1e3a5f', border: '#2563eb', dot: '#3b82f6' },
};

const TOOL_ICONS: Record<string, JSX.Element> = {
  Read: (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>),
  Write: (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>),
  Edit: (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>),
  Bash: (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></svg>),
  Grep: (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>),
  Glob: (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>),
};

const DEFAULT_ICON = (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>);

const styles = {
  node: { padding: '8px 12px', borderRadius: '6px', minWidth: '140px', maxWidth: '180px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)', transition: 'box-shadow 0.2s, transform 0.2s', cursor: 'pointer' },
  nodeSelected: { boxShadow: '0 0 0 2px #e94560, 0 2px 8px rgba(0, 0, 0, 0.2)', transform: 'scale(1.02)' },
  header: { display: 'flex', alignItems: 'center', gap: '6px' },
  icon: { width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  statusDot: { width: '5px', height: '5px', borderRadius: '50%', flexShrink: 0 },
  title: { fontSize: '11px', fontWeight: 500, color: '#fff', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  countBadge: { fontSize: '10px', color: '#9ca3af', marginTop: '4px', textAlign: 'center' as const },
  chevron: { fontSize: '10px', color: '#9ca3af', lineHeight: 1 },
  handle: { width: '5px', height: '5px', background: '#f59e0b', border: '1px solid #1a1a2e' },
  hookBadge: { fontSize: '9px', color: '#fbbf24', marginLeft: '4px', whiteSpace: 'nowrap' as const },
};

function ToolGroupNodeComponent({ data, selected }: NodeProps<ToolGroupNodeType>) {
  const colors = STATUS_COLORS[data.state] ?? DEFAULT_STATUS_COLORS;
  const icon = TOOL_ICONS[data.toolName] || DEFAULT_ICON;
  const isExpanded = useIsGroupExpanded(data.groupId);

  return (
    <>
      <Handle type="target" position={Position.Left} style={styles.handle} />
      <div
        style={{
          ...styles.node,
          backgroundColor: colors.bg,
          border: `1px solid ${colors.border}`,
          ...(selected ? styles.nodeSelected : {})
        }}
      >
        <div style={styles.header}>
          <div style={styles.icon}>{icon}</div>
          <span style={styles.title}>{data.toolName}</span>
          <span style={styles.chevron}>{isExpanded ? '▼' : '▶'}</span>
          <div style={{ ...styles.statusDot, backgroundColor: colors.dot }} title={data.state} />
        </div>
        <div style={styles.countBadge}>
          {data.count} {data.count === 1 ? 'call' : 'calls'}
          {data.hooks && data.hooks.length > 0 && (
            <span style={styles.hookBadge}>🪝 {data.hooks.length}</span>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={styles.handle} />
    </>
  );
}

export const ToolGroupNode = memo(ToolGroupNodeComponent);
