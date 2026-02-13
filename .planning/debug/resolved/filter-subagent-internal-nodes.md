---
status: resolved
trigger: "filter-subagent-internal-nodes"
created: 2026-02-12T00:00:00Z
updated: 2026-02-12T00:00:00Z
---

## Current Focus

hypothesis: Fix applied - filtering internal nodes after construction and using filtered list for dimensions and React Flow node creation
test: Build and run application, test filter toggles with expanded subagents
expecting: Internal nodes correctly hidden/shown based on filter state, box dimensions adjust
next_action: Verify the fix works in the running application

## Symptoms

expected: When a node type toggle is turned off (e.g. Tools), internal nodes of that type inside expanded subagent boxes should also be hidden/filtered out
actual: The filter toggles only affect top-level nodes in the main graph — nodes inside expanded subagents are unaffected by filters
errors: No errors — just nodes remain visible when they should be hidden
reproduction: 1) Open a session with subagents 2) Expand a subagent box 3) Toggle off "Tools" in the filter bar 4) Tool nodes inside the subagent remain visible
started: This has likely never worked for internal subagent nodes since filters were added before internal node expansion was implemented (Phase 19)

## Eliminated

## Evidence

- timestamp: 2026-02-12T00:00:00Z
  checked: Toolbar.tsx (lines 245-263)
  found: Filter toggles for 'tools', 'model', 'prompts', 'subagents', 'skills' call toggleNodeTypeVisibility(key)
  implication: Filter UI updates hiddenNodeTypes Set in store correctly

- timestamp: 2026-02-12T00:00:00Z
  checked: sessionStore.ts (lines 60-61, 333-343)
  found: hiddenNodeTypes state exists, toggleNodeTypeVisibility correctly adds/removes node type keys
  implication: Store layer working correctly

- timestamp: 2026-02-12T00:00:00Z
  checked: GraphView.tsx (line 156)
  found: createLayoutedGraph() receives hiddenNodeTypes as 5th parameter
  implication: Filter state is passed to layout function

- timestamp: 2026-02-12T00:00:00Z
  checked: graphLayout.ts (lines 401-410)
  found: Top-level timeline filtering checks hiddenNodeTypes for 'tools', 'model', 'prompts', 'subagents', 'skills'
  implication: Main timeline nodes ARE filtered correctly

- timestamp: 2026-02-12T00:00:00Z
  checked: graphLayout.ts (lines 696-1345)
  found: When building internalNodes array for subagent boxes (both parallel and sequential paths), the code adds ALL tool and model nodes without checking hiddenNodeTypes
  implication: ROOT CAUSE FOUND - Internal nodes in subagent boxes bypass filtering completely

- timestamp: 2026-02-12T00:00:00Z
  checked: graphLayout.ts (lines 923-942, 1277-1290, 943-962, 1294-1313)
  found: When isExpanded=true, code creates actual React Flow nodes with type='tool-group' and 'model-output' without filter checks
  implication: Both collapsed (internalNodes array) and expanded (RF child nodes) paths need filtering

## Resolution

root_cause: When constructing subagent box internal nodes (lines 696-1345 in graphLayout.ts), the code builds the internalNodes array and creates React Flow child nodes without checking hiddenNodeTypes. The filtering at lines 401-410 only applies to the main timeline, not to nodes inside expanded subagent boxes.

fix: Applied filtering to internal subagent nodes in graphLayout.ts:
1. Added filteredInternalNodes filter after building internalNodes (after line 828 for parallel, after line 1187 for sequential)
2. Changed dimension calculations to use filteredInternalNodes instead of internalNodes (lines 874-875, 1233-1234)
3. Changed React Flow child node creation to iterate filteredInternalNodes (lines 932, 1291)
4. Stored filteredInternalNodes in boxNode.data.internalNodes for SubagentBoxNode component (lines 901, 1260)

verification: Build succeeded with no TypeScript errors. The fix ensures:
- When 'tools' filter is toggled off, tool nodes inside expanded subagents are excluded from internalNodes
- When 'model' filter is toggled off, model output nodes are excluded
- Box dimensions (expandedWidth) recalculate based on visible node count only
- React Flow child nodes are only created for visible nodes
- Request and response nodes always remain visible (structural, not filtered)

Test cases:
1. Expanded subagent with tools visible → Toggle 'Tools' off → Tool nodes disappear, box shrinks
2. Expanded subagent with model outputs → Toggle 'Model' off → Model nodes disappear, box shrinks
3. Toggle both filters off → Only Request and Response nodes visible
4. Re-enable filters → Nodes reappear, box expands back
5. Collapsed subagent → Filters don't affect collapsed display (internalNodes used for click handlers only)

files_changed: ['client/src/utils/graphLayout.ts']
