---
phase: 15-fix-tree-view-readability-issues-skip-em
plan: 1
type: execute
wave: 1
depends_on: []
files_modified: ["client/src/components/TreeView.tsx"]
autonomous: true
must_haves:
  truths:
    - "Tree view renders without empty messages"
    - "Tool calls appear directly without assistant message wrapper"
    - "Visual hierarchy is cleaner and more readable"
  artifacts:
    - path: "client/src/components/TreeView.tsx"
      provides: "Modified TreeView component with filtering and flattening logic"
      contains: "Empty message filtering logic"
      contains: "Assistant message flattening logic"
  key_links:
    - from: "TreeView.tsx"
      to: "session.nodes"
      via: "Filtered rendering"
      pattern: "filter.*empty.*message"
    - from: "TreeView.tsx"
      to: "toolUses extraction"
      via: "flattened hierarchy"
      pattern: "extract.*toolUses"
---

<objective>
Fix tree view readability issues by filtering empty messages and flattening tool call hierarchy
</objective>

<purpose>
The current tree view shows assistant messages with tool calls as children, creating visual clutter. This makes the hierarchy harder to read and navigate. We need to filter out empty content and show tool calls directly without the assistant message wrapper.
</purpose>

<output>
Cleaner, more readable tree view with flattened tool call hierarchy and filtered empty messages
</output>

<tasks>

<task type="auto">
  <name>Filter empty messages and flatten assistant message tool calls</name>
  <files>client/src/components/TreeView.tsx</files>
  <action>
    Modify the TreeView component to improve readability:

    1. Filter empty messages: Add a check to skip rendering messages with empty, null, or whitespace-only content (line 257 where groupedNodes is created)

    2. Flatten assistant message tool calls: Extract toolUses from assistant messages and show them directly in the node list instead of as children. This means:
       - When processing session nodes, separate assistant messages with toolUses from regular nodes
       - Extract the toolUses array and convert them to tool nodes
       - Add these extracted tool nodes directly to the rendered list
       - Only render the assistant message itself if it has meaningful content beyond tool calls

    3. Ensure tool grouping still works correctly for the extracted tool calls

    The goal is to make the tree view cleaner: show tool calls at the same level as messages (not nested), and skip empty messages entirely.
  </action>
  <verify>
    Build the client with npm run build and verify no TypeScript errors. The tree view should render without empty messages and with tool calls shown directly without assistant message nesting.
  </verify>
  <done>
    Tree view displays with: (1) No empty messages visible, (2) Tool calls appear directly without assistant message wrapper, (3) Visual hierarchy is cleaner and more readable
  </done>
</task>

</tasks>

<verification>
- npm run build completes without errors
- Tree view renders with filtered content
- Tool calls appear at proper hierarchy level
</verification>

<success_criteria>
- Empty messages are filtered out and not rendered
- Assistant messages with only tool calls are flattened - tool calls appear directly
- Tree view is more readable with cleaner visual hierarchy
</success_criteria>

<output>
After completion, create `.planning/quick/15-fix-tree-view-readability-issues-skip-em/15-SUMMARY.md`
</output>
