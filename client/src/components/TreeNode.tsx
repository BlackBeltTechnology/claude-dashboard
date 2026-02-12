import React from 'react';
import type { AnyNode, SessionState, Session } from 'shared';

// Icons for different node types
const NODE_ICONS: Record<string, string> = {
  session: '\u{1F4C1}',      // Folder
  'message-user': '\u{1F464}',    // User
  'message-assistant': '\u{1F916}', // Robot
  skill: '\u26A1',           // Lightning bolt
  subagent: '\u{1F500}',     // Shuffle
  tool: '\u{1F527}',         // Wrench
};

// Status colors
const STATUS_COLORS: Record<SessionState, string> = {
  active: '#22c55e',   // Green
  waiting: '#eab308',  // Yellow
  idle: '#6b7280',     // Gray
  completed: '#3b82f6', // Blue
};

const styles = {
  nodeContainer: {
    userSelect: 'none' as const,
  },
  nodeRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '6px 8px',
    cursor: 'pointer',
    borderRadius: '4px',
    transition: 'background-color 0.15s',
  },
  nodeRowHover: {
    backgroundColor: '#1e2a4a',
  },
  nodeRowSelected: {
    backgroundColor: '#0f3460',
  },
  expandIcon: {
    width: '16px',
    height: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '4px',
    fontSize: '10px',
    color: '#888',
    flexShrink: 0,
  },
  typeIcon: {
    marginRight: '8px',
    fontSize: '14px',
    flexShrink: 0,
  },
  statusDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    marginRight: '8px',
    flexShrink: 0,
  },
  nodeText: {
    flex: 1,
    fontSize: '13px',
    color: '#eee',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  childrenContainer: {
    marginLeft: '20px',
  },
};

// Type for tree node data - can be AnyNode or Session (for root sessions and subagents)
export type TreeNodeData = AnyNode | Session;

interface TreeNodeProps {
  node: TreeNodeData;
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  hasChildren: boolean;
  isHighlighted?: boolean;
  onToggle: () => void;
  onSelect: () => void;
  children?: React.ReactNode;
}

function getNodeIcon(node: TreeNodeData): string {
  if ('type' in node) {
    // It's an AnyNode
    if (node.type === 'message') {
      return NODE_ICONS[`message-${node.role}`] || NODE_ICONS['message-user'];
    }
    return NODE_ICONS[node.type] || '\u{1F4C4}'; // Default document icon
  }
  // It's a Session (root or subagent)
  return NODE_ICONS.session;
}

function getNodeLabel(node: TreeNodeData): string {
  if ('type' in node) {
    // It's an AnyNode
    switch (node.type) {
      case 'session':
        return node.summary || `Session ${node.sessionId.slice(0, 8)}...`;
      case 'message':
        return node.content.length > 50
          ? node.content.slice(0, 50) + '...'
          : node.content || `${node.role} message`;
      case 'skill':
        return `Skill: ${node.skillName}`;
      case 'subagent':
        return `Subagent: ${node.agentType}`;
      case 'tool':
        return `Tool: ${node.toolName}`;
      default:
        return 'Unknown node';
    }
  }
  // It's a Session
  return node.summary || `Session ${node.id.slice(0, 8)}...`;
}

function getNodeState(node: TreeNodeData): SessionState {
  return node.state;
}

export function TreeNode({
  node,
  depth,
  isExpanded,
  isSelected,
  hasChildren,
  isHighlighted,
  onToggle,
  onSelect,
  children,
}: TreeNodeProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const rowStyle: React.CSSProperties = {
    ...styles.nodeRow,
    paddingLeft: `${8 + depth * 16}px`,
    ...(isHovered && !isSelected ? styles.nodeRowHover : {}),
    ...(isSelected ? styles.nodeRowSelected : {}),
    ...(isHighlighted
      ? { outline: '1px solid #854d0e', outlineOffset: '-1px', backgroundColor: 'rgba(133, 77, 14, 0.15)' }
      : {}),
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle();
  };

  const icon = getNodeIcon(node);
  const label = getNodeLabel(node);
  const state = getNodeState(node);

  return (
    <div style={styles.nodeContainer}>
      <div
        style={rowStyle}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Expand/collapse icon */}
        <span
          style={styles.expandIcon}
          onClick={hasChildren ? handleToggle : undefined}
        >
          {hasChildren ? (isExpanded ? '\u25BC' : '\u25B6') : ''}
        </span>

        {/* Type icon */}
        <span style={styles.typeIcon}>{icon}</span>

        {/* Status dot */}
        <div
          style={{
            ...styles.statusDot,
            backgroundColor: STATUS_COLORS[state],
          }}
          title={state}
        />

        {/* Node label */}
        <span style={styles.nodeText} title={label}>
          {label}
        </span>
      </div>

      {/* Children (rendered by parent TreeView) */}
      {isExpanded && children && (
        <div style={styles.childrenContainer}>{children}</div>
      )}
    </div>
  );
}
