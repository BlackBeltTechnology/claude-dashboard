import React, { useState } from 'react';
import type { AnyNode, Session, SessionState, ToolGroup, ToolNode as ToolNodeType } from 'shared';
import { TreeNodeData } from './TreeNode';
import { ToolDetailFormatter } from '../utils/toolFormatters';

const STATUS_COLORS: Record<SessionState, { bg: string; text: string }> = {
  active: { bg: '#166534', text: '#22c55e' },
  waiting: { bg: '#854d0e', text: '#fbbf24' },
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

// Helper to format JSON output
function formatJsonOutput(value: unknown): string {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return value;
    }
  }
  return JSON.stringify(value, null, 2);
}

// Icons for node types
const NODE_ICONS: Record<string, string> = {
  session: '\u{1F4C1}',
  'message-user': '\u{1F464}',
  'message-assistant': '\u{1F916}',
  skill: '\u26A1',
  subagent: '\u{1F500}',
  tool: '\u{1F527}',
  directory: '\u{1F4C1}',
  'user-prompt': '\u{1F4AC}',    // Speech bubble
  'clear-marker': '\u2702',       // Scissors
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

interface ToolCallsListProps {
  toolCalls: Array<{ id: string; toolName: string; inputSummary: string; state: string }>;
  subagentNodes?: AnyNode[];
}

function ToolCallsList({ toolCalls, subagentNodes }: ToolCallsListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div>
      {toolCalls.map((tc, index) => {
        const isExpanded = expandedId === tc.id;
        const fullNode = subagentNodes?.find(n => n.id === tc.id && n.type === 'tool');

        return (
          <div key={tc.id} style={{ marginBottom: '4px' }}>
            <div
              onClick={() => setExpandedId(isExpanded ? null : tc.id)}
              style={{
                padding: '8px 10px',
                backgroundColor: '#1e293b',
                borderRadius: isExpanded ? '4px 4px 0 0' : '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '10px', color: '#888' }}>
                {isExpanded ? '\u25BC' : '\u25B6'}
              </span>
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#93c5fd', minWidth: '24px' }}>
                #{index + 1}
              </span>
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#fff' }}>
                {tc.toolName}
              </span>
              <span style={{
                fontSize: '11px', color: '#6b7280', fontFamily: 'monospace',
                flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {tc.inputSummary}
              </span>
            </div>
            {isExpanded && fullNode && fullNode.type === 'tool' && (
              <div style={{
                backgroundColor: '#0f1729',
                padding: '12px',
                borderRadius: '0 0 4px 4px',
                borderTop: '1px solid #1e293b',
              }}>
                <ToolDetailFormatter toolNode={fullNode as ToolNodeType} />
              </div>
            )}
            {isExpanded && !fullNode && (
              <div style={{
                backgroundColor: '#0f1729', padding: '12px', borderRadius: '0 0 4px 4px',
                fontSize: '12px', color: '#6b7280'
              }}>
                {tc.inputSummary}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface ToolGroupCallsListProps {
  tools: ToolNodeType[];
}

function ToolGroupCallsList({ tools }: ToolGroupCallsListProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <div>
      {tools.map((tool, index) => {
        const isExpanded = expandedIndex === index;
        // Generate preview text
        let preview = '';
        if (tool.toolName === 'Bash' && tool.input.command) {
          const cmd = String(tool.input.command);
          preview = cmd.length > 50 ? cmd.substring(0, 50) + '...' : cmd;
        } else if ((tool.toolName === 'Read' || tool.toolName === 'Write') && tool.input.file_path) {
          const path = String(tool.input.file_path);
          preview = path.length > 50 ? '...' + path.substring(path.length - 47) : path;
        } else if ((tool.toolName === 'Grep' || tool.toolName === 'Glob') && tool.input.pattern) {
          preview = String(tool.input.pattern).substring(0, 50);
        }

        return (
          <div key={tool.id} style={{ marginBottom: '4px' }}>
            <div
              onClick={() => setExpandedIndex(isExpanded ? null : index)}
              style={{
                padding: '8px 10px',
                backgroundColor: '#1e293b',
                borderRadius: isExpanded ? '4px 4px 0 0' : '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '10px', color: '#888' }}>
                {isExpanded ? '\u25BC' : '\u25B6'}
              </span>
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#93c5fd', minWidth: '24px' }}>
                #{index + 1}
              </span>
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#fff' }}>
                {tool.toolName}
              </span>
              {preview && (
                <span style={{
                  fontSize: '11px', color: '#6b7280', fontFamily: 'monospace',
                  flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {preview}
                </span>
              )}
              <span style={{ fontSize: '11px', color: '#6b7280' }}>
                {new Date(tool.timestamp).toLocaleTimeString()}
              </span>
            </div>
            {isExpanded && (
              <div style={{
                backgroundColor: '#0f1729', padding: '12px', borderRadius: '0 0 4px 4px',
                borderTop: '1px solid #1e293b'
              }}>
                <ToolDetailFormatter toolNode={tool} />
              </div>
            )}
          </div>
        );
      })}
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
        return node.agentName || `Subagent: ${node.agentType}`;
      case 'tool':
        return `Tool: ${node.toolName}`;
      case 'tool-group':
        return `${node.toolName} (${node.count})`;
      case 'user-prompt':
        return node.isCommand ? `Command: ${node.commandName || 'unknown'}` : 'User Prompt';
      case 'clear-marker':
        return `/clear #${node.clearIndex + 1}`;
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
  console.log('NodeDetail render:', node);
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
  const getBadgeColors = () => {
    if ('state' in node && node.state in STATUS_COLORS) {
      return STATUS_COLORS[node.state];
    }
    return STATUS_COLORS.active;
  };
  const badgeColors = getBadgeColors();

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleRow}>
          <span style={styles.typeIcon}>{icon}</span>
          <span style={styles.title}>{title}</span>
          {'state' in node && (
            <span
              style={{
                ...styles.stateBadge,
                backgroundColor: badgeColors.bg,
                color: badgeColors.text,
              }}
            >
              {node.state}
            </span>
          )}
        </div>
        <div style={styles.metaRow}>
          Type: {nodeType}
          {' | '}
          ID: {'id' in node ? node.id : 'N/A'}
          {'state' in node ? ` | State: ${node.state}` : ''}
        </div>
      </div>

      {/* Node-specific content */}
      {renderNodeContent(node)}
    </div>
  );
}

function renderGroupedModelOutputContent(data: { nodeData: any[]; count: number }): React.ReactNode {
  return (
    <>
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Model Outputs ({data.count})</div>
        {data.nodeData.map((msg: any, i: number) => (
          <ModelOutputEntry key={i} msg={msg} index={i} />
        ))}
      </div>
    </>
  );
}

function ModelOutputEntry({ msg, index }: { msg: any; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const content = msg.content || '(empty)';
  const preview = content.length > 120 ? content.slice(0, 120) + '...' : content;

  return (
    <div
      style={{
        marginBottom: '8px',
        background: '#1a1a2e',
        borderRadius: '6px',
        border: '1px solid #333',
        overflow: 'hidden',
      }}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '8px 12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          color: '#c4b5fd',
        }}
      >
        <span style={{ fontSize: '10px' }}>{expanded ? '\u25BC' : '\u25B6'}</span>
        <span style={{ fontWeight: 600 }}>Response {index + 1}</span>
        {msg.timestamp && (
          <span style={{ marginLeft: 'auto', color: '#666', fontSize: '11px' }}>
            {new Date(msg.timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>
      {expanded ? (
        <div style={{ padding: '8px 12px', borderTop: '1px solid #333', color: '#ccc', fontSize: '12px', whiteSpace: 'pre-wrap', maxHeight: '400px', overflowY: 'auto' }}>
          {content}
        </div>
      ) : (
        <div style={{ padding: '4px 12px 8px', color: '#888', fontSize: '11px' }}>
          {preview}
        </div>
      )}
    </div>
  );
}

function renderNodeContent(node: TreeNodeData): React.ReactNode {
  // Check for grouped model output data (has nodeData array + count, no type)
  if ('nodeData' in (node as any) && 'count' in (node as any) && Array.isArray((node as any).nodeData)) {
    return renderGroupedModelOutputContent(node as any);
  }

  // Check if it's a Session (has sessionId but no 'type')
  if (!('type' in node) && 'sessionId' in node) {
    return renderSessionContent(node);
  }

  // Fallback for unknown non-typed objects
  if (!('type' in node)) {
    return <p style={{ color: '#888' }}>Unknown node data</p>;
  }

  // Handle different node types
  if ('type' in node) {
    const nodeType = node.type;
    switch (nodeType) {
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
      case 'tool-group':
        return renderToolGroupContent(node);
      case 'directory':
        return renderDirectoryContent(node);
      case 'user-prompt':
        return renderUserPromptContent(node);
      case 'clear-marker':
        return renderClearMarkerContent(node);
      default:
        return <p style={{ color: '#888' }}>Unknown node type</p>;
    }
  } else if ('sessionId' in node) {
    // It's a Session
    return renderSessionContent(node);
  } else {
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

interface ModelOutputGroupListProps {
  messages: Array<AnyNode & { type: 'message'; role: 'assistant' }>;
}

function ModelOutputGroupList({ messages }: ModelOutputGroupListProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <div>
      {messages.map((msg, index) => {
        const isExpanded = expandedIndex === index;
        const preview = msg.content ? (msg.content.length > 100 ? msg.content.slice(0, 100) + '...' : msg.content) : '(empty)';

        return (
          <div key={msg.id} style={{ marginBottom: '4px' }}>
            <div
              onClick={() => setExpandedIndex(isExpanded ? null : index)}
              style={{
                padding: '8px 10px',
                backgroundColor: '#1e293b',
                borderRadius: isExpanded ? '4px 4px 0 0' : '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '10px', color: '#888' }}>
                {isExpanded ? '\u25BC' : '\u25B6'}
              </span>
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#93c5fd', minWidth: '24px' }}>
                #{index + 1}
              </span>
              <span style={{
                fontSize: '11px', color: '#9ca3af', fontFamily: 'monospace',
                flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {preview}
              </span>
              <span style={{ fontSize: '11px', color: '#6b7280' }}>
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
            {isExpanded && (
              <div style={{
                backgroundColor: '#0f1729', padding: '12px', borderRadius: '0 0 4px 4px',
                borderTop: '1px solid #1e293b'
              }}>
                <div style={{
                  fontSize: '13px',
                  lineHeight: 1.5,
                  color: '#eee',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {msg.content || '(empty)'}
                </div>
                {msg.toolUses && msg.toolUses.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px' }}>
                      Tool Uses ({msg.toolUses.length})
                    </div>
                    {msg.toolUses.map((toolUse) => (
                      <div key={toolUse.id} style={{ marginBottom: '8px' }}>
                        <CollapsibleJson
                          title={`${toolUse.name} (${toolUse.id.slice(0, 8)}...)`}
                          data={toolUse.input}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function renderMessageContent(node: AnyNode & { type: 'message' } | { nodeData: AnyNode[] }): React.ReactNode {
  // Check if this is a grouped model output (array of messages)
  if ('nodeData' in node && Array.isArray(node.nodeData)) {
    const messages = node.nodeData.filter(
      (n): n is AnyNode & { type: 'message'; role: 'assistant' } =>
        n.type === 'message' && n.role === 'assistant'
    );

    if (messages.length > 0) {
      return (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Model Outputs ({messages.length})</div>
          <ModelOutputGroupList messages={messages} />
        </div>
      );
    }
  }

  // Single message node
  const messageNode = 'nodeData' in node ? null : node;
  if (!messageNode) return null;

  return (
    <>
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Message Content</div>
        <div style={styles.content}>{messageNode.content || '(empty message)'}</div>
      </div>

      {messageNode.toolUses && messageNode.toolUses.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            Tool Uses ({messageNode.toolUses.length})
          </div>
          {messageNode.toolUses.map((toolUse, index) => (
            <div key={toolUse.id} style={{ marginBottom: index < messageNode.toolUses!.length - 1 ? '12px' : 0 }}>
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
          <span style={styles.infoValue}>{messageNode.role}</span>

          <span style={styles.infoLabel}>Node ID:</span>
          <span style={styles.infoValue}>{messageNode.id}</span>

          <span style={styles.infoLabel}>Timestamp:</span>
          <span style={styles.infoValue}>
            {new Date(messageNode.timestamp).toLocaleString()}
          </span>
        </div>
      </div>

      {(messageNode as any).hooks && (messageNode as any).hooks.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Hooks ({(messageNode as any).hooks.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(messageNode as any).hooks.sort((a: any, b: any) => a.timestamp - b.timestamp).map((hook: any, index: number) => (
              <div key={index} style={{ padding: '10px', backgroundColor: '#16213e', borderRadius: '6px' }}>
                <div style={styles.infoGrid}>
                  <span style={styles.infoLabel}>Event:</span>
                  <span style={styles.infoValue}>{hook.event}</span>

                  <span style={styles.infoLabel}>Hook Name:</span>
                  <span style={styles.infoValue}>{hook.hookName}</span>

                  <span style={styles.infoLabel}>Command:</span>
                  <span style={{ ...styles.infoValue, fontFamily: 'monospace', fontSize: '11px', fontStyle: hook.command === 'callback' ? 'italic' : 'normal' }}>
                    {hook.command}
                  </span>

                  <span style={styles.infoLabel}>Time:</span>
                  <span style={styles.infoValue}>{new Date(hook.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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

      {node.hooks && node.hooks.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Hooks ({node.hooks.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {node.hooks.sort((a, b) => a.timestamp - b.timestamp).map((hook, index) => (
              <div key={index} style={{ padding: '10px', backgroundColor: '#16213e', borderRadius: '6px' }}>
                <div style={styles.infoGrid}>
                  <span style={styles.infoLabel}>Event:</span>
                  <span style={styles.infoValue}>{hook.event}</span>

                  <span style={styles.infoLabel}>Hook Name:</span>
                  <span style={styles.infoValue}>{hook.hookName}</span>

                  <span style={styles.infoLabel}>Command:</span>
                  <span style={{ ...styles.infoValue, fontFamily: 'monospace', fontSize: '11px', fontStyle: hook.command === 'callback' ? 'italic' : 'normal' }}>
                    {hook.command}
                  </span>

                  <span style={styles.infoLabel}>Time:</span>
                  <span style={styles.infoValue}>{new Date(hook.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function ExpandableSection({ title, content }: { title: string; content: string }) {
  const [expanded, setExpanded] = React.useState(false);
  return (
    <div style={styles.section}>
      <div style={{ ...styles.sectionTitle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{title}</span>
        <span
          onClick={() => setExpanded(!expanded)}
          style={{ cursor: 'pointer', fontSize: '11px', color: '#e94560', fontWeight: 400, textTransform: 'none' as const }}
        >
          {expanded ? 'Show less' : 'Show all'}
        </span>
      </div>
      <div style={{
        ...styles.content,
        maxHeight: expanded ? 'none' : '500px',
        fontSize: '14px',
      }}>{content}</div>
    </div>
  );
}

function renderSubagentContent(node: AnyNode & { type: 'subagent' }): React.ReactNode {
  return (
    <>
      {node.prompt && (
        <ExpandableSection title="Request" content={node.prompt} />
      )}

      {(node as any).summary && (
        <ExpandableSection title="Response" content={(node as any).summary} />
      )}

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Agent Info</div>
        <div style={styles.infoGrid}>
          <span style={styles.infoLabel}>Agent Type:</span>
          <span style={styles.infoValue}>{node.agentType}</span>

          {node.agentName && (
            <>
              <span style={styles.infoLabel}>Agent Name:</span>
              <span style={styles.infoValue}>{node.agentName}</span>
            </>
          )}

          {node.model && (
            <>
              <span style={styles.infoLabel}>Model:</span>
              <span style={styles.infoValue}>{node.model}</span>
            </>
          )}

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

      {node.sourceFilePath && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Source File</div>
          <div style={styles.content}>{node.sourceFilePath}</div>
        </div>
      )}

      {node.hooks && node.hooks.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Hooks ({node.hooks.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {node.hooks.sort((a, b) => a.timestamp - b.timestamp).map((hook, index) => (
              <div key={index} style={{ padding: '10px', backgroundColor: '#16213e', borderRadius: '6px' }}>
                <div style={styles.infoGrid}>
                  <span style={styles.infoLabel}>Event:</span>
                  <span style={styles.infoValue}>{hook.event}</span>

                  <span style={styles.infoLabel}>Hook Name:</span>
                  <span style={styles.infoValue}>{hook.hookName}</span>

                  <span style={styles.infoLabel}>Command:</span>
                  <span style={{ ...styles.infoValue, fontFamily: 'monospace', fontSize: '11px', fontStyle: hook.command === 'callback' ? 'italic' : 'normal' }}>
                    {hook.command}
                  </span>

                  <span style={styles.infoLabel}>Time:</span>
                  <span style={styles.infoValue}>{new Date(hook.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
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
          <pre style={styles.jsonContent}>{formatJsonOutput(node.output)}</pre>
        </div>
      )}

      {node.hooks && node.hooks.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Hooks ({node.hooks.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {node.hooks.sort((a, b) => a.timestamp - b.timestamp).map((hook, index) => (
              <div key={index} style={{ padding: '10px', backgroundColor: '#16213e', borderRadius: '6px' }}>
                <div style={styles.infoGrid}>
                  <span style={styles.infoLabel}>Event:</span>
                  <span style={styles.infoValue}>{hook.event}</span>

                  <span style={styles.infoLabel}>Hook Name:</span>
                  <span style={styles.infoValue}>{hook.hookName}</span>

                  <span style={styles.infoLabel}>Command:</span>
                  <span style={{ ...styles.infoValue, fontFamily: 'monospace', fontSize: '11px', fontStyle: hook.command === 'callback' ? 'italic' : 'normal' }}>
                    {hook.command}
                  </span>

                  <span style={styles.infoLabel}>Time:</span>
                  <span style={styles.infoValue}>{new Date(hook.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function renderToolGroupContent(node: ToolGroup): React.ReactNode {
  return (
    <>
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Tool Group Info</div>
        <div style={styles.infoGrid}>
          <span style={styles.infoLabel}>Tool Name:</span>
          <span style={styles.infoValue}>{node.toolName}</span>

          <span style={styles.infoLabel}>Count:</span>
          <span style={styles.infoValue}>{node.count}</span>

          <span style={styles.infoLabel}>Group ID:</span>
          <span style={styles.infoValue}>{node.id}</span>

          <span style={styles.infoLabel}>State:</span>
          <span style={styles.infoValue}>{node.state}</span>

          <span style={styles.infoLabel}>Timestamp:</span>
          <span style={styles.infoValue}>
            {new Date(node.timestamp).toLocaleString()}
          </span>
        </div>
      </div>

      {node.count > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Tool Calls ({node.count})</div>
          <ToolGroupCallsList tools={node.nodes} />
        </div>
      )}
    </>
  );
}

function renderDirectoryContent(node: any): React.ReactNode {
  return (
    <>
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Directory Info</div>
        <div style={styles.infoGrid}>
          <span style={styles.infoLabel}>Directory:</span>
          <span style={styles.infoValue}>{node.label}</span>

          <span style={styles.infoLabel}>Working Directory:</span>
          <span style={styles.infoValue}>{node.cwd}</span>

          <span style={styles.infoLabel}>Session Count:</span>
          <span style={styles.infoValue}>{node.sessionCount}</span>
        </div>
      </div>
    </>
  );
}

function renderUserPromptContent(node: AnyNode & { type: 'user-prompt' }): React.ReactNode {
  return (
    <>
      <div style={styles.section}>
        <div style={styles.sectionTitle}>User Prompt</div>
        <div style={styles.content}>{node.promptText}</div>
      </div>

      {node.isCommand && node.commandName && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Command</div>
          <div style={styles.infoGrid}>
            <span style={styles.infoLabel}>Command:</span>
            <span style={styles.infoValue}>{node.commandName}</span>
          </div>
        </div>
      )}

      {node.commandMetadata && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Command Metadata (XML)</div>
          <pre style={{
            ...styles.jsonContent,
            borderRadius: '6px',
            fontSize: '11px',
          }}>{node.commandMetadata}</pre>
        </div>
      )}

      {node.hooks && node.hooks.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Hooks ({node.hooks.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {node.hooks.sort((a, b) => a.timestamp - b.timestamp).map((hook, index) => (
              <div key={index} style={{ padding: '10px', backgroundColor: '#16213e', borderRadius: '6px' }}>
                <div style={styles.infoGrid}>
                  <span style={styles.infoLabel}>Event:</span>
                  <span style={styles.infoValue}>{hook.event}</span>

                  <span style={styles.infoLabel}>Hook Name:</span>
                  <span style={styles.infoValue}>{hook.hookName}</span>

                  <span style={styles.infoLabel}>Command:</span>
                  <span style={{ ...styles.infoValue, fontFamily: 'monospace', fontSize: '11px', fontStyle: hook.command === 'callback' ? 'italic' : 'normal' }}>
                    {hook.command}
                  </span>

                  <span style={styles.infoLabel}>Time:</span>
                  <span style={styles.infoValue}>{new Date(hook.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Metadata</div>
        <div style={styles.infoGrid}>
          <span style={styles.infoLabel}>Node ID:</span>
          <span style={styles.infoValue}>{node.id}</span>
          <span style={styles.infoLabel}>Timestamp:</span>
          <span style={styles.infoValue}>{new Date(node.timestamp).toLocaleString()}</span>
        </div>
      </div>
    </>
  );
}

function renderClearMarkerContent(node: AnyNode & { type: 'clear-marker' }): React.ReactNode {
  return (
    <>
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Context Reset</div>
        <div style={styles.content}>
          This /clear command reset the conversation context.
          All messages before this point were cleared from Claude's context window.
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Metadata</div>
        <div style={styles.infoGrid}>
          <span style={styles.infoLabel}>Clear Index:</span>
          <span style={styles.infoValue}>#{node.clearIndex + 1}</span>
          <span style={styles.infoLabel}>Node ID:</span>
          <span style={styles.infoValue}>{node.id}</span>
          <span style={styles.infoLabel}>Timestamp:</span>
          <span style={styles.infoValue}>{new Date(node.timestamp).toLocaleString()}</span>
        </div>
      </div>
    </>
  );
}
