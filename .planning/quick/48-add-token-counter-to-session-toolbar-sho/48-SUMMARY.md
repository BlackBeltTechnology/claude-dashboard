# Quick Task 48: Add token counter to session toolbar

## Change
Added token counter display to the session view toolbar in `Toolbar.tsx`. Shows total tokens next to the session title (e.g., "124.5k tokens"). Hover tooltip shows full breakdown: input, output, cache read, cache creation.

## Files Modified
- `client/src/components/Toolbar.tsx` — added `formatTokenCount` helper + token display span after session title

## Verification
- Build: passed
