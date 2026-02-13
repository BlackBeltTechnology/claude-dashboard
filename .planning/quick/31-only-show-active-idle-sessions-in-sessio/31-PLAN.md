---
phase: quick-31
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - client/src/components/Toolbar.tsx
autonomous: true
---

<objective>
Filter session switcher dropdown to only show active/idle/waiting sessions (not completed), and color active sessions green.
</objective>

<tasks>
<task type="auto">
  <name>Task 1: Filter completed sessions from dropdown and color active ones</name>
  <files>client/src/components/Toolbar.tsx</files>
  <action>
  1. Filter sameDirSessions to exclude completed state (keep current session even if completed)
  2. Add green color to active/waiting session options via option style
  3. Add filled/unfilled circle prefix to distinguish active vs idle
  </action>
</task>
</tasks>
