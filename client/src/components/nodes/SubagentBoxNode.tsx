import React, { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { SessionState } from 'shared';
import type { SubagentBoxNodeData } from '../../utils/graphLayout';

export type SubagentBoxNodeType = Node<SubagentBoxNodeData, 'subagent-box'>;

const DEFAULT_STATUS_COLORS = { bg: '#374151', border: '#6b7280', dot: '#9ca3af' };
const STATUS_COLORS: Record<SessionState, { bg: string; border: string; dot: string }> = {
  active: { bg: '#052e16', border: '#16a34a', dot: '#22c55e' },
  waiting: { bg: '#422006', border: '#ca8a04', dot: '#fbbf24' },
  idle: { bg: '#1f2937', border: '#4b5563', dot: '#9ca3af' },
  completed: { bg: '#1e3a5f', border: '#2563eb', dot: '#3b82f6' },
};

// Tool icons (same as ToolNode.tsx)
const TOOL_ICONS: Record<string, JSX.Element> = {
  Read: (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  Write: (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  Edit: (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  ),
  Bash: (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  ),
  Grep: (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Glob: (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
};

const DEFAULT_ICON = (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

/**
 * Convert hex color to rgba with specified alpha.
 */
function hexToRgba(hex: string, alpha: number): string {
  // Handle hsl() format
  if (hex.startsWith('hsl(')) {
    // For HSL, return a semi-transparent background using rgba approximation
    // For simplicity, we'll use a darker overlay effect
    return `rgba(255, 255, 255, ${alpha})`;
  }

  // Handle hex format
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const styles = {
  boxCollapsed: {
    padding: '10px 14px',
    borderRadius: '8px',
    width: '220px',
    minHeight: '70px',
    boxShadow: '0 3px 10px rgba(0, 0, 0, 0.25)',
    transition: 'box-shadow 0.2s, transform 0.2s',
    cursor: 'pointer',
    position: 'relative' as const,
  },
  boxExpanded: {
    padding: '10px 14px',
    borderRadius: '8px',
    boxShadow: '0 3px 10px rgba(0, 0, 0, 0.25)',
    transition: 'box-shadow 0.2s, transform 0.2s',
    cursor: 'pointer',
    position: 'relative' as const,
  },
  boxSelected: {
    boxShadow: '0 0 0 2px #e94560, 0 3px 10px rgba(0, 0, 0, 0.25)',
    transform: 'scale(1.02)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '6px',
  },
  agentColorCircle: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    flexShrink: 0,
    border: '1px solid rgba(255, 255, 255, 0.3)',
  },
  title: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#fff',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
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
  lastNode: {
    fontSize: '10px',
    color: '#9ca3af',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  internalNodesContainer: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
    overflowX: 'auto' as const,
    paddingBottom: '4px',
  },
  internalNodeCard: {
    minWidth: '130px',
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    cursor: 'pointer',
    transition: 'background-color 0.15s, transform 0.15s',
    flexShrink: 0,
  },
  internalNodeCardHover: {
    transform: 'scale(1.02)',
  },
  internalNodeLabel: {
    fontSize: '10px',
    fontWeight: 500,
    color: '#fff',
    marginBottom: '4px',
  },
  internalNodeInput: {
    fontSize: '9px',
    color: '#9ca3af',
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

function SubagentBoxNodeComponent({ data, selected }: NodeProps<SubagentBoxNodeType>) {
  const colors = STATUS_COLORS[data.state] ?? DEFAULT_STATUS_COLORS;

  const boxBackground = hexToRgba(data.agentColor, 0.08);
  const handleColor = data.agentColor;

  const handleBoxClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on internal nodes (they have stopPropagation)
    data.onToggleExpand?.();
  };

  const handleInternalNodeClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    data.onInternalNodeClick?.(nodeId);
  };

  // Collapsed view
  if (!data.isExpanded) {
    return (
      <>
        <Handle
          type="target"
          position={Position.Left}
          style={{ ...styles.handle, background: handleColor }}
        />
        <div
          style={{
            ...styles.boxCollapsed,
            backgroundColor: boxBackground,
            borderLeft: `3px solid ${data.agentColor}`,
            ...(selected ? styles.boxSelected : {}),
          }}
          onClick={handleBoxClick}
        >
          <div
            style={{
              ...styles.statusDot,
              backgroundColor: colors.dot,
            }}
            title={data.state}
          />
          <div style={styles.header}>
            <div
              style={{
                ...styles.agentColorCircle,
                backgroundColor: data.agentColor,
              }}
              title="Agent Color"
            />
            <span style={styles.title}>
              {data.agentType} ({data.toolCount} tool{data.toolCount !== 1 ? 's' : ''})
            </span>
          </div>
          <div style={styles.lastNode}>
            {data.lastNodeType === 'tool' && (
              <div style={{ width: '10px', height: '10px', flexShrink: 0 }}>
                {TOOL_ICONS[data.lastNodeLabel] || DEFAULT_ICON}
              </div>
            )}
            {data.lastNodeType === 'request' && <span>📝</span>}
            {data.lastNodeType === 'response' && <span>✓</span>}
            <span>{data.lastNodeLabel}</span>
          </div>
        </div>
        <Handle
          type="source"
          position={Position.Right}
          style={{ ...styles.handle, background: handleColor }}
        />
      </>
    );
  }

  // Expanded view - renders header only; child nodes are rendered by React Flow as children
  const expandedWidth = data.expandedWidth || 280;
  const expandedHeight = data.expandedHeight || 120;

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        style={{ ...styles.handle, background: handleColor }}
      />
      <div
        style={{
          ...styles.boxExpanded,
          backgroundColor: boxBackground,
          border: `1px solid rgba(255, 255, 255, 0.1)`,
          borderLeft: `3px solid ${data.agentColor}`,
          ...(selected ? styles.boxSelected : {}),
          width: `${expandedWidth}px`,
          height: `${expandedHeight}px`,
          overflow: 'visible',
        }}
        onClick={handleBoxClick}
      >
        <div
          style={{
            ...styles.statusDot,
            backgroundColor: colors.dot,
          }}
          title={data.state}
        />
        <div style={styles.header}>
          <div
            style={{
              ...styles.agentColorCircle,
              backgroundColor: data.agentColor,
            }}
            title="Agent Color"
          />
          <span style={styles.title}>
            {data.agentType} ({data.toolCount} tool{data.toolCount !== 1 ? 's' : ''})
          </span>
          <span style={{ fontSize: '10px', color: '#6b7280', cursor: 'pointer' }}>▲ collapse</span>
        </div>
        {/* Child nodes rendered by React Flow inside this parent */}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={{ ...styles.handle, background: handleColor }}
      />
    </>
  );
}

export const SubagentBoxNode = memo(SubagentBoxNodeComponent);
