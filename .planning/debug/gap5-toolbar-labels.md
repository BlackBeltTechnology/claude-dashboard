---
status: diagnosed
trigger: "Toolbar expand/collapse all buttons have poor labels ('+ All' and '- All')"
created: 2026-02-12T00:00:00Z
updated: 2026-02-12T00:00:00Z
---

## Current Focus

hypothesis: The "+ All" and "- All" labels are too terse and inconsistent with the descriptive label style used by other toolbar buttons
test: Compare label patterns across all toolbar buttons
expecting: Other buttons use descriptive text labels, confirming these two are outliers
next_action: Document findings (diagnosis only)

## Symptoms

expected: Expand/collapse all subagent box buttons should have clear, descriptive labels consistent with other toolbar buttons
actual: Buttons are labeled "+ All" and "- All" which are cryptic and don't communicate what they expand/collapse
errors: N/A (cosmetic/UX issue)
reproduction: Open any session with subagents in the session timeline view, observe toolbar buttons
started: Introduced in Phase 17 Plan 02

## Eliminated

(none needed - issue is straightforward)

## Evidence

- timestamp: 2026-02-12T00:00:00Z
  checked: client/src/components/Toolbar.tsx - all button labels in the toolbar
  found: |
    The toolbar has two views: directory view and session timeline view.

    **Directory view buttons:**
    - Settings button: Unicode gear icon U+2699 (line 161) with title="Settings"

    **Session timeline view buttons (right section, in order):**
    1. "Tree" (line 206) - title="Toggle tree panel" - descriptive single-word label
    2. "+ All" (line 222) - title="Expand all agent boxes" - POOR: cryptic abbreviation
    3. "- All" (line 233) - title="Collapse all agent boxes" - POOR: cryptic abbreviation
    4. Session switcher dropdown (conditional)
    5. Settings gear icon U+2699 (line 258) - title="Settings"

    **Back button (left section):**
    - "\u2190 Back" (line 194) - title="Back to directory" - uses unicode arrow + descriptive word

  implication: |
    The toolbar label convention is: descriptive text labels (e.g., "Tree", "Back").
    The "+" and "-" symbols are not used elsewhere. The word "All" is ambiguous -
    "all" of what? The title attributes ("Expand all agent boxes" / "Collapse all agent boxes")
    are descriptive but tooltips only appear on hover and are not visible at a glance.

- timestamp: 2026-02-12T00:00:00Z
  checked: Button style and spacing constraints
  found: |
    All toolbar buttons use the same style (styles.button):
    - padding: 6px 10px
    - fontSize: 14px
    - display: flex, alignItems: center

    The "Tree" button is also a single short word, so slightly longer labels like
    "Expand All" / "Collapse All" would be consistent in length.

    The buttons are conditionally rendered (only when hasSubagents is true, line 208),
    so they only appear when relevant.
  implication: |
    There is room for slightly longer labels. The style can accommodate multi-word labels.

## Resolution

root_cause: |
  The expand/collapse all buttons in the session timeline toolbar use cryptic labels
  "+ All" and "- All" (lines 222 and 233 of client/src/components/Toolbar.tsx).
  These labels:
  1. Use symbolic "+"/"-" prefixes instead of descriptive text like other toolbar buttons
  2. Use the ambiguous word "All" without specifying what is being expanded/collapsed
  3. Are inconsistent with the toolbar's established convention of descriptive text labels
     (e.g., "Tree", "Back")

fix: |
  Replace the button labels to be more descriptive and consistent with the toolbar style.

  Recommended labels (in order of preference):

  Option A - Short and descriptive (best fit with existing "Tree" and "Back" style):
    "Expand All" / "Collapse All"

  Option B - More explicit:
    "Expand Agents" / "Collapse Agents"

  Option A is recommended because:
  - Matches the conciseness of "Tree" and "Back" labels
  - "Expand"/"Collapse" are standard UI verbs that replace the cryptic "+"/"-"
  - "All" is acceptable here because in context (only shown when subagents exist),
    the meaning is clear
  - The title attributes already provide the full description on hover

  Code change location: Lines 222 and 233 of client/src/components/Toolbar.tsx
  Change "+ All" to "Expand All" and "- All" to "Collapse All"

verification: N/A (diagnosis only)
files_changed: []
