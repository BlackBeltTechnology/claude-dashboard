import React, { useState } from 'react';
import type { AnyNode, Session, SessionState } from 'shared';
import { TreeNodeData } from './TreeNode';

const STATUS_COLORS: Record<SessionState, { bg: string; text: string }> = {
  active: { bg: '#166534', text: '#22c55e' },
  waiting: { bg: '#854d0e', text: '#eab308' },
  idle: { bg: '#374151', text: '#9ca3af' },
  completed: { bg: '#1e40af', text: '#60a5fa' },
};

const styles = {
  container: {
    padding: '20px',
    height: '100%',
    overflowY: 'auto' as const,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#666',
    fontSize: '14px',
  },
  header: {
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: '1px solid #0f3460',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  typeIcon: {
    fontSize: '24px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#eee',
    flex: 1,
  },
  stateBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  metaRow: {
    fontSize: '12px',
    color: '#888',
    marginTop: '4px',
  },
  section: {
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    color: '#888',
    letterSpacing: '0.5px',
    marginBottom: '8px',
  },
  content: {
    backgroundColor: '#16213e',
    borderRadius: '6px',
    padding: '12px',
    fontSize: '13px',
    lineHeight: 1.5,
    color: '#eee',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
    maxHeight: '300px',
    overflowY: 'auto' as const,
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    gap: '8px 16px',
    fontSize: '13px',
  },
  infoLabel: {
    color: '#888',
  },
  infoValue: {
    color: '#eee',
    wordBreak: 'break-all' as const,
  },
  jsonContainer: {
    position: 'relative' as const,
  },
  jsonToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#16213e',
    border: 'none',
    borderRadius: '6px 6px 0 0',
    color: '#eee',
    fontSize: '13px',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left' as const,
  },
  jsonToggleIcon: {
    fontSize: '10px',
    color: '#888',
  },
  jsonContent: {
    backgroundColor: '#0f1729',
    borderRadius: '0 0 6px 6px',
    padding: '12px',
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#93c5fd',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-all' as const,
    maxHeight: '400px',
    overflowY: 'auto' as const,
    borderTop: '1px solid #0f3460',
  },
};

// Icons for node types
const NODE_ICONS: Record<string, string> = {
  session: '\u{1F4C1}',
  'message-user': '\u{1F464}',
  'message-assistant': '\u{1F916}',
  skill: '\u26A1',
  subagent: '\u{1F500}',
  tool: '\u{1F527}',
};

interface CollapsibleJsonProps {
  title: string;
  data: unknown;
  defaultExpanded?: boolean;
}

function CollapsibleJson({ title, data, defaultExpanded = false }: CollapsibleJsonProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const jsonString = React.useMemo(() => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }, [data]);

  return (
    <div style={styles.jsonContainer}>
      <button
        style={styles.jsonToggle}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span style={styles.jsonToggleIcon}>
          {isExpanded ? '\u25BC' : '\u25B6'}
        </span>
        {title}
      </button>
      {isExpanded && (
        <pre style={styles.jsonContent}>{jsonString}</pre>
      )}
    </div>
  );
}

interface NodeDetailProps {
  node: TreeNodeData | null;
}

function getNodeIcon(node: TreeNodeData): string {
  if ('type' in node) {
    if (node.type === 'message') {
      return NODE_ICONS[`message-${node.role}`] || NODE_ICONS['message-user'];
    }
    return NODE_ICONS[node.type] || '\u{1F4C4}';
  }
  return NODE_ICONS.session;
}

function getNodeTitle(node: TreeNodeData): string {
  if ('type' in node) {
    switch (node.type) {
      case 'session':
        return node.summary || 'Session';
      case 'message':
        return `${node.role === 'user' ? 'User' : 'Assistant'} Message`;
      case 'skill':
        return `Skill: ${node.skillName}`;
      case 'subagent':
        return `Subagent: ${node.agentType}`;
      case 'tool':
        return `Tool: ${node.toolName}`;
      default:
        return 'Node';
    }
  }
  return node.summary || 'Session';
}

function getNodeType(node: TreeNodeData): string {
  if ('type' in node) {
    return node.type;
  }
  return 'session';
}

export function NodeDetail({ node }: NodeDetailProps) {
  if (!node) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <p>Select a node to view details</p>
        </div>
      </div>
    );
  }

  const icon = getNodeIcon(node);
  const title = getNodeTitle(node);
  const nodeType = getNodeType(node);
  const badgeColors = STATUS_COLORS[node.state] || STATUS_COLORS.idle;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleRow}>
          <span style={styles.typeIcon}>{icon}</span>
          <span style={styles.title}>{title}</span>
          <span
            style={{
              ...styles.stateBadge,
              backgroundColor: badgeColors.bg,
              color: badgeColors.text,
            }}
          >
            {node.state}
          </span>
        </div>
        <div style={styles.metaRow}>
          Type: {nodeType}
          {' | '}
          ID: {'id' in node ? node.id : 'N/A'}
        </div>
      </div>

      {/* Node-specific content */}
      {renderNodeContent(node)}
    </div>
  );
}

function renderNodeContent(node: TreeNodeData): React.ReactNode {
  // Check if it's a Session (no 'type' property at the top level)
  if (!('type' in node)) {
    return renderSessionContent(node);
  }

  // It's an AnyNode
  switch (node.type) {
    case 'session':
      return renderSessionNodeContent(node);
    case 'message':
      return renderMessageContent(node);
    case 'skill':
      return renderSkillContent(node);
    case 'subagent':
      return renderSubagentContent(node);
    case 'tool':
      return renderToolContent(node);
    default:
      return <p style={{ color: '#888' }}>Unknown node type</p>;
  }
}

function renderSessionContent(session: Session): React.ReactNode {
  return (
    <>
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Session Info</div>
        <div style={styles.infoGrid}>
          <span style={styles.infoLabel}>Session ID:</span>
          <span style={styles.infoValue}>{session.id}</span>

          <span style={styles.infoLabel}>Project Hash:</span>
          <span style={styles.infoValue}>{session.projectHash}</span>

          {session.gitBranch && (
            <>
              <span style={styles.infoLabel}>Git Branch:</span>
              <span style={styles.infoValue}>{session.gitBranch}</span>
            </>
          )}

          {session.tmuxTarget && (
            <>
              <span style={styles.infoLabel}>Tmux Target:</span>
              <span style={styles.infoValue}>{session.tmuxTarget}</span>
            </>
          )}

          <span style={styles.infoLabel}>Created:</span>
          <span style={styles.infoValue}>
            {new Date(session.createdAt).toLocaleString()}
          </span>

          <span style={styles.infoLabel}>Last Activity:</span>
          <span style={styles.infoValue}>
            {new Date(session.lastActivity).toLocaleString()}
          </span>

          <span style={styles.infoLabel}>Nodes:</span>
          <span style={styles.infoValue}>{session.nodes.length}</span>

          <span style={styles.infoLabel}>Subagents:</span>
          <span style={styles.infoValue}>{session.subagents.length}</span>
        </div>
      </div>

      {session.summary && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Summary</div>
          <div style={styles.content}>{session.summary}</div>
        </div>
      )}
    </>
  );
}

function renderSessionNodeContent(node: AnyNode & { type: 'session' }): React.ReactNode {
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>Session Node Info</div>
      <div style={styles.infoGrid}>
        <span style={styles.infoLabel}>Session ID:</span>
        <span style={styles.infoValue}>{node.sessionId}</span>

        <span style={styles.infoLabel}>Project Hash:</span>
        <span style={styles.infoValue}>{node.projectHash}</span>

        {node.gitBranch && (
          <>
            <span style={styles.infoLabel}>Git Branch:</span>
            <span style={styles.infoValue}>{node.gitBranch}</span>
          </>
        )}

        {node.tmuxTarget && (
          <>
            <span style={styles.infoLabel}>Tmux Target:</span>
            <span style={styles.infoValue}>{node.tmuxTarget}</span>
          </>
        )}

        <span style={styles.infoLabel}>Timestamp:</span>
        <span style={styles.infoValue}>
          {new Date(node.timestamp).toLocaleString()}
        </span>
      </div>

      {node.summary && (
        <div style={{ ...styles.section, marginTop: '16px' }}>
          <div style={styles.sectionTitle}>Summary</div>
          <div style={styles.content}>{node.summary}</div>
        </div>
      )}
    </div>
  );
}

function renderMessageContent(node: AnyNode & { type: 'message' }): React.ReactNode {
  return (
    <>
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Message Content</div>
        <div style={styles.content}>{node.content || '(empty message)'}</div>
      </div>

      {node.toolUses && node.toolUses.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            Tool Uses ({node.toolUses.length})
          </div>
          {node.toolUses.map((toolUse, index) => (
            <div key={toolUse.id} style={{ marginBottom: index < node.toolUses!.length - 1 ? '12px' : 0 }}>
              <CollapsibleJson
                title={`${toolUse.name} (${toolUse.id.slice(0, 8)}...)`}
                data={toolUse.input}
              />
            </div>
          ))}
        </div>
      )}

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Metadata</div>
        <div style={styles.infoGrid}>
          <span style={styles.infoLabel}>Role:</span>
          <span style={styles.infoValue}>{node.role}</span>

          <span style={styles.infoLabel}>Node ID:</span>
          <span style={styles.infoValue}>{node.id}</span>

          <span style={styles.infoLabel}>Timestamp:</span>
          <span style={styles.infoValue}>
            {new Date(node.timestamp).toLocaleString()}
          </span>
        </div>
      </div>
    </>
  );
}

function renderSkillContent(node: AnyNode & { type: 'skill' }): React.ReactNode {
  return (
    <>
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Skill Info</div>
        <div style={styles.infoGrid}>
          <span style={styles.infoLabel}>Skill Name:</span>
          <span style={styles.infoValue}>{node.skillName}</span>

          <span style={styles.infoLabel}>Node ID:</span>
          <span style={styles.infoValue}>{node.id}</span>

          <span style={styles.infoLabel}>Timestamp:</span>
          <span style={styles.infoValue}>
            {new Date(node.timestamp).toLocaleString()}
          </span>
        </div>
      </div>

      {node.args && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Arguments</div>
          <div style={styles.content}>{node.args}</div>
        </div>
      )}
    </>
  );
}

function renderSubagentContent(node: AnyNode & { type: 'subagent' }): React.ReactNode {
  return (
    <>
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Subagent Info</div>
        <div style={styles.infoGrid}>
          <span style={styles.infoLabel}>Agent ID:</span>
          <span style={styles.infoValue}>{node.agentId}</span>

          <span style={styles.infoLabel}>Agent Type:</span>
          <span style={styles.infoValue}>{node.agentType}</span>

          <span style={styles.infoLabel}>Node ID:</span>
          <span style={styles.infoValue}>{node.id}</span>

          <span style={styles.infoLabel}>Timestamp:</span>
          <span style={styles.infoValue}>
            {new Date(node.timestamp).toLocaleString()}
          </span>
        </div>
      </div>

      {node.description && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Description</div>
          <div style={styles.content}>{node.description}</div>
        </div>
      )}
    </>
  );
}

function renderToolContent(node: AnyNode & { type: 'tool' }): React.ReactNode {
  return (
    <>
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Tool Info</div>
        <div style={styles.infoGrid}>
          <span style={styles.infoLabel}>Tool Name:</span>
          <span style={styles.infoValue}>{node.toolName}</span>

          <span style={styles.infoLabel}>Node ID:</span>
          <span style={styles.infoValue}>{node.id}</span>

          <span style={styles.infoLabel}>Timestamp:</span>
          <span style={styles.infoValue}>
            {new Date(node.timestamp).toLocaleString()}
          </span>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Input</div>
        <CollapsibleJson title="Tool Input" data={node.input} defaultExpanded />
      </div>

      {node.output && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Output</div>
          <div style={styles.content}>{node.output}</div>
        </div>
      )}
    </>
  );
}
