# Quick Task 28: Active filter hides idle sessions older than 10 minutes

## Changes

**File:** `client/src/store/sessionStore.ts`

Modified the `getFilteredSessions` filter to treat idle sessions differently from active/waiting:
- `active` and `waiting` sessions: always shown when Active toggle is on
- `idle` sessions: shown only if `lastActivity` is within the last 10 minutes
- Idle sessions older than 10 minutes are hidden (treated as stale)

## Build

Clean build, zero TypeScript errors.
