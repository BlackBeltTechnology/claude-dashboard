# Claude Session Dashboard

A real-time monitoring dashboard for Claude Code AI agent sessions. It watches `~/.claude/projects/` for JSONL session transcripts, parses them into a navigable hierarchy, and presents them via a local web UI with multiple visualization modes.

See what's happening across all your Claude Code sessions at a glance and drill into any detail.

## Features

- **Directory overview** — see all working directories with active sessions as the primary navigation view
- **Horizontal timeline graph** — left-to-right session timeline using dagre layout with fork-join subagent branches
- **Tree view** — hierarchical session breakdown (sessions > messages > tools/skills/subagents)
- **Real-time updates** — filesystem watching + WebSocket broadcast for live session state
- **Session state detection** — 4-state model (active/waiting/idle/completed) with color-coded indicators
- **Subagent workflow visualization** — expandable container boxes showing request > tool calls > response per subagent
- **Parallel subagent rendering** — fork-join pattern for concurrent Task tool invocations
- **Tool call grouping** — "Bash (12)" instead of 12 separate nodes, with drill-down panel
- **Node metadata inspection** — click any node for full metadata, formatted tool parameters, hook info
- **Content filtering** — filter nodes by tool name, agent name, prompt text, model response, skill name
- **Browser notifications** — alerts when sessions finish executing
- **Session naming** — sessions identified by first user prompt, with working directory context
- **Localhost-only** — no authentication needed, secured by binding to 127.0.0.1

## Prerequisites

- **Node.js** >= 18
- **npm** >= 9
- **Claude Code** installed and used (creates `~/.claude/projects/` with session data)

## Quick Start

```bash
# Install dependencies
npm install

# Build all workspaces (shared types must build first)
npm run build

# Start development servers (Express backend + Vite frontend)
npm run dev
```

The dashboard opens at **http://localhost:5173** with the API server on port **3847**.

## Architecture

TypeScript monorepo with three npm workspaces:

```
claude-session-dashboard/
├── shared/          # Shared TypeScript types (zero dependencies)
│   └── src/index.ts # Session, AnyNode, WebSocket message interfaces
├── server/          # Express + WebSocket backend
│   └── src/
│       ├── index.ts             # Server entry point (port 3847)
│       ├── api.ts               # REST endpoints
│       ├── watcher.ts           # SessionManager — file watching + event emission
│       ├── websocket.ts         # WebSocketManager — real-time broadcasts
│       ├── session-discovery.ts # JSONL file discovery + hierarchy building
│       └── jsonl-parser.ts      # Claude Code JSONL transcript parser
├── client/          # React + Zustand + @xyflow frontend
│   └── src/
│       ├── App.tsx              # Root component
│       ├── store/               # Zustand state management
│       ├── components/          # React components
│       │   ├── Layout.tsx       # Main layout (toolbar + content)
│       │   ├── GraphView.tsx    # @xyflow graph visualization
│       │   ├── TreeView.tsx     # Tree hierarchy view
│       │   ├── NodeDetail.tsx   # Node metadata panel
│       │   ├── Toolbar.tsx      # Filter bar + view controls
│       │   └── nodes/           # Typed node renderers
│       ├── hooks/               # Custom React hooks
│       └── utils/               # Layout algorithms + formatters
└── .planning/       # GSD planning artifacts
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Shared** | TypeScript | Type definitions shared across workspaces |
| **Server** | Express | HTTP API |
| **Server** | ws | WebSocket server for real-time updates |
| **Server** | chokidar | Filesystem watching for JSONL changes |
| **Client** | React 18 | UI framework |
| **Client** | Zustand | State management |
| **Client** | @xyflow/react | Graph visualization (nodes + edges) |
| **Client** | dagre | Automatic graph layout algorithm |
| **Client** | Vite | Development server + build tool |
| **Build** | TypeScript 5 | Type checking + compilation |

## Available Scripts

Run from the project root:

| Script | Command | Description |
|--------|---------|-------------|
| **dev** | `npm run dev` | Start both server (tsx watch) and client (vite) concurrently |
| **build** | `npm run build` | Build shared > server > client in dependency order |
| **restart** | `npm run restart` | Kill port 3847, rebuild, and restart dev servers |
| **start** | `npm run start` | Run production server (after build) |

Workspace-specific:

```bash
npm run dev -w server     # Server only (tsx watch, port 3847)
npm run dev -w client     # Client only (vite, port 5173)
npm run build -w shared   # Build shared types
npm run test -w client    # Run client tests (vitest)
```

## How It Works

### Data Flow

1. **Discovery** — Server scans `~/.claude/projects/*/` for JSONL session files on startup
2. **Watching** — Chokidar monitors for file changes with 100ms debounce
3. **Parsing** — JSONL parser extracts messages, tool calls, skills, subagents into a typed hierarchy
4. **Broadcasting** — WebSocket pushes session updates to all connected browser clients
5. **Rendering** — Zustand store processes updates, React re-renders affected views

### Session State Detection

Sessions are classified into 4 states based on activity signals:

| State | Color | Meaning |
|-------|-------|---------|
| **Active** | Green | Currently executing (tool call within last 10s) |
| **Waiting** | Amber | Awaiting user input (idle_prompt marker detected) |
| **Idle** | Gray | No recent activity |
| **Completed** | Blue | Session ended (SessionEnd marker found) |

### Views

- **Directory Overview** — Working directories as primary nodes, session nodes nested inside. Entry point for navigation.
- **Session Graph** — Horizontal timeline of a single session. Tool groups, subagent boxes, user prompts, and model outputs flow left-to-right.
- **Tree View** — Collapsible hierarchy overlay. Click any tree item to focus its graph node.

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CLAUDE_DASHBOARD_PORT` | `3847` | Server port |
| `HOME` | (system) | Used to locate `~/.claude/` |

### Ports

- **3847** — Express API + WebSocket server
- **5173** — Vite dev server (development only)

---

## Developing with GSD

This project uses the **GSD (Get Shit Done)** framework for AI-assisted development with Claude Code. GSD provides structured planning, execution, and state tracking via slash commands.

### What is GSD?

GSD is a workflow framework that orchestrates Claude Code agents to plan and execute development tasks. It maintains planning artifacts in `.planning/` and provides:

- **Phased roadmaps** — work broken into phases with dependencies and success criteria
- **Executable plans** — detailed task lists with file targets and verification steps
- **State tracking** — `STATE.md` records progress, decisions, and session continuity
- **Quick tasks** — lightweight path for small, self-contained changes

### Project Structure (.planning/)

```
.planning/
├── PROJECT.md       # Project definition, requirements, constraints, key decisions
├── ROADMAP.md       # Phase breakdown with milestones and progress tracking
├── STATE.md         # Current position, metrics, accumulated context, quick tasks
├── REQUIREMENTS.md  # Formal requirement definitions
├── config.json      # GSD settings (model profile, workflow toggles)
├── codebase/        # Auto-generated architecture analysis (7 documents)
├── phases/          # Phase plans and summaries (01-tool-call-grouping/, etc.)
├── quick/           # Quick task plans and summaries (numbered sequentially)
├── milestones/      # Archived milestone roadmaps
└── research/        # Research outputs from domain analysis
```

### GSD Commands

#### Project Setup

| Command | Description |
|---------|-------------|
| `/gsd:new-project` | Initialize a new project — gathers context, creates PROJECT.md, researches domain, creates ROADMAP.md |
| `/gsd:new-milestone` | Start a new milestone cycle with requirements gathering |
| `/gsd:map-codebase` | Analyze codebase with parallel agents, produces `.planning/codebase/` documents |

#### Planning

| Command | Description |
|---------|-------------|
| `/gsd:plan-phase` | Create detailed execution plans for the current phase (spawns researcher + planner + checker) |
| `/gsd:discuss-phase` | Gather context through adaptive questioning before planning |
| `/gsd:list-phase-assumptions` | Surface Claude's assumptions about a phase before planning |
| `/gsd:research-phase` | Standalone research for a phase (usually embedded in plan-phase) |
| `/gsd:add-phase` | Add a new phase to the end of the current milestone |
| `/gsd:insert-phase` | Insert an urgent phase between existing phases (e.g., 7.1 between 7 and 8) |
| `/gsd:remove-phase` | Remove a future phase and renumber subsequent ones |

#### Execution

| Command | Description |
|---------|-------------|
| `/gsd:execute-phase` | Execute all plans in the current phase with wave-based parallelization |
| `/gsd:quick` | Execute a quick task — skips research/verification, ideal for small changes |
| `/gsd:verify-work` | Validate built features through conversational UAT |

#### Progress & State

| Command | Description |
|---------|-------------|
| `/gsd:progress` | Check project progress and route to next action (execute or plan) |
| `/gsd:pause-work` | Create context handoff when pausing mid-phase |
| `/gsd:resume-work` | Resume work from previous session with full context restoration |
| `/gsd:add-todo` | Capture an idea or task as a todo |
| `/gsd:check-todos` | List pending todos and select one to work on |

#### Milestone Management

| Command | Description |
|---------|-------------|
| `/gsd:audit-milestone` | Audit milestone completion against original intent |
| `/gsd:plan-milestone-gaps` | Create phases to close gaps identified by audit |
| `/gsd:complete-milestone` | Archive completed milestone and prepare for next version |

#### Configuration

| Command | Description |
|---------|-------------|
| `/gsd:settings` | Configure workflow toggles and model profile |
| `/gsd:set-profile` | Switch model profile (quality/balanced/budget) |
| `/gsd:help` | Show available commands and usage guide |

### Typical Development Workflow

#### Starting a new feature (phased)

```
1. /gsd:progress              # See current state
2. /gsd:plan-phase             # Plan the next phase (auto-researches, creates PLAN.md)
3. /gsd:execute-phase          # Execute all plans (spawns executor agents, updates STATE.md)
4. /gsd:verify-work            # Validate the feature works as expected
```

#### Quick fix or small change

```
/gsd:quick                     # Describe the task, GSD plans + executes + tracks it
```

#### Starting fresh on this project

```
/gsd:progress                  # Read STATE.md, see where things stand
/gsd:resume-work               # If continuing from a previous session
```

### GSD Config (.planning/config.json)

```json
{
  "mode": "yolo",              // Execution mode
  "depth": "quick",            // Planning depth
  "parallelization": true,     // Parallel executor agents
  "commit_docs": false,        // Git commit behavior (false = no commits)
  "model_profile": "balanced", // Agent model selection (quality/balanced/budget)
  "workflow": {
    "research": false,         // Skip research phase
    "plan_check": true,        // Verify plans before execution
    "verifier": true           // Post-execution verification
  }
}
```

### Key Concepts

- **Phase** — A unit of work with 1-4 plans, dependencies, and success criteria. Lives in `.planning/phases/NN-slug/`.
- **Plan** — An executable task list within a phase. Created by `gsd-planner`, executed by `gsd-executor`.
- **Quick Task** — A lightweight 1-3 task operation that skips research and verification. Lives in `.planning/quick/NNN-slug/`.
- **STATE.md** — The project's living state document. Records current position, decisions, metrics, blockers, and session continuity info.
- **ROADMAP.md** — The phase dependency graph with milestone groupings and progress tracking.

## License

Private project — not published.
