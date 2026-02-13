---
phase: quick-1
plan: 01
subsystem: session-discovery
tags: [bug-fix, session-titles, command-filtering]
dependency_graph:
  requires: []
  provides:
    - firstUserPrompt extraction that skips /clear in all encoding formats
  affects:
    - Session title display in left panel and directory overview
tech_stack:
  added: []
  patterns:
    - isSkippableCommand helper for normalized command detection
    - Extract-then-filter pattern (extract prompt first, then check if skippable)
key_files:
  created: []
  modified:
    - server/src/session-discovery.ts
decisions:
  - decision: Move skip check after extraction (extract-then-filter pattern)
    rationale: Raw content check misses XML-wrapped commands; extractReadablePrompt returns "clear" from <command-name>clear</command-name>, so we must check the extracted result
    alternatives: [Pre-check both raw content and XML patterns before extraction (more complex, duplicates extraction logic)]
    chosen: Extract-then-filter (simpler, single source of truth for prompt text)
  - decision: Case-insensitive normalized comparison for skippable commands
    rationale: Handle edge cases like "Clear", "CLEAR", "/Clear" consistently
    alternatives: [Case-sensitive checks (brittle), Regex pattern (overkill for exact matches)]
    chosen: toLowerCase + exact/prefix checks (readable, covers all variations)
metrics:
  duration: <1min
  completed: 2026-02-09
---

# Quick Task 1: Skip /clear Commands in Session Title Extraction

**One-liner:** isSkippableCommand helper fixes session title derivation to skip /clear in both raw text and XML-wrapped formats

## Summary

Fixed session title extraction to skip /clear commands regardless of encoding format. Previously, raw content check `content.startsWith('/clear')` only caught direct text, but XML-wrapped `/clear` commands (`<command-name>clear</command-name>`) returned `"clear"` from `extractReadablePrompt`, which wasn't caught. Now extraction happens first, followed by normalized skip checking.

## Implementation Details

### Added isSkippableCommand Helper

Created `isSkippableCommand(prompt: string): boolean` to detect clear commands after extraction:
- Normalizes prompt (toLowerCase + trim)
- Checks for: `"clear"`, `"/clear"`, `"/clear ..."`, `"clear ..."`
- Handles both XML-extracted format ("clear") and raw text format ("/clear")

### Updated firstUserPrompt Loop

Refactored extraction logic (lines ~453-463):
1. Removed raw `content.startsWith('/clear')` check
2. Extract prompt with `extractReadablePrompt(content)` first
3. Check if extracted result is skippable with `isSkippableCommand(extracted)`
4. Only accept prompt if extracted AND not skippable

This ensures /clear is caught regardless of encoding, since we check the extracted prompt text, not the raw content.

## Testing

**Build verification:** `npm run build` passed with no TypeScript errors

**Logic verification:** Code review confirms:
- `isSkippableCommand` correctly identifies all clear command variations
- Loop processes extraction before skip-checking
- XML-wrapped `/clear` commands now properly skipped (extracted as "clear", caught by isSkippableCommand)

## Deviations from Plan

None - plan executed exactly as written.

## Impact

Sessions starting with `/clear` (in any format) now show the first meaningful prompt as their title instead of "clear". This fixes session identification in both the left panel session list and the directory overview graph.

## Next Steps

No follow-up required. Quick task complete.

## Self-Check: PASSED

**Files modified:**
```bash
ls -l /home/botond/claude-session-dashboard/server/src/session-discovery.ts
```
File exists and was modified: CONFIRMED

**Build success:**
```bash
npm run build
```
Compilation succeeded with no errors: CONFIRMED

**Implementation verified:**
- isSkippableCommand helper added at lines 70-82
- firstUserPrompt loop updated at lines 453-463
- Extract-then-filter pattern correctly implemented
