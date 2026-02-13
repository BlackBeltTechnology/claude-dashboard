---
phase: 03-session-identification
plan: 02
subsystem: ui
tags: [react, typescript, graph-view, tree-view, session-naming]

# Dependency graph
requires:
  - phase: 03-01
    provides: Session display name utility and cwd field in data pipeline
provides:
  - Graph view session nodes showing directory names
  - Tree view session nodes showing directory names
  - Consistent naming across sidebar, graph, and tree views
affects: [04-user-experience, future-ui-enhancements]

# Tech tracking
tech-stack:
  added: []
  patterns: [Unified session naming across all views, Agent type display for subagents]

key-files:
  created: []
  modified:
    - client/src/utils/graphLayout.ts
    - client/src/components/TreeNode.tsx

key-decisions:
  - "Graph view session nodes use getSessionDisplayName for parent sessions"
  - "Subagent sessions in graph view show agent type, not directory name"
  - "Tree view root sessions show directory name via getSessionDisplayName"
  - "Tree view subagent sessions detected by ID length and show agent type"

patterns-established:
  - "All three views (sidebar, graph, tree) now use consistent naming for parent sessions"
  - "Subagent/child sessions consistently show agent type across all views"

# Metrics
duration: 1min
completed: 2026-02-06
---

# Phase 03 Plan 02: Session Identification Summary

**Consistent directory-based session naming across graph and tree views with agent type display for subagents**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-06T14:25:05Z
- **Completed:** 2026-02-06T14:26:29Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Updated graph view to display directory names for parent sessions instead of UUID-based labels
- Updated tree view to display directory names for parent sessions instead of UUID-based labels
- Subagent sessions in both views now show agent type ("Task Agent") instead of directory name
- Achieved consistent session naming across all three views (sidebar, graph, tree)
- All existing functionality preserved (grouping, drill-down, expansion)

## Task Execution

**Note: Git commit operations were blocked per user preference (commit_docs: false). All code changes were made successfully without git commits.**

### Task 1: Update graph view session labels to use directory names
- Added import of `getSessionDisplayName` from `./sessionName` to graphLayout.ts
- Updated session node label from `session.summary || 'Session ${session.id.slice(0, 8)}...'` to `getSessionDisplayName(session)`
- Updated subagent session node label to show `session.summary || 'Task Agent'` (agent type, not directory)
- Per LOCKED DECISION: parent sessions show directory name, subagent/child sessions show agent type
- **Verification:** `npm run build` passed - all workspaces compiled successfully

### Task 2: Update tree view session labels to use directory names
- Added import of `getSessionDisplayName` from `../utils/sessionName` to TreeNode.tsx
- Updated `getNodeLabel` function for Session objects (else branch):
  - Added ID length check to distinguish subagents (ID < 20 chars) from parent sessions (UUID = 36 chars)
  - Subagent sessions: return `node.summary || 'Task Agent'`
  - Parent sessions: return `getSessionDisplayName(node)`
- SessionNode case in switch statement kept as-is (handles AnyNode type, not Session objects)
- **Verification:** `npm run build` passed - all workspaces compiled successfully

## Files Created/Modified
- `client/src/utils/graphLayout.ts` - Updated session node labels to use getSessionDisplayName, subagent labels to show agent type
- `client/src/components/TreeNode.tsx` - Updated getNodeLabel to use getSessionDisplayName for parent sessions, agent type for subagents

## Decisions Made

**1. Subagent detection in tree view**
- Use ID length check (< 20 characters) to distinguish subagent sessions from parent sessions
- Rationale: Subagent IDs are ~7 chars (like "a8818a4"), while session UUIDs are 36 chars. This is a reliable heuristic without requiring additional metadata

**2. Consistent agent type display**
- Show "Task Agent" as fallback for subagent sessions without summary
- Rationale: Matches the pattern from graph view and maintains consistency across all views

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed without issues. Build passed on first attempt for both tasks.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- SESS-03 requirement fully satisfied: session nodes in graph and tree views now show working directory name
- All three views (sidebar, graph, tree) use consistent naming for sessions
- Parent sessions show directory name, subagent/child sessions show agent type
- Visual consistency achieved across the entire dashboard
- Ready for Phase 4 (user experience enhancements) or additional UI improvements
- No blockers or concerns

---
*Phase: 03-session-identification*
*Completed: 2026-02-06*
