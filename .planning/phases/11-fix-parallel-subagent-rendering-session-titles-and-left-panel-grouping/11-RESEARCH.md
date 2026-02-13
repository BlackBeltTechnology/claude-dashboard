# Phase 11: Fix Parallel Subagent Rendering, Session Titles, and Left Panel Grouping - Research

**Researched:** 2026-02-09
**Domain:** React Flow graph layout, JSONL parsing, UI state management
**Confidence:** HIGH

## Summary

This phase addresses three distinct issues: detecting and rendering parallel subagent invocations as forked branches (not sequential chains), adding session initial commands as titles, and fixing broken left panel session grouping. The core challenge is DETECTING parallel Task tool calls from JSONL structure, since Phase 10 implemented all subagents as sequential chains via sequencer nodes.

The key insight is that when Claude invokes multiple tools in parallel, they appear in a SINGLE assistant message's content array with multiple `tool_use` blocks. Sequential invocations appear in SEPARATE assistant messages. The JSONL parser already extracts `toolUses` as an array per message entry, providing the parallelism signal.

**Primary recommendation:** Detect parallel Task calls by checking `toolUses.length > 1` with multiple Task entries in a single assistant message. Use fork-join pattern for parallel subagents, sequential chain for non-parallel. Extract session titles from first user message content, filtering out `/clear` commands. Debug SessionList grouping to identify why `groupSessionsByCwd` fails.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @xyflow/react | 12.x | Graph visualization with dagre layout | Industry standard for node-based UIs, handles fork-join patterns natively |
| dagre | 0.8.5 | Hierarchical graph layout algorithm | Automatically positions nodes in ranks (parallel branches get same rank) |
| zustand | 4.x | React state management | Simple store for session data, expansion state, navigation |
| React | 18.x | UI framework | Modern concurrent features, already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| N/A | - | No additional libraries needed | Existing stack covers all requirements |

**Installation:**
All dependencies already installed in monorepo.

## Architecture Patterns

### Recommended Project Structure
```
server/src/
├── jsonl-parser.ts           # Parse JSONL, extract toolUses per message
├── session-discovery.ts      # Build Session objects with nodes
client/src/
├── components/
│   ├── SessionList.tsx       # Left panel with grouping (DEBUG THIS)
│   ├── DirectoryOverview.tsx # Directory view with session nodes
│   └── nodes/
│       ├── SessionNode.tsx   # Add onClick handler for navigation
│       └── DirectoryNode.tsx # No changes needed
├── utils/
│   ├── graphLayout.ts        # Add parallel detection, conditional fork-join
│   ├── sessionName.ts        # Add getSessionTitle function
│   └── directoryGraphLayout.ts # Pass sessionId to SessionNode data
└── store/
    └── sessionStore.ts       # Add navigation to session detail view
```

### Pattern 1: Detecting Parallel Tool Invocations from JSONL

**What:** Parallel tools appear in ONE assistant message with multiple `tool_use` content blocks. Sequential tools appear in SEPARATE messages.

**When to use:** When determining whether to render subagents as parallel branches or sequential chain.

**Example:**
```typescript
// From jsonl-parser.ts line 125-135
// toolUses is extracted as an array per message:
const toolUseBlocks = raw.message.content.filter(
  (block): block is RawContentBlock & { type: 'tool_use'; ... } =>
    block.type === 'tool_use' && typeof block.id === 'string' && typeof block.name === 'string'
);
if (toolUseBlocks.length > 0) {
  parsed.toolUses = toolUseBlocks.map((block) => ({
    id: block.id,
    name: block.name,
    input: block.input ?? {},
  }));
}

// Detection logic (NEW):
function detectParallelTasks(entries: ParsedEntry[]): Map<string, string[]> {
  const parallelGroups = new Map<string, string[]>();

  for (const entry of entries) {
    if (entry.toolUses && entry.toolUses.length > 1) {
      // Multiple tool uses in ONE message = parallel invocation
      const taskTools = entry.toolUses.filter(t => t.name === 'Task');
      if (taskTools.length > 1) {
        // These Task IDs should fork in parallel
        const taskIds = taskTools.map(t => t.id);
        parallelGroups.set(entry.uuid, taskIds); // Key by parent message UUID
      }
    }
  }

  return parallelGroups;
}
```

### Pattern 2: Conditional Fork-Join vs Sequential Chain

**What:** Use fork-join pattern for parallel subagents (dagre places at same rank), sequential chain for non-parallel.

**When to use:** In `convertSessionToGraph` when processing subagents.

**Example:**
```typescript
// From graphLayout.ts line 256-287 (CURRENT SEQUENTIAL LOGIC)
// REPLACE with conditional logic:

if (session.subagents.length > 0) {
  const forkPointId = prevNodeId;

  // Detect which subagents are parallel vs sequential
  const parallelGroups = detectParallelSubagents(session);

  if (parallelGroups.size > 0) {
    // PARALLEL FORK-JOIN PATTERN
    const joinNodeId = `${session.id}-join-after-subagents`;
    const joinNode: Node<CustomNodeData> = {
      id: joinNodeId,
      type: 'join-node' as any,
      position: { x: 0, y: 0 },
      data: { label: '' } as any,
    };
    nodes.push(joinNode);

    // For each parallel group, fork from forkPointId
    for (const [parentUuid, subagentIds] of parallelGroups) {
      for (const subagentId of subagentIds) {
        const subagent = session.subagents.find(s => s.id === subagentId);
        if (!subagent) continue;

        // Create subagent node
        const subagentNodeId = createNodeId(session.id, subagent.id);
        // ... (create subagent node)

        // Fork edge: forkPointId -> subagentNode
        edges.push({
          id: `e-fork-${forkPointId}-${subagentNodeId}`,
          source: forkPointId,
          target: subagentNodeId,
          type: 'smoothstep',
          animated: subagent.state === 'active',
          style: { stroke: '#8b5cf6', strokeWidth: 1.5 },
        });

        // ... (expand inline tool calls if needed)

        // Join edge: branchTailId -> joinNode
        edges.push({
          id: `e-join-${branchTailId}-${joinNodeId}`,
          source: branchTailId,
          target: joinNodeId,
          type: 'smoothstep',
          style: { stroke: '#8b5cf6', strokeWidth: 1.5 },
        });
      }
    }

    prevNodeId = joinNodeId;
  } else {
    // SEQUENTIAL CHAIN PATTERN (keep existing logic)
    // ... (current lines 274-483)
  }
}
```

### Pattern 3: Extracting Session Initial Command as Title

**What:** First user message content (excluding `/clear`) becomes session title.

**When to use:** In SessionList and SessionNode display, fallback to directory name if no command.

**Example:**
```typescript
// In sessionName.ts (NEW function):
export function getSessionTitle(session: Session, entries?: ParsedEntry[]): string {
  // Try to find first user message from JSONL entries if provided
  if (entries) {
    for (const entry of entries) {
      if (entry.type === 'user' && entry.content) {
        const content = entry.content.trim();
        // Skip /clear commands
        if (content && !content.startsWith('/clear')) {
          // Truncate long commands
          return content.length > 60 ? content.slice(0, 60) + '...' : content;
        }
      }
    }
  }

  // Fallback to directory name
  return getSessionDisplayName(session);
}

// Usage in SessionList:
<div style={styles.sessionTitle}>{getSessionTitle(session)}</div>
<div style={styles.sessionMeta}>{session.cwd} • {formatTime(session.lastActivity)}</div>
```

### Pattern 4: React Flow Node Click Navigation

**What:** Add onClick handler to SessionNode that navigates to session detail view.

**When to use:** In Directory Overview when user clicks a session node.

**Example:**
```typescript
// In SessionNode.tsx:
import { useSessionStore } from '../../store/sessionStore';

function SessionNodeComponent({ data, selected }: NodeProps<SessionNodeType>) {
  const setSelectedSession = useSessionStore((state) => state.setSelectedSession);
  const setViewMode = useSessionStore((state) => state.setViewMode);

  const handleClick = () => {
    // Extract sessionId from data (needs to be added to SessionNodeData)
    if (data.sessionId) {
      setSelectedSession(data.sessionId);
      setViewMode('tree'); // or 'graph' based on preference
    }
  };

  return (
    <>
      <Handle ... />
      <div
        style={{...}}
        onClick={handleClick}
        style={{ cursor: 'pointer' }}
      >
        {/* ... existing content ... */}
      </div>
      <Handle ... />
    </>
  );
}

// In directoryGraphLayout.ts (line 68-83):
// Add sessionId to data:
const sessionNode: Node<SessionNodeData> = {
  id: sessionNodeId,
  type: 'session',
  position: { x: 0, y: 0 },
  data: {
    label: getSessionDisplayName(session),
    state: session.state,
    projectHash: session.projectHash,
    gitBranch: session.gitBranch,
    tmuxTarget: session.tmuxTarget,
    subagentCount: session.subagents.length,
    nodeCount: session.nodes.length,
    sessionId: session.id, // ADD THIS
  },
};
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Graph layout algorithm | Custom positioning logic | dagre with rankdir:'LR' | Fork-join requires rank-based layout, hand-rolling fails with complex graphs |
| JSONL parallel detection | Timestamp-based heuristics | toolUses array length check | Timestamps unreliable, JSONL structure is ground truth |
| Session title extraction | Parse summary field | First user message content | Summary may not exist, user command is most relevant |

**Key insight:** The JSONL structure already contains all parallelism information via the `toolUses` array per message. Don't try to infer from timestamps or separate heuristics.

## Common Pitfalls

### Pitfall 1: Confusing Timestamp Order with Parallelism
**What goes wrong:** Assuming tasks invoked close in time are parallel, or using timestamp gaps to detect sequencing.
**Why it happens:** Intuitive to think "same time = parallel", but JSONL writes are sequential even for parallel calls.
**How to avoid:** Only use message structure: multiple `tool_use` blocks in ONE message content array = parallel.
**Warning signs:** Detection logic checks `entry.timestamp - prevEntry.timestamp < threshold`.

### Pitfall 2: Matching Subagent by Filename Agent ID
**What goes wrong:** Trying to match `agentId` from subagent filename (e.g., `agent-a8818a4.jsonl`) to Task tool ID.
**Why it happens:** Decision 10-02 states "Match SubagentNode by agentId == subagent session ID (both use 7-char agent hash)", but this is WRONG. Tool ID is a UUID like `toolu_01VYEazjxJNy1k4Sq3LAC51D`, not the agent hash.
**How to avoid:** The `agentId` in the subagent JSONL's first entry (`entries[0].agentId`) should be used to match to the Task tool. The filename agent ID is just for filesystem organization.
**Warning signs:** Trying to match `tool.id.slice(-7)` to subagent filename.

### Pitfall 3: Breaking Existing Sequential Chains
**What goes wrong:** Converting all subagents to fork-join breaks sessions that genuinely invoked tasks sequentially.
**Why it happens:** Overgeneralizing the solution, not preserving conditional logic.
**How to avoid:** DETECT parallel groups first, only use fork-join for those groups. Keep sequential chain for non-parallel.
**Warning signs:** Removing the sequential chain code entirely instead of making it conditional.

### Pitfall 4: Left Panel Grouping "Broken" May Be Data Issue
**What goes wrong:** Assuming grouping code is broken when sessions may legitimately have no `cwd` or same `cwd`.
**Why it happens:** Success criteria says "fix broken grouping" without evidence it's actually broken.
**How to avoid:** Debug first: log `sessionsByDirectory` map in SessionList, check if sessions actually have different `cwd` values. Issue may be upstream in session discovery.
**Warning signs:** Rewriting grouping logic without confirming what's actually broken.

### Pitfall 5: Session Title Extraction Without JSONL Access
**What goes wrong:** Trying to extract initial command from Session object, but Session.nodes doesn't include raw message content.
**Why it happens:** Session nodes are filtered to exclude message nodes (graphLayout.ts line 99, 253).
**How to avoid:** Need to either: (a) preserve raw JSONL entries in Session object, or (b) add `firstUserPrompt` field during session discovery parsing.
**Warning signs:** Accessing `session.nodes.find(n => n.type === 'message')` expecting to find user messages.

## Code Examples

### Parallel Task Detection from JSONL
```typescript
// In server/src/session-discovery.ts (NEW function)
/**
 * Detect parallel Task invocations from parsed JSONL entries.
 * Returns a map of parent assistant message UUID -> array of Task tool IDs
 */
export function detectParallelTasks(entries: ParsedEntry[]): Map<string, string[]> {
  const parallelGroups = new Map<string, string[]>();

  for (const entry of entries) {
    if (entry.type === 'assistant' && entry.toolUses && entry.toolUses.length > 1) {
      // Multiple tool uses in ONE message = parallel invocation
      const taskTools = entry.toolUses.filter(t => t.name === 'Task');

      if (taskTools.length > 1) {
        // These Task IDs should fork in parallel
        const taskIds = taskTools.map(t => t.id);
        parallelGroups.set(entry.uuid, taskIds);
      }
    }
  }

  return parallelGroups;
}
```

### Matching Subagent Sessions to Task Tool IDs
```typescript
// In server/src/session-discovery.ts
// CURRENT CODE (line 438-476) matches by filename agent ID - WRONG
// FIX: Match by agentId field in subagent's first JSONL entry

export async function discoverSubagents(
  session: Session,
  sessionJsonlPath: string,
  parallelGroups: Map<string, string[]> // ADD THIS parameter
): Promise<void> {
  const sessionDir = sessionJsonlPath.replace('.jsonl', '');
  const subagentFiles = await findSubagentFiles(sessionDir);

  // Build map of agentId -> subagent file path
  const subagentByAgentId = new Map<string, string>();

  for (const [filenameAgentId, filePath] of subagentFiles) {
    try {
      const content = await readFile(filePath, 'utf-8');
      const entries = parseJSONL(content);

      if (entries.length > 0) {
        // Get agentId from first entry (this is the TRUE agent ID)
        const agentId = entries[0].agentId || filenameAgentId;
        subagentByAgentId.set(agentId, filePath);
      }
    } catch {
      // Skip unreadable files
    }
  }

  // Now match Task tools in session.nodes to subagent files
  for (const node of session.nodes) {
    if (node.type === 'subagent') {
      // node.agentId was set from tool.id.slice(-7) - WRONG
      // Need to match tool.id to subagent entries[0].agentId somehow
      // ... (this is the matching challenge)
    }
  }

  // Sort subagents by creation time
  session.subagents.sort((a, b) => a.createdAt - b.createdAt);
}
```

### Session Title Extraction (Two Options)

**Option A: Add firstUserPrompt to Session during discovery**
```typescript
// In server/src/session-discovery.ts (modify parseSessionFile)
export async function parseSessionFile(filePath: string, indexEntry?: SessionIndexEntry): Promise<Session | null> {
  // ... existing code ...

  // Extract first user prompt (excluding /clear)
  let firstUserPrompt: string | undefined;
  for (const entry of entries) {
    if (entry.type === 'user' && entry.content) {
      const content = entry.content.trim();
      if (content && !content.startsWith('/clear')) {
        firstUserPrompt = content;
        break;
      }
    }
  }

  const session: Session = {
    id: sessionId,
    projectHash,
    state,
    summary: indexEntry?.summary || metadata.summary,
    gitBranch: indexEntry?.gitBranch || metadata.gitBranch,
    cwd: indexEntry?.projectPath || metadata.cwd,
    createdAt: indexEntry?.created ? new Date(indexEntry.created).getTime() : metadata.firstTimestamp,
    lastActivity: metadata.lastTimestamp,
    nodes,
    subagents: [],
    firstUserPrompt, // ADD THIS
  };

  return session;
}

// In shared/src/index.ts (add to Session interface)
export interface Session {
  id: string;
  projectHash: string;
  state: SessionState;
  summary?: string;
  gitBranch?: string;
  cwd?: string;
  tmuxTarget?: string;
  createdAt: number;
  lastActivity: number;
  nodes: AnyNode[];
  subagents: Session[];
  firstUserPrompt?: string; // ADD THIS
}

// In client/src/utils/sessionName.ts
export function getSessionTitle(session: Session): string {
  if (session.firstUserPrompt) {
    return session.firstUserPrompt.length > 60
      ? session.firstUserPrompt.slice(0, 60) + '...'
      : session.firstUserPrompt;
  }

  // Fallback to directory name
  return getSessionDisplayName(session);
}
```

**Option B: Re-parse JSONL on client side (NOT RECOMMENDED)**
Too expensive, violates separation of concerns.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| All subagents parallel fork-join (Phase 7) | All subagents sequential chain (Phase 10) | Phase 10 (2026-02) | Lost parallel visualization, now need conditional detection |
| Session title = summary or UUID | (unchanged) | N/A | Need to add initial command extraction |
| Directory-based session names | (unchanged) | N/A | Working as designed, add command as primary title |

**Deprecated/outdated:**
- Phase 10-02 decision "Match SubagentNode by agentId == subagent session ID (both use 7-char agent hash)" is INCORRECT. Tool IDs are UUIDs, not 7-char hashes.

## Open Questions

1. **How to match Task tool IDs to subagent agentIds?**
   - What we know: Tool ID is UUID like `toolu_01...`, subagent JSONL has `agentId` field in entries
   - What's unclear: Is there a direct mapping, or do we need to infer from timestamps/order?
   - Recommendation: Examine actual JSONL files to see if agentId correlates to tool ID in any way. May need to rely on creation order + parallel detection.

2. **What's actually broken with SessionList grouping?**
   - What we know: Success criteria says "fix left panel session grouping"
   - What's unclear: Is code broken, or do sessions legitimately have same/missing cwd?
   - Recommendation: Add debug logging to SessionList line 282 to inspect `sessionGroups` map. Check if sessions have distinct cwd values.

3. **Should session title show command only, or command + directory?**
   - What we know: Success criteria says "initial command as title, with working directory below"
   - What's unclear: Display format details
   - Recommendation: Two-line display: command as title, cwd as meta (like current lastActivity display)

4. **How to handle sessions with no initial command (only /clear)?**
   - What we know: Some sessions may start with /clear or have empty first user message
   - What's unclear: Fallback behavior
   - Recommendation: Fallback to directory name (existing getSessionDisplayName logic)

## Sources

### Primary (HIGH confidence)
- Codebase files: `server/src/jsonl-parser.ts`, `server/src/session-discovery.ts`, `client/src/utils/graphLayout.ts`, `client/src/components/SessionList.tsx` - Analyzed existing implementation
- JSONL sample: `/home/botond/.claude/projects/-home-botond-Desktop/82e901c4-a077-4ae5-8e96-831f9de0abb5.jsonl` - Verified message structure with toolUses array
- Prior phase decisions: 10-01, 10-02, 07-02, 09-02 - Context for sequential chain implementation

### Secondary (MEDIUM confidence)
- dagre documentation: Rank-based layout automatically positions parallel nodes at same rank
- React Flow patterns: Standard onClick handler for node navigation

### Tertiary (LOW confidence)
- None - all findings verified against codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, no new dependencies
- Architecture patterns: HIGH - Patterns verified against existing codebase structure
- Pitfalls: MEDIUM-HIGH - Identified from code analysis, one (agentId matching) needs empirical testing
- Parallel detection: HIGH - JSONL structure is authoritative, toolUses array length is ground truth
- Session title extraction: HIGH - Clear path via firstUserPrompt field in Session
- SessionList grouping: LOW - Need to debug to confirm what's broken

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (30 days, stable domain)
