# Agent Node Metadata Fix - Summary

## Problems Identified

### 1. Agent Nodes Not Opening (FIXED ✅)

**Root Cause:**
- GraphView tried to parse React Flow node IDs to extract subagent session IDs
- Node IDs contain hyphens from session UUIDs, making parsing unreliable
- Example: Node ID "session-uuid-123-agent123-start" was parsed incorrectly
- Parsed ID "uuid-123-agent123" didn't match actual agent ID "agent123"
- Lookup always failed, so agent metadata never displayed

**Solution:**
- Changed GraphView to use `node.data.agentId` directly instead of parsing node ID
- This accesses the agent ID that was already being stored in the node data by graphLayout.ts
- Reliable lookup now works: `subagentNodes.find(n => n.agentId === subagentSessionId)`

### 2. Agent Name Display (FIXED ✅)

**Root Cause:**
- graphLayout.ts was using wrong ID field for lookup: `n.id` instead of `n.agentId`
- The `n.id` is the tool use UUID (e.g., "call_function_abc123")
- The `n.agentId` is the 7-char agent ID (e.g., "a8818a4")
- Lookup failed, so `agentName` was always undefined

**Solution:**
- Fixed lookup in graphLayout.ts to use `n.agentId` instead of `n.id`
- Now correctly extracts agentName from SubagentNode objects
- Agent nodes now display readable names like "GSD Planner" instead of hashes

### 3. Tool Nodes Not Working (INVESTIGATING 🔍)

**Current Status:**
- Tools are rendered as 'tool-group' React Flow nodes (not 'tool' nodes)
- Click handler checks for both 'tool' and 'tool-group' types
- Need to verify findToolGroupInSessions function works correctly
- May need to add expansion support like subagents have

### 4. Tool Call Groups Can't Expand (INVESTIGATING 🔍)

**Current Status:**
- Subagent nodes have inline expansion showing tool calls
- Tool group nodes may not have expansion functionality
- Need to verify if expansion is implemented and working

## Files Modified

1. **client/src/utils/graphLayout.ts**
   - Fixed lookup: `n.agentId === parallelSubagent.id` (was `n.id === parallelSubagent.id`)
   - Fixed lookup: `n.agentId === subagent.id` (was `n.id === subagent.id`)
   - Now correctly extracts agentName from SubagentNode objects

2. **client/src/components/GraphView.tsx**
   - Changed agent node click handler to use `node.data.agentId` instead of parsing node ID
   - Removed unreliable ID parsing logic
   - Now directly accesses agentId from node data

## Testing

To verify the fixes:

1. **Agent Node Metadata:**
   - Click any agent node in GraphView
   - Check browser console for "findSubagentNode result" log
   - Should show agent data with agentName populated
   - Metadata panel should open with agent details

2. **Agent Name Display:**
   - Look at agent nodes in GraphView
   - Should show readable names like "GSD Planner" instead of "a8818a4"
   - Color circles should work correctly

## Next Steps

1. **Verify Tool Node Clicks:**
   - Click tool group nodes in GraphView
   - Check if metadata panel opens
   - Verify tool details are displayed correctly

2. **Add Tool Group Expansion:**
   - Implement expansion functionality for tool groups
   - Allow users to see individual tool calls within groups
   - Mirror the subagent inline expansion pattern

3. **Test All Node Types:**
   - Session nodes
   - Subagent nodes (start/stop)
   - Skill nodes
   - Tool group nodes
   - Directory nodes (in Directory Overview)

## Technical Details

### Data Flow (Server → Client)

```
Server (session-discovery.ts):
  1. Parse JSONL files
  2. Create SubagentNode objects with agentId, agentType, agentName
  3. Create Session objects for subagents with id = agentId
  4. Send sessions via WebSocket to client

Client (graphLayout.ts):
  1. Receive sessions
  2. Create React Flow nodes with node.data.agentId populated
  3. Pass to GraphView

Client (GraphView):
  1. On click, access node.data.agentId
  2. Find SubagentNode with matching agentId
  3. Display metadata
```

### Key Insight

The agent ID matching is:
- **SubagentNode.agentId** = last 7 chars of tool use UUID (e.g., "a8818a4")
- **Session.id** = agent ID from filename (e.g., "a8818a4")
- They match! ✅

The bug was in the lookup logic, not the data itself.
