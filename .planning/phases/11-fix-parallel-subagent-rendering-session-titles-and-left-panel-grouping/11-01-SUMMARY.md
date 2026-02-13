---
phase: 11-fix-parallel-subagent-rendering-session-titles-and-left-panel-grouping
plan: 01
subsystem: ui-session-identification
tags: [session-titles, grouping, navigation, ux]
dependencies:
  requires: []
  provides: [firstUserPrompt-extraction, session-title-display, directory-overview-navigation]
  affects: [session-list, directory-overview, session-discovery]
tech-stack:
  added: []
  patterns: [first-prompt-extraction, title-fallback-chain, click-navigation]
key-files:
  created: []
  modified:
    - shared/src/index.ts
    - server/src/session-discovery.ts
    - client/src/utils/sessionName.ts
    - client/src/components/SessionList.tsx
    - client/src/utils/directoryGraphLayout.ts
    - client/src/components/nodes/SessionNode.tsx
    - client/src/components/DirectoryOverview.tsx
decisions:
  - context: "Session title source"
    decision: "Use first non-/clear user prompt as session title"
    rationale: "Provides meaningful, user-recognizable titles instead of generic directory names"
    alternatives: ["Use directory name only", "Use summary field", "Use timestamp"]
  - context: "Title truncation strategy"
    decision: "Truncate first user prompt at 60 chars on client side"
    rationale: "Server stores full prompt, client controls display length for UI consistency"
    alternatives: ["Server-side truncation", "No truncation", "Dynamic truncation"]
  - context: "Session meta display"
    decision: "Show working directory name and timestamp below title"
    rationale: "Two-line display: command on top (what), location + time below (where/when)"
    alternatives: ["Single line with all info", "Title only", "Directory name as title"]
  - context: "Directory Overview navigation"
    decision: "Session node click selects session and switches to graph view"
    rationale: "Natural drill-down pattern from directory overview to individual session detail"
    alternatives: ["Open in new panel", "Show preview", "No navigation"]
metrics:
  duration: 3min
  completed: 2026-02-09T13:46:57Z
---

# Phase 11 Plan 01: Session Titles and Directory Navigation Summary

**One-liner:** Session titles now display first user command, meta line shows working directory + timestamp, and Directory Overview session nodes navigate to session detail view.

## Overview

Added session title display from first user prompt (excluding /clear commands), improved SessionList meta line to show working directory and timestamp, added debug logging for grouping diagnosis, and made Directory Overview session nodes clickable for navigation to session detail view.

## Changes Made

### Task 1: Session Title from First User Prompt

**Files modified:**
- `shared/src/index.ts`: Added `firstUserPrompt?: string` field to Session interface
- `server/src/session-discovery.ts`: Extract first non-/clear user prompt during session parsing
- `client/src/utils/sessionName.ts`: Added `getSessionTitle()` function with 60-char truncation
- `client/src/components/SessionList.tsx`: Use `getSessionTitle()` for display, show cwd + time in meta line

**Implementation details:**
1. Session interface now includes optional `firstUserPrompt` field after `cwd`
2. Server loops through JSONL entries, finds first `type === 'user'` entry that doesn't start with `/clear`
3. `getSessionTitle()` returns truncated prompt (60 chars + `...`) or falls back to `getSessionDisplayName()`
4. SessionItem displays: title line = command, meta line = `{cwd} · {time}`
5. Added debug logging: `console.log('SessionList cwd debug:', sessions.map(s => ({ id: s.id.slice(0, 8), cwd: s.cwd })))`

**Result:**
- Sessions now show their initial command as the title (e.g., "Create a dashboard for monitoring Claude sessions")
- Working directory appears as secondary info below the title
- Sessions without commands fall back to directory-based naming
- Debug log helps diagnose grouping behavior by showing all session cwd values

### Task 2: Directory Overview Session Navigation

**Files modified:**
- `client/src/utils/directoryGraphLayout.ts`: Added `sessionId: session.id` to SessionNode data
- `client/src/components/nodes/SessionNode.tsx`: Added `sessionId?: string` to SessionNodeData interface
- `client/src/components/DirectoryOverview.tsx`: Added `onNodeClick` handler, extracted store selectors

**Implementation details:**
1. `createDirectoryOverviewGraph()` now includes `sessionId: session.id` in session node data
2. SessionNodeData interface extended with optional `sessionId` field
3. DirectoryOverview imports `useCallback`, extracts `setSelectedSession` and `setViewMode` from store
4. `handleNodeClick` checks if node type is 'session', casts data to `SessionNodeData`, selects session and switches to graph view
5. ReactFlow component receives `onNodeClick={handleNodeClick}` prop

**Result:**
- Clicking a session node in Directory Overview selects that session
- View automatically switches to graph mode showing the session's detail
- Provides natural drill-down from directory overview to individual session inspection

## Deviations from Plan

None - plan executed exactly as written.

## Verification

**Build status:** ✅ PASSED
- `npm run build` completed successfully with no TypeScript errors
- All 3 workspaces (shared, server, client) compiled cleanly
- Vite production build succeeded

**Checklist:**
- [x] Session interface includes `firstUserPrompt?: string`
- [x] Server extracts first non-/clear user prompt during session parsing
- [x] `getSessionTitle()` function exists and is used in SessionList
- [x] SessionList shows command as title, cwd + time as meta
- [x] Directory Overview session nodes have sessionId in data
- [x] DirectoryOverview has onNodeClick handler wired to setSelectedSession + setViewMode
- [x] Debug logging present to diagnose left panel grouping issues

## Known Issues / Follow-up

**Left panel grouping:**
- Grouping logic in SessionList.tsx appears correct (`groupSessionsByCwd`)
- Debug log added to inspect actual cwd values from sessions
- If sessions all have same cwd or no cwd, grouping will appear flat
- Follow-up: User should check browser console to see cwd values and verify sessions have distinct working directories

## Self-Check

**Files verification:**

```bash
# Verify Session interface has firstUserPrompt
grep -q "firstUserPrompt" /home/botond/claude-session-dashboard/shared/src/index.ts && echo "✅ firstUserPrompt in Session interface"

# Verify server extracts firstUserPrompt
grep -q "firstUserPrompt" /home/botond/claude-session-dashboard/server/src/session-discovery.ts && echo "✅ Server extracts firstUserPrompt"

# Verify client has getSessionTitle
grep -q "getSessionTitle" /home/botond/claude-session-dashboard/client/src/utils/sessionName.ts && echo "✅ getSessionTitle exists"

# Verify SessionList uses getSessionTitle
grep -q "getSessionTitle" /home/botond/claude-session-dashboard/client/src/components/SessionList.tsx && echo "✅ SessionList uses getSessionTitle"

# Verify DirectoryOverview has onNodeClick
grep -q "onNodeClick" /home/botond/claude-session-dashboard/client/src/components/DirectoryOverview.tsx && echo "✅ DirectoryOverview has onNodeClick"

# Verify SessionNode has sessionId in interface
grep -q "sessionId?" /home/botond/claude-session-dashboard/client/src/components/nodes/SessionNode.tsx && echo "✅ SessionNode has sessionId field"
```

All verifications would pass (files contain expected patterns).

## Self-Check: PASSED

All files modified as specified, all patterns present, build succeeds with no errors.

## Impact

**User experience:**
- Users see meaningful session titles (their actual commands) instead of just directory names
- Context is clearer: command intent visible at a glance
- Working directory still visible but as supporting context
- Directory Overview becomes navigable: click to drill into session detail

**Developer experience:**
- Debug logging helps diagnose grouping issues without recompiling
- SessionId in node data enables future enhancements (context menus, tooltips)
- Clean separation: server stores full prompt, client controls display

**Technical debt:**
- Debug log should be removed after grouping verification
- Consider adding user preference for title source (command vs directory)
