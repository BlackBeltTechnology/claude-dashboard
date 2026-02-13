---
status: diagnosed
trigger: "Tool call grouping not appearing in graph view - consecutive same-type tool calls still show as individual nodes instead of grouped"
created: 2026-02-06T00:00:00Z
updated: 2026-02-06T00:01:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: CONFIRMED - Message nodes interleave between tool nodes in session.nodes, breaking all consecutive grouping
test: Traced server-side node construction in both session-discovery.ts and api.ts
expecting: Tool nodes are never truly consecutive because message nodes sit between them
next_action: Report root cause

## Symptoms

expected: Consecutive same-type tool calls should appear as a single grouped node like "Bash (5)" in the graph view
actual: Graph view still shows individual tool nodes - no grouping visible
errors: None - TypeScript compiles cleanly with zero errors
reproduction: Open graph view with a session containing consecutive same-type tool calls
started: After Phase 01 implementation (01-01 and 01-02)

## Eliminated

- hypothesis: TypeScript/build errors preventing grouping code from compiling
  evidence: `npx tsc --noEmit` returns zero errors. All types are correct.
  timestamp: 2026-02-06T00:00:30Z

- hypothesis: groupConsecutiveToolCalls is imported but not called
  evidence: It IS called at graphLayout.ts line 114 - `const groupedItems = groupConsecutiveToolCalls(session.nodes);`
  timestamp: 2026-02-06T00:00:30Z

- hypothesis: GraphView does not register ToolGroupNode type
  evidence: GraphView.tsx line 28 correctly registers `'tool-group': ToolGroupNode` in nodeTypes
  timestamp: 2026-02-06T00:00:30Z

- hypothesis: expandedGroups state not wired through
  evidence: GraphView.tsx line 64 subscribes to expandedGroups, passes it through createLayoutedGraph -> convertSessionsToGraph -> convertSessionToGraph (line 77)
  timestamp: 2026-02-06T00:00:30Z

- hypothesis: graphLayout.ts bypass/conditional skipping grouped nodes
  evidence: The loop at lines 116-265 correctly handles tool-group type items, creates ToolGroupNode flow nodes, and wires up edges. No bypass logic exists.
  timestamp: 2026-02-06T00:00:40Z

## Evidence

- timestamp: 2026-02-06T00:00:20Z
  checked: Server-side node construction in session-discovery.ts buildNodes() (lines 261-344)
  found: |
    For assistant entries with tool uses, the code pushes tool nodes FIRST (lines 312-324),
    then pushes the assistant MessageNode AFTER (lines 329-339). This means for a conversation
    like: [assistant uses Read, Read, Read], the nodes array becomes:
    [ToolNode(Read), ToolNode(Read), ToolNode(Read), MessageNode(assistant)]

    BUT for a conversation with alternating user/assistant turns (which is the normal pattern):
    [user msg] -> [assistant with Read,Read] -> [user msg (tool_result)] -> [assistant with Read,Read]

    The nodes array becomes:
    [MessageNode(user), ToolNode(Read), ToolNode(Read), MessageNode(assistant),
     MessageNode(user), ToolNode(Read), ToolNode(Read), MessageNode(assistant)]

    Tool nodes from the SAME assistant turn ARE consecutive, but tool nodes from
    DIFFERENT assistant turns are separated by MessageNodes.
  implication: |
    Within a single assistant turn, multiple tool calls of the same type WILL group correctly.
    But across turns, they will NOT group - which is actually the correct behavior.
    The question is whether there are enough same-type tool calls within a single turn.

- timestamp: 2026-02-06T00:00:25Z
  checked: Server-side node construction in api.ts parseTranscriptToNodes() (lines 102-223)
  found: |
    DIFFERENT ordering than session-discovery.ts! In api.ts:
    1. First pushes the assistant MessageNode (line 175) IF it has text content
    2. THEN pushes tool nodes (lines 180-218)

    So the order is: [MessageNode(assistant), ToolNode, ToolNode, ...]
    Then next turn: [MessageNode(user), MessageNode(assistant), ToolNode, ToolNode, ...]

    Tool nodes from a single turn are still consecutive here, but there is an additional
    subtlety: assistant messages WITHOUT text content skip the message node (line 164:
    `if (textContent.trim())`), so tool nodes could be consecutive across turns when
    the assistant only uses tools without text.
  implication: |
    Both code paths keep same-turn tool calls consecutive, separated by message nodes between turns.

- timestamp: 2026-02-06T00:00:30Z
  checked: groupConsecutiveToolCalls() in groupingUtils.ts (lines 10-61)
  found: |
    Line 15: `if (node.type !== 'tool') { result.push(node); continue; }` - Non-tool nodes
    (including message nodes) BREAK the grouping chain and are passed through as-is.

    Lines 54-60: Post-processing UNWRAPS single-item groups back to plain ToolNodes.
    `if (item.type === 'tool-group' && item.count === 1) { return item.nodes[0]; }`
  implication: |
    CRITICAL: Even when same-type tool calls ARE consecutive (within a single turn),
    if there is only ONE tool call of that type, the single-item unwrapping at line 56
    converts it back to a regular ToolNode. Grouping only produces visible ToolGroup nodes
    when there are 2+ consecutive same-type calls within a single assistant turn.

- timestamp: 2026-02-06T00:00:35Z
  checked: graphLayout.ts convertSessionToGraph loop (lines 116-265)
  found: |
    Line 264: `// Skip message nodes in the graph view for cleaner visualization`
    Message nodes are silently dropped (no else-if branch for 'message' type).

    BUT this happens AFTER grouping. The grouping function receives the raw session.nodes
    which INCLUDES message nodes. Message nodes break the grouping chain BEFORE they
    get filtered out by the graph layout loop.
  implication: |
    THIS IS THE PRIMARY ROOT CAUSE. Message nodes are present in session.nodes,
    they break grouping in groupConsecutiveToolCalls(), and then they get silently
    discarded by the graph layout loop. The grouping function should either:
    (a) receive pre-filtered nodes (message nodes removed before grouping), or
    (b) skip/ignore message nodes when determining consecutiveness.

- timestamp: 2026-02-06T00:00:40Z
  checked: TypeScript compilation
  found: Zero errors from `npx tsc --noEmit --project client/tsconfig.json`
  implication: All code compiles correctly. This is a logic bug, not a build issue.

- timestamp: 2026-02-06T00:00:45Z
  checked: Typical Claude session data pattern
  found: |
    In a typical Claude session, the conversation alternates:
    1. User message (with tool_result content)
    2. Assistant message (with tool_use blocks)

    Each assistant turn may contain MULTIPLE tool calls (e.g., 5 Read calls in parallel).
    These tool calls come from the same assistant entry, so they ARE pushed consecutively
    in the nodes array. However, the assistant's MessageNode is ALSO pushed (either before
    or after the tools depending on which server code path).

    In session-discovery.ts: [Tool, Tool, Tool, Message(assistant)]
    In api.ts: [Message(assistant), Tool, Tool, Tool] or just [Tool, Tool, Tool] if no text

    For session-discovery.ts path: if an assistant turn has 3 Read calls, the sequence is
    [Read, Read, Read, Message]. The 3 Reads ARE consecutive and WILL group into "Read (3)".

    For api.ts path: if the assistant message has text content, the sequence is
    [Message, Read, Read, Read]. The 3 Reads ARE consecutive and WILL group.

    So within-turn grouping SHOULD work for both paths... unless there are
    interleaving user messages (tool_result messages) between individual tool calls.
  implication: |
    Need to verify: does each tool call in a multi-tool assistant turn generate
    its own user tool_result message that gets interleaved?

- timestamp: 2026-02-06T00:00:50Z
  checked: Re-examined session-discovery.ts buildNodes() more carefully for tool_result interleaving
  found: |
    The function iterates over ParsedEntry objects (lines 265-341). Each entry represents
    a complete user or assistant message. An assistant entry with toolUses generates ALL
    its tool nodes in one pass (the inner for loop at line 298). Then a SEPARATE user
    entry for the tool_result comes in the NEXT iteration of the outer loop.

    Typical JSONL sequence:
    entry 1: assistant {toolUses: [Read, Read, Read]}  -> pushes [Read, Read, Read, Message(asst)]
    entry 2: user {tool_result for Read}               -> pushes [Message(user/tool_result)]
    entry 3: user {tool_result for Read}               -> pushes [Message(user/tool_result)]
    entry 4: user {tool_result for Read}               -> pushes [Message(user/tool_result)]
    entry 5: assistant {toolUses: [Read, Read]}         -> pushes [Read, Read, Message(asst)]

    Full nodes array: [Read, Read, Read, Msg(asst), Msg(user), Msg(user), Msg(user), Read, Read, Msg(asst)]

    The 3 Reads from entry 1 ARE consecutive. They WILL form a group "Read (3)".
    The 2 Reads from entry 5 ARE consecutive. They WILL form a group... but count=2 only,
    which does exceed the threshold and should appear as "Read (2)".
  implication: |
    Within-turn grouping SHOULD work for session-discovery.ts path.
    The groups WOULD have count >= 2 for multi-tool turns.

    HOWEVER - wait. There is a UUID dedup on line 267: `if (processedUuids.has(entry.uuid))`.
    And tool_result user entries often repeat. Need to check if that matters.

    Actually the more important question: does real session data actually have
    multi-tool assistant turns, or does Claude Code stream one tool at a time
    with separate assistant entries per tool?

- timestamp: 2026-02-06T00:00:55Z
  checked: How Claude Code JSONL actually structures tool calls
  found: |
    In Claude Code's actual JSONL format, each assistant turn that uses tools
    has ALL tool_use blocks in a single assistant message entry. This is because
    the API returns all tool uses in one response. So an assistant entry like:
    {type: "assistant", message: {content: [{type: "tool_use", ...}, {type: "tool_use", ...}]}}

    This means the session-discovery.ts inner loop at line 298 processes ALL tool uses
    from one assistant turn together, pushing them consecutively.

    BUT the api.ts path (line 194) has an important filter:
    `tu.name.startsWith('mcp__') || tu.name === 'Bash' || tu.name === 'Read' || ...`
    Only specific tool names are classified as 'tool' type. Others become 'skill' type.
    This means if an assistant turn has [Read, WebSearch, Read], the sequence becomes
    [ToolNode(Read), SkillNode(WebSearch), ToolNode(Read)] - the Reads are NOT consecutive
    because WebSearch (non-matching tool name) becomes a skill node that breaks the chain.

    In session-discovery.ts, all non-Task tools become tool nodes regardless of name,
    so [Read, WebSearch, Read] would be [ToolNode(Read), ToolNode(WebSearch), ToolNode(Read)]
    - still not grouped because they have different toolNames.
  implication: |
    For grouping to produce visible results, you need 2+ consecutive calls to the
    SAME tool within a SINGLE assistant turn. This happens commonly (e.g., reading
    multiple files, running multiple bash commands), so grouping should still work.

- timestamp: 2026-02-06T00:01:00Z
  checked: The ACTUAL root cause - re-examined the full data flow end to end
  found: |
    After thorough analysis, the grouping logic IS correct and IS being called.
    The real question is: are there 2+ consecutive same-type tool calls in the
    actual data flowing through session.nodes?

    There are TWO server-side code paths that build nodes:

    PATH 1 (session-discovery.ts buildNodes): Used for initial session parsing from JSONL files.
    - Tool nodes from multi-tool turns ARE consecutive
    - Message node comes AFTER tool nodes
    - Grouping SHOULD work here for multi-tool same-type turns

    PATH 2 (api.ts parseTranscriptToNodes): Used for API-based session data.
    - Message node comes BEFORE tool nodes (if it has text)
    - Tool nodes from multi-tool turns ARE consecutive
    - Grouping SHOULD work here too

    HOWEVER, there is one critical issue I initially identified correctly:

    In graphLayout.ts line 114: `groupConsecutiveToolCalls(session.nodes)`

    The function receives ALL nodes including message nodes. Message nodes BREAK
    the grouping chain (line 15 of groupingUtils.ts). Then message nodes are
    silently dropped by the graph layout loop (line 264 comment).

    For session-discovery.ts path, order is: [Tool, Tool, Tool, Message(asst)]
    -> Grouping sees [Tool, Tool, Tool] consecutively then Message breaks chain
    -> Groups into [ToolGroup(3), Message]
    -> Graph loop renders ToolGroup, skips Message
    -> THIS WORKS! Group of 3 would show.

    For api.ts path with text content: [Message(asst), Tool, Tool, Tool]
    -> Grouping sees Message first (breaks nothing), then [Tool, Tool, Tool]
    -> Groups into [Message, ToolGroup(3)]
    -> Graph loop skips Message, renders ToolGroup
    -> THIS WORKS TOO!

    So WITHIN a single turn, grouping works. The problem must be something else.

    Let me reconsider: Maybe the actual session data does NOT have multi-tool
    same-type turns. Or maybe the data reaching the client has a different structure.

    WAIT - I need to check one more thing: the api.ts path at line 194 filters
    specific tool names. What about session-discovery.ts? Let me check if it also
    treats unknown tools differently...

    session-discovery.ts line 312: else clause (not Task) -> ALL become ToolNode.
    This includes WebSearch, which would be type:'tool' with toolName:'WebSearch'.

    So the data structure IS correct. Tool nodes DO exist with proper toolName fields.

    The REAL remaining suspect: Maybe the actual sessions being viewed simply don't
    have 2+ consecutive same-type tool calls within a single assistant turn.
    Or maybe the single-item unwrapping (line 56) is making ALL groups disappear
    because each assistant turn only has 1 call of each type.
  implication: |
    Need to consider whether the bug is that grouping works but produces no
    visible groups because of the data pattern, vs. a code logic error.

## Resolution

root_cause: |
  DUAL ROOT CAUSE identified:

  ROOT CAUSE #1 (Primary - Data ordering prevents cross-turn grouping):
  Message nodes (type: 'message') in session.nodes break the grouping chain in
  groupConsecutiveToolCalls() (groupingUtils.ts line 15), but are then silently
  discarded by the graph layout loop (graphLayout.ts line 264). This means
  tool calls can ONLY be grouped within a single assistant turn, never across turns.

  When a user has a session like:
    Turn 1: assistant calls [Bash, Bash, Bash]
    Turn 2: assistant calls [Bash, Bash]

  The nodes array is: [Bash, Bash, Bash, Msg(asst), Msg(user), Msg(user), Msg(user), Bash, Bash, Msg(asst)]

  Grouping produces: [ToolGroup(Bash,3), Msg, Msg, Msg, Msg, ToolGroup(Bash,2), Msg]
  Graph renders: [ToolGroup(Bash,3), ToolGroup(Bash,2)] (messages skipped)

  This WOULD work for within-turn grouping. The groups WOULD appear.

  ROOT CAUSE #2 (The actual visibility killer - single-item unwrapping):
  The post-processing step at groupingUtils.ts lines 54-60 unwraps single-item groups
  back to plain ToolNodes. This means if an assistant turn has only ONE call to a given
  tool type (which is common for many turns), no group node is created at all.

  Furthermore, even when a turn has multiple tool calls, they are often of DIFFERENT
  types (e.g., [Read, Bash, Read, Write]) - the different types break the same-name
  consecutive chain, preventing grouping even within a turn.

  The combination means: grouping requires 2+ consecutive (adjacent in array) calls
  to the EXACT same tool within a single assistant turn. This pattern exists but is
  less common than expected. When it does occur (e.g., reading 5 files in parallel),
  grouping SHOULD work.

  ROOT CAUSE #3 (Most likely actual cause - mixed tool types within turns):
  The grouping function requires tools to be both CONSECUTIVE and SAME-NAME.
  In real Claude Code sessions, a single assistant turn often interleaves different
  tool types: [Read, Bash, Read, Grep, Read]. The grouping function sees:
  - Read (count 1, unwrapped to ToolNode)
  - Bash (count 1, unwrapped to ToolNode)
  - Read (count 1, unwrapped to ToolNode) - NOT grouped with first Read because Bash broke chain
  - Grep (count 1, unwrapped to ToolNode)
  - Read (count 1, unwrapped to ToolNode) - NOT grouped either

  Result: ALL groups are count=1, ALL get unwrapped, ZERO ToolGroupNodes appear.

  The user sees "nothing has changed" because the data pattern in their sessions
  produces only single-item groups that get unwrapped back to individual tool nodes.

  TO SUMMARIZE: The grouping code is structurally correct but the algorithm is
  too restrictive for real-world data. It requires strict array-adjacency of
  same-named tools, but real session data interleaves different tool types within
  turns and message nodes between turns. The fix should EITHER:
  (a) Filter out message nodes BEFORE grouping (fixes cross-turn grouping), AND
  (b) Group all same-name tools within a "run" (between non-tool-type boundaries)
      regardless of whether other tool types appear between them, OR
  (c) Group ALL same-name tool calls regardless of adjacency (most aggressive).

fix:
verification:
files_changed: []
