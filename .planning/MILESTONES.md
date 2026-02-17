# Milestones

## v1.0 MVP (Shipped: 2026-02-11)

**Phases completed:** 11 phases, 22 plans, 17 tasks

**Key accomplishments:**
- Tool call grouping with drill-down side panel — consecutive calls collapsed by type ("Bash (12)") with click-to-inspect
- Human-readable session naming — working directory names replace UUIDs everywhere with #1/#2 disambiguation
- Horizontal timeline graph — left-to-right timeline with fork-join subagent branches and inline tool expansion
- Full node metadata inspection — click any node (tool, skill, agent) for formatted metadata, source files, and I/O
- Directory Overview graph — bird's eye view of working directories with session children, clear/hide groups
- Parallel subagent rendering — true fork-join for parallel Task calls, session titles from first user prompt
- Browser-only notifications with working directory names
- Tree view with hierarchical subagent/tool display and active node pulse animation
- 23 additional quick tasks for UI polish, metadata fixes, and interaction improvements

---


## v1.1 Verbose Debugging (Shipped: 2026-02-12)

**Phases completed:** 4 phases (12-15), 7 plans, 15 tasks
**Execution time:** 19.6 minutes total
**Requirements:** 13/13 satisfied

**Key accomplishments:**
- Directory graph replaces sidebar as primary navigation — click session to drill into timeline, filter by active/archived
- User prompts and /clear commands visible as interactive timeline nodes with command metadata display
- Clickable tool calls on subagent nodes open tool metadata directly; agent panel shows only request/response
- Subagent request/response visible in both graph view (120-char preview) and tree view (synthetic entries)
- Chronological tree ordering with timestamp-sorted merged nodes and reduced nesting depth (12px vs 16px)
- Tree-to-graph node focus synchronization with slide-in panel overlay

---

