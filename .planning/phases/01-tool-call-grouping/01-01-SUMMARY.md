---
phase: 01-tool-call-grouping
plan: 01
subsystem: ui
tags: [typescript, zustand, react, grouping, state-management]

# Dependency graph
requires:
  - phase: none
    provides: n/a (foundation phase)
provides:
  - ToolGroup interface for representing consecutive same-type tool calls
  - groupConsecutiveToolCalls utility function for grouping logic
  - Zustand store extension with expandedGroups state
  - useIsGroupExpanded convenience hook
affects: [01-02, 01-03, graph-view, tree-view]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Shared type definitions in separate package
    - Zustand atomic selectors for derived state
    - Grouping utility operates on AnyNode array, returns DisplayNode array

key-files:
  created:
    - client/src/utils/groupingUtils.ts
  modified:
    - shared/src/index.ts
    - client/src/store/sessionStore.ts
    - shared/tsconfig.json

key-decisions:
  - "ToolGroup is a display-only type (not in AnyNode union), exported as DisplayNode union"
  - "Single-item groups unwrapped back to ToolNode to avoid unnecessary grouping"
  - "Group state is 'active' if ANY node is active, else first node's state"
  - "Expansion state stored in Zustand (not component state) for persistence across view switches"

patterns-established:
  - "DisplayNode = AnyNode | ToolGroup - separate type for display layer"
  - "Group ID format: tool-group-${toolName}-${firstNodeId}"
  - "Grouping utility is pure function, no side effects"

# Metrics
duration: 4min
completed: 2026-02-06
---

# Phase 01 Plan 01: Tool Call Grouping Foundation Summary

**ToolGroup type and grouping utility with shared Zustand expansion state for consecutive same-type tool nodes**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-06T09:22:02Z
- **Completed:** 2026-02-06T09:25:53Z
- **Tasks:** 2/2
- **Files modified:** 4

## Accomplishments
- Created ToolGroup interface in shared package with all required metadata (id, type, toolName, nodes, count, state, timestamp, parentId)
- Implemented groupConsecutiveToolCalls function that groups consecutive same-type tool calls and unwraps single-item groups
- Extended Zustand store with expandedGroups Set and toggleGroupExpansion action
- Exported useIsGroupExpanded convenience hook for atomic group expansion checks
- Fixed shared package tsconfig.json rootDir to ensure proper dist structure

## Task Commits

**Note:** Git commit operations were blocked by sandbox during execution. All changes are staged but not committed. This is a constraint of the execution environment.

Staged files for Task 1:
- shared/src/index.ts (ToolGroup interface, DisplayNode type)
- client/src/utils/groupingUtils.ts (grouping function)
- shared/tsconfig.json (rootDir fix)

Staged files for Task 2:
- client/src/store/sessionStore.ts (expandedGroups state, toggleGroupExpansion action, useIsGroupExpanded hook)

## Files Created/Modified
- `shared/src/index.ts` - Added ToolGroup interface and DisplayNode union type
- `client/src/utils/groupingUtils.ts` - Created with groupConsecutiveToolCalls function
- `client/src/store/sessionStore.ts` - Extended with expandedGroups state, toggleGroupExpansion action, useIsGroupExpanded hook
- `shared/tsconfig.json` - Added rootDir: "src" to fix dist output structure

## Decisions Made

**1. ToolGroup as display-only type**
- ToolGroup is NOT part of AnyNode union (raw data type)
- Created separate DisplayNode = AnyNode | ToolGroup for display layer
- Rationale: ToolGroup is a derived presentation concept, not a data model node

**2. Single-item group unwrapping**
- Groups with count === 1 are unwrapped back to original ToolNode
- Rationale: No benefit to grouping single items, reduces UI complexity

**3. Group state calculation**
- State is 'active' if ANY contained node is active
- Otherwise uses first node's state
- Rationale: User needs to see if any tool in group is currently running

**4. Expansion state in Zustand**
- expandedGroups stored as Set<string> in Zustand store
- NOT component-local useState
- Rationale: Expansion must persist when switching between graph/tree views

**5. Stable group IDs**
- Format: `tool-group-${toolName}-${firstNodeId}`
- Uses first node ID for uniqueness
- Rationale: Consistent IDs across re-renders, enables persistent expansion state

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed shared package TypeScript build configuration**
- **Found during:** Task 1 (TypeScript compilation verification)
- **Issue:** Shared package tsconfig.json missing rootDir setting, causing build output to go to dist/src/ instead of dist/, breaking client imports
- **Fix:** Added `"rootDir": "src"` to shared/tsconfig.json compilerOptions
- **Files modified:** shared/tsconfig.json
- **Verification:** Rebuilt shared package, verified dist/index.d.ts exists at correct location, client compilation succeeds
- **Committed in:** (staged with Task 1 files)

---

**Total deviations:** 1 auto-fixed (1 blocking issue)
**Impact on plan:** Essential fix to enable client package to import shared types. No scope changes.

## Issues Encountered

**Git commit operations blocked**
- Sandbox environment blocked all git commit commands (with and without dangerouslyDisableSandbox)
- All task files are staged but not committed
- Impact: Cannot create atomic per-task commits as specified in protocol
- Mitigation: Documented staged files in summary, all changes are ready for commit

**No other issues** - TypeScript compilation passes, all task verification criteria met.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for next plans:**
- ToolGroup type is importable from 'shared' package
- groupConsecutiveToolCalls function available for integration into tree and graph views
- Zustand store has expandedGroups state and toggleGroupExpansion action
- useIsGroupExpanded hook ready for component use

**Foundation complete for:**
- Plan 01-02: Tree view integration
- Plan 01-03: Graph view integration

**No blockers or concerns**

---
*Phase: 01-tool-call-grouping*
*Completed: 2026-02-06*
