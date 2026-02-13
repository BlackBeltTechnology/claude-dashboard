// Session states
export type SessionState = 'active' | 'waiting' | 'idle' | 'completed';

// Node types in the hierarchy
export type NodeType = 'session' | 'message' | 'skill' | 'subagent' | 'tool' | 'user-prompt' | 'clear-marker';

// Base node interface
export interface HierarchyNode {
  id: string;
  type: NodeType;
  parentId: string | null;
  state: SessionState;
  timestamp: number;
}

// Session node
export interface SessionNode extends HierarchyNode {
  type: 'session';
  sessionId: string;
  projectHash: string;
  summary?: string;
  gitBranch?: string;
  tmuxTarget?: string;
}

// Message node (user or assistant)
export interface MessageNode extends HierarchyNode {
  type: 'message';
  role: 'user' | 'assistant';
  content: string;
  toolUses?: ToolUseInfo[];
}

// Tool use information
export interface ToolUseInfo {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

// Hook execution information
export interface HookInfo {
  event: string;        // e.g., "PreToolUse", "PostToolUse", "SessionStart"
  hookName: string;     // e.g., "PreToolUse:Task"
  command: string;      // e.g., "python3 ..." or "callback"
  timestamp: number;    // Unix timestamp in ms
}

// Skill node (Skill tool invocation)
export interface SkillNode extends HierarchyNode {
  type: 'skill';
  skillName: string;
  args?: string;
  sourceFilePath?: string;
  commandName?: string;
  success?: boolean;
  prompt?: string;
  result?: string;
  hooks?: HookInfo[];
}

// Subagent node (Task tool invocation)
export interface SubagentNode extends HierarchyNode {
  type: 'subagent';
  agentId: string;
  agentType: string;
  agentName?: string;
  agentColor?: string;  // Color from ~/.claude/agents/*.md frontmatter
  description?: string;
  sourceFilePath?: string;
  prompt?: string;
  summary?: string;
  model?: string;
  messageId?: string;  // API message ID - same for all tool_use blocks in one assistant turn (parallel detection)
  hooks?: HookInfo[];
}

// Tool node (any other tool call)
export interface ToolNode extends HierarchyNode {
  type: 'tool';
  toolName: string;
  input: Record<string, unknown>;
  output?: string;
  hooks?: HookInfo[];
}

// User prompt node (user messages with readable text)
export interface UserPromptNode extends HierarchyNode {
  type: 'user-prompt';
  promptText: string;          // The extracted readable user text
  commandName?: string;        // If this was a slash command (e.g. "gsd:plan-phase")
  commandMetadata?: string;    // Raw XML content if command had metadata
  isCommand: boolean;          // true if this was a slash command invocation
  hooks?: HookInfo[];
}

// Clear marker node (/clear commands)
export interface ClearMarkerNode extends HierarchyNode {
  type: 'clear-marker';
  clearIndex: number;          // Sequential index (1st /clear, 2nd /clear, etc.)
}

// Tool group node (consecutive tool calls of same type)
export interface ToolGroup {
  id: string;                // Stable ID: `tool-group-${toolName}-${firstNodeId}`
  type: 'tool-group';
  toolName: string;
  nodes: ToolNode[];
  count: number;
  state: SessionState;       // 'active' if any node is active, else first node's state
  timestamp: number;         // From first node
  parentId: string | null;   // From first node
}

// Union type for all nodes
export type AnyNode = SessionNode | MessageNode | SkillNode | SubagentNode | ToolNode | UserPromptNode | ClearMarkerNode;

// Display node type (includes grouping)
export type DisplayNode = AnyNode | ToolGroup;

// Session with full hierarchy
export interface Session {
  id: string;
  projectHash: string;
  state: SessionState;
  summary?: string;
  gitBranch?: string;
  cwd?: string;
  firstUserPrompt?: string;
  lastUserPrompt?: string;
  hasClearPrefix?: boolean;
  tmuxTarget?: string;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationInputTokens: number;
    cacheReadInputTokens: number;
    totalTokens: number;
  };
  createdAt: number;
  lastActivity: number;
  nodes: AnyNode[];
  subagents: Session[];
}

// WebSocket message types
export type WSMessageType =
  | 'snapshot'
  | 'session-update'
  | 'subagent-update'
  | 'state-change'
  | 'error';

export interface WSMessage {
  type: WSMessageType;
  payload: unknown;
  timestamp: number;
}

export interface SnapshotPayload {
  sessions: Session[];
}

export interface SessionUpdatePayload {
  sessionId: string;
  session: Session;
}

export interface SubagentUpdatePayload {
  parentSessionId: string;
  agentId: string;
  subagent: Session;
}

export interface StateChangePayload {
  sessionId: string;
  agentId?: string;
  previousState: SessionState;
  newState: SessionState;
  cwd?: string;                  // Working directory path
  lastUserPrompt?: string;       // Last command/prompt executed
}

// REST API types
export interface ApiError {
  error: string;
  message: string;
}

export interface PromptRequest {
  prompt: string;
  tmuxTarget?: string;  // Manual override
}

export interface PromptResponse {
  success: boolean;
  message: string;
}
