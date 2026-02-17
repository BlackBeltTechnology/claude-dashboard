# Roadmap: Claude Session Dashboard

## Milestones

- ✅ **v1.0 MVP** — Phases 1-11 (shipped 2026-02-11)
- ✅ **v1.1 Verbose Debugging** — Phases 12-15 (shipped 2026-02-12)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-11) — SHIPPED 2026-02-11</summary>

- [x] Phase 1: Tool Call Grouping (4/4 plans) — completed 2026-02-09
- [x] Phase 2: Group Drill-Down (2/2 plans) — completed 2026-02-06
- [x] Phase 3: Session Identification (2/2 plans) — completed 2026-02-06
- [x] Phase 4: UX Polish (2/2 plans) — completed 2026-02-06
- [x] Phase 5: Node Metadata Inspection (2/2 plans) — completed 2026-02-09
- [x] Phase 6: Notification Refinement (1/1 plan) — completed 2026-02-09
- [x] Phase 7: Horizontal Timeline Graph (2/2 plans) — completed 2026-02-09
- [x] Phase 8: Fix Tree View (1/1 plan) — completed 2026-02-09
- [x] Phase 9: Clear Session Group + Directory Overview (2/2 plans) — completed 2026-02-09
- [x] Phase 10: Fix Subagent Graph + Inspection (2/2 plans) — completed 2026-02-09
- [x] Phase 11: Parallel Subagents + Session Titles (2/2 plans) — completed 2026-02-09

Full details: [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)

</details>

### ✅ v1.1 Verbose Debugging (Shipped 2026-02-12)

**Milestone Goal:** Enable deep debugging visibility with directory-first navigation, visible user prompts and commands, clickable agent tool calls, and improved tree view timeline.

- [x] **Phase 12: Navigation Refactor** - Directory graph becomes primary view with session filtering — completed 2026-02-12
- [x] **Phase 13: Timeline Enhancement** - User prompts, /clear markers, and command metadata visible in timeline — completed 2026-02-12
- [x] **Phase 14: Agent Debugging** - Clickable tool calls on agent nodes with metadata panel improvements — completed 2026-02-12
- [x] **Phase 15: Tree View Fixes** - Chronological ordering and reduced nesting depth — completed 2026-02-12

## Phase Details

### Phase 12: Navigation Refactor
**Goal**: Directory graph becomes the primary navigation entry point, replacing left sidebar session list.

**Depends on**: Nothing (uses existing DirectoryOverview component)

**Requirements**: NAV-01, NAV-02, NAV-03, NAV-04

**Success Criteria** (what must be TRUE):
  1. User opens dashboard and sees directory graph as main view (no left sidebar session list visible)
  2. User can toggle active/archived session filters directly in directory graph view
  3. User sees each session node labeled with the first command title (skipping /clear commands)
  4. User can click any session node in directory graph to navigate into that session's timeline graph

**Plans:** 2 plans

Plans:
- [x] 12-01-PLAN.md — Navigation state + layout restructure + toolbar
- [x] 12-02-PLAN.md — Tree panel, tree-to-graph sync, session node labels, cleanup

### Phase 13: Timeline Enhancement
**Goal**: User prompts, /clear commands, and command metadata become visible nodes in the session timeline.

**Depends on**: Nothing (enhances existing GraphView)

**Requirements**: TIME-01, TIME-02, TIME-03

**Success Criteria** (what must be TRUE):
  1. User sees their own prompt messages rendered as distinct nodes in the session timeline graph
  2. User sees /clear commands rendered as context-reset marker nodes (not skipped, but marked)
  3. User sees command/skill metadata extracted from XML format when commands are invoked

**Plans:** 2 plans

Plans:
- [x] 13-01-PLAN.md — Shared types + server-side node emission for user prompts and /clear markers (TIME-01, TIME-02, TIME-03 data layer)
- [x] 13-02-PLAN.md — React Flow node components, graph layout integration, detail panel, and TreeView support (TIME-01, TIME-02, TIME-03 UI layer)

### Phase 14: Agent Debugging
**Goal**: Individual tool calls become clickable on agent nodes, and agent metadata panel shows request/response without tool list clutter.

**Depends on**: Phase 13 (tool calls need timeline context)

**Requirements**: AGNT-01, AGNT-02, AGNT-03, AGNT-04

**Success Criteria** (what must be TRUE):
  1. User can click individual tool calls directly on an agent node to open that tool's metadata in the detail panel
  2. User sees agent metadata panel displaying only request (prompt) and response — no tool list
  3. User sees subagent request and response visible in graph view timeline
  4. User sees subagent request and response visible in tree view

**Plans:** 2 plans

Plans:
- [x] 14-01-PLAN.md — Clickable tool calls on agent nodes + clean agent detail panel (AGNT-01, AGNT-02)
- [x] 14-02-PLAN.md — Subagent request/response visibility in graph and tree views (AGNT-03, AGNT-04)

### Phase 15: Tree View Fixes
**Goal**: Tree view displays events in correct chronological order with reduced nesting for better readability.

**Depends on**: Nothing (independent tree view improvements)

**Requirements**: TREE-01, TREE-02

**Success Criteria** (what must be TRUE):
  1. User sees tree view events displayed in correct chronological order (earliest first)
  2. User sees reduced nesting depth in tree view for cleaner timeline readability

**Plans:** 1 plan

Plans:
- [x] 15-01-PLAN.md — Chronological ordering + reduced nesting depth (TREE-01, TREE-02)

## Progress

**Execution Order:**
Phases 12 → 13 → 14 → 15

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Tool Call Grouping | v1.0 | 4/4 | Complete | 2026-02-09 |
| 2. Group Drill-Down | v1.0 | 2/2 | Complete | 2026-02-06 |
| 3. Session Identification | v1.0 | 2/2 | Complete | 2026-02-06 |
| 4. UX Polish | v1.0 | 2/2 | Complete | 2026-02-06 |
| 5. Node Metadata Inspection | v1.0 | 2/2 | Complete | 2026-02-09 |
| 6. Notification Refinement | v1.0 | 1/1 | Complete | 2026-02-09 |
| 7. Horizontal Timeline Graph | v1.0 | 2/2 | Complete | 2026-02-09 |
| 8. Fix Tree View | v1.0 | 1/1 | Complete | 2026-02-09 |
| 9. Clear Session Group + Dir Overview | v1.0 | 2/2 | Complete | 2026-02-09 |
| 10. Fix Subagent Graph + Inspection | v1.0 | 2/2 | Complete | 2026-02-09 |
| 11. Parallel Subagents + Session Titles | v1.0 | 2/2 | Complete | 2026-02-09 |
| 12. Navigation Refactor | v1.1 | 2/2 | Complete | 2026-02-12 |
| 13. Timeline Enhancement | v1.1 | 2/2 | Complete | 2026-02-12 |
| 14. Agent Debugging | v1.1 | 2/2 | Complete | 2026-02-12 |
| 15. Tree View Fixes | v1.1 | 1/1 | Complete | 2026-02-12 |
| 16. Session Node Fixes | — | 2/2 | Complete | 2026-02-12 |
| 17. Subagent Workflow Visualization | — | 4/4 | Complete | 2026-02-12 |
| 18. Session Activity and Timestamps | — | 2/2 | Complete | 2026-02-12 |
| 19. Subagent Internal Nodes | — | 2/2 | Complete | 2026-02-12 |

### Phase 16: Session Node Fixes

**Goal:** Fix session node display issues: show last command in session nodes for better identification, fix completed sessions incorrectly shown as active, and mark sessions created from /clear commands with a clear-session indicator instead of showing the clear node as first entry.
**Depends on:** Phase 15
**Plans:** 2 plans

Plans:
- [x] 16-01-PLAN.md — Last command display, state detection fix, clear-session indicator — completed 2026-02-12
- [x] 16-02-PLAN.md — Gap closure: fix lastCommand font size and remove aggressive idle threshold — completed 2026-02-12

### Phase 17: Subagent Workflow Visualization ✓ COMPLETE

**Goal:** Subagent nodes become expandable container boxes on the main horizontal timeline. Each box contains the subagent's full workflow (request → tool calls → response) with colored backgrounds by agent type. Boxes are collapsed by default showing last-node progress, expandable inline. Parallel subagents stack vertically. Remove tool call summaries.
**Depends on:** Phase 16
**Plans:** 4 plans (all complete)

Plans:
- [x] 17-01-PLAN.md — Layout engine rework + store state for subagent box nodes — completed 2026-02-12
- [x] 17-02-PLAN.md — SubagentBoxNode component + GraphView wiring + toolbar controls — completed 2026-02-12
- [x] 17-03-PLAN.md — Gap closure: tool grouping in subagent boxes, expanded box sizing, toolbar labels — completed 2026-02-12
- [x] 17-04-PLAN.md — Gap closure: model output nodes, tree-to-graph navigation, click/metadata fixes — completed 2026-02-12

### Phase 18: Session Activity and Timestamps ✓ COMPLETE

**Goal:** Only show session nodes as active when they are currently working (ignore idle state and timers — only actual work signals count as active). Add timestamps to session nodes and order them by last action time in the directory overview.
**Depends on:** Phase 17
**Plans:** 2 plans (all complete)

Plans:
- [x] 18-01-PLAN.md — 4-state session detection (active/waiting/idle/completed) with idle_prompt parsing and 10s threshold — completed 2026-02-12
- [x] 18-02-PLAN.md — Idle state colors, relative timestamps, live ticking, state-priority sorting in directory overview — completed 2026-02-12

### Phase 19: Subagent internal nodes in main graph with model response nodes ✓ COMPLETE

**Goal:** Promote subagent internal workflow nodes (request, tool-groups, model-outputs, response) from contained visual cards inside SubagentBoxNode into actual React Flow nodes in the main session graph when expanded, enabling direct click interaction, tree-to-graph navigation, and consistent node styling.
**Depends on:** Phase 18
**Plans:** 2 plans (all complete)

Plans:
- [x] 19-01-PLAN.md — New RF node components (RequestNode, ResponseNode, ModelOutputNode) + graphLayout conditional node generation — completed 2026-02-12
- [x] 19-02-PLAN.md — GraphView wiring (nodeTypes, click handlers, minimap) + TreeView navigation update — completed 2026-02-12

### Phase 20: Advanced node filtering by type, agent name, prompt text, and model response content

**Goal:** Enable content-level filtering within each node category so users can filter tool nodes by tool name, agent nodes by agent name, prompt nodes by prompt text, and model output nodes by response content — beyond the existing category-level toggle.
**Depends on:** Phase 19
**Plans:** 2 plans

Plans:
- [ ] 20-01-PLAN.md — Store state + filtering logic in graph layout and tree view
- [ ] 20-02-PLAN.md — Toolbar filter UI with content inputs + GraphView wiring
