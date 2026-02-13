# Quick Task 33 Summary

## Task: Fix chronological grouping + add node type filter toggles

**Status:** COMPLETE
**Duration:** ~5min
**Files modified:** 5

## Changes

### Bug Fix: Chronological Grouping

**Root cause:** Two separate bugs:
1. `groupConsecutiveToolCalls` grouped all same-name tools within a contiguous tool run, even when interleaved (e.g., [Bash, Read, Bash] → Bash(2), Read instead of 3 separate nodes)
2. Main timeline filtered out message nodes before grouping, hiding natural run-breakers
3. Subagent internals (both parallel and sequential paths) filtered tools/models into separate arrays before grouping, destroying ALL interleaving

**Fixes applied:**

#### client/src/utils/groupingUtils.ts
- Rewrote `groupConsecutiveToolCalls` to only group truly consecutive same-name tool nodes
- [Bash, Bash, Read, Read] → Bash(2), Read(2) (same-name consecutive = grouped)
- [Bash, Read, Bash, Read] → 4 individual nodes (interleaved = no grouping)

#### client/src/utils/graphLayout.ts
- **Main timeline:** Pass ALL session.nodes (including messages) to `groupConsecutiveToolCalls` so messages naturally break tool runs
- **Subagent internals (2 paths):** Replaced filter-then-group with inline chronological grouping that respects the interleaved timeline order
- Removed unused `groupConsecutiveModelOutputs` function (grouping now done inline)

### Feature: Node Type Filter Toggles

#### client/src/store/sessionStore.ts
- Added `hiddenNodeTypes: Set<string>` state
- Added `toggleNodeTypeVisibility(nodeType: string)` action

#### client/src/utils/graphLayout.ts
- Added `hiddenNodeTypes` parameter to `convertSessionToGraph`, `convertSessionsToGraph`, `createLayoutedGraph`
- Filters `processedTimeline` before generating RF nodes (maps user categories to timeline item types)

#### client/src/components/GraphView.tsx
- Reads `hiddenNodeTypes` from store
- Passes to `createLayoutedGraph` as dependency

#### client/src/components/Toolbar.tsx
- Added 5 filter chip buttons: Tools, Model, Prompts, Agents, Skills
- Active chips (visible nodes) show bright text; inactive (hidden) show dim
- Chips separated from other toolbar items with a left border divider

## Filter Categories
| Chip | Hides |
|------|-------|
| Tools | tool, tool-group |
| Model | model, model-group |
| Prompts | user-prompt, clear-marker |
| Agents | subagent |
| Skills | skill |

## Verification
- `npm run build` passes with no errors
- No dangling references to removed function
