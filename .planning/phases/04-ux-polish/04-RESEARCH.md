# Phase 4: UX Polish - Research

**Researched:** 2026-02-06
**Domain:** React UI enhancements - collapsible session groups, tool node inspection, and formatted detail display
**Confidence:** HIGH

## Summary

Phase 4 requires three UX improvements: (1) collapsible workspace session grouping in the sidebar, (2) clickable single tool call nodes that open the detail panel, and (3) human-readable tool detail formatting instead of raw JSON. The research focused on understanding the current implementation constraints and identifying patterns that fit the existing architecture.

The current codebase has solid foundations: SessionList component already computes cwd-based display names via sessionName.ts, GroupDrillDownPanel exists for drill-down interactions, and GraphView/TreeView already handle node clicks. The standard approach involves:
1. **Session grouping by cwd** - Group sessions in SessionList by shared cwd, render collapsible groups using native HTML details/summary or custom useState
2. **Single tool node clicks** - Extend existing onNodeClick handlers in GraphView and TreeView to handle 'tool' type nodes (currently only handles 'tool-group')
3. **Formatted tool details** - Parse ToolNode input/output fields to extract human-readable information (Bash command, Read file_path, etc.) and render with syntax highlighting using react-syntax-highlighter

The existing architecture patterns from Phases 1-2 (Zustand state management, atomic selectors, inline styles, memoization) continue to apply. No new major libraries are required.

**Primary recommendation:** Extend existing components (SessionList, GraphView, TreeView, GroupDrillDownPanel) rather than creating new patterns. Use existing state management (Zustand), existing styling (inline styles), and add minimal dependencies (react-syntax-highlighter for code highlighting only if needed).

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.2.0 | UI framework | Already in use, useState for collapsible groups |
| Zustand | 4.5.0 | State management | Already in use, selectedGroupId pattern established |
| @xyflow/react | 12.0.0 | Graph visualization | Already in use, onNodeClick pattern established |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-syntax-highlighter | ^15.5.0 | Code syntax highlighting | For rendering bash commands, file paths with color coding (optional) |
| React.useMemo | Built-in | Memoize grouped sessions | Prevent re-computation on every render |
| Map/Set | Built-in | Group sessions by cwd | Fast lookups, preserve insertion order |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom grouping | react-collapsible library | Library adds dependency, custom solution is 10 lines of code |
| react-syntax-highlighter | Prism.js directly | More setup, no React integration benefits |
| Parsing tool input JSON | Displaying raw JSON.stringify | Raw JSON is harder to read, doesn't surface key information |
| Native details/summary | Custom useState collapse | details/summary is simpler but less styleable, useState gives more control |

**Installation:**
```bash
# Optional: only if syntax highlighting is desired
npm install react-syntax-highlighter @types/react-syntax-highlighter
```

## Architecture Patterns

### Recommended Project Structure
```
client/src/
├── components/
│   ├── SessionList.tsx              # Add session grouping by cwd
│   ├── GraphView.tsx                # Extend onNodeClick for 'tool' type
│   ├── TreeView.tsx                 # Extend node selection for 'tool' type
│   ├── GroupDrillDownPanel.tsx      # Add formatted tool detail rendering
│   └── ToolDetailFormatter.tsx      # NEW: Parse and format tool inputs/outputs (optional)
├── store/
│   └── sessionStore.ts              # Add selectedToolId state (if not using selectedGroupId)
├── utils/
│   └── toolFormatters.ts            # NEW: Tool-specific formatters (Bash, Read, Write, etc.)
```

### Pattern 1: Grouping Sessions by Working Directory
**What:** Group sessions that share the same cwd property in SessionList, render as collapsible sections
**When to use:** When multiple sessions exist with the same working directory (common in long-running projects)
**Example:**
```typescript
// Source: Existing sessionName.ts + React collapsible pattern
function groupSessionsByCwd(sessions: Session[]): Map<string, Session[]> {
  const groups = new Map<string, Session[]>();

  for (const session of sessions) {
    const key = session.cwd || 'unknown';
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(session);
  }

  return groups;
}

// In SessionList component
const groupedSessions = useMemo(() => {
  return groupSessionsByCwd(sortedSessions);
}, [sortedSessions]);

// Render
{Array.from(groupedSessions.entries()).map(([cwd, sessions]) => {
  if (sessions.length === 1) {
    // Single session, render normally
    return <SessionItem key={sessions[0].id} session={sessions[0]} />;
  }

  // Multiple sessions, render as collapsible group
  return (
    <CollapsibleSessionGroup key={cwd} cwd={cwd} sessions={sessions} />
  );
})}
```

### Pattern 2: Collapsible UI with useState
**What:** Use local useState to track which groups are expanded/collapsed
**When to use:** UI state that doesn't need to be shared across components or persisted
**Example:**
```typescript
// Source: React hooks pattern + DevExtreme collapsible groups
function CollapsibleSessionGroup({ cwd, sessions }: Props) {
  const [isExpanded, setIsExpanded] = useState(true); // Default expanded

  const dirName = cwd.split('/').filter(s => s.length > 0).pop() || 'unknown';

  return (
    <div>
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={styles.groupHeader}
      >
        <span style={styles.chevron}>{isExpanded ? '▼' : '▶'}</span>
        <span>{dirName} ({sessions.length})</span>
      </div>
      {isExpanded && (
        <div style={styles.groupContent}>
          {sessions.map(session => (
            <SessionItem key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}
```

### Pattern 3: Extending onNodeClick for Single Tool Nodes
**What:** Add 'tool' type handling to existing onNodeClick handlers in GraphView and TreeView
**When to use:** Making single tool call nodes inspectable via detail panel
**Example:**
```typescript
// Source: Existing GraphView.tsx onNodeClick + Phase 2 patterns
// In GraphView.tsx
const onNodeClick: NodeMouseHandler = useCallback(
  (_event, node) => {
    if (node.type === 'session') {
      setSelectedSession(node.id);
    } else if (node.type === 'tool-group') {
      const groupId = (node.data as ToolGroupNodeData).groupId;
      setSelectedGroupId(groupId);
    } else if (node.type === 'tool') {
      // NEW: Handle single tool node clicks
      // Option 1: Create a single-item group on the fly
      const syntheticGroup: ToolGroup = {
        id: `tool-group-single-${node.id}`,
        type: 'tool-group',
        toolName: node.data.toolName,
        nodes: [/* find original ToolNode from data */],
        count: 1,
        state: node.data.state,
        timestamp: node.data.timestamp,
        parentId: null,
      };
      setSelectedGroupId(syntheticGroup.id);

      // Option 2: Use separate selectedToolId state
      // setSelectedToolId(node.id);
    }
  },
  [setSelectedSession, setSelectedGroupId]
);
```

### Pattern 4: Tool Input Parsing and Formatting
**What:** Extract human-readable information from ToolNode.input based on tool type
**When to use:** Rendering tool details in GroupDrillDownPanel
**Example:**
```typescript
// Source: Bash command structure + tool call patterns
interface BashInput {
  command: string;
  description?: string;
  timeout?: number;
}

interface ReadInput {
  file_path: string;
  offset?: number;
  limit?: number;
}

function formatToolInput(toolName: string, input: Record<string, unknown>): JSX.Element {
  switch (toolName) {
    case 'Bash':
      const bashInput = input as BashInput;
      return (
        <div>
          <div style={styles.label}>Command</div>
          <pre style={styles.code}>{bashInput.command}</pre>
          {bashInput.description && (
            <>
              <div style={styles.label}>Description</div>
              <div style={styles.text}>{bashInput.description}</div>
            </>
          )}
        </div>
      );

    case 'Read':
      const readInput = input as ReadInput;
      return (
        <div>
          <div style={styles.label}>File Path</div>
          <div style={styles.filePath}>{readInput.file_path}</div>
          {readInput.offset !== undefined && (
            <div style={styles.meta}>
              Offset: {readInput.offset}, Limit: {readInput.limit || 'all'}
            </div>
          )}
        </div>
      );

    case 'Write':
      const writeInput = input as { file_path: string; content: string };
      return (
        <div>
          <div style={styles.label}>File Path</div>
          <div style={styles.filePath}>{writeInput.file_path}</div>
          <div style={styles.label}>Content ({writeInput.content.length} chars)</div>
          <pre style={styles.code}>{writeInput.content}</pre>
        </div>
      );

    default:
      // Fallback to formatted JSON
      return (
        <pre style={styles.code}>
          {JSON.stringify(input, null, 2)}
        </pre>
      );
  }
}
```

### Pattern 5: Visual Hierarchy with Inline Styles
**What:** Use existing inline styles pattern with visual differentiation for input vs output, labels vs content
**When to use:** All UI styling in this project (consistent with existing components)
**Example:**
```typescript
// Source: Existing GroupDrillDownPanel.tsx + NodeDetail.tsx patterns
const styles = {
  sectionLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#93c5fd',  // Blue accent for labels
    marginBottom: '8px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  codeBlock: {
    backgroundColor: '#0f1729',  // Darker background for code
    borderRadius: '6px',
    padding: '12px',
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#e2e8f0',  // Light text
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-all' as const,
    maxHeight: '300px',
    overflowY: 'auto' as const,
    border: '1px solid #1e293b',  // Subtle border
  },
  filePath: {
    fontFamily: 'monospace',
    fontSize: '13px',
    color: '#fbbf24',  // Amber for file paths
    backgroundColor: '#1a1a2e',
    padding: '6px 10px',
    borderRadius: '4px',
  },
  metaText: {
    fontSize: '12px',
    color: '#9ca3af',  // Gray for metadata
    marginTop: '4px',
  },
};
```

### Anti-Patterns to Avoid
- **Breaking existing group navigation:** Don't remove or change selectedGroupId pattern, extend it
- **Adding global expansion state to Zustand:** Session group collapse is UI-only, keep in component state
- **Over-parsing tool inputs:** Don't try to parse every tool type perfectly, fallback to JSON is acceptable
- **Adding large syntax highlighting libraries:** react-syntax-highlighter is 150KB, only add if truly needed
- **Changing node data structures:** ToolNode input/output fields are already defined in shared types, work with existing structure

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON syntax highlighting | Custom regex-based highlighter | react-syntax-highlighter or native <pre> | Edge cases (nested objects, strings with quotes), performance, accessibility |
| Session grouping by cwd | Array.filter in every render | useMemo + Map | Prevents O(n²) filtering on every render |
| Bash command formatting | String manipulation | Display as-is in monospace | Commands are already formatted, just need proper font |
| Parsing all tool types | Giant switch statement | Tool-specific formatters + fallback | Maintainable, extensible, graceful degradation |
| Collapsible animation | Custom CSS transitions | Start with no animation | YAGNI - add only if requested |

**Key insight:** Phase 4 is about polishing existing patterns, not adding new complexity. The codebase already has the right structure (Zustand state, component separation, inline styles), so extend rather than rebuild.

## Common Pitfalls

### Pitfall 1: Conflicting Selection State
**What goes wrong:** Both selectedGroupId and selectedToolId exist in store, unclear which takes precedence when both are set
**Why it happens:** Adding new state without considering interaction with existing state
**How to avoid:** Reuse selectedGroupId for both group and single-tool selection. Create synthetic single-item ToolGroups for individual tool nodes. Alternatively, clear selectedGroupId when setting selectedToolId.
**Warning signs:** Panel shows wrong content, selection state conflicts, UI flickers

### Pitfall 2: Re-computing Session Groups on Every Render
**What goes wrong:** Session grouping logic runs on every render, causing performance issues with many sessions
**Why it happens:** Not wrapping grouping logic in useMemo
**How to avoid:** Always use useMemo for derived data that involves iteration/transformation
**Warning signs:** Console shows slow renders, React DevTools profiler shows SessionList as bottleneck

### Pitfall 3: Breaking DisplayName Logic
**What goes wrong:** Session groups show wrong names or IDs instead of directory names
**Why it happens:** Forgetting that getSessionDisplayNames already handles disambiguation, duplicating logic
**How to avoid:** Use existing getSessionDisplayNames for individual session names, extract directory name from cwd for group headers separately
**Warning signs:** Sessions show "claude-session-dashboard #1 #2" or duplicate group names

### Pitfall 4: Not Handling Single-Item Groups Consistently
**What goes wrong:** UI shows collapsible group for single session, or worse, breaks when trying to collapse
**Why it happens:** Not checking sessions.length before rendering as group
**How to avoid:** Render single-session "groups" as normal SessionItem, not CollapsibleSessionGroup
**Warning signs:** Awkward UI with collapsible containing one item, visual inconsistency

### Pitfall 5: Tool Input Parsing Fragility
**What goes wrong:** Tool detail display crashes or shows [object Object] when tool input structure changes
**Why it happens:** Assuming input structure without validation, not handling undefined/null
**How to avoid:** Use optional chaining (?.), provide fallback to JSON.stringify, validate structure before parsing
**Warning signs:** Console errors, [object Object] in UI, blank detail panel

### Pitfall 6: Over-Engineering Tool Formatters
**What goes wrong:** Spending hours implementing perfect formatters for every tool type
**Why it happens:** Perfectionism, not recognizing diminishing returns
**How to avoid:** Start with Bash, Read, Write (most common). Use JSON fallback for others. Iterate based on actual usage.
**Warning signs:** Week spent on formatters, complex formatter code, user doesn't notice

## Code Examples

Verified patterns from official sources:

### Session Grouping by Working Directory
```typescript
// Source: Existing sessionName.ts + React useMemo pattern
import React, { useMemo, useState } from 'react';
import type { Session } from 'shared';
import { useSessionStore } from '../store/sessionStore';
import { getSessionDisplayNames } from '../utils/sessionName';

function groupSessionsByCwd(
  sessions: Session[]
): Map<string, Session[]> {
  const groups = new Map<string, Session[]>();

  for (const session of sessions) {
    const cwd = session.cwd || '__no_cwd__';
    if (!groups.has(cwd)) {
      groups.set(cwd, []);
    }
    groups.get(cwd)!.push(session);
  }

  return groups;
}

function getCwdDisplayName(cwd: string): string {
  if (cwd === '__no_cwd__') return 'Unknown Location';
  const segments = cwd.split('/').filter(s => s.length > 0);
  return segments[segments.length - 1] || 'root';
}

export function SessionList() {
  const sessions = useSessionStore((state) => state.sessions);
  const selectedSessionId = useSessionStore((state) => state.selectedSessionId);
  const setSelectedSession = useSessionStore((state) => state.setSelectedSession);

  // Get disambiguated display names for individual sessions
  const displayNames = useMemo(() => {
    return getSessionDisplayNames(sessions);
  }, [sessions]);

  // Sort sessions by most recent activity
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => b.lastActivity - a.lastActivity);
  }, [sessions]);

  // Group sessions by cwd
  const sessionGroups = useMemo(() => {
    return groupSessionsByCwd(sortedSessions);
  }, [sortedSessions]);

  if (sessions.length === 0) {
    return <div style={styles.emptyState}>No active sessions</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.sectionTitle}>Sessions ({sessions.length})</div>
      {Array.from(sessionGroups.entries()).map(([cwd, groupSessions]) => {
        if (groupSessions.length === 1) {
          // Single session, render normally
          const session = groupSessions[0];
          return (
            <SessionItem
              key={session.id}
              session={session}
              displayName={displayNames.get(session.id) || session.id}
              isSelected={selectedSessionId === session.id}
              onClick={() => setSelectedSession(session.id)}
            />
          );
        }

        // Multiple sessions, render as collapsible group
        return (
          <CollapsibleSessionGroup
            key={cwd}
            cwd={cwd}
            sessions={groupSessions}
            displayNames={displayNames}
            selectedSessionId={selectedSessionId}
            onSessionSelect={setSelectedSession}
          />
        );
      })}
    </div>
  );
}
```

### Collapsible Session Group Component
```typescript
// Source: DevExtreme collapsible pattern + existing SessionList styles
interface CollapsibleSessionGroupProps {
  cwd: string;
  sessions: Session[];
  displayNames: Map<string, string>;
  selectedSessionId: string | null;
  onSessionSelect: (id: string) => void;
}

function CollapsibleSessionGroup({
  cwd,
  sessions,
  displayNames,
  selectedSessionId,
  onSessionSelect,
}: CollapsibleSessionGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const dirName = getCwdDisplayName(cwd);

  return (
    <div>
      {/* Group header */}
      <div
        style={{
          ...styles.groupHeader,
          ...(isExpanded ? styles.groupHeaderExpanded : {}),
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span style={styles.chevron}>{isExpanded ? '▼' : '▶'}</span>
        <span style={styles.groupTitle}>{dirName}</span>
        <span style={styles.groupCount}>({sessions.length})</span>
      </div>

      {/* Session items (when expanded) */}
      {isExpanded && (
        <div style={styles.groupContent}>
          {sessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              displayName={displayNames.get(session.id) || session.id}
              isSelected={selectedSessionId === session.id}
              onClick={() => onSessionSelect(session.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  // ... existing styles ...
  groupHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 16px',
    cursor: 'pointer',
    backgroundColor: '#0f3460',
    borderBottom: '1px solid #16213e',
    transition: 'background-color 0.15s',
  },
  groupHeaderExpanded: {
    backgroundColor: '#1e3a5f',
  },
  chevron: {
    fontSize: '10px',
    color: '#888',
    marginRight: '8px',
    width: '12px',
  },
  groupTitle: {
    flex: 1,
    fontSize: '12px',
    fontWeight: 600,
    color: '#93c5fd',
  },
  groupCount: {
    fontSize: '11px',
    color: '#6b7280',
  },
  groupContent: {
    backgroundColor: '#0a1929',
  },
};
```

### Extending GraphView for Single Tool Nodes
```typescript
// Source: Existing GraphView.tsx + Phase 2 drill-down pattern
// In GraphView.tsx
import { useCallback } from 'react';
import type { NodeMouseHandler } from '@xyflow/react';

export function GraphView() {
  const setSelectedSession = useSessionStore((state) => state.setSelectedSession);
  const setSelectedGroupId = useSessionStore((state) => state.setSelectedGroupId);
  const sessions = useSessionStore((state) => state.sessions);

  // Helper to find original ToolNode by React Flow node ID
  const findToolNodeById = useCallback((nodeId: string): ToolNode | null => {
    // Parse nodeId format: "session-abc123-tool-xyz789"
    // ... implementation ...
    return null; // placeholder
  }, [sessions]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (node.type === 'session') {
        setSelectedSession(node.id);
      } else if (node.type === 'tool-group') {
        const groupId = (node.data as ToolGroupNodeData).groupId;
        setSelectedGroupId(groupId);
      } else if (node.type === 'tool') {
        // NEW: Handle single tool nodes
        // Create a synthetic single-item ToolGroup
        const toolNode = findToolNodeById(node.id);
        if (toolNode) {
          const syntheticGroupId = `tool-group-single-${toolNode.id}`;
          // Store the synthetic group for GroupDrillDownPanel to find
          setSelectedGroupId(syntheticGroupId);
        }
      }
    },
    [setSelectedSession, setSelectedGroupId, findToolNodeById]
  );

  // ... rest of component
}
```

### Formatted Tool Detail Rendering
```typescript
// Source: Bash command structure + Phase 2 GroupDrillDownPanel patterns
interface ToolDetailFormatterProps {
  toolNode: ToolNode;
}

function ToolDetailFormatter({ toolNode }: ToolDetailFormatterProps) {
  const { toolName, input, output } = toolNode;

  // Input formatting
  let inputContent: JSX.Element;

  switch (toolName) {
    case 'Bash':
      const bashInput = input as { command: string; description?: string };
      inputContent = (
        <div>
          {bashInput.description && (
            <div style={styles.description}>{bashInput.description}</div>
          )}
          <pre style={styles.codeBlock}>{bashInput.command}</pre>
        </div>
      );
      break;

    case 'Read':
      const readInput = input as { file_path: string; offset?: number; limit?: number };
      inputContent = (
        <div>
          <div style={styles.filePath}>{readInput.file_path}</div>
          {readInput.offset !== undefined && (
            <div style={styles.metaText}>
              Lines {readInput.offset} - {readInput.offset + (readInput.limit || 2000)}
            </div>
          )}
        </div>
      );
      break;

    case 'Write':
      const writeInput = input as { file_path: string; content: string };
      inputContent = (
        <div>
          <div style={styles.filePath}>{writeInput.file_path}</div>
          <div style={styles.metaText}>{writeInput.content.length} characters</div>
          <pre style={styles.codeBlock}>
            {writeInput.content.slice(0, 500)}
            {writeInput.content.length > 500 && '\n... (truncated)'}
          </pre>
        </div>
      );
      break;

    case 'Grep':
    case 'Glob':
      const searchInput = input as { pattern: string; path?: string };
      inputContent = (
        <div>
          <div style={styles.label}>Pattern</div>
          <div style={styles.inlineCode}>{searchInput.pattern}</div>
          {searchInput.path && (
            <>
              <div style={styles.label}>Path</div>
              <div style={styles.filePath}>{searchInput.path}</div>
            </>
          )}
        </div>
      );
      break;

    default:
      // Fallback to formatted JSON
      inputContent = (
        <pre style={styles.codeBlock}>
          {JSON.stringify(input, null, 2)}
        </pre>
      );
  }

  // Output formatting
  let outputContent: JSX.Element | null = null;
  if (output) {
    outputContent = (
      <pre style={styles.outputBlock}>
        {output.length > 5000
          ? output.slice(0, 5000) + '\n... (truncated)'
          : output
        }
      </pre>
    );
  }

  return (
    <div>
      {/* Input section */}
      <div style={styles.section}>
        <div style={styles.sectionLabel}>Input</div>
        {inputContent}
      </div>

      {/* Output section */}
      {outputContent && (
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Output</div>
          {outputContent}
        </div>
      )}
    </div>
  );
}

const styles = {
  section: {
    marginBottom: '20px',
  },
  sectionLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#93c5fd',
    marginBottom: '8px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  description: {
    fontSize: '13px',
    color: '#e2e8f0',
    marginBottom: '8px',
    fontStyle: 'italic' as const,
  },
  codeBlock: {
    backgroundColor: '#0f1729',
    borderRadius: '6px',
    padding: '12px',
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#e2e8f0',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
    maxHeight: '300px',
    overflowY: 'auto' as const,
    margin: 0,
    border: '1px solid #1e293b',
  },
  outputBlock: {
    backgroundColor: '#0a0e1a',
    borderRadius: '6px',
    padding: '12px',
    fontSize: '11px',
    fontFamily: 'monospace',
    color: '#94a3b8',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
    maxHeight: '400px',
    overflowY: 'auto' as const,
    margin: 0,
    border: '1px solid #1e293b',
  },
  filePath: {
    fontFamily: 'monospace',
    fontSize: '13px',
    color: '#fbbf24',
    backgroundColor: '#1a1a2e',
    padding: '6px 10px',
    borderRadius: '4px',
    wordBreak: 'break-all' as const,
  },
  inlineCode: {
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#a78bfa',
    backgroundColor: '#1e1b2e',
    padding: '4px 8px',
    borderRadius: '3px',
  },
  label: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#9ca3af',
    marginTop: '12px',
    marginBottom: '6px',
  },
  metaText: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px',
  },
};
```

### Updated GroupDrillDownPanel with Formatting
```typescript
// Source: Existing GroupDrillDownPanel.tsx + new formatting patterns
// In GroupDrillDownPanel.tsx, replace raw JSON display with formatted version

// Detail view section (lines 211-304)
{selectedToolIndex !== null && selectedToolNode && (
  <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
    <div style={styles.detailHeader}>
      <h4>Call #{selectedToolIndex + 1} Details</h4>
      <button onClick={() => setSelectedToolIndex(null)}>
        Back to list
      </button>
    </div>

    {/* NEW: Use formatted display instead of raw JSON */}
    <ToolDetailFormatter toolNode={selectedToolNode} />
  </div>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Flat session lists | Grouped session lists | Ongoing trend | Better organization with many sessions, reduces visual clutter |
| Raw JSON display | Parsed + formatted display | 2024-2025 | Improved readability, domain-specific formatting |
| Separate formatters per tool | Generic formatter + fallback | 2025+ | Maintainable, extensible, graceful degradation |
| Heavy syntax highlighting libs | Lightweight or native display | 2025+ | Smaller bundles, faster load times, CSS-based highlighting |

**Deprecated/outdated:**
- react-collapsible package - Replaced by native details/summary or simple useState patterns (lighter weight)
- Separate tool detail components - Consolidated formatters with switch/case more maintainable
- Global expansion state - Local component state sufficient for UI-only interactions

## Open Questions

Things that couldn't be fully resolved:

1. **Should session groups default to expanded or collapsed?**
   - What we know: Current SessionList shows all sessions expanded
   - What's unclear: User preference when many workspace groups exist
   - Recommendation: Default to expanded (matches current behavior), persist user's expand/collapse choices in localStorage if needed

2. **Should single tool nodes use synthetic groups or separate state?**
   - What we know: GroupDrillDownPanel expects ToolGroup structure, single nodes are ToolNode
   - What's unclear: Better to create synthetic single-item groups or add separate selectedToolId state?
   - Recommendation: Use synthetic groups (simpler, reuses existing panel logic), but document the pattern clearly

3. **How deep should tool input parsing go?**
   - What we know: Bash, Read, Write are most common, others vary
   - What's unclear: Should we parse Grep output modes, Bash timeout fields, etc.?
   - Recommendation: Start with core fields (command, file_path, content), ignore optional fields. Iterate based on user feedback.

4. **Should we add react-syntax-highlighter or use native styling?**
   - What we know: react-syntax-highlighter is 150KB, provides nice highlighting
   - What's unclear: Is syntax highlighting valuable enough to justify bundle size?
   - Recommendation: Start with monospace + color-coded text using inline styles. Add react-syntax-highlighter only if users request it.

## Sources

### Primary (HIGH confidence)
- Project codebase - /home/botond/claude-session-dashboard/client/src/components/SessionList.tsx - Current implementation, cwd extraction
- Project codebase - /home/botond/claude-session-dashboard/client/src/utils/sessionName.ts - Display name logic, disambiguation
- Project codebase - /home/botond/claude-session-dashboard/client/src/components/GroupDrillDownPanel.tsx - Existing drill-down pattern, master-detail
- Project codebase - /home/botond/claude-session-dashboard/shared/src/index.ts - ToolNode structure, input/output types
- Project codebase - Phase 1 & 2 RESEARCH.md - Established patterns (Zustand, inline styles, memoization)

### Secondary (MEDIUM confidence)
- [DevExtreme List - Expand and Collapse a Group](https://js.devexpress.com/React/Documentation/Guide/UI_Components/List/Grouping/Expand_and_Collapse_a_Group/) - Collapsible group pattern
- [DEV Community - Expand & collapse groups of items in a list](https://dev.to/vier31/expand--collapse-groups-of-items-in-a-list-275g) - React collapsible implementation
- [react-syntax-highlighter on npm](https://www.npmjs.com/package/react-syntax-highlighter) - Syntax highlighting library info
- [LogRocket - The guide to syntax highlighting in React](https://blog.logrocket.com/guide-syntax-highlighting-react/) - Syntax highlighting approaches

### Tertiary (LOW confidence)
- [Baeldung - Parsing, Validating, and Printing JSON in Shell Scripts](https://www.baeldung.com/linux/json-shell-parse-validate-print) - JSON parsing reference (informational only, not directly applicable to React)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All patterns use existing libraries (React, Zustand, @xyflow/react)
- Architecture: HIGH - Extends existing components and patterns from Phases 1-2
- Pitfalls: HIGH - Based on existing codebase structure and common React pitfalls

**Research date:** 2026-02-06
**Valid until:** 2026-03-06 (30 days - stable patterns, minor UX enhancements)
