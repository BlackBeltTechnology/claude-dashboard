---
phase: 16-fix-agent-node-rendering-to-show-agent-n
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: ["shared/src/index.ts", "server/src/session-discovery.ts", "client/src/components/nodes/SubagentNode.tsx"]
autonomous: true

must_haves:
  truths:
    - "Agent nodes display readable names like 'gsd-planner' instead of hashes like 'a102c2c'"
    - "Agent name extraction works from ~/.claude/agents/*.md definition files"
    - "Fallback behavior preserved: agentName → agentId → agentType → label"
    - "Agent color coding continues to function correctly"
  artifacts:
    - path: "shared/src/index.ts"
      provides: "SubagentNode interface with agentName field"
      contains: "agentName?: string;"
    - path: "server/src/session-discovery.ts"
      provides: "Agent name extraction and population logic"
      contains: "loadAgentNames"
    - path: "client/src/components/nodes/SubagentNode.tsx"
      provides: "Agent node UI rendering with name display"
      contains: "data.agentName"
  key_links:
    - from: "server/src/session-discovery.ts"
      to: "shared/src/index.ts"
      via: "SubagentNode interface usage"
      pattern: "SubagentNode.*agentName"
    - from: "client/src/components/nodes/SubagentNode.tsx"
      to: "shared/src/index.ts"
      via: "TypeScript interface import"
      pattern: "import.*SubagentNode"
---

<objective>
Fix agent node rendering to display readable agent NAMES instead of IDs by extracting names from ~/.claude/agents/*.md definition files.
</objective>

<execution_context>
@/home/botond/.claude/get-shit-done/workflows/execute-plan.md
@/home/botond/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/home/botond/.claude/STATE.md
@/home/botond/.claude/agents/*.md (agent definition files with YAML frontmatter containing 'name' field)
@/home/botond/claude-session-dashboard/client/src/components/nodes/SubagentNode.tsx (currently displays agentId which shows as hash)
@/home/botond/claude-session-dashboard/server/src/session-discovery.ts (creates SubagentNode data)
@/home/botond/claude-session-dashboard/shared/src/index.ts (SubagentNode interface)
</context>

<tasks>

<task type="auto">
  <name>Add agentName field to SubagentNode interface</name>
  <files>shared/src/index.ts</files>
  <action>
    Add `agentName?: string;` field to the SubagentNode interface (after agentType field) to store the readable agent name extracted from definition files.
  </action>
  <verify>TypeScript compilation passes without errors</verify>
  <done>SubagentNode interface includes agentName field for storing readable names</done>
</task>

<task type="auto">
  <name>Create agent name extraction function</name>
  <files>server/src/session-discovery.ts</files>
  <action>
    Add new function `loadAgentNames()` that:
    1. Reads all .md files from ~/.claude/agents/
    2. Parses YAML frontmatter to extract the 'name' field from each file
    3. Returns a Map<string, string> mapping agent filenames to names
    4. Caches the result for performance

    Also add helper function `extractAgentNameFromPath()` to convert agent filenames like 'gsd-planner.md' to 'gsd-planner'.
  </action>
  <verify>Function can be called without errors and returns a Map of agent names</verify>
  <done>Agent name extraction utility ready for use in session discovery</done>
</task>

<task type="auto">
  <name>Update session-discovery to populate agentName field</name>
  <files>server/src/session-discovery.ts</files>
  <action>
    In the `buildNodes()` function where SubagentNode is created (around line 375-390):
    1. Call `loadAgentNames()` to get the agent name mapping
    2. Determine agent name by checking if agentType matches any agent definition name
    3. Set the `agentName` field on the SubagentNode object
    4. Fallback to agentType if no matching definition found

    Also update the `discoverSubagents()` function similarly to populate agentName for subagent sessions.
  </action>
  <verify>SubagentNode objects created with agentName field populated from definitions</verify>
  <done>Session discovery extracts and stores agent names from definition files</done>
</task>

<task type="auto">
  <name>Update SubagentNode component to display agentName</name>
  <files>client/src/components/nodes/SubagentNode.tsx</files>
  <action>
    Update the title display logic (around line 256-258):
    1. Change from `{data.agentId || data.agentType || data.label}`
    2. To: `{data.agentName || data.agentId || data.agentType || data.label}`
    3. This prioritizes agentName, then falls back to agentId, then agentType, then label

    Ensure the agent color circle logic (line 229-254) continues to work correctly with the agentName display.
  </action>
  <verify>Component renders with agentName displayed instead of agentId when available</verify>
  <done>SubagentNode component shows readable agent names from definitions</done>
</task>

</tasks>

<verification>
- Agent nodes display names like "gsd-planner", "doc-structure-explorer" instead of hashes like "a102c2c"
- Fallback behavior works: agentId → agentType → label if no definition found
- TypeScript compilation succeeds
- Agent color coding still functions correctly
</verification>

<success_criteria>
Agent nodes in the UI show readable names from ~/.claude/agents/*.md definition files instead of short hash IDs, improving usability and clarity for users.
</success_criteria>

<output>
After completion, create `.planning/quick/16-fix-agent-node-rendering-to-show-agent-n/16-SUMMARY.md`
</output>
