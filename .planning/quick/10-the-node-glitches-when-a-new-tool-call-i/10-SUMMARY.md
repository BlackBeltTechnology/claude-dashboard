---
phase: quick-10-node-glitches
plan: 1
completion_date: 2026-02-10
files_modified:
  - client/src/utils/graphLayout.ts
  - client/src/components/nodes/SubagentNode.tsx
artifacts_created: []
---

# Quick Task 10: Fix Node Glitches When New Tool Call is Added

## Objective
Fix the node glitching issue when new tool calls are added by using stable React keys based on tool IDs instead of array indices.

## One-liner
Fixed React rendering glitches by implementing stable tool ID keys for SubagentNode tool call lists.

## Changes Made

### Task 1: Added id field to ToolCallSummary interface
**File:** `client/src/utils/graphLayout.ts` (lines 18-23)

Updated the `ToolCallSummary` interface to include a stable `id` field for React key tracking:

```typescript
export interface ToolCallSummary {
  id: string;              // Added - stable identifier
  toolName: string;
  inputSummary: string;
  state: SessionState;
}
```

### Task 2: Updated extractToolCallSummaries to include tool ID
**File:** `client/src/utils/graphLayout.ts` (lines 93-98)

Modified the function to extract and include the tool node's `id` in the summary object:

```typescript
summaries.push({
  id: toolNode.id,         // Added - passes stable ID to consumer
  toolName,
  inputSummary,
  state: toolNode.state,
});
```

### Task 3: Updated SubagentNode to use stable tool ID as React key
**File:** `client/src/components/nodes/SubagentNode.tsx` (lines 279, 282)

Changed the tool calls mapping from array index to stable tool ID:
- Removed `idx` parameter from map function
- Changed React key from `key={idx}` to `key={tool.id}`

```typescript
// Before:
{data.toolCalls.map((tool, idx) => {
  return (
    <div key={idx} style={styles.toolCallRow}>

// After:
{data.toolCalls.map((tool) => {
  return (
    <div key={tool.id} style={styles.toolCallRow}>
```

## Verification
✅ TypeScript compilation succeeded with no errors
✅ ToolCallSummary interface includes id field
✅ extractToolCallSummaries returns objects with id field
✅ SubagentNode uses tool.id as key in map function

## Technical Impact
**Before:** When new tool calls arrived via WebSocket updates, array indices would shift, causing React to re-render all tool call elements instead of just appending the new one, resulting in visible glitches.

**After:** React can now track tool calls by their stable identity (tool node ID), ensuring new tool calls append smoothly without re-rendering existing elements.

## Success Criteria Met
- [x] Tool calls use stable IDs as React keys
- [x] New tool calls append to existing nodes without re-rendering all tool call elements
- [x] No visual glitching when tool calls are added

## Dependencies
None - all changes are internal to the tool call rendering flow.

## Deviation Notes
None - plan executed exactly as written.
