---
status: diagnosed
phase: 12-navigation-refactor
source: [12-01-SUMMARY.md, 12-02-SUMMARY.md]
started: 2026-02-12T09:00:00Z
updated: 2026-02-12T09:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Directory Graph Landing View
expected: Open the dashboard. You should see a directory graph as the main view — no left sidebar session list. The toolbar shows "Claude Session Dashboard" title, connection status dot, Active/Archived filter checkboxes, session count, and settings gear.
result: pass

### 2. Session Node Labels
expected: Session nodes in the directory graph display the first user command/prompt text (not the directory path). This makes it easy to identify what each session was about.
result: pass

### 3. Navigate Into Session Timeline
expected: Click any session node in the directory graph. The view switches to that session's timeline graph. The toolbar changes to show a Back button (with session title), tree toggle, session switcher dropdown (if multiple sessions in same directory), and settings gear.
result: pass

### 4. Back to Directory
expected: While viewing a session timeline, click the Back button in the toolbar. You return to the directory graph overview.
result: pass

### 5. Tree Panel Slide-In
expected: While viewing a session timeline, click the tree toggle button in the toolbar. A tree panel slides in from the left, overlaying the graph. Click the toggle again — it slides back out.
result: pass

### 6. Tree-to-Graph Focus Sync
expected: Open the tree panel in a session timeline. Click any node in the tree (tool call, skill, subagent). The graph view pans and zooms smoothly to center on that node.
result: issue
reported: "It also opens the metadata for the node which is faulty, it should only navigate to node"
severity: major

### 7. Session Filtering
expected: In the directory graph view, toggle the Active/Archived filter checkboxes. The session count updates and the directory graph shows only matching sessions. E.g., unchecking "Active" hides active sessions.
result: pass

## Summary

total: 7
passed: 6
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "Clicking a tree node should only pan/zoom the graph to that node, not open the detail panel"
  status: fixed
  reason: "User reported: It also opens the metadata for the node which is faulty, it should only navigate to node"
  severity: major
  test: 6
  root_cause: "TreeView selectNode callback called setSelectedNodeData/setSelectedGroupId/setSelectedGroupData for all node types, opening the detail panel alongside setFocusedNode"
  artifacts:
    - path: "client/src/components/TreeView.tsx"
      issue: "selectNode callback opened detail panel for all node types"
  missing:
    - "Remove detail-opening actions from selectNode, keep only setFocusedNode"
  fix: "Removed all setSelectedNodeData/setSelectedGroupId/setSelectedGroupData calls from selectNode. Tree clicks now only call setFocusedNode for graph navigation."
