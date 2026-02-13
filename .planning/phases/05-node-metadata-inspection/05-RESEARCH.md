# Phase 5: Node Metadata Inspection - Research

**Researched:** 2026-02-09
**Domain:** JSONL session file format, Claude Code filesystem structure
**Confidence:** HIGH

## Summary

Claude Code session metadata is stored in JSONL files at `~/.claude/projects/{project-hash}/{session-id}.jsonl`. Each line is a JSON object representing events (user messages, assistant messages, tool invocations, tool results). The JSONL format contains rich metadata that is currently parsed but not fully exposed in the UI.

**Current state:** The dashboard already parses JSONL, extracts tool_use blocks, and displays input/output for regular tools (Bash, Read, Write, etc.) via `GroupDrillDownPanel`. However, Skills and Subagents have limited metadata extraction, and source file paths are not exposed.

**Key discoveries:**
1. Skills and subagents can be linked to source files via filesystem conventions (`~/.claude/skills/{skill-name}/SKILL.md`, `~/.claude/agents/{agent-type}.md`)
2. Tool results contain additional metadata fields (stdout/stderr, timing, error state) not currently displayed
3. The existing parser already extracts most data — the gap is primarily in the UI layer
4. Skills use `toolUseResult.success` and `toolUseResult.commandName` fields (not currently parsed)
5. Subagent prompts are stored in subagent JSONL files and can be extracted

**Primary recommendation:** Extend the existing type system to include missing metadata fields (stdout/stderr separation, execution timing, error details), add source file path resolution logic, and create node-specific detail formatters for Skills and Subagents analogous to the existing tool formatters.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js fs/promises | Built-in | File I/O for reading JSONL and source files | Native async filesystem access |
| path module | Built-in | Path manipulation for resolving source file locations | Standard Node.js path handling |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| JSON.parse | Built-in | JSONL line parsing | Already used in jsonl-parser.ts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Built-in fs | third-party parsers | Unnecessary dependency for simple file reads |

**Installation:**
No new dependencies required — use existing Node.js built-ins.

## Architecture Patterns

### Recommended Project Structure
Current structure is well-suited:
```
shared/src/
├── index.ts           # Type definitions (extend existing node types)
server/src/
├── jsonl-parser.ts    # JSONL parsing (extend ParsedEntry type)
├── session-discovery.ts # Node building (extend buildNodes function)
client/src/
├── components/
│   ├── NodeDetail.tsx         # Currently empty — implement here
│   └── GroupDrillDownPanel.tsx # Existing tool detail panel — reuse pattern
├── utils/
│   ├── toolFormatters.tsx     # Existing — add skill/subagent formatters
│   └── sourceFileResolver.ts  # NEW — resolve paths to SKILL.md / agent .md files
```

### Pattern 1: Type Extension (Not Replacement)
**What:** Extend existing ToolNode, SkillNode, SubagentNode types with optional metadata fields
**When to use:** When adding new fields that aren't always present in older JSONL files
**Example:**
```typescript
// In shared/src/index.ts
export interface ToolNode extends HierarchyNode {
  type: 'tool';
  toolName: string;
  input: Record<string, unknown>;
  output?: string;

  // NEW metadata fields (optional for backward compatibility)
  stdout?: string;
  stderr?: string;
  isError?: boolean;
  requestId?: string;
  cwd?: string;
  gitBranch?: string;
}

export interface SkillNode extends HierarchyNode {
  type: 'skill';
  skillName: string;
  args?: string;

  // NEW metadata fields
  sourceFilePath?: string;  // Resolved from ~/.claude/skills/{skillName}/SKILL.md
  commandName?: string;      // From toolUseResult.commandName
  success?: boolean;         // From toolUseResult.success
  prompt?: string;           // Input prompt to skill
  result?: string;           // Output result from skill
}

export interface SubagentNode extends HierarchyNode {
  type: 'subagent';
  agentId: string;
  agentType: string;
  description?: string;

  // NEW metadata fields
  sourceFilePath?: string;   // Resolved from ~/.claude/agents/{agentType}.md
  prompt?: string;           // Full input prompt to subagent
  model?: string;            // Model used for subagent
}
```

### Pattern 2: Source File Path Resolution
**What:** Map node types to filesystem locations using naming conventions
**When to use:** When displaying source files for skills and subagents
**Example:**
```typescript
// In client/src/utils/sourceFileResolver.ts
// Source: Research of ~/.claude/ filesystem structure

export function resolveSkillSourcePath(skillName: string): string {
  return `~/.claude/skills/${skillName}/SKILL.md`;
}

export function resolveAgentSourcePath(agentType: string): string {
  return `~/.claude/agents/${agentType}.md`;
}

export function resolveToolSourcePath(toolName: string): string | null {
  // Built-in tools don't have source files
  return null;
}
```

### Pattern 3: Metadata Enrichment Pipeline
**What:** Three-stage pipeline for adding metadata: parse → enrich → display
**When to use:** When JSONL data needs enrichment with filesystem data
**Example:**
```typescript
// Stage 1: Parse (server/src/jsonl-parser.ts)
// Extract all fields from JSONL entries

// Stage 2: Enrich (server/src/session-discovery.ts)
// Add computed fields like source file paths, resolve relationships

// Stage 3: Display (client/src/components/)
// Format for human consumption
```

### Anti-Patterns to Avoid
- **Fetching source files on every render:** Resolve paths once during node creation, fetch file contents only on user click
- **Blocking on missing files:** Source files may not exist (deleted, moved) — handle gracefully with "File not found" message
- **Parsing JSONL client-side:** All JSONL parsing must remain server-side for security and performance

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reading JSONL lines | Custom line parser | Existing parseJSONL function | Already handles malformed lines gracefully |
| Tool detail formatting | Generic JSON.stringify | Existing ToolDetailFormatter | Tool-specific formatters provide better UX |
| Click-outside detection | Custom event listeners | Existing useClickOutside hook | Handles cleanup and stale closures correctly |
| Path resolution | String concatenation | Node.js path.join() | Handles platform differences (Windows/Unix) |

**Key insight:** The codebase already has robust patterns for parsing, formatting, and UI interactions. Follow existing patterns rather than introducing new approaches.

## Common Pitfalls

### Pitfall 1: Assuming Source Files Always Exist
**What goes wrong:** Code crashes or shows broken UI when SKILL.md or agent .md files are missing
**Why it happens:** Skills/agents can be deleted, renamed, or moved after session files are created
**How to avoid:**
- Make sourceFilePath optional (TypeScript `?` operator)
- Check file existence before displaying "View Source" link
- Show graceful error: "Source file not found: ~/.claude/skills/foo/SKILL.md"
**Warning signs:** Try block without catch, no error state in component

### Pitfall 2: Confusing Tool Results with Tool Output
**What goes wrong:** Displaying `toolUseResult` object instead of parsed stdout/stderr
**Why it happens:** JSONL has both `message.content[].content` (string) and top-level `toolUseResult` (object with stdout/stderr)
**How to avoid:**
- For Bash: Show `toolUseResult.stdout` and `toolUseResult.stderr` separately
- For Read: Show `message.content[].content` (file contents)
- For Skills: Show `toolUseResult.commandName` and result message
**Warning signs:** Seeing `[object Object]` in UI, showing JSON structure to users

### Pitfall 3: Not Handling Skills Specially
**What goes wrong:** Treating Skills like regular tools (Bash, Read, etc.)
**Why it happens:** Skills use tool_use blocks but have different semantics — they spawn separate processes
**How to avoid:**
- Check `tool.name === 'Skill'` in parser
- Extract `input.skill` field (skill name), not full input object
- Parse `toolUseResult.success` and `toolUseResult.commandName` fields
- Link to `~/.claude/skills/{skill-name}/SKILL.md`
**Warning signs:** Skill nodes showing `{"skill": "name"}` instead of just skill name

### Pitfall 4: Subagent Data Location Confusion
**What goes wrong:** Looking for subagent prompt in parent session JSONL instead of subagent's own JSONL
**Why it happens:** Tool_use block in parent has minimal data; full conversation is in `{session-id}/subagents/agent-{id}.jsonl`
**How to avoid:**
- Extract `agentId` from subagent node
- Read subagent JSONL file from `~/.claude/projects/{project}/{session}/subagents/agent-{agentId}.jsonl`
- Parse first entry (type=user) for full input prompt
- Parse entries for subagent's own tool calls and responses
**Warning signs:** Subagent detail panel showing only description, not full conversation

### Pitfall 5: Exposing Raw Timestamps
**What goes wrong:** Showing "2026-02-09T06:54:05.504Z" instead of human-readable time
**Why it happens:** JSONL stores ISO 8601 timestamps
**How to avoid:**
- Use `new Date(timestamp).toLocaleTimeString()` for time-of-day
- Use `new Date(timestamp).toLocaleString()` for full date+time
- Existing code already does this in GroupDrillDownPanel line 99
**Warning signs:** ISO format strings in UI

## Code Examples

Verified patterns from official sources:

### Parsing Tool Results with Extended Metadata
```typescript
// Source: server/src/jsonl-parser.ts (lines 148-154) + research findings

// Current code extracts basic tool result:
if (raw.toolUseResult !== undefined && raw.sourceToolAssistantUUID) {
  parsed.toolResult = {
    toolUseId: raw.sourceToolAssistantUUID,
    content: raw.toolUseResult,
    isError: raw.toolUseResult.startsWith('Error:'),
  };
}

// EXTEND to capture stdout/stderr for Bash tools:
if (raw.toolUseResult !== undefined && raw.sourceToolAssistantUUID) {
  const result = raw.toolUseResult;
  parsed.toolResult = {
    toolUseId: raw.sourceToolAssistantUUID,
    content: typeof result === 'string' ? result : JSON.stringify(result),
    isError: typeof result === 'string' ? result.startsWith('Error:') : false,
    // NEW: Extract structured data
    stdout: result?.stdout,
    stderr: result?.stderr,
    interrupted: result?.interrupted,
  };
}
```

### Building Skill Nodes with Metadata
```typescript
// Source: server/src/session-discovery.ts (lines 298-326) + JSONL research

// Current code doesn't parse Skills specially
// EXTEND buildNodes to detect Skills:

if (entry.toolUses && entry.toolUses.length > 0) {
  for (const tool of entry.toolUses) {
    if (tool.name === 'Task') {
      // Existing Task handling...
    } else if (tool.name === 'Skill') {
      // NEW: Handle Skill invocations
      const skillNode: SkillNode = {
        id: tool.id,
        type: 'skill',
        parentId: entry.uuid,
        state,
        timestamp: entry.timestamp,
        skillName: (tool.input.skill as string) || 'unknown',
        sourceFilePath: `~/.claude/skills/${tool.input.skill}/SKILL.md`,
      };
      nodes.push(skillNode);
    } else {
      // Regular tool call...
    }
  }
}
```

### Node Detail Component Pattern
```typescript
// Source: client/src/components/GroupDrillDownPanel.tsx (pattern) + new logic
// Currently: GroupDrillDownPanel shows tool groups
// NEW: NodeDetailPanel shows single node (any type)

interface NodeDetailPanelProps {
  node: AnyNode;
  onClose: () => void;
}

export function NodeDetailPanel({ node, onClose }: NodeDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useClickOutside(panelRef, onClose);

  return (
    <div ref={panelRef} style={panelStyles.panel}>
      <div style={panelStyles.header}>
        <h3>{getNodeTitle(node)}</h3>
        <button onClick={onClose}>X</button>
      </div>

      <div style={panelStyles.content}>
        {node.type === 'tool' && <ToolDetailFormatter toolNode={node} />}
        {node.type === 'skill' && <SkillDetailFormatter skillNode={node} />}
        {node.type === 'subagent' && <SubagentDetailFormatter subagentNode={node} />}
        {node.type === 'message' && <MessageDetailFormatter messageNode={node} />}
      </div>
    </div>
  );
}
```

### Skill Detail Formatter
```typescript
// Source: client/src/utils/toolFormatters.tsx (pattern) + new implementation

export function SkillDetailFormatter({ skillNode }: { skillNode: SkillNode }) {
  return (
    <div>
      <Section label="Skill Name">
        <InlineCode>{skillNode.skillName}</InlineCode>
      </Section>

      {skillNode.sourceFilePath && (
        <Section label="Source File">
          <FilePath>{skillNode.sourceFilePath}</FilePath>
          <Button onClick={() => window.api?.openFile(skillNode.sourceFilePath)}>
            View Source
          </Button>
        </Section>
      )}

      {skillNode.prompt && (
        <Section label="Input">
          <CodeBlock>{skillNode.prompt}</CodeBlock>
        </Section>
      )}

      {skillNode.result && (
        <Section label="Output">
          <OutputBlock>{skillNode.result}</OutputBlock>
        </Section>
      )}

      <Section label="Status">
        <StatusBadge success={skillNode.success}>
          {skillNode.success ? 'Success' : 'Failed'}
        </StatusBadge>
      </Section>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tool groups only | Individual node inspection | Phase 5 | Users can inspect any node, not just groups |
| Raw JSON output | Formatted tool-specific output | Phase 4 (2026-02-06) | Better readability |
| UUID session names | Directory names | Phase 3 (2026-02-06) | Recognizable sessions |

**Deprecated/outdated:**
- None — all existing patterns are current and should be followed

## Open Questions

Things that couldn't be fully resolved:

1. **Skills with arguments**
   - What we know: Skills can take arguments via `input.skill` field (e.g., `{skill: "cli-tester"}`)
   - What's unclear: Are there multi-argument skills? How are args passed?
   - Recommendation: Check SKILL.md frontmatter `argument-hint` field for expected format

2. **Subagent nesting depth**
   - What we know: Code comment says "Nested subagents not currently supported" (session-discovery.ts:438)
   - What's unclear: Can subagents spawn their own subagents? How deep does nesting go?
   - Recommendation: Document this limitation in UI ("Nested subagents not displayed")

3. **Tool result timing data**
   - What we know: JSONL has timestamps for tool_use and tool_result as separate entries
   - What's unclear: Is execution duration computed? Where is it stored?
   - Recommendation: Compute duration as `toolResultTimestamp - toolUseTimestamp` on client side

4. **Source file viewing in browser**
   - What we know: Source files are at `~/.claude/skills/`, `~/.claude/agents/`
   - What's unclear: Should browser display file contents inline, or link to filesystem?
   - Recommendation: Add API endpoint `/api/source-file?path={path}` to serve file contents safely (prevent path traversal attacks)

## Sources

### Primary (HIGH confidence)
- Direct examination of JSONL files in `~/.claude/projects/`
- Existing codebase: `shared/src/index.ts`, `server/src/jsonl-parser.ts`, `server/src/session-discovery.ts`
- Filesystem verification: `~/.claude/skills/`, `~/.claude/agents/`

### Secondary (MEDIUM confidence)
- None

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- JSONL structure: HIGH - Directly examined multiple session files
- Source file paths: HIGH - Verified filesystem structure exists
- Type definitions: HIGH - Examined existing codebase types
- UI patterns: HIGH - Reviewed existing GroupDrillDownPanel and formatters

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (30 days - JSONL format is stable)

---

## Key JSONL Metadata Fields Reference

For planner reference, here are all metadata fields available in JSONL entries:

### Top-Level Entry Fields
```typescript
{
  uuid: string;              // Unique entry ID
  parentUuid: string | null; // Parent entry (threading)
  type: 'user' | 'assistant' | 'progress' | 'result' | 'summary';
  timestamp: string;         // ISO 8601 format
  sessionId: string;         // Session UUID
  agentId?: string;          // For subagent entries
  isSidechain: boolean;      // true for subagents
  cwd: string;               // Working directory
  gitBranch?: string;        // Git branch name
  version: string;           // Claude Code version
  requestId?: string;        // API request ID
  slug?: string;             // Session slug (human-readable)
}
```

### Tool Use Block (in message.content[])
```typescript
{
  type: 'tool_use';
  id: string;                // Tool use ID (toolu_...)
  name: string;              // Tool name (Bash, Read, Skill, Task, etc.)
  input: Record<string, unknown>; // Tool-specific parameters
}
```

### Tool Result Block (in message.content[])
```typescript
{
  type: 'tool_result';
  tool_use_id: string;       // Matches tool_use.id
  content: string;           // Result content (may be empty for structured results)
  is_error: boolean;         // Error flag
}

// ALSO at top level:
toolUseResult: {
  stdout?: string;           // For Bash tools
  stderr?: string;           // For Bash tools
  interrupted?: boolean;     // For Bash tools
  success?: boolean;         // For Skill tools
  commandName?: string;      // For Skill tools
}
```

### Skill Tool Use
```typescript
// Tool use block:
{
  type: 'tool_use',
  name: 'Skill',
  input: {
    skill: string;           // Skill name (e.g., "cli-tester")
  }
}

// Tool result:
toolUseResult: {
  success: boolean;
  commandName: string;       // Skill name
}
```

### Subagent (Task) Tool Use
```typescript
// Tool use block:
{
  type: 'tool_use',
  name: 'Task',
  input: {
    description: string;     // Brief description
    subagent_type: string;   // Agent type (e.g., "gsd-phase-researcher")
    model?: string;          // Model override ("sonnet", "opus", etc.)
    prompt: string;          // Full input prompt
  }
}

// Subagent JSONL location:
// ~/.claude/projects/{project}/{session}/subagents/agent-{agentId}.jsonl
```

### Currently NOT Exposed in UI
- `requestId` - API request correlation
- `version` - Claude Code version
- `slug` - Human-readable session slug
- `toolUseResult.stdout` / `stderr` - Separated for Bash
- `toolUseResult.interrupted` - Process interruption flag
- Source file paths (derived, not in JSONL)
- Subagent full prompt (in subagent JSONL, not parent)
