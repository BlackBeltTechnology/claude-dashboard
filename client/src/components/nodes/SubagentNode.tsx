import React, { memo, useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { SessionState } from 'shared';
import type { ToolCallSummary } from '../../utils/graphLayout';

export interface SubagentNodeData {
  label: string;
  state: SessionState;
  agentType: string;
  description?: string;
  agentId?: string;
  agentName?: string;
  agentColor?: string;
  prompt?: string;            // request text
  summary?: string;           // response text
  model?: string;
  toolCalls?: ToolCallSummary[];
  toolCallCount?: number;
  isExpanded?: boolean;       // whether tool call list is shown
  onToolCallClick?: (toolCallId: string) => void;
  hooks?: Array<{ event: string; hookName: string; command: string; timestamp: number }>;
  [key: string]: unknown;
}

export type SubagentNodeType = Node<SubagentNodeData, 'subagent'>;

const DEFAULT_STATUS_COLORS = { bg: '#374151', border: '#6b7280', dot: '#9ca3af' };
const STATUS_COLORS: Record<SessionState, { bg: string; border: string; dot: string }> = {
  active: { bg: '#052e16', border: '#16a34a', dot: '#22c55e' },
  waiting: { bg: '#422006', border: '#ca8a04', dot: '#fbbf24' },
  idle: { bg: '#1f2937', border: '#4b5563', dot: '#9ca3af' },
  completed: { bg: '#1e3a5f', border: '#2563eb', dot: '#3b82f6' },
};

// Tool icons (copied from ToolNode.tsx)
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

const styles = {
  nodeStart: {
    padding: '10px 14px',
    borderRadius: '8px',
    minWidth: '200px',
    maxWidth: '220px',
    boxShadow: '0 3px 10px rgba(0, 0, 0, 0.25)',
    transition: 'box-shadow 0.2s, transform 0.2s',
    borderLeft: '3px solid #8b5cf6',
  },
  nodeStop: {
    padding: '8px 12px',
    borderRadius: '6px',
    minWidth: '140px',
    maxWidth: '160px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
    transition: 'box-shadow 0.2s, transform 0.2s',
    borderLeft: '3px solid #3b82f6',
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
    width: '16px',
    height: '16px',
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
    fontSize: '12px',
    fontWeight: 500,
    color: '#fff',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  sectionLabel: {
    fontSize: '9px',
    color: '#6b7280',
    marginTop: '6px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  promptPreview: {
    fontSize: '10px',
    color: '#9ca3af',
    marginTop: '2px',
    fontStyle: 'italic',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  summaryPreview: {
    fontSize: '10px',
    color: '#9ca3af',
    marginTop: '2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  toolCallsHeader: {
    fontSize: '10px',
    color: '#d1d5db',
    marginTop: '6px',
    paddingTop: '6px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
    userSelect: 'none' as const,
  },
  toolCallsList: {
    marginTop: '4px',
    maxHeight: '200px',
    overflowY: 'auto' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  toolCallRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '3px 4px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '3px',
    minHeight: '24px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  toolCallRowHover: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  toolName: {
    fontSize: '9px',
    fontWeight: 500,
    color: '#fff',
    minWidth: '40px',
  },
  toolInput: {
    fontSize: '9px',
    color: '#9ca3af',
    fontFamily: 'monospace',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  handle: {
    width: '6px',
    height: '6px',
    background: '#8b5cf6',
    border: '2px solid #1a1a2e',
  },
  hookBadge: {
    fontSize: '9px',
    backgroundColor: '#374151',
    color: '#9ca3af',
    padding: '1px 4px',
    borderRadius: '3px',
    marginLeft: '4px',
  },
};

function SubagentNodeComponent({ data, selected }: NodeProps<SubagentNodeType>) {
  const colors = STATUS_COLORS[data.state] ?? DEFAULT_STATUS_COLORS;
  const [showTools, setShowTools] = useState(false);
  const [hoveredToolId, setHoveredToolId] = useState<string | null>(null);
  const toolCount = data.toolCallCount || 0;

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        style={styles.handle}
      />
      <div
        style={{
          ...styles.nodeStart,
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

          {/* Agent color circle - 12px for named agents */}
          {(data.agentType && data.agentType !== 'Task') ? (
            <div
              style={{
                backgroundColor: data.agentColor || '#6b7280',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                flexShrink: 0,
                border: '1px solid rgba(255, 255, 255, 0.3)',
              }}
              title="Agent Color"
            />
          ) : (
            /* Grey fallback for task agents */
            <div
              style={{
                backgroundColor: '#6b7280',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                flexShrink: 0,
                border: '1px solid rgba(255, 255, 255, 0.3)',
              }}
              title="Task Agent"
            />
          )}

          <span style={styles.title}>
            {(data.agentType && data.agentType !== 'Task') ? data.agentType : (data.agentName || data.agentId || data.label)}
          </span>

          {data.hooks && data.hooks.length > 0 && (
            <span style={styles.hookBadge}>🪝 {data.hooks.length}</span>
          )}

          <div
            style={{
              ...styles.statusDot,
              backgroundColor: colors.dot,
            }}
            title={data.state}
          />
        </div>

        <div style={styles.sectionLabel}>Request</div>
        <div style={styles.promptPreview} title={data.prompt || '(no request)'}>
          {data.prompt ? (
            <>
              {data.prompt.slice(0, 120)}{data.prompt.length > 120 ? '...' : ''}
            </>
          ) : (
            <span style={{ color: '#6b7280' }}>(no request)</span>
          )}
        </div>

        <div style={styles.sectionLabel}>Response</div>
        <div style={styles.summaryPreview} title={data.summary || '(pending...)'}>
          {data.summary ? (
            <>
              {data.summary.slice(0, 120)}{data.summary.length > 120 ? '...' : ''}
            </>
          ) : (
            <span style={{ color: '#6b7280' }}>(pending...)</span>
          )}
        </div>

        {toolCount > 0 && (
          <>
            <div
              style={styles.toolCallsHeader}
              onClick={(e) => {
                e.stopPropagation();
                setShowTools(!showTools);
              }}
            >
              <span>{showTools ? '▼' : '▶'}</span>
              <span>Tool Calls ({toolCount})</span>
            </div>

            {showTools && data.toolCalls && (
              <div style={styles.toolCallsList}>
                {data.toolCalls.map((tool) => {
                  const icon = TOOL_ICONS[tool.toolName] || DEFAULT_ICON;
                  const isHovered = hoveredToolId === tool.id;
                  return (
                    <div
                      key={tool.id}
                      style={{
                        ...styles.toolCallRow,
                        ...(isHovered ? styles.toolCallRowHover : {}),
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        data.onToolCallClick?.(tool.id);
                      }}
                      onMouseEnter={() => setHoveredToolId(tool.id)}
                      onMouseLeave={() => setHoveredToolId(null)}
                    >
                      <div style={{ ...styles.icon, width: '12px', height: '12px' }}>
                        {icon}
                      </div>
                      <span style={styles.toolName}>{tool.toolName}</span>
                      <span style={styles.toolInput} title={tool.inputSummary}>
                        {tool.inputSummary}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={styles.handle}
      />
    </>
  );
}

export const SubagentNode = memo(SubagentNodeComponent);
