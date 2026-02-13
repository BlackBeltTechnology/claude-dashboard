---
phase: quick-10-node-glitches
plan: 1
type: execute
wave: 1
depends_on: []
files_modified: ["client/src/utils/graphLayout.ts", "client/src/components/nodes/SubagentNode.tsx"]
autonomous: true
must_haves:
  truths:
    - "New tool calls append to the end without causing visual glitches"
    - "React uses stable keys for tool calls"
  artifacts:
    - path: "client/src/utils/graphLayout.ts"
      contains: "id: string;"
    - path: "client/src/components/nodes/SubagentNode.tsx"
      contains: "key={tool.id}"
  key_links:
    - from: "extractToolCallSummaries"
      to: "ToolCallSummary"
      via: "returns array with id field"
    - from: "SubagentNode tool rendering"
      to: "ToolCallSummary"
      via: "uses tool.id as key"
---

<objective>
Fix the node glitching issue when new tool calls are added by using stable React keys based on tool IDs instead of array indices.
</objective>

<execution_context>
The SubagentNode component renders tool calls using `{data.toolCalls.map((tool, idx) => ... key={idx})}`. When new tool calls arrive via WebSocket updates, the array indices shift, causing React to re-render all tool call elements instead of just appending the new one, resulting in a visible glitch.
</execution_context>

<context>
@client/src/utils/graphLayout.ts
@client/src/components/nodes/SubagentNode.tsx
@shared/src/index.ts
</context>

<tasks>

<task type="auto">
  <name>Add id field to ToolCallSummary interface</name>
  <files>client/src/utils/graphLayout.ts</files>
  <action>Update the ToolCallSummary interface (lines 17-22) to include an id field:
```typescript
export interface ToolCallSummary {
  id: string;
  toolName: string;
  inputSummary: string;
  state: SessionState;
}
```</action>
  <verify>TypeScript compilation passes with no errors</verify>
  <done>ToolCallSummary interface includes stable id field</done>
</task>

<task type="auto">
  <name>Update extractToolCallSummaries to include tool ID</name>
  <files>client/src/utils/graphLayout.ts</files>
  <action>Modify the extractToolCallSummaries function to include the tool node's id when creating summaries. Update the summaries.push call (lines 92-96) to include the id:
```typescript
summaries.push({
  toolName,
  inputSummary,
  state: toolNode.state,
  id: toolNode.id,  // Add this line
});
```</action>
  <verify>TypeScript compilation passes, extractToolCallSummaries returns objects with id field</verify>
  <done>Each ToolCallSummary includes the unique tool node ID</done>
</task>

<task type="auto">
  <name>Update SubagentNode to use stable tool ID as React key</name>
  <files>client/src/components/nodes/SubagentNode.tsx</files>
  <action>Change the tool calls mapping to use tool.id instead of idx as the React key. On line 279, change:
```typescript
{data.toolCalls.map((tool, idx) => {
```
to:
```typescript
{data.toolCalls.map((tool) => {
```

And on line 282, change the key prop from `key={idx}` to `key={tool.id}`. This ensures React can track tool calls by their stable identity instead of array position.</action>
  <verify>TypeScript compilation passes, component renders without errors</verify>
  <done>New tool calls append smoothly without causing visual glitches</done>
</task>

</tasks>

<verification>
1. Verify TypeScript compilation succeeds
2. Check that ToolCallSummary interface includes id field
3. Confirm extractToolCallSummaries returns objects with id
4. Ensure SubagentNode uses tool.id as key in map function
</verification>

<success_criteria>
- Tool calls use stable IDs as React keys
- New tool calls append to existing nodes without re-rendering all tool call elements
- No visual glitching when tool calls are added
</success_criteria>

<output>
After completion, create .planning/quick/10-the-node-glitches-when-a-new-tool-call-i/10-SUMMARY.md
</output>
