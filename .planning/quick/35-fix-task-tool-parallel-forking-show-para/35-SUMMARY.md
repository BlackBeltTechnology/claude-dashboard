# Quick Task 35: Fix Task Tool Parallel Forking

## Changes

### 1. ParentId-based parallel subagent detection (`client/src/utils/graphLayout.ts`)

**Problem:** `detectParallelSubagentGroups` only used timestamp proximity (10s window) to detect parallel subagents. When Task tools are spawned in the same assistant message, they share the same `parentId` (assistant message UUID), but this wasn't used.

**Fix:** Added parentId-based detection as the primary method:
- For each subagent session, find its corresponding `SubagentNode` by matching `agentId === subagent.id`
- Group subagents whose SubagentNodes share the same `parentId`
- Groups with 2+ members are parallel spawns
- Timestamp proximity kept as fallback for backward compatibility

### 2. Hide TaskOutput tool calls (`server/src/session-discovery.ts`)

**Problem:** `TaskOutput` tool calls appeared as separate sequential tool nodes in the graph, but they're just polling/collecting results from already-displayed subagent boxes.

**Fix:** Added `TaskOutput` skip in `buildNodes()` — when a tool use has `name === 'TaskOutput'`, skip creating a ToolNode for it (continue to next tool).

## Files Modified

| File | Change |
|------|--------|
| `client/src/utils/graphLayout.ts` | Enhanced `detectParallelSubagentGroups` with parentId grouping + updated call site |
| `server/src/session-discovery.ts` | Skip TaskOutput tool calls in buildNodes |

## Verification

- Build succeeds with no TypeScript errors
