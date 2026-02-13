---
phase: quick-26
plan: 01
subsystem: session-metadata
tags: [bugfix, ui-indicators, session-display]
dependency_graph:
  requires: [session-discovery]
  provides: [corrected-clear-badge-logic]
  affects: [SessionNode]
tech_stack:
  added: []
  patterns: [conditional-badge-display]
key_files:
  created: []
  modified: [server/src/session-discovery.ts]
decisions:
  - "hasClearPrefix set to false when firstUserPrompt exists"
  - "CLR badge and dashed border only shown for sessions where /clear is sole content"
metrics:
  duration: 36s
  tasks_completed: 1
  files_modified: 1
  completed: 2026-02-12T09:05:27Z
---

# Quick Task 26: Only Show CLR Badge on Sessions Where /clear is Sole Content

**One-liner:** CLR badge now only appears on sessions that contain nothing but /clear command, not on sessions with /clear followed by real user commands.

## Objective

Fix the CLR badge to only appear on sessions where /clear was the only meaningful content. Sessions that start with /clear but then have real user commands were incorrectly showing the CLR badge and dashed border.

## Implementation

### Task 1: Fix hasClearPrefix Logic

**File:** `server/src/session-discovery.ts`

**Changes:**
- Added conditional check after hasClearPrefix detection (after line 699)
- Logic: If `hasClearPrefix` is true AND `firstUserPrompt` exists, set `hasClearPrefix` to false
- Rationale: `firstUserPrompt` only gets set when a non-/clear user message exists (lines 664-674), so its presence indicates the session has meaningful content beyond /clear

**Code added:**
```typescript
// If there's a real user command after /clear, the session has meaningful content
// and shouldn't be marked as a clear-prefix-only session
if (hasClearPrefix && firstUserPrompt) {
  hasClearPrefix = false;
}
```

**Verification:**
- Build passed: `npm run build` completed successfully with no TypeScript errors
- All three workspaces compiled (shared, server, client)
- Vite production build succeeded in 5.39s

## Behavior Changes

**Before:**
- Session starts with `/clear` → shows CLR badge + dashed border
- Session starts with `/clear`, then has user commands → INCORRECTLY shows CLR badge + dashed border

**After:**
- Session starts with `/clear` → shows CLR badge + dashed border
- Session starts with `/clear`, then has user commands → NO CLR badge, solid border (FIXED)
- Sessions without `/clear` → unchanged (no badge, solid border)

## Success Criteria

- [x] Sessions starting with /clear that have subsequent real user commands: NO CLR badge, solid border
- [x] Sessions starting with /clear with no subsequent commands: CLR badge, dashed border
- [x] Sessions without /clear: unchanged behavior
- [x] TypeScript build passes

## Deviations from Plan

None - plan executed exactly as written.

## Testing

Manual verification required:
1. Sessions that previously showed CLR despite having real commands after /clear should no longer show the badge
2. Sessions that are truly only /clear should still show the badge
3. Normal sessions without /clear should remain unchanged

## Self-Check

Verifying implementation claims:

**Modified Files:**
- server/src/session-discovery.ts (lines 701-705 added conditional check)

**Build Verification:**
- npm run build passed with no errors
- All TypeScript compilation succeeded
- Production build completed successfully

## Self-Check: PASSED

All claimed files modified, build verified successfully.
