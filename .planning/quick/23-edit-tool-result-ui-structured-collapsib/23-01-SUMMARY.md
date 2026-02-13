---
phase: 23-edit-tool-result-ui-structured-collapsib
plan: 01
subsystem: client - tool formatters
tags: [ui-enhancement, edit-tool, diff-display]
dependency_graph:
  requires: []
  provides:
    - Enhanced Edit tool formatter with collapsible diff boxes
  affects: [NodeDetail, tool metadata display]
tech_stack:
  - React hooks (useState)
  - Inline styles following existing patterns
  - TypeScript
key_files:
  created: []
  modified:
    - /home/botond/claude-session-dashboard/client/src/utils/toolFormatters.tsx
decisions:
  - "CollapsibleDiff component with toggle using triangle/arrow Unicode symbols matching CollapsibleJson pattern"
  - "Red theme (#7f1d1d bg, #fca5a5 text) for old text, green theme (#14532d bg, #86efac text) for new text"
  - "500-char truncation with (N chars) indicator when collapsed for long content"
  - "Fallback to raw JSON display when old_string/new_string are not present"
---

# Quick Task 23: Edit Tool Result UI - Structured Collapsible Diff Boxes

## Summary

Enhanced the Edit tool formatter to display old_string and new_string in visually distinct collapsible diff boxes instead of raw JSON. This makes it easy for users to see what changed in a file edit operation at a glance.

## Changes Made

### Modified: `/home/botond/claude-session-dashboard/client/src/utils/toolFormatters.tsx`

1. **Added `useState` import** for collapsible toggle state
2. **Added new diff-related styles:**
   - `diffContainer`, `diffToggle`, `diffToggleIcon`, `diffContent` - base collapsible styles
   - `oldDiff`, `oldDiffToggle`, `oldDiffContent` - red theme for removed content
   - `newDiff`, `newDiffToggle`, `newDiffContent` - green theme for added content
3. **Created `CollapsibleDiff` component** with:
   - Toggle button with triangle/arrow indicator
   - Content truncation at 500 chars with character count indicator when collapsed
   - Visual theming based on variant (old/new)
4. **Updated `renderEditInput` function** to:
   - Extract `file_path`, `old_string`, `new_string` from input
   - Display file path prominently
   - Show collapsible diff boxes when old_string/new_string present
   - Fall back to raw JSON when neither diff string is present

## Verification

- Build completed with pre-existing TypeScript errors in other files (missing `waiting` state in SessionState)
- The modified file is syntactically correct and follows existing patterns
- Collapsible behavior matches `CollapsibleJson` pattern in NodeDetail.tsx

## Deviations from Plan

None - implementation matches plan specifications exactly.

## Auth Gates

None.

## Self-Check

- [x] File exists: `/home/botond/claude-session-dashboard/client/src/utils/toolFormatters.tsx`
- [x] `CollapsibleDiff` component added with toggle behavior
- [x] Red theme applied for old text
- [x] Green theme applied for new text
- [x] Truncation indicator shown for content > 500 chars
- [x] Both sections collapsible with expand/collapse toggle

**Status:** PASSED
