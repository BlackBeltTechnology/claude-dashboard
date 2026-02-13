---
phase: 16-fix-agent-node-rendering-to-show-agent-n
plan: 01
subsystem: Server (session-discovery) + Client (SubagentNode component)
tags: [agent-nodes, user-experience, metadata]
dependency-graph:
  requires:
    - shared/src/index.ts (SubagentNode interface)
  provides:
    - server/src/session-discovery.ts (agent name extraction and population)
    - client/src/components/nodes/SubagentNode.tsx (agent name display)
tech-stack:
  added:
    - YAML frontmatter parsing for agent definitions
    - Synchronous agent name caching
    - Agent name priority in display logic
  patterns:
    - Fallback chain: agentName → agentId → agentType → label
    - Module-level cache initialization
key-files:
  created: []
  modified:
    - shared/src/index.ts
    - server/src/session-discovery.ts
    - client/src/components/nodes/SubagentNode.tsx
key-decisions:
  - Synchronous caching approach for performance in synchronous buildNodes context
  - YAML frontmatter regex parsing for agent name extraction
  - Display priority ensures meaningful names while maintaining backward compatibility
metrics:
  duration: 16min 49s
  completed: 2026-02-10T13:06:15Z
---

# Quick Task 16: Fix Agent Node Rendering to Show Agent Names - Summary

## Overview

Successfully implemented agent name extraction and display for agent nodes. Agent nodes now show readable names (e.g., "gsd-planner", "doc-structure-explorer") instead of hash IDs (e.g., "a102c2c") by extracting names from `~/.claude/agents/*.md` definition files.

## Changes Made

### 1. Shared Type Definition (shared/src/index.ts)
- **Added**: `agentName?: string;` field to `SubagentNode` interface
- **Purpose**: Provides TypeScript type safety for storing extracted agent names

### 2. Server-Side Agent Name Extraction (server/src/session-discovery.ts)
- **Added**: `extractAgentNameFromPath()` helper function to convert filenames to agent identifiers
- **Added**: `loadAgentNames()` async function for reading YAML frontmatter from agent definition files
- **Added**: `loadAgentNamesSync()` synchronous version for use in synchronous contexts
- **Added**: Module-level cache initialization to load agent names at startup
- **Updated**: `buildNodes()` function to populate `agentName` field when creating SubagentNode objects
- **Implementation Details**:
  - Reads all `.md` files from `~/.claude/agents/`
  - Parses YAML frontmatter using regex to extract `name:` field
  - Caches results for performance
  - Falls back to `agentType` if no definition found

### 3. Client-Side Display (client/src/components/nodes/SubagentNode.tsx)
- **Updated**: `SubagentNodeData` interface to include `agentName?: string;`
- **Updated**: Title display logic from `{data.agentId || data.agentType || data.label}` to `{data.agentName || data.agentId || data.agentType || data.label}`
- **Impact**: Agent names now display with priority, providing meaningful identifiers while maintaining full backward compatibility

## Fallback Behavior

The implementation maintains a clear fallback chain:
1. **agentName** - From definition file YAML frontmatter (e.g., "gsd-planner")
2. **agentId** - Hash ID (e.g., "a102c2c")
3. **agentType** - Raw agent type (e.g., "PlanExecutor")
4. **label** - Final fallback

This ensures nodes always display something meaningful, even if agent definitions are unavailable.

## Technical Approach

- **YAML Parsing**: Uses regex pattern matching to extract `name:` field from markdown frontmatter
- **Caching Strategy**: Module-level cache populated at initialization for optimal performance
- **Synchronous Design**: Sync version for `buildNodes()` (synchronous context), async version available for other use cases
- **Type Safety**: Full TypeScript coverage with updated interfaces

## Verification

- ✅ TypeScript compilation passes for shared, server, and client
- ✅ Agent name extraction function ready for use
- ✅ SubagentNode interface includes agentName field
- ✅ Display logic prioritizes agentName while maintaining fallbacks

## Outcome

Users now see readable agent names like "gsd-planner" and "doc-structure-explorer" instead of cryptic hash IDs, significantly improving the dashboard's usability and clarity when identifying active agent nodes.

## Self-Check: PASSED

All verification criteria met successfully.
