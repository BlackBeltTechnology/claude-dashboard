# Claude Session Dashboard

## What This Is

A real-time monitoring dashboard for Claude Code AI agent sessions. It watches `~/.claude/projects/` for JSONL session transcripts, parses them into a hierarchy (sessions -> messages -> tools/skills/subagents), and presents them via a local web UI with directory-first navigation, horizontal timeline graph, tree view, and detailed node inspection. Sessions are navigable from a directory overview, subagent workflows are expandable inline with internal nodes, and every element is clickable for full metadata. Content-level filtering enables drilling into specific tools, agents, or prompts. Built as a TypeScript monorepo with Express/WebSocket backend and React frontend.

## Core Value

Make Claude Code agent activity visible and navigable — users can see what's happening across all their sessions at a glance and drill into any detail.

## Requirements

### Validated

- ✓ Real-time session monitoring via filesystem watching and WebSocket broadcast — existing
- ✓ Session discovery from `~/.claude/projects/` JSONL files with subagent hierarchy — existing
- ✓ Tree view visualization of session hierarchy (sessions -> messages -> tools/skills/subagents) — v1.0
- ✓ Graph view visualization using @xyflow/react with dagre layout — v1.0
- ✓ Session state detection (active/archived) with browser notifications — v1.0
- ✓ Filtering by node type (session, subagent, tool, skill) and text search — existing
- ✓ Tmux integration for prompt injection into active sessions — existing
- ✓ Localhost-only security (WebSocket and CORS restrictions) — existing
- ✓ Sessions identified by working directory name with #1/#2 disambiguation — v1.0
- ✓ Tool calls grouped by type in tree and graph views ("Bash (12)") — v1.0
- ✓ Side panel for inspecting individual tool calls within groups — v1.0
- ✓ Horizontal timeline graph with fork-join subagent branches — v1.0
- ✓ Full node metadata inspection (tools, skills, agents) with formatted display — v1.0
- ✓ Directory Overview graph (working directories as primary nodes) — v1.0
- ✓ Parallel subagent detection and fork-join rendering — v1.0
- ✓ Session titles from first user prompt — v1.0
- ✓ Browser-only notifications with working directory names — v1.0
- ✓ Agent name extraction from ~/.claude/agents/*.md definition files — v1.0
- ✓ Directory graph as sole navigation (removed left sidebar session list) — v1.1
- ✓ Active/archived session state filters in directory graph view — v1.1
- ✓ Session nodes display first command title (skip /clear) — v1.1
- ✓ User prompt nodes visible in session timeline — v1.1
- ✓ /clear commands rendered as context-reset marker nodes — v1.1
- ✓ Tool calls clickable directly on agent nodes to open tool metadata — v1.1
- ✓ Agent metadata panel shows request/response only (no tool list) — v1.1
- ✓ Subagent request/response visible in graph and tree views — v1.1
- ✓ Tree view chronological ordering fix — v1.1
- ✓ Tree view nesting depth reduction — v1.1
- ✓ Session node last command display and clear-session indicator — post-v1.1
- ✓ 4-state session detection (active/waiting/idle/completed) — post-v1.1
- ✓ Expandable subagent workflow boxes with internal nodes — post-v1.1
- ✓ Subagent internal nodes promoted to real React Flow nodes — post-v1.1
- ✓ Relative timestamps and state-priority sorting in directory overview — post-v1.1
- ✓ Content-level filtering by tool name, agent name, prompt text, model response content — post-v1.1
- ✓ Hook metadata badges and expandable group drill-down — post-v1.1

### Active

No active milestone. Use `/gsd:new-milestone` to start next milestone.

### Out of Scope

- Multi-user or remote access — localhost dashboard for personal use
- Persistent storage or database — in-memory state rebuilt from filesystem on startup
- Session editing or modification — read-only monitoring (except tmux prompt injection)
- Nested grouping (groups within groups) — over-complicates UI
- Real-time group animations — distracting when groups constantly update

## Context

- Monorepo: `server/` (Express + ws + chokidar), `client/` (React + Zustand + @xyflow), `shared/` (types)
- ~14,000 LOC TypeScript across ~50 source files
- No test suite — all changes verified manually during development
- Codebase mapped in `.planning/codebase/` with 7 analysis documents
- Session data from Claude Code's JSONL transcript format with `cwd` field
- v1.0 shipped 2026-02-11 with 11 phases, 22 plans, 23 quick tasks
- v1.1 shipped 2026-02-12 with 4 phases, 7 plans (+ 5 post-v1.1 phases, 18 quick tasks)

## Constraints

- **Tech stack**: TypeScript, React, @xyflow/react, Zustand, Express, ws — no framework changes
- **Shared types**: All data shapes defined in `shared/src/index.ts` for cross-workspace type safety
- **No git operations**: All changes made locally per user preference

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Group tool calls by type, not by parent message | Reduces visual noise — "Bash (5)" instead of 5 nodes | ✓ Good |
| Side panel for drill-down (not modal or inline expand) | Consistent with dashboard patterns, preserves layout | ✓ Good |
| Derive session name from working directory path | Most meaningful identifier users recognize | ✓ Good |
| Horizontal LR timeline with dagre layout | Natural left-to-right temporal flow | ✓ Good |
| Fork-join pattern with invisible join/sequencer nodes | dagre requires nodes for convergence points | ✓ Good |
| Parallel subagent detection by parentId grouping | 2+ SubagentNodes with same parentId = parallel invocation | ✓ Good |
| First non-/clear user prompt as session title | More meaningful than directory names alone | ✓ Good |
| Browser-only notifications (removed server-side) | Simpler, no desktop notification dependencies | ✓ Good |
| Component-local useState for ephemeral UI state | Tool expansion, hover state don't need Zustand persistence | ✓ Good |
| Agent name extraction from YAML frontmatter | ~/.claude/agents/*.md files contain readable agent names | ✓ Good |
| Directory graph as primary navigation entry point | Users start from working directories, drill into sessions — natural mental model | ✓ Good |
| Atomic navigation actions (enterSession/exitToDirectory) | Batch state changes atomically to prevent UI desync | ✓ Good |
| Tree panel as absolute-positioned overlay | Panel overlays graph without affecting viewport dimensions | ✓ Good |
| UserPromptNode/ClearMarkerNode as dedicated types | Separate from MessageNodes enables timeline visibility with distinct styling | ✓ Good |
| Callback prop pattern for nested tool clicks | onToolCallClick with stopPropagation avoids React Flow event conflicts | ✓ Good |
| Node enrichment post-layout | Attach callbacks after layout computation keeps layout logic pure | ✓ Good |
| Subagent boxes with expand/collapse state | Map<string, Set<string>> per-session state enables independent toggle | ✓ Good |
| 4-state session machine (active/waiting/idle/completed) | Idle as default state — only actual work signals count as active | ✓ Good |
| Two-pass filtering (category visibility + content matching) | Category toggle is fast; content filter is deep — orthogonal concerns | ✓ Good |

---
*Last updated: 2026-02-17 after v1.1 milestone completion*
