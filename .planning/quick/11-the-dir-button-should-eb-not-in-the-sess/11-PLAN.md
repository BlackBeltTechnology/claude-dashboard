---
phase: quick-11-dir-button-layout
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: ["client/src/components/FilterBar.tsx", "client/src/components/SessionList.tsx"]
autonomous: true
user_setup: []
must_haves:
  truths:
    - "Dir button appears as standalone button next to Sessions count"
    - "Dir button no longer appears in session group headers"
    - "Search input appears on separate row below filter checkboxes"
  artifacts:
    - path: "client/src/components/FilterBar.tsx"
      provides: "Two-row layout with checkboxes on row 1, search on row 2"
    - path: "client/src/components/SessionList.tsx"
      provides: "Standalone Dir button next to Sessions title"
---

<objective>
Fix UI layout by moving Dir button out of session groups and separating search bar from filter checkboxes

Purpose: Improve UI organization by having dedicated locations for each control element
Output: Updated FilterBar and SessionList components with improved layout
</objective>

<execution_context>
@/home/botond/claude-session-dashboard/client/src/components/FilterBar.tsx
@/home/botond/claude-session-dashboard/client/src/components/SessionList.tsx
@/home/botond/claude-session-dashboard/client/src/App.tsx
</execution_context>

<context>
Current layout has:
- FilterBar: Checkboxes and search input on same row (flex container)
- SessionList: "Sessions (count)" title with Dir button appearing on group header hover

Required changes:
1. Split FilterBar into two rows
2. Add standalone Dir button next to Sessions title
3. Remove Dir button from CollapsibleSessionGroup
</context>

<tasks>

<task type="auto">
  <name>Update FilterBar to use two-row layout</name>
  <files>client/src/components/FilterBar.tsx</files>
  <action>
    Modify FilterBar.tsx to create two separate rows:
    - Row 1: Container with checkboxes (Active, Idle, Archived) using flex display
    - Row 2: Container with search input using flex display with full width

    Maintain existing styling (colors, padding, font sizes) for consistency. Update main container to use flexDirection: 'column' instead of single row.
  </action>
  <verify>Build the project with npm run build or check the UI renders correctly</verify>
  <done>FilterBar displays with checkboxes on top row and search input on bottom row</done>
</task>

<task type="auto">
  <name>Move Dir button to standalone location and remove from groups</name>
  <files>client/src/components/SessionList.tsx</files>
  <action>
    In SessionList component (around line 333):
    1. Add a standalone Dir button next to "Sessions ({sessions.length})" title with blue background (#3b82f6) matching the original button style
    2. The button should call setViewMode('directory') on click (same handler as before)

    In CollapsibleSessionGroup component (around lines 194-272):
    1. Remove isDirHovered state variable (line 194)
    2. Remove dirButtonStyle definition (lines 211-223)
    3. Remove handleDirView function (lines 237-240)
    4. Remove the Dir button from the hover section (lines 255-262) - keep only the Clear button

    Keep the Clear button functionality intact.
  </action>
  <verify>Build the project and verify the UI shows Dir button next to Sessions title, and group headers only show Clear button on hover</verify>
  <done>Dir button appears next to Sessions count and is removed from session group headers</done>
</task>

</tasks>

<verification>
After changes, verify:
1. Dir button appears as blue button next to "Sessions (X)" title
2. Hovering over session groups shows only Clear button (not Dir button)
3. Filter checkboxes appear on one row
4. Search input appears on separate row below checkboxes
</verification>

<success_criteria>
- FilterBar has two distinct rows: checkboxes on top, search on bottom
- SessionList has standalone Dir button next to Sessions count
- Session groups no longer show Dir button on hover
</success_criteria>

<output>
After completion, create `.planning/quick/11-the-dir-button-should-eb-not-in-the-sess/11-SUMMARY.md`
</output>
