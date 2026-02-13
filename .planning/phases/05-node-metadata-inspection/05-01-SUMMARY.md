---
phase: 05-node-metadata-inspection
plan: 01
subsystem: data-pipeline
status: complete
tags: [types, parser, metadata, skills, subagents, tools]

requires:
  - 04-02: Tool detail panel with formatters

provides:
  - Extended type system with metadata fields
  - Structured tool result parsing
  - SkillNode creation and enrichment
  - Enhanced SubagentNode with prompt/model/sourceFilePath
  - ToolNode output attachment

affects:
  - Future UI components displaying node metadata
  - Tool detail panel can now show rich metadata

tech-stack:
  added: []
  patterns:
    - "Structured tool result parsing (stdout/stderr/interrupted/success/commandName)"
    - "Type-specific node creation (SkillNode vs ToolNode)"
    - "Tool result lookup map pattern"

key-files:
  created: []
  modified:
    - path: "shared/src/index.ts"
      change: "Extended SkillNode (5 fields), SubagentNode (3 fields) with metadata"
    - path: "server/src/jsonl-parser.ts"
      change: "Added structured toolResult fields, handle object toolUseResult"
    - path: "server/src/session-discovery.ts"
      change: "Create SkillNode for Skills, attach tool results to nodes, enrich metadata"

decisions:
  - decision: "SkillNode separate from ToolNode"
    rationale: "Skills have unique metadata (commandName, success) requiring dedicated type"
    alternatives: "Could have used discriminated ToolNode type"
    impact: "Cleaner type system, easier skill-specific UI components"

  - decision: "Tool result lookup map pattern"
    rationale: "Single pass to build map, O(1) lookup when processing tool uses"
    alternatives: "Could search entries array for each tool use (O(n²))"
    impact: "Better performance for sessions with many tools"

  - decision: "sourceFilePath conventions"
    rationale: "Standard paths like ~/.claude/skills/{name}/SKILL.md enable direct file access"
    alternatives: "Could store null, require separate discovery step"
    impact: "UI can directly link to source files"

metrics:
  duration: "1.8min"
  completed: "2026-02-09"

execution:
  autonomous: true
  deviations: []
  auth-gates: []
---

# Phase 05 Plan 01: Node Metadata Inspection Summary

**One-liner:** Extended type system and JSONL parser to extract full metadata for Skills, Subagents, and Tools including stdout/stderr, success flags, prompts, models, and source file paths.

## What Was Built

### 1. Extended Type System (shared/src/index.ts)

**SkillNode enhancements:**
- `sourceFilePath?: string` — Path to SKILL.md file
- `commandName?: string` — Actual command executed
- `success?: boolean` — Execution result
- `prompt?: string` — Input prompt/arguments
- `result?: string` — Output result

**SubagentNode enhancements:**
- `sourceFilePath?: string` — Path to agent definition file
- `prompt?: string` — Full input prompt to subagent
- `model?: string` — Model used (e.g., "claude-opus-4-6")

**ToolNode:** Already had `output?: string`, no changes needed.

### 2. Structured Tool Result Parsing (server/src/jsonl-parser.ts)

**Extended ParsedEntry.toolResult interface:**
```typescript
toolResult?: {
  toolUseId: string;
  content: string;
  isError: boolean;
  // NEW structured fields
  stdout?: string;
  stderr?: string;
  interrupted?: boolean;
  success?: boolean;       // For Skill results
  commandName?: string;    // For Skill results
};
```

**Enhanced parseLine() function:**
- Changed `RawJSONLEntry.toolUseResult` from `string` to `string | Record<string, unknown>`
- Added object handling logic:
  - If string: handle as before (backward compatible)
  - If object: extract structured fields (stdout, stderr, interrupted, success, commandName)
  - Fallback content: stdout || stderr || JSON.stringify(result)
  - Error detection: stderr present without stdout

### 3. Enhanced buildNodes() (server/src/session-discovery.ts)

**Tool result lookup pattern:**
- Pre-build Map<toolUseId, toolResult> for O(1) lookups
- Single pass through entries before main processing loop

**SkillNode creation:**
- Detect `tool.name === 'Skill'` in tool uses loop
- Create SkillNode (not ToolNode) with:
  - skillName from tool.input.skill
  - sourceFilePath: `~/.claude/skills/${skillName}/SKILL.md`
  - commandName, success from tool result
  - prompt from tool.input.prompt
  - result from tool result content

**SubagentNode enrichment:**
- Added prompt from tool.input.prompt
- Added model from tool.input.model
- Added sourceFilePath: `~/.claude/agents/${subagent_type}.md`

**ToolNode enrichment:**
- Lookup tool result in map
- Attach result.content to ToolNode.output field

## Technical Implementation

### Type Safety
All new fields are optional to maintain backward compatibility with existing sessions that lack this metadata.

### Performance
Tool result lookup map pattern ensures O(1) access rather than O(n) array search for each tool use, improving performance for sessions with many tools.

### Backward Compatibility
- String-based toolUseResult still works (existing format)
- Object-based toolUseResult now parsed (new format from newer Claude versions)
- Missing metadata gracefully handled via optional fields

## Verification Results

✅ Build passes with no TypeScript errors
✅ SkillNode has 5 new metadata fields
✅ SubagentNode has 3 new metadata fields
✅ ParsedEntry.toolResult has 5 new structured fields
✅ RawJSONLEntry.toolUseResult accepts string or object
✅ buildNodes() creates SkillNode when tool.name === 'Skill'
✅ buildNodes() attaches tool results to ToolNode.output
✅ buildNodes() populates SubagentNode metadata from Task input

## Deviations from Plan

None — plan executed exactly as written.

## Next Phase Readiness

**Unblocked for:**
- Node detail panel UI (has all metadata to display)
- Skill execution visualization (success flags, commandName)
- Subagent drill-down with source file links
- Tool output inspection with structured stdout/stderr

**Data quality notes:**
- sourceFilePath follows conventions, not validated against filesystem
- Skills in older sessions may lack commandName/success if JSONL format changed
- Tool results only available if toolUseResult entry exists in JSONL

## Files Changed

### shared/src/index.ts
- Extended SkillNode interface (+5 optional fields)
- Extended SubagentNode interface (+3 optional fields)
- No changes to ToolNode (output field already existed)

### server/src/jsonl-parser.ts
- Changed RawJSONLEntry.toolUseResult type to accept string or object
- Extended ParsedEntry.toolResult interface (+5 optional fields)
- Enhanced parseLine() to handle object toolUseResult with branching logic

### server/src/session-discovery.ts
- Added SkillNode to imports
- Added tool result lookup map creation in buildNodes()
- Added Skill branch in tool processing loop (creates SkillNode)
- Enhanced SubagentNode creation with prompt/model/sourceFilePath
- Enhanced ToolNode creation with output from tool result lookup

## Lessons Learned

### What Worked Well
- Type-first approach: Extending types before implementation caught interface mismatches at compile time
- Tool result lookup map: Single-pass preprocessing cleaner than inline lookups
- Structured field extraction: Defensive coding (optional fields, typeof checks) handles format variations gracefully

### Edge Cases Handled
- Missing tool results (skill executed but no result entry yet)
- Old string-based toolUseResult format (backward compatibility)
- Object toolUseResult with missing fields (undefined checks)
- Skills/subagents in older sessions (optional metadata)

---

**Status:** Complete ✓
**Duration:** 1.8 minutes
**Build:** Passing
**Phase 05:** 1/1 plans complete
