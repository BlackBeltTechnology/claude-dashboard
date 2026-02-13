# Claude Session Dashboard

## What This Is

A real-time monitoring dashboard for Claude Code AI agent sessions. It watches `~/.claude/projects/` for JSONL session transcripts, parses them into a hierarchy (sessions -> messages -> tools/skills/subagents), and presents them via a local web UI with multiple views: horizontal timeline graph, tree view, and directory overview. Tool calls are grouped by type, sessions are named by working directory, and every node is clickable for full metadata inspection. Built as a TypeScript monorepo with Express/WebSocket backend and React frontend.

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

### Active

#### Current Milestone: v1.1 Verbose Debugging

- [ ] Directory graph as sole navigation (remove left sidebar session list)
- [ ] Active/archived session state filters in directory graph view
- [ ] Session nodes display first command title (skip /clear)
- [ ] User prompt nodes visible in session timeline
- [ ] /clear commands rendered as context-reset marker nodes
- [ ] Tool calls clickable directly on agent nodes to open tool metadata
- [ ] Agent metadata panel shows request/response only (no tool list)
- [ ] Subagent request/response visible in graph and tree views
- [ ] Tree view timeline ordering fix
- [ ] Tree view nesting depth reduction

### Out of Scope

- Multi-user or remote access — localhost dashboard for personal use
- Persistent storage or database — in-memory state rebuilt from filesystem on startup
- Session editing or modification — read-only monitoring (except tmux prompt injection)
- Nested grouping (groups within groups) — over-complicates UI
- Real-time group animations — distracting when groups constantly update

## Context

- Monorepo: `server/` (Express + ws + chokidar), `client/` (React + Zustand + @xyflow), `shared/` (types)
- ~9,800 LOC TypeScript across 39 source files
- No test suite — all changes verified manually during development
- Codebase mapped in `.planning/codebase/` with 7 analysis documents
- Session data from Claude Code's JSONL transcript format with `cwd` field
- v1.0 shipped 2026-02-11 with 11 phases, 22 plans, 23 quick tasks

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

---
*Last updated: 2026-02-11 after v1.1 milestone start*
