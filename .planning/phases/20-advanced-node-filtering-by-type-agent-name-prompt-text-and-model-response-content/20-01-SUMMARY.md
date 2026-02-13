---
phase: 20-advanced-node-filtering
plan: 01
subsystem: filtering
tags: [store, graph-layout, tree-view, content-filtering]

dependency-graph:
  requires:
    - phase-19: Subagent internal nodes with model response nodes in main graph
  provides:
    - nodeTypeFilters state and actions in Zustand store
    - Content-level filtering in graph layout timeline processing
    - Content-level filtering in tree view timeline
  affects:
    - sessionStore: Added nodeTypeFilters Map and set/clear actions
    - graphLayout: Accepts and applies nodeTypeFilters to main timeline and subagent internal nodes
    - TreeView: Reads nodeTypeFilters from store and applies to timeline
    - GraphView: Passes nodeTypeFilters to createLayoutedGraph

tech-stack:
  added:
    - Map<string, string> for per-category content filters
  patterns:
    - Two-pass filtering: category visibility (hiddenNodeTypes) then content matching (nodeTypeFilters)
    - Case-insensitive substring matching via .toLowerCase().includes()
    - Type-safe SubagentNode extraction via type predicate guards

key-files:
  created: []
  modified:
    - client/src/store/sessionStore.ts: Added nodeTypeFilters state + setNodeTypeFilter/clearNodeTypeFilter/clearAllNodeTypeFilters actions
    - client/src/utils/graphLayout.ts: Content filtering in timeline + subagent internal nodes (parallel + sequential)
    - client/src/components/TreeView.tsx: Content filtering in buildSessionTimeline function
    - client/src/components/GraphView.tsx: Pass nodeTypeFilters to createLayoutedGraph

decisions:
  - Content filters stored as Map<string, string> with category keys ('tools', 'subagents', 'prompts', 'model', 'skills')
  - Empty filter string = show all nodes in category (backward compatible, no regression)
  - Content filters only apply to visible categories (hiddenNodeTypes takes precedence)
  - Case-insensitive substring matching for all content filters
  - Tool filtering by toolName, subagent filtering by agentType+agentName, prompt filtering by promptText, model filtering by content
  - Subagent internal nodes (expanded boxes) also respect content filters for tools and model outputs

metrics:
  duration: 210s
  completed: 2026-02-13T00:19:44Z
  tasks: 2
  files: 4
---

# Phase 20 Plan 01: Add Content-Level Filtering State and Logic

**One-liner:** Content-level filtering via per-category filter strings (tool names, agent names, prompt text, model responses) with case-insensitive substring matching.

## Objective

Add content-level filtering state and logic so that each node category (tools, subagents, prompts, model, skills) can be filtered by content — not just toggled on/off. Users need to filter to specific tool names (e.g., only show Bash), specific agent names, prompt text, and model response content.

## Tasks Completed

### Task 1: Add per-category filter state to Zustand store

**Status:** ✅ Complete

**Changes:**
- Added `nodeTypeFilters: Map<string, string>` state to SessionStore interface
- Added `setNodeTypeFilter(category: string, filter: string)` action (empty string clears)
- Added `clearNodeTypeFilter(category: string)` action
- Added `clearAllNodeTypeFilters()` action
- Initialized state as `new Map<string, string>()`

**Files Modified:**
- `client/src/store/sessionStore.ts`

**Verification:** TypeScript compilation passes (`npx tsc --noEmit -p client/tsconfig.json`)

### Task 2: Apply content filters in graph layout and tree view

**Status:** ✅ Complete

**Changes:**

**In graphLayout.ts:**
- Added `nodeTypeFilters: Map<string, string>` parameter to `convertSessionToGraph()`, `convertSessionsToGraph()`, and `createLayoutedGraph()`
- Implemented two-pass filtering: first `hiddenNodeTypes` (category visibility), then `nodeTypeFilters` (content matching)
- Content filtering logic for main timeline:
  - `tool`/`tool-group`: filter by `toolName` (case-insensitive contains)
  - `subagent`: filter by `agentType`/`agentName` from SubagentNode (case-insensitive contains)
  - `user-prompt`: filter by `promptText` (case-insensitive contains)
  - `model`/`model-group`: filter by message `content` (case-insensitive contains, checks any node in group)
  - `skill`: filter by `skillName` (case-insensitive contains)
- Applied same content filtering to subagent internal nodes (expanded box children) for `tool` and `model` types
- Implemented for both parallel and sequential subagent code paths

**In TreeView.tsx:**
- Added `nodeTypeFilters: Map<string, string>` parameter to `buildSessionTimeline()`
- Read `nodeTypeFilters` from store and passed to timeline builder
- Implemented two-pass filtering (same logic as graphLayout)
- Content filtering for timeline items (tools, subagents, prompts, model, skills)
- Used TypeScript type predicate guards for SubagentNode extraction

**In GraphView.tsx:**
- Read `nodeTypeFilters` from store
- Passed to `createLayoutedGraph()` call
- Added to useMemo dependency array

**Files Modified:**
- `client/src/utils/graphLayout.ts`
- `client/src/components/TreeView.tsx`
- `client/src/components/GraphView.tsx`

**Verification:** Full build passes (`npm run build`)

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

1. ✅ TypeScript compiles without errors (`npx tsc --noEmit -p client/tsconfig.json`)
2. ✅ Full build passes (`npm run build`)
3. ✅ Store exports nodeTypeFilters state and set/clear actions
4. ✅ graphLayout.ts accepts and applies nodeTypeFilters parameter to main timeline and subagent internal nodes
5. ✅ TreeView.tsx reads nodeTypeFilters from store and applies to timeline
6. ✅ GraphView.tsx passes nodeTypeFilters to createLayoutedGraph with dependency tracking

## Success Criteria

✅ Content-level filtering logic is wired from store through graph layout and tree view
✅ Setting a filter string for a category hides non-matching nodes
✅ Empty filter = show all (no regression, backward compatible)
✅ Two-pass filtering: category visibility first, then content matching
✅ Subagent internal nodes respect content filters for tools and model outputs

## Implementation Notes

**Filtering Architecture:**

1. **Two-pass filtering model:**
   - Pass 1: `hiddenNodeTypes` — category-level visibility (entire category hidden/shown)
   - Pass 2: `nodeTypeFilters` — content-level matching within visible categories

2. **Content filter categories:**
   - `'tools'` → filters by `toolName` (ToolNode, ToolGroup)
   - `'subagents'` → filters by `agentType` + `agentName` (SubagentNode → Session)
   - `'prompts'` → filters by `promptText` (UserPromptNode)
   - `'model'` → filters by `content` (MessageNode with role='assistant')
   - `'skills'` → filters by `skillName` (SkillNode)

3. **Backward compatibility:**
   - Empty filter string = show all nodes in category
   - No change to existing behavior when nodeTypeFilters is empty Map

4. **Subagent filtering details:**
   - Main timeline: filter subagent session items by looking up corresponding SubagentNode in parent session
   - Internal nodes: filter tool/model nodes inside expanded subagent boxes
   - Both parallel and sequential subagent code paths handle filtering

5. **TypeScript type safety:**
   - Used type predicate guards `(n): n is SubagentNode` to safely access agentType/agentName
   - Prevents type errors when extracting SubagentNode from AnyNode array

## Next Steps

Phase 20 Plan 02 will add UI controls (filter input fields, filter chips) to expose the content filtering state to users.

## Self-Check

✅ PASSED

**Files verified:**
- ✅ `client/src/store/sessionStore.ts` exists and contains nodeTypeFilters state + actions
- ✅ `client/src/utils/graphLayout.ts` exists and applies nodeTypeFilters
- ✅ `client/src/components/TreeView.tsx` exists and applies nodeTypeFilters
- ✅ `client/src/components/GraphView.tsx` exists and passes nodeTypeFilters

**Build verification:**
- ✅ TypeScript compilation passes
- ✅ Full build completes successfully
- ✅ No runtime errors introduced
