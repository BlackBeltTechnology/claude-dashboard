# Quick Task 31 Summary

## Task: Filter session switcher to active/idle only, color active differently

**Status:** COMPLETE
**Duration:** ~2min
**Files modified:** 1

## Changes

### client/src/components/Toolbar.tsx
- Filtered `sameDirSessions` to exclude `completed` sessions (keeps currently selected session even if completed)
- Active/waiting sessions show in **green** (`#22c55e`) with a filled circle prefix (●)
- Idle sessions show in default color (`#eee`) with an unfilled circle prefix (○)
- Dropdown is now much shorter — only shows sessions that are still alive

## Verification
- `npm run build` passes with no errors
- Completed sessions hidden from dropdown
- Active sessions visually distinguished with green color + filled dot
