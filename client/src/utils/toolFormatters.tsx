import React, { useState } from 'react';
import type { ToolNode, SkillNode, SubagentNode } from 'shared';

interface ToolDetailFormatterProps {
  toolNode: ToolNode;
}

const styles = {
  section: {
    marginBottom: '16px',
  },
  sectionLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#93c5fd',
    marginBottom: '8px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  codeBlock: {
    backgroundColor: '#0f1729',
    color: '#e2e8f0',
    fontFamily: 'monospace',
    fontSize: '12px',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
    maxHeight: '300px',
    overflowY: 'auto' as const,
    border: '1px solid #1e293b',
    borderRadius: '6px',
    padding: '12px',
  },
  outputBlock: {
    backgroundColor: '#0a0e1a',
    color: '#94a3b8',
    fontFamily: 'monospace',
    fontSize: '11px',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
    maxHeight: '300px',
    overflowY: 'auto' as const,
    border: '1px solid #1e293b',
    borderRadius: '6px',
    padding: '12px',
  },
  filePath: {
    color: '#fbbf24',
    backgroundColor: '#1a1a2e',
    padding: '6px 10px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '13px',
    wordBreak: 'break-all' as const,
    display: 'inline-block',
  },
  metaText: {
    fontSize: '12px',
    color: '#888',
    marginTop: '4px',
  },
  description: {
    fontSize: '12px',
    color: '#9ca3af',
    fontStyle: 'italic' as const,
    marginBottom: '8px',
  },
  inlineCode: {
    color: '#a78bfa',
    backgroundColor: '#1e1b2e',
    padding: '4px 8px',
    borderRadius: '3px',
    fontFamily: 'monospace',
    fontSize: '12px',
    display: 'inline-block',
  },
  label: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#cbd5e1',
    marginTop: '8px',
    marginBottom: '4px',
  },
  diffContainer: {
    position: 'relative' as const,
    marginTop: '8px',
  },
  diffToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    border: 'none',
    borderRadius: '6px 6px 0 0',
    fontSize: '13px',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left' as const,
  },
  diffToggleIcon: {
    fontSize: '10px',
    color: '#888',
  },
  diffContent: {
    borderRadius: '0 0 6px 6px',
    padding: '12px',
    fontSize: '12px',
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-all' as const,
    maxHeight: '400px',
    overflowY: 'auto' as const,
  },
  oldDiff: {
    backgroundColor: '#2a1515',
    border: '1px solid #7f1d1d',
    borderTop: 'none',
  },
  oldDiffToggle: {
    backgroundColor: '#7f1d1d',
    color: '#fca5a5',
  },
  oldDiffContent: {
    backgroundColor: '#1f1212',
    color: '#fca5a5',
  },
  newDiff: {
    backgroundColor: '#152a1a',
    border: '1px solid #14532d',
    borderTop: 'none',
  },
  newDiffToggle: {
    backgroundColor: '#14532d',
    color: '#86efac',
  },
  newDiffContent: {
    backgroundColor: '#121f15',
    color: '#86efac',
  },
};

function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '\n\n... (truncated)';
}

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

function renderBashInput(input: Record<string, unknown>) {
  const command = input.command as string | undefined;
  const description = input.description as string | undefined;

  return (
    <>
      {description && (
        <div style={styles.description}>
          {description}
        </div>
      )}
      <div style={styles.codeBlock}>
        {command || '(no command)'}
      </div>
    </>
  );
}

function renderReadInput(input: Record<string, unknown>) {
  const filePath = input.file_path as string | undefined;
  const offset = input.offset as number | undefined;
  const limit = input.limit as number | undefined;

  return (
    <>
      <div style={styles.filePath}>
        {filePath || '(no file path)'}
      </div>
      {offset !== undefined && (
        <div style={styles.metaText}>
          Lines {offset} - {offset + (limit || 2000)}
        </div>
      )}
    </>
  );
}

function renderWriteInput(input: Record<string, unknown>) {
  const filePath = input.file_path as string | undefined;
  const content = input.content as string | undefined;

  return (
    <>
      <div style={styles.filePath}>
        {filePath || '(no file path)'}
      </div>
      {content !== undefined && (
        <>
          <div style={styles.metaText}>
            {content.length} characters
          </div>
          <div style={{ ...styles.codeBlock, marginTop: '8px' }}>
            {truncateString(content, 500)}
          </div>
        </>
      )}
    </>
  );
}

function renderGrepInput(input: Record<string, unknown>) {
  const pattern = input.pattern as string | undefined;
  const path = input.path as string | undefined;

  return (
    <>
      <div style={styles.label}>Pattern</div>
      <div style={styles.inlineCode}>
        {pattern || '(no pattern)'}
      </div>
      {path && (
        <>
          <div style={styles.label}>Path</div>
          <div style={styles.filePath}>
            {path}
          </div>
        </>
      )}
    </>
  );
}

function renderGlobInput(input: Record<string, unknown>) {
  // Same as Grep
  return renderGrepInput(input);
}

function renderEditInput(input: Record<string, unknown>) {
  const filePath = input.file_path as string | undefined;
  const oldString = input.old_string as string | undefined;
  const newString = input.new_string as string | undefined;

  return (
    <>
      <div style={styles.filePath}>
        {filePath || '(no file path)'}
      </div>
      {(oldString || newString) ? (
        <div style={{ marginTop: '12px' }}>
          {oldString !== undefined && (
            <CollapsibleDiff
              title="Old Text"
              content={oldString}
              variant="old"
            />
          )}
          {newString !== undefined && (
            <CollapsibleDiff
              title="New Text"
              content={newString}
              variant="new"
            />
          )}
        </div>
      ) : (
        <div style={{ ...styles.codeBlock, marginTop: '8px' }}>
          {JSON.stringify(input, null, 2)}
        </div>
      )}
    </>
  );
}

interface CollapsibleDiffProps {
  title: string;
  content: string;
  variant: 'old' | 'new';
}

function CollapsibleDiff({ title, content, variant }: CollapsibleDiffProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const truncatedContent = truncateString(content, 500);
  const isTruncated = content.length > 500;

  const toggleStyle = variant === 'old' ? styles.oldDiffToggle : styles.newDiffToggle;
  const contentStyle = variant === 'old' ? styles.oldDiffContent : styles.newDiffContent;
  const containerStyle = variant === 'old' ? styles.oldDiff : styles.newDiff;

  return (
    <div style={{ ...styles.diffContainer, ...containerStyle }}>
      <button
        style={{ ...styles.diffToggle, ...toggleStyle }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span style={styles.diffToggleIcon}>
          {isExpanded ? '\u25BC' : '\u25B6'}
        </span>
        {title}{isTruncated && !isExpanded && ` (${content.length} chars)`}
      </button>
      {isExpanded && (
        <pre style={{ ...styles.diffContent, ...contentStyle }}>
          {truncatedContent}
        </pre>
      )}
    </div>
  );
}

function renderAskUserQuestionInput(input: Record<string, unknown>) {
  const questions = input.questions as Array<{
    question?: string;
    header?: string;
    options?: Array<{ label?: string; description?: string }>;
    multiSelect?: boolean;
  }> | undefined;

  if (!questions || !Array.isArray(questions)) {
    return renderDefaultInput(input);
  }

  return (
    <>
      {questions.map((q, qi) => (
        <div key={qi} style={{ marginBottom: qi < questions.length - 1 ? '16px' : 0 }}>
          {q.header && (
            <div style={{ ...styles.label, color: '#fbbf24', fontSize: '13px' }}>
              {q.header}
            </div>
          )}
          {q.question && (
            <div style={{ fontSize: '13px', color: '#e2e8f0', marginBottom: '8px' }}>
              {q.question}
            </div>
          )}
          {q.options && q.options.length > 0 && (
            <div style={{ paddingLeft: '8px' }}>
              {q.options.map((opt, oi) => (
                <div key={oi} style={{
                  padding: '6px 10px',
                  marginBottom: '4px',
                  backgroundColor: '#1e293b',
                  borderRadius: '4px',
                  borderLeft: '3px solid #3b82f6',
                }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#93c5fd' }}>
                    {opt.label}
                  </div>
                  {opt.description && (
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                      {opt.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {q.multiSelect && (
            <div style={{ ...styles.metaText, color: '#a78bfa' }}>Multi-select enabled</div>
          )}
        </div>
      ))}
    </>
  );
}

function renderWebFetchInput(input: Record<string, unknown>) {
  const url = input.url as string | undefined;
  const prompt = input.prompt as string | undefined;

  return (
    <>
      <div style={styles.label}>URL</div>
      <div style={styles.filePath}>
        {url || '(no URL)'}
      </div>
      {prompt && (
        <>
          <div style={styles.label}>Prompt</div>
          <div style={styles.description}>
            {prompt}
          </div>
        </>
      )}
    </>
  );
}

function renderWebSearchInput(input: Record<string, unknown>) {
  const query = input.query as string | undefined;
  const allowedDomains = input.allowed_domains as string[] | undefined;
  const blockedDomains = input.blocked_domains as string[] | undefined;

  return (
    <>
      <div style={styles.label}>Query</div>
      <div style={styles.inlineCode}>
        {query || '(no query)'}
      </div>
      {allowedDomains && allowedDomains.length > 0 && (
        <>
          <div style={styles.label}>Allowed Domains</div>
          <div style={styles.metaText}>
            {allowedDomains.join(', ')}
          </div>
        </>
      )}
      {blockedDomains && blockedDomains.length > 0 && (
        <>
          <div style={styles.label}>Blocked Domains</div>
          <div style={styles.metaText}>
            {blockedDomains.join(', ')}
          </div>
        </>
      )}
    </>
  );
}

function renderTaskCreateInput(input: Record<string, unknown>) {
  const subject = input.subject as string | undefined;
  const description = input.description as string | undefined;

  return (
    <>
      <div style={styles.label}>Subject</div>
      <div style={styles.inlineCode}>
        {subject || '(no subject)'}
      </div>
      {description && (
        <>
          <div style={styles.label}>Description</div>
          <div style={styles.codeBlock}>
            {truncateString(description, 500)}
          </div>
        </>
      )}
    </>
  );
}

function renderTaskUpdateInput(input: Record<string, unknown>) {
  const taskId = input.taskId as string | undefined;
  const status = input.status as string | undefined;
  const subject = input.subject as string | undefined;
  const description = input.description as string | undefined;

  const statusColor = status === 'completed' ? '#10b981' : status === 'cancelled' ? '#ef4444' : '#a78bfa';

  return (
    <>
      <div style={styles.label}>Task ID</div>
      <div style={styles.inlineCode}>
        {taskId || '(no task ID)'}
      </div>
      {status && (
        <>
          <div style={styles.label}>Status</div>
          <div style={{ ...styles.inlineCode, color: statusColor }}>
            {status}
          </div>
        </>
      )}
      {subject && (
        <>
          <div style={styles.label}>Subject</div>
          <div style={styles.inlineCode}>
            {subject}
          </div>
        </>
      )}
      {description && (
        <>
          <div style={styles.label}>Description</div>
          <div style={styles.codeBlock}>
            {truncateString(description, 500)}
          </div>
        </>
      )}
    </>
  );
}

function renderTaskGetInput(input: Record<string, unknown>) {
  const taskId = input.taskId as string | undefined;

  return (
    <>
      <div style={styles.label}>Task ID</div>
      <div style={styles.inlineCode}>
        {taskId || '(no task ID)'}
      </div>
    </>
  );
}

function renderTaskListInput(_input: Record<string, unknown>) {
  return (
    <div style={styles.description}>
      List all tasks
    </div>
  );
}

function renderTaskOutputInput(input: Record<string, unknown>) {
  const taskId = input.task_id as string | undefined;
  const timeout = input.timeout as number | undefined;

  return (
    <>
      <div style={styles.label}>Task ID</div>
      <div style={styles.inlineCode}>
        {taskId || '(no task ID)'}
      </div>
      {timeout !== undefined && (
        <div style={styles.metaText}>
          Timeout: {timeout}ms
        </div>
      )}
    </>
  );
}

function renderTaskStopInput(input: Record<string, unknown>) {
  const taskId = input.task_id as string | undefined;

  return (
    <>
      <div style={styles.label}>Task ID</div>
      <div style={styles.inlineCode}>
        {taskId || '(no task ID)'}
      </div>
    </>
  );
}

function renderNotebookEditInput(input: Record<string, unknown>) {
  const notebookPath = input.notebook_path as string | undefined;
  const cellId = input.cell_id as string | undefined;
  const cellType = input.cell_type as string | undefined;
  const editMode = input.edit_mode as string | undefined;
  const newSource = input.new_source as string | undefined;

  return (
    <>
      <div style={styles.filePath}>
        {notebookPath || '(no notebook path)'}
      </div>
      {cellId && (
        <>
          <div style={styles.label}>Cell</div>
          <div style={styles.inlineCode}>
            {cellId}
          </div>
        </>
      )}
      {cellType && (
        <>
          <div style={styles.label}>Type</div>
          <div style={styles.inlineCode}>
            {cellType}
          </div>
        </>
      )}
      {editMode && (
        <>
          <div style={styles.label}>Mode</div>
          <div style={styles.inlineCode}>
            {editMode}
          </div>
        </>
      )}
      {newSource && (
        <>
          <div style={styles.label}>New Source</div>
          <div style={styles.codeBlock}>
            {truncateString(newSource, 500)}
          </div>
        </>
      )}
    </>
  );
}

function renderEnterPlanModeInput(_input: Record<string, unknown>) {
  return (
    <div style={styles.description}>
      Entering plan mode
    </div>
  );
}

function renderExitPlanModeInput(input: Record<string, unknown>) {
  const pushToRemote = input.pushToRemote as boolean | undefined;

  return (
    <>
      <div style={styles.description}>
        Exiting plan mode
      </div>
      {pushToRemote && (
        <div style={styles.metaText}>
          Push to remote: yes
        </div>
      )}
    </>
  );
}

function renderDefaultInput(input: Record<string, unknown>) {
  return (
    <div style={styles.codeBlock}>
      {JSON.stringify(input, null, 2)}
    </div>
  );
}

export function ToolDetailFormatter({ toolNode }: ToolDetailFormatterProps) {
  let inputContent: React.ReactNode;

  switch (toolNode.toolName) {
    case 'Bash':
      inputContent = renderBashInput(toolNode.input);
      break;
    case 'Read':
      inputContent = renderReadInput(toolNode.input);
      break;
    case 'Write':
      inputContent = renderWriteInput(toolNode.input);
      break;
    case 'Grep':
      inputContent = renderGrepInput(toolNode.input);
      break;
    case 'Glob':
      inputContent = renderGlobInput(toolNode.input);
      break;
    case 'Edit':
      inputContent = renderEditInput(toolNode.input);
      break;
    case 'AskUserQuestion':
      inputContent = renderAskUserQuestionInput(toolNode.input);
      break;
    case 'WebFetch':
      inputContent = renderWebFetchInput(toolNode.input);
      break;
    case 'WebSearch':
      inputContent = renderWebSearchInput(toolNode.input);
      break;
    case 'Task':
    case 'TaskCreate':
      inputContent = renderTaskCreateInput(toolNode.input);
      break;
    case 'TaskUpdate':
      inputContent = renderTaskUpdateInput(toolNode.input);
      break;
    case 'TaskGet':
      inputContent = renderTaskGetInput(toolNode.input);
      break;
    case 'TaskList':
      inputContent = renderTaskListInput(toolNode.input);
      break;
    case 'TaskOutput':
      inputContent = renderTaskOutputInput(toolNode.input);
      break;
    case 'TaskStop':
      inputContent = renderTaskStopInput(toolNode.input);
      break;
    case 'NotebookEdit':
      inputContent = renderNotebookEditInput(toolNode.input);
      break;
    case 'EnterPlanMode':
      inputContent = renderEnterPlanModeInput(toolNode.input);
      break;
    case 'ExitPlanMode':
      inputContent = renderExitPlanModeInput(toolNode.input);
      break;
    default:
      inputContent = renderDefaultInput(toolNode.input);
  }

  const outputContent = toolNode.output ? truncateString(formatJsonOutput(toolNode.output), 5000) : null;

  return (
    <div>
      <div style={styles.section}>
        <div style={styles.sectionLabel}>Input</div>
        {inputContent}
      </div>
      {outputContent && (
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Output</div>
          <div style={styles.outputBlock}>
            {outputContent}
          </div>
        </div>
      )}
      {toolNode.hooks && toolNode.hooks.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Hooks ({toolNode.hooks.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {toolNode.hooks.sort((a, b) => a.timestamp - b.timestamp).map((hook, idx) => (
              <div key={idx} style={{ padding: '8px', backgroundColor: '#1a1a2e', borderRadius: '6px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#fbbf24', fontWeight: 600 }}>{hook.event}</span>
                  <span style={{ color: '#888' }}>{new Date(hook.timestamp).toLocaleTimeString()}</span>
                </div>
                <div style={{ color: '#93c5fd', marginBottom: '2px' }}>{hook.hookName}</div>
                <div style={{ color: '#9ca3af', fontFamily: 'monospace', fontSize: '11px', fontStyle: hook.command === 'callback' ? 'italic' : 'normal' }}>
                  {hook.command}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface SkillDetailFormatterProps {
  skillNode: SkillNode;
}

export function SkillDetailFormatter({ skillNode }: SkillDetailFormatterProps) {
  return (
    <div>
      <div style={styles.section}>
        <div style={styles.sectionLabel}>Skill Name</div>
        <div style={styles.inlineCode}>
          {skillNode.skillName}
        </div>
      </div>

      {skillNode.commandName && (
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Command</div>
          <div style={styles.inlineCode}>
            {skillNode.commandName}
          </div>
        </div>
      )}

      {skillNode.sourceFilePath && (
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Source File</div>
          <div style={styles.filePath}>
            {skillNode.sourceFilePath}
          </div>
        </div>
      )}

      {skillNode.args && (
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Arguments</div>
          <div style={styles.codeBlock}>
            {skillNode.args}
          </div>
        </div>
      )}

      {skillNode.prompt && (
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Prompt</div>
          <div style={styles.codeBlock}>
            {truncateString(skillNode.prompt, 1000)}
          </div>
        </div>
      )}

      {skillNode.result && (
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Result</div>
          <div style={styles.outputBlock}>
            {truncateString(formatJsonOutput(skillNode.result), 5000)}
          </div>
        </div>
      )}

      {skillNode.success !== undefined && (
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Success</div>
          <div style={{
            ...styles.inlineCode,
            color: skillNode.success ? '#10b981' : '#ef4444'
          }}>
            {skillNode.success ? 'True' : 'False'}
          </div>
        </div>
      )}
      {skillNode.hooks && skillNode.hooks.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Hooks ({skillNode.hooks.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {skillNode.hooks.sort((a, b) => a.timestamp - b.timestamp).map((hook, idx) => (
              <div key={idx} style={{ padding: '8px', backgroundColor: '#1a1a2e', borderRadius: '6px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#fbbf24', fontWeight: 600 }}>{hook.event}</span>
                  <span style={{ color: '#888' }}>{new Date(hook.timestamp).toLocaleTimeString()}</span>
                </div>
                <div style={{ color: '#93c5fd', marginBottom: '2px' }}>{hook.hookName}</div>
                <div style={{ color: '#9ca3af', fontFamily: 'monospace', fontSize: '11px', fontStyle: hook.command === 'callback' ? 'italic' : 'normal' }}>
                  {hook.command}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface SubagentDetailFormatterProps {
  subagentNode: SubagentNode;
}

export function SubagentDetailFormatter({ subagentNode }: SubagentDetailFormatterProps) {
  return (
    <div>
      <div style={styles.section}>
        <div style={styles.sectionLabel}>Agent Type</div>
        <div style={styles.inlineCode}>
          {subagentNode.agentType}
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionLabel}>Agent ID</div>
        <div style={styles.inlineCode}>
          {subagentNode.agentId}
        </div>
      </div>

      {subagentNode.description && (
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Description</div>
          <div style={styles.description}>
            {subagentNode.description}
          </div>
        </div>
      )}

      {subagentNode.sourceFilePath && (
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Source File</div>
          <div style={styles.filePath}>
            {subagentNode.sourceFilePath}
          </div>
        </div>
      )}

      {subagentNode.prompt && (
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Prompt</div>
          <div style={styles.codeBlock}>
            {truncateString(subagentNode.prompt, 1000)}
          </div>
        </div>
      )}

      {subagentNode.model && (
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Model</div>
          <div style={styles.inlineCode}>
            {subagentNode.model}
          </div>
        </div>
      )}
      {subagentNode.hooks && subagentNode.hooks.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Hooks ({subagentNode.hooks.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {subagentNode.hooks.sort((a, b) => a.timestamp - b.timestamp).map((hook, idx) => (
              <div key={idx} style={{ padding: '8px', backgroundColor: '#1a1a2e', borderRadius: '6px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#fbbf24', fontWeight: 600 }}>{hook.event}</span>
                  <span style={{ color: '#888' }}>{new Date(hook.timestamp).toLocaleTimeString()}</span>
                </div>
                <div style={{ color: '#93c5fd', marginBottom: '2px' }}>{hook.hookName}</div>
                <div style={{ color: '#9ca3af', fontFamily: 'monospace', fontSize: '11px', fontStyle: hook.command === 'callback' ? 'italic' : 'normal' }}>
                  {hook.command}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
