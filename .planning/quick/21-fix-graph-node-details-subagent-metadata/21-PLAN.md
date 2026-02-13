---
phase: 21-fix-graph-node-details-subagent-metadata
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - client/src/components/NodeDetail.tsx
  - client/src/components/GroupDrillDownPanel.tsx
  - client/src/components/GraphView.tsx
  - client/src/utils/graphLayout.ts
  - server/src/session-discovery.ts
  - shared/src/index.ts
autonomous: true
must_haves:
  truths:
    - "Clicking a subagent node in the graph opens the detail panel with agent name, prompt, summary, tool call list, and agent color"
    - "Clicking a tool-group node in the graph opens the detail panel with a master-detail list of individual tool calls showing formatted input/output"
    - "Clicking a single tool node (rendered as tool-group with count=1) opens the detail panel with properly formatted tool input/output"
    - "Agent color field is extracted from ~/.claude/agents/*.md YAML frontmatter and passed through to SubagentNode display"
    - "Tool group detail panel shows each tool call with ToolDetailFormatter (Bash shows command, Read/Write shows file path, etc.)"
    - "Subagent detail panel shows tool calls made by the subagent with expandable list"
  artifacts:
    - path: "client/src/components/NodeDetail.tsx"
      provides: "Improved renderSubagentContent with tool calls list, improved renderToolGroupContent with ToolDetailFormatter"
    - path: "client/src/components/GroupDrillDownPanel.tsx"
      provides: "Correctly handles subagent node click showing full subagent detail"
    - path: "client/src/components/GraphView.tsx"
      provides: "Fixed subagent click handler that correctly finds and passes subagent data with tool calls"
    - path: "server/src/session-discovery.ts"
      provides: "Agent color extraction from YAML frontmatter"
    - path: "shared/src/index.ts"
      provides: "SubagentNode.agentColor field in type definition"
  key_links:
    - from: "client/src/components/GraphView.tsx"
      to: "client/src/store/sessionStore.ts"
      via: "setSelectedNodeData with enriched subagent data including tool calls and color"
      pattern: "setSelectedNodeData"
    - from: "client/src/components/NodeDetail.tsx"
      to: "client/src/utils/toolFormatters.tsx"
      via: "ToolDetailFormatter for rendering tool call details in subagent and tool-group views"
      pattern: "ToolDetailFormatter"
---

<objective>
Fix graph node detail panel display for subagents and tool groups, add agent color extraction from ~/.claude/agents/*.md, and improve the detail panel to show rich tool call information.

Purpose: Currently clicking subagent nodes often fails to show details (the click handler searches session.nodes for SubagentNode but the agentId mapping is fragile), tool group detail shows only basic info grids instead of formatted tool input/output, and agent colors are not extracted from agent definition files.

Output: Working detail panels for all graph node types with formatted tool input/output display, agent color support, and subagent tool call lists.
</objective>

<context>
@shared/src/index.ts
@client/src/components/GraphView.tsx
@client/src/components/NodeDetail.tsx
@client/src/components/GroupDrillDownPanel.tsx
@client/src/components/nodes/SubagentNode.tsx
@client/src/utils/toolFormatters.tsx
@client/src/utils/graphLayout.ts
@client/src/store/sessionStore.ts
@server/src/session-discovery.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add agent color extraction and fix subagent click handler data flow</name>
  <files>
    shared/src/index.ts
    server/src/session-discovery.ts
    client/src/components/GraphView.tsx
    client/src/utils/graphLayout.ts
  </files>
  <action>
**1. shared/src/index.ts** - Add `agentColor` field to SubagentNode interface:
```typescript
export interface SubagentNode extends HierarchyNode {
  type: 'subagent';
  agentId: string;
  agentType: string;
  agentName?: string;
  agentColor?: string;  // ADD THIS - color from ~/.claude/agents/*.md frontmatter
  description?: string;
  sourceFilePath?: string;
  prompt?: string;
  summary?: string;
  model?: string;
}
```

**2. server/src/session-discovery.ts** - Extract agent color alongside agent name from YAML frontmatter.

Modify the agent names cache to store both name and color. Change the cache type from `Map<string, string>` to `Map<string, { name: string; color?: string }>`.

In `loadAgentNames()` and `loadAgentNamesSync()`, after parsing the `name:` field from YAML frontmatter, also parse the `color:` field:
```typescript
const colorMatch = yamlContent.match(/^color:\s*(.+?)\s*$/m);
```
Store `{ name, color }` in the map.

In `buildNodes()` where SubagentNode is created (~line 477), also extract color:
```typescript
const agentInfo = agentNames.get(agentType);
const agentName = agentInfo?.name || undefined;
const agentColor = agentInfo?.color || undefined;
```
Then add `agentColor` to the SubagentNode object.

Define a color mapping function to convert named colors (cyan, green, orange, yellow, blue, purple) to hex values:
```typescript
const AGENT_COLOR_MAP: Record<string, string> = {
  cyan: '#06b6d4',
  green: '#22c55e',
  orange: '#f97316',
  yellow: '#eab308',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  red: '#ef4444',
  pink: '#ec4899',
};
```
Use this to resolve `agentColor` before storing it.

**3. client/src/utils/graphLayout.ts** - In `convertSessionToGraph`, when creating SubagentNodeData for start nodes (both parallel and sequential paths), prefer the `agentColor` from the SubagentNode in session.nodes over the generated HSL color. Update the `generateAgentColor` function:
```typescript
function generateAgentColor(agentId: string | undefined, agentType: string | undefined, resolvedColor?: string): string {
  if (resolvedColor) return resolvedColor;
  // ... existing fallback logic
}
```
Find the SubagentNode from session.nodes to get its `agentColor` and pass it through. The subagentNode is already found via `subagentNodes.find(n => n.agentId === subagent.id)` — just access `(subagentNode as any).agentColor`.

**4. client/src/components/GraphView.tsx** - Fix the subagent click handler. The current handler (lines 277-319) searches for a SubagentNode in session.nodes where `n.agentId === subagentSessionId`. The problem is `subagentSessionId` comes from `node.data.agentId` which is the subagent Session.id (a short hash like "a8818a4"), but SubagentNode.agentId in session.nodes is set to `tool.id.slice(-7)` which is the last 7 chars of the tool use UUID — these often don't match.

Fix: Instead of trying to find the SubagentNode from session.nodes, build the detail data directly from the subagent Session object and the graph node's `data`:
```typescript
} else if (node.type === 'subagent') {
  // The graph node's data already contains all needed info (populated by graphLayout.ts)
  const subagentData = node.data as SubagentNodeData;
  const subagentSessionId = subagentData.agentId;

  // Find the subagent Session to get its tool calls and metadata
  const findSubagentSession = (): Session | null => {
    const searchSession = (session: Session): Session | null => {
      for (const sub of session.subagents) {
        if (sub.id === subagentSessionId) return sub;
        const nested = searchSession(sub);
        if (nested) return nested;
      }
      return null;
    };
    for (const session of sessions) {
      const found = searchSession(session);
      if (found) return found;
    }
    return null;
  };

  const subagentSession = findSubagentSession();

  // Build a combined object for the detail panel
  // Type it as SubagentNode (from shared) enriched with extra fields
  const detailData = {
    id: subagentData.agentId || '',
    type: 'subagent' as const,
    parentId: null,
    state: subagentData.state,
    timestamp: Date.now(),
    agentId: subagentData.agentId || '',
    agentType: subagentData.agentType,
    agentName: subagentData.agentName,
    agentColor: subagentData.agentColor,
    description: subagentData.description,
    prompt: subagentData.prompt,
    summary: subagentData.summary,
    model: subagentData.model,
    sourceFilePath: subagentData.agentType !== 'Task'
      ? `~/.claude/agents/${subagentData.agentType}.md`
      : undefined,
    // Extra fields for detail panel
    toolCalls: subagentData.toolCalls,
    toolCallCount: subagentData.toolCallCount,
    // Attach the full subagent session's nodes for drill-down
    subagentNodes: subagentSession?.nodes || [],
  };

  setSelectedNodeData(detailData as any);
}
```
This approach bypasses the fragile agentId matching by using data already on the graph node.
  </action>
  <verify>
Run `npm run build` from the project root. Verify no TypeScript errors. Check that the SubagentNode type in shared/src/index.ts includes `agentColor`. Check that session-discovery.ts loadAgentNamesSync extracts both name and color.
  </verify>
  <done>
SubagentNode type has agentColor field. Server extracts agent color from YAML frontmatter. Graph layout passes resolved agent color to subagent graph nodes. Clicking a subagent node in GraphView constructs detail data from the graph node's pre-populated data rather than fragile session.nodes lookup, ensuring the detail panel always receives complete subagent information.
  </done>
</task>

<task type="auto">
  <name>Task 2: Improve NodeDetail and GroupDrillDownPanel to show rich tool call details</name>
  <files>
    client/src/components/NodeDetail.tsx
    client/src/components/GroupDrillDownPanel.tsx
  </files>
  <action>
**1. client/src/components/NodeDetail.tsx** - Import ToolDetailFormatter from utils/toolFormatters and improve three render functions:

**a) `renderSubagentContent`** - After the existing sections (Agent Info, Description, Source File, Input Prompt, Response Summary), add a "Tool Calls" section that shows the subagent's tool calls if `(node as any).toolCalls` exists:
```tsx
{(node as any).toolCalls && (node as any).toolCalls.length > 0 && (
  <div style={styles.section}>
    <div style={styles.sectionTitle}>
      Tool Calls ({(node as any).toolCallCount || (node as any).toolCalls.length})
    </div>
    <ToolCallsList
      toolCalls={(node as any).toolCalls}
      subagentNodes={(node as any).subagentNodes}
    />
  </div>
)}
```

Create a `ToolCallsList` component inside NodeDetail.tsx that renders an expandable list of tool calls. Each item shows: tool icon area (colored circle or tool name badge), tool name, input summary (from ToolCallSummary.inputSummary). When clicked, if `subagentNodes` is available, find the matching ToolNode by id and render its details using `ToolDetailFormatter`.

```tsx
function ToolCallsList({ toolCalls, subagentNodes }: {
  toolCalls: Array<{ id: string; toolName: string; inputSummary: string; state: string }>;
  subagentNodes?: AnyNode[];
}) {
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
                <ToolDetailFormatter toolNode={fullNode as ToolNode} />
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
```

Also show agent color as a colored circle in the header if `(node as any).agentColor` exists:
In the renderSubagentContent info grid, add:
```tsx
{(node as any).agentColor && (
  <>
    <span style={styles.infoLabel}>Agent Color:</span>
    <span style={styles.infoValue}>
      <span style={{
        display: 'inline-block',
        width: '14px',
        height: '14px',
        borderRadius: '50%',
        backgroundColor: (node as any).agentColor,
        verticalAlign: 'middle',
        marginRight: '6px',
      }} />
      {(node as any).agentColor}
    </span>
  </>
)}
```

**b) `renderToolGroupContent`** - Replace the current basic tool call list with one that uses ToolDetailFormatter for each tool. Change the tool calls section to be an expandable list similar to ToolCallsList above. Each tool call item should be clickable to expand and show `ToolDetailFormatter` with the full ToolNode data (the `node.nodes` array already contains the full ToolNode objects):

Replace the existing tool calls section (lines 604-619):
```tsx
{node.count > 0 && (
  <div style={styles.section}>
    <div style={styles.sectionTitle}>Tool Calls ({node.count})</div>
    <ToolGroupCallsList tools={node.nodes} />
  </div>
)}
```

Create `ToolGroupCallsList` component:
```tsx
function ToolGroupCallsList({ tools }: { tools: ToolNode[] }) {
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
```

Import `ToolDetailFormatter` at the top of NodeDetail.tsx:
```typescript
import { ToolDetailFormatter } from '../utils/toolFormatters';
```

Import `ToolNode as ToolNodeType` from shared for type casting:
```typescript
import type { AnyNode, Session, SessionState, ToolGroup, ToolNode as ToolNodeType } from 'shared';
```

**2. client/src/components/GroupDrillDownPanel.tsx** - Fix the subagent header title to use agentName when available:

In the `if (selectedNodeData && !toolGroup)` block, update the subagent case (line 109-110):
```typescript
case 'subagent':
  headerTitle = `Subagent: ${(selectedNodeData as any).agentName || (selectedNodeData as SubagentNode).agentType}`;
  break;
```

Also for tool type, improve the header:
```typescript
case 'tool':
  headerTitle = `Tool: ${(selectedNodeData as ToolNode).toolName}`;
  break;
case 'tool-group':
  headerTitle = `${(selectedNodeData as any).toolName} (${(selectedNodeData as any).count} calls)`;
  break;
```

The `tool-group` case needs to be added since when a tool-group node is clicked, selectedNodeData has type='tool-group' but the switch only handles session/message/skill/subagent/tool. Add the tool-group case in the switch.

Also remove the "No Summary" warning section from renderSubagentContent in NodeDetail.tsx (lines 535-540) since it's noisy and summary may legitimately be absent for active subagents.
  </action>
  <verify>
Run `npm run build` from the project root. Verify no TypeScript errors. Visually inspect that NodeDetail.tsx has the ToolCallsList and ToolGroupCallsList components. Verify the import of ToolDetailFormatter is present. Check that GroupDrillDownPanel handles 'tool-group' type in its header switch.
  </verify>
  <done>
Subagent detail panel shows: agent info with color swatch, prompt, summary, and expandable tool calls list where each call can be clicked to see formatted input/output via ToolDetailFormatter. Tool group detail panel shows: group info and expandable list of individual tool calls with formatted input/output. GroupDrillDownPanel header correctly shows agent name for subagents and handles tool-group type. The "No Summary" warning is removed.
  </done>
</task>

</tasks>

<verification>
1. `npm run build` completes without errors
2. In the running app, click a subagent node in the graph - detail panel should open showing agent info, prompt/summary, and expandable tool call list
3. Click a tool-group node in the graph - detail panel should show group info and expandable list of calls with ToolDetailFormatter rendering
4. Click a single tool node (count=1) - detail panel should show formatted tool input/output
5. For agents defined in ~/.claude/agents/*.md with a `color:` field in frontmatter, the subagent node should display that color instead of the HSL hash fallback
</verification>

<success_criteria>
- All graph node types (session, subagent, tool, tool-group, skill) open a detail panel when clicked
- Subagent detail shows agent name, color, prompt, summary, and tool calls list
- Tool group detail shows expandable list with ToolDetailFormatter for each call
- Agent colors from ~/.claude/agents/*.md are displayed on subagent nodes
- No TypeScript build errors
</success_criteria>

<output>
After completion, create `.planning/quick/21-fix-graph-node-details-subagent-metadata/21-SUMMARY.md`
</output>
