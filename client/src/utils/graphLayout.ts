import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';
import type { Session, AnyNode, SessionState, ToolGroup, DisplayNode } from 'shared';
import type { SessionNodeData } from '../components/nodes/SessionNode';
import type { SubagentNodeData } from '../components/nodes/SubagentNode';
import type { SkillNodeData } from '../components/nodes/SkillNode';
import type { ToolGroupNodeData } from '../components/nodes/ToolGroupNode';
import type { UserPromptNodeData } from '../components/nodes/UserPromptNode';
import type { ClearMarkerNodeData } from '../components/nodes/ClearMarkerNode';
import type { RequestNodeData } from '../components/nodes/RequestNode';
import type { ResponseNodeData } from '../components/nodes/ResponseNode';
import type { ModelOutputNodeData } from '../components/nodes/ModelOutputNode';
import { getSessionDisplayName } from './sessionName';
import { groupConsecutiveToolCalls } from './groupingUtils';

interface TimelineItem {
  itemType: 'tool' | 'model';
  data: AnyNode;
  timestamp: number;
  toolSummary?: { inputSummary: string };
}

// ModelGroup interface kept for main timeline model output grouping
interface ModelGroup {
  id: string;
  type: 'model-group';
  count: number;
  nodes: AnyNode[];
}

// Subagent box node data interface
export interface SubagentBoxNodeData {
  label: string;               // Header text: "AgentType (N tools)"
  state: SessionState;
  agentType: string;
  agentName?: string;
  agentId: string;
  agentColor: string;
  isExpanded: boolean;
  toolCount: number;
  sessionId: string;           // Parent session ID for state management
  // Collapsed display
  lastNodeLabel: string;       // Last tool/response label for progress indicator
  lastNodeType: string;        // 'tool' | 'response' | 'request'
  // Request/response for detail panel
  prompt?: string;
  summary?: string;
  // Internal nodes (only used when expanded)
  internalNodes?: Array<{
    id: string;
    type: 'request' | 'tool' | 'response' | 'model';
    label: string;
    toolName?: string;
    inputSummary?: string;
    content?: string;
    state: SessionState;
    hooks?: Array<{ event: string; hookName: string; command: string; timestamp: number }>;
    nodeData: AnyNode | AnyNode[] | null;  // Original node data for detail panel clicks (array for grouped model outputs)
    count?: number;  // For grouped tool cards: number of tools in the group
  }>;
  // Expanded dimensions (for parent node sizing)
  expandedWidth?: number;
  expandedHeight?: number;
  // Hooks from the SubagentNode (Task tool_use) in the parent session
  hooks?: Array<{ event: string; hookName: string; command: string; timestamp: number }>;
  // Callbacks (injected by GraphView post-layout)
  onToggleExpand?: () => void;
  onInternalNodeClick?: (nodeId: string) => void;
  [key: string]: unknown;
}

// Union of all custom node data types
type CustomNodeData = SessionNodeData | SubagentNodeData | SkillNodeData | ToolGroupNodeData | UserPromptNodeData | ClearMarkerNodeData | SubagentBoxNodeData | RequestNodeData | ResponseNodeData | ModelOutputNodeData;

/**
 * Generate a consistent HSL color from a string identifier.
 * Prefers resolved color from agent definition, falls back to generated color.
 * Named agents get distinct colors, tasks get grey.
 */
function generateAgentColor(agentId: string | undefined, agentType: string | undefined, resolvedColor?: string): string {
  // If a resolved color is provided from agent definition, use it
  if (resolvedColor) {
    return resolvedColor;
  }

  // Task agents get grey color
  if (agentType === 'Task' || !agentId) {
    return '#6b7280';
  }

  // Generate consistent color from agent ID
  let hash = 0;
  for (let i = 0; i < agentId.length; i++) {
    hash = agentId.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Convert to HSL color with good saturation and lightness
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 60%)`;
}

export interface GraphData {
  nodes: Node<CustomNodeData>[];
  edges: Edge[];
}

// Tool call summary for embedded display in subagent nodes
export interface ToolCallSummary {
  id: string;
  toolName: string;
  inputSummary: string;
  state: SessionState;
}

// Node dimensions for layout
const NODE_DIMENSIONS = {
  session: { width: 200, height: 100 },
  subagent: { width: 220, height: 90 },
  'subagent-box': { width: 220, height: 70 },  // Default collapsed size, calculated dynamically for expanded
  skill: { width: 150, height: 70 },
  'tool-group': { width: 140, height: 60 },
  'user-prompt': { width: 180, height: 70 },
  'clear-marker': { width: 120, height: 40 },
  'request': { width: 160, height: 60 },
  'response': { width: 160, height: 60 },
  'model-output': { width: 160, height: 60 },
  'join-node': { width: 1, height: 1 },  // Invisible, minimal size for layout
};

// Create a unique node ID
export function createNodeId(sessionId: string, nodeId?: string): string {
  return nodeId ? `${sessionId}-${nodeId}` : sessionId;
}

/**
 * Extract tool call summaries from a subagent session's nodes.
 * Returns an array of { toolName, inputSummary, state } for each tool call.
 */
function extractToolCallSummaries(subagent: Session): ToolCallSummary[] {
  const summaries: ToolCallSummary[] = [];

  for (const node of subagent.nodes) {
    if (node.type !== 'tool') continue;

    const toolNode = node;
    const toolName = toolNode.toolName;
    const input = toolNode.input || {};
    let inputSummary = '';

    // Generate input summary based on tool type
    switch (toolName) {
      case 'Bash':
        inputSummary = typeof input.command === 'string'
          ? input.command.slice(0, 60)
          : '(no command)';
        break;

      case 'Read':
      case 'Write':
      case 'Edit':
        if (typeof input.file_path === 'string') {
          const parts = input.file_path.split('/');
          inputSummary = parts[parts.length - 1] || '(no file)';
        } else {
          inputSummary = '(no file)';
        }
        break;

      case 'Grep':
      case 'Glob':
        inputSummary = typeof input.pattern === 'string'
          ? input.pattern.slice(0, 40)
          : '(no pattern)';
        break;

      default: {
        // For other tools, show first key-value pair
        const keys = Object.keys(input);
        if (keys.length > 0) {
          const firstKey = keys[0];
          const firstValue = String(input[firstKey] || '');
          inputSummary = `${firstKey}: ${firstValue.slice(0, 40)}`;
        } else {
          inputSummary = '(...)';
        }
        break;
      }
    }

    summaries.push({
      id: toolNode.id,
      toolName,
      inputSummary,
      state: toolNode.state,
    });
  }

  return summaries;
}

/**
 * Detect parallel subagent groups by checking the parentId field on SubagentNodes.
 * In Claude's API, truly parallel tool calls appear as MULTIPLE tool_use content blocks
 * within a SINGLE assistant message. Sequential tool calls are in SEPARATE assistant messages.
 * The parentId (which is the assistant message UUID) is the definitive indicator:
 * - Same parentId = parallel (spawned in same assistant turn)
 * - Different parentId = sequential (spawned in different assistant turns)
 * Returns a map of parentId -> array of subagent session IDs.
 * Only includes groups with 2+ parallel subagents.
 */
function detectParallelSubagentGroups(
  subagents: Session[],
  allNodes: AnyNode[] = []
): Map<string, string[]> {
  const parallelGroups = new Map<string, string[]>();
  if (subagents.length < 2) return parallelGroups;

  // Build a map of subagent session ID -> messageId from SubagentNode objects.
  // messageId is the API message ID (msg_xxx) which is the SAME for all tool_use
  // blocks in a single assistant turn. This is the true indicator of parallel execution:
  // - Same messageId = multiple Task calls in one assistant message = parallel
  // - Different messageId = separate assistant messages = sequential
  const subagentIdToMessageId = new Map<string, string>();
  for (const node of allNodes) {
    if (node.type === 'subagent' && node.messageId) {
      subagentIdToMessageId.set(node.agentId, node.messageId);
    }
  }

  // Group subagents by messageId
  const messageIdGroups = new Map<string, string[]>();
  for (const subagent of subagents) {
    const messageId = subagentIdToMessageId.get(subagent.id);
    if (!messageId) continue;

    if (!messageIdGroups.has(messageId)) {
      messageIdGroups.set(messageId, []);
    }
    messageIdGroups.get(messageId)!.push(subagent.id);
  }

  // Only keep groups with 2+ subagents (truly parallel)
  for (const [messageId, subagentIds] of messageIdGroups) {
    if (subagentIds.length >= 2) {
      parallelGroups.set(messageId, subagentIds);
    }
  }

  return parallelGroups;
}

// Convert session hierarchy to React Flow nodes and edges
export function convertSessionToGraph(
  session: Session,
  expandedGroups: Set<string>,  // No longer used for main graph, kept for signature compatibility
  expandedSubagents: Set<string>,  // No longer used, kept for signature compatibility
  expandedSubagentBoxes: Set<string> = new Set(),  // Set of expanded subagent box IDs for this session
  hiddenNodeTypes: Set<string> = new Set(),  // Node types to hide from the graph
  nodeTypeFilters: Map<string, string> = new Map()  // Content filters per category
): GraphData {
  const nodes: Node<CustomNodeData>[] = [];
  const edges: Edge[] = [];

  const sessionNodeId = createNodeId(session.id);

  // Create session node
  const sessionNode: Node<SessionNodeData> = {
    id: sessionNodeId,
    type: 'session',
    position: { x: 0, y: 0 }, // Will be calculated by dagre
    data: {
      label: getSessionDisplayName(session),
      state: session.state,
      projectHash: session.projectHash,
      gitBranch: session.gitBranch,
      tmuxTarget: session.tmuxTarget,
      subagentCount: session.subagents.length,
      nodeCount: session.nodes.length,
      totalTokens: session.tokenUsage?.totalTokens,
    },
  };

  nodes.push(sessionNode);

  // Build unified timeline from skills, tool-groups, subagents, user prompts, clear markers, and model outputs
  interface TimelineItem {
    type: 'skill' | 'tool' | 'tool-group' | 'subagent' | 'user-prompt' | 'clear-marker' | 'model' | 'model-group';
    timestamp: number;
    data: AnyNode | Session | ToolGroup;
    nodes?: AnyNode[];  // For model-group type
    count?: number;     // For model-group type
  }

  const timeline: TimelineItem[] = [];

  // Collect skill nodes from session.nodes
  for (const node of session.nodes) {
    if (node.type === 'skill') {
      timeline.push({
        type: 'skill',
        timestamp: node.timestamp,
        data: node,
      });
    }
  }

  // Collect user prompt nodes
  for (const node of session.nodes) {
    if (node.type === 'user-prompt') {
      timeline.push({
        type: 'user-prompt' as any,
        timestamp: node.timestamp,
        data: node,
      });
    }
  }

  // Collect clear marker nodes
  for (const node of session.nodes) {
    if (node.type === 'clear-marker') {
      timeline.push({
        type: 'clear-marker' as any,
        timestamp: node.timestamp,
        data: node,
      });
    }
  }

  // Collect assistant message nodes (model outputs)
  for (const node of session.nodes) {
    if (node.type === 'message' && node.role === 'assistant' && typeof node.content === 'string' && node.content.trim() !== '') {
      timeline.push({
        type: 'model' as any,
        timestamp: node.timestamp,
        data: node,
      });
    }
  }

  // Collect tool groups from session.nodes
  // Pass ALL nodes so messages/skills/etc. break tool runs naturally
  const groupedNodes = groupConsecutiveToolCalls(session.nodes);

  for (const node of groupedNodes) {
    if (node.type === 'tool-group') {
      timeline.push({
        type: 'tool-group',
        timestamp: node.timestamp,
        data: node,
      });
    } else if (node.type === 'tool') {
      timeline.push({
        type: 'tool',
        timestamp: node.timestamp,
        data: node,
      });
    }
  }

  // Collect subagent sessions
  for (const subagent of session.subagents) {
    timeline.push({
      type: 'subagent',
      timestamp: subagent.createdAt,
      data: subagent,
    });
  }

  // Sort chronologically
  timeline.sort((a, b) => a.timestamp - b.timestamp);

  // Group consecutive model outputs in timeline
  const processedTimeline: TimelineItem[] = [];
  let i = 0;
  while (i < timeline.length) {
    if (timeline[i].type === 'model') {
      // Collect consecutive model items
      const modelNodes: AnyNode[] = [timeline[i].data as AnyNode];
      const firstTimestamp = timeline[i].timestamp;
      let j = i + 1;
      while (j < timeline.length && timeline[j].type === 'model') {
        modelNodes.push(timeline[j].data as AnyNode);
        j++;
      }
      if (modelNodes.length === 1) {
        processedTimeline.push(timeline[i]);
      } else {
        processedTimeline.push({
          type: 'model-group',
          timestamp: firstTimestamp,
          data: modelNodes[0],  // Store first node as representative data
          nodes: modelNodes,
          count: modelNodes.length,
        });
      }
      i = j;
    } else {
      processedTimeline.push(timeline[i]);
      i++;
    }
  }

  // Detect parallel subagent groups
  const sortedSubagents = [...session.subagents].sort((a, b) => a.createdAt - b.createdAt);
  const subagentNodes = session.nodes.filter(n => n.type === 'subagent');
  const parallelGroups = detectParallelSubagentGroups(sortedSubagents, session.nodes);

  // Build set of all parallel subagent IDs
  const parallelSubagentIds = new Set<string>();
  for (const subIds of parallelGroups.values()) {
    subIds.forEach(id => parallelSubagentIds.add(id));
  }

  // Apply node type filters (category-level visibility)
  let filteredByCategory = hiddenNodeTypes.size > 0
    ? processedTimeline.filter((item) => {
        if (hiddenNodeTypes.has('tools') && (item.type === 'tool' || item.type === 'tool-group')) return false;
        if (hiddenNodeTypes.has('model') && (item.type === 'model' || item.type === 'model-group')) return false;
        if (hiddenNodeTypes.has('prompts') && (item.type === 'user-prompt' || item.type === 'clear-marker')) return false;
        if (hiddenNodeTypes.has('subagents') && item.type === 'subagent') return false;
        if (hiddenNodeTypes.has('skills') && item.type === 'skill') return false;
        return true;
      })
    : processedTimeline;

  // Apply content-level filters (within visible categories)
  const premergeTimeline = nodeTypeFilters.size > 0
    ? filteredByCategory.filter((item) => {
        // For tool/tool-group: check toolName against 'tools' filter
        if (item.type === 'tool' || item.type === 'tool-group') {
          const toolFilter = nodeTypeFilters.get('tools');
          if (toolFilter) {
            const toolName = item.type === 'tool-group'
              ? (item.data as ToolGroup).toolName
              : (item.data as import('shared').ToolNode).toolName;
            if (!toolName.toLowerCase().includes(toolFilter.toLowerCase())) return false;
          }
        }

        // For subagent: check agentType/agentName against 'subagents' filter
        if (item.type === 'subagent') {
          const subagentFilter = nodeTypeFilters.get('subagents');
          if (subagentFilter) {
            const subagent = item.data as Session;
            // Find corresponding SubagentNode for agentType/agentName
            const subagentNode = session.nodes.find((n): n is import('shared').SubagentNode => n.type === 'subagent' && n.agentId === subagent.id);
            const agentType = subagentNode?.agentType || '';
            const agentName = subagentNode?.agentName || '';
            const searchText = `${agentType} ${agentName}`.toLowerCase();
            if (!searchText.includes(subagentFilter.toLowerCase())) return false;
          }
        }

        // For user-prompt: check promptText against 'prompts' filter
        if (item.type === 'user-prompt') {
          const promptFilter = nodeTypeFilters.get('prompts');
          if (promptFilter) {
            const promptNode = item.data as import('shared').UserPromptNode;
            if (!promptNode.promptText.toLowerCase().includes(promptFilter.toLowerCase())) return false;
          }
        }

        // For model/model-group: check content against 'model' filter
        if (item.type === 'model' || item.type === 'model-group') {
          const modelFilter = nodeTypeFilters.get('model');
          if (modelFilter) {
            const modelNodes = item.type === 'model-group'
              ? (item.nodes || [item.data as AnyNode])
              : [item.data as AnyNode];
            // Check if any model node's content matches
            const anyMatch = modelNodes.some((node) => {
              const content = (node as any).content || '';
              return content.toLowerCase().includes(modelFilter.toLowerCase());
            });
            if (!anyMatch) return false;
          }
        }

        // For skill: check skillName against 'skills' filter
        if (item.type === 'skill') {
          const skillFilter = nodeTypeFilters.get('skills');
          if (skillFilter) {
            const skillNode = item.data as import('shared').SkillNode;
            if (!skillNode.skillName.toLowerCase().includes(skillFilter.toLowerCase())) return false;
          }
        }

        return true;
      })
    : filteredByCategory;

  // Merge consecutive same-type items after filtering
  // (filtering can remove intervening nodes, making same-type items adjacent)
  const filteredTimeline: TimelineItem[] = [];
  for (let ti = 0; ti < premergeTimeline.length; ti++) {
    const item = premergeTimeline[ti];

    // Merge consecutive same-name tool/tool-group items
    const itemToolName = item.type === 'tool-group'
      ? (item.data as ToolGroup).toolName
      : item.type === 'tool'
        ? (item.data as import('shared').ToolNode).toolName
        : null;

    if (itemToolName) {
      const toolNodes: import('shared').ToolNode[] = item.type === 'tool-group'
        ? [...(item.data as ToolGroup).nodes]
        : [item.data as import('shared').ToolNode];

      let tj = ti + 1;
      while (tj < premergeTimeline.length) {
        const next = premergeTimeline[tj];
        const nextToolName = next.type === 'tool-group'
          ? (next.data as ToolGroup).toolName
          : next.type === 'tool'
            ? (next.data as import('shared').ToolNode).toolName
            : null;
        if (nextToolName !== itemToolName) break;
        if (next.type === 'tool-group') {
          toolNodes.push(...(next.data as ToolGroup).nodes);
        } else {
          toolNodes.push(next.data as import('shared').ToolNode);
        }
        tj++;
      }

      if (toolNodes.length === 1) {
        filteredTimeline.push(item);
      } else {
        const firstNode = toolNodes[0];
        filteredTimeline.push({
          type: 'tool-group',
          timestamp: firstNode.timestamp,
          data: {
            id: `tool-group-${itemToolName}-${firstNode.id}`,
            type: 'tool-group',
            toolName: itemToolName,
            nodes: toolNodes,
            count: toolNodes.length,
            state: toolNodes.some(n => n.state === 'active') ? 'active' : firstNode.state,
            timestamp: firstNode.timestamp,
            parentId: firstNode.parentId,
          } as ToolGroup,
        });
      }
      ti = tj - 1;
      continue;
    }

    // Merge consecutive model/model-group items
    if (item.type === 'model' || item.type === 'model-group') {
      const modelNodes: AnyNode[] = item.type === 'model-group'
        ? [...(item.nodes || [item.data as AnyNode])]
        : [item.data as AnyNode];

      let tj = ti + 1;
      while (tj < premergeTimeline.length && (premergeTimeline[tj].type === 'model' || premergeTimeline[tj].type === 'model-group')) {
        const next = premergeTimeline[tj];
        if (next.type === 'model-group') {
          modelNodes.push(...(next.nodes || [next.data as AnyNode]));
        } else {
          modelNodes.push(next.data as AnyNode);
        }
        tj++;
      }

      if (modelNodes.length === 1) {
        filteredTimeline.push(item);
      } else {
        filteredTimeline.push({
          type: 'model-group',
          timestamp: modelNodes[0].timestamp,
          data: modelNodes[0],
          nodes: modelNodes,
          count: modelNodes.length,
        });
      }
      ti = tj - 1;
      continue;
    }

    filteredTimeline.push(item);
  }

  // Process timeline items
  let chainPoint = sessionNodeId;
  const processedSubagents = new Set<string>();
  let parallelGroupIndex = 0;

  for (const item of filteredTimeline) {
    if (item.type === 'skill') {
      // Add skill node to main timeline
      const node = item.data as AnyNode;
      if (node.type !== 'skill') continue;  // Type guard

      const skillNodeId = createNodeId(session.id, node.id);

      const skillFlowNode: Node<SkillNodeData> = {
        id: skillNodeId,
        type: 'skill',
        position: { x: 0, y: 0 },
        data: {
          label: node.skillName,
          state: node.state,
          skillName: node.skillName,
          args: node.args,
        },
      };
      nodes.push(skillFlowNode);

      edges.push({
        id: `e-${chainPoint}-${skillNodeId}`,
        source: chainPoint,
        target: skillNodeId,
        type: 'smoothstep',
        animated: node.state === 'active',
        style: { stroke: '#06b6d4', strokeWidth: 1.5 },
      });

      chainPoint = skillNodeId;

    } else if (item.type === 'tool-group') {
      // Add tool-group node to main timeline
      const toolGroup = item.data as ToolGroup;
      const toolGroupNodeId = createNodeId(session.id, toolGroup.id);

      // Aggregate hooks from all tool nodes in the group
      const groupHooks = toolGroup.nodes.flatMap(n => n.hooks || []);
      const toolGroupFlowNode: Node<ToolGroupNodeData> = {
        id: toolGroupNodeId,
        type: 'tool-group',
        position: { x: 0, y: 0 },
        data: {
          label: `${toolGroup.toolName} (${toolGroup.count})`,
          state: toolGroup.state,
          toolName: toolGroup.toolName,
          count: toolGroup.count,
          groupId: toolGroup.id,
          ...(groupHooks.length > 0 ? { hooks: groupHooks } : {}),
        },
      };
      nodes.push(toolGroupFlowNode);

      edges.push({
        id: `e-${chainPoint}-${toolGroupNodeId}`,
        source: chainPoint,
        target: toolGroupNodeId,
        type: 'smoothstep',
        animated: toolGroup.state === 'active',
        style: { stroke: '#f59e0b', strokeWidth: 1.5 },
      });

      chainPoint = toolGroupNodeId;

    } else if (item.type === 'tool') {
      // Add single tool node to main timeline
      const toolNode = item.data as AnyNode;
      if (toolNode.type !== 'tool') continue;  // Type guard

      const singleToolNodeId = createNodeId(session.id, toolNode.id);

      const singleToolFlowNode: Node<ToolGroupNodeData> = {
        id: singleToolNodeId,
        type: 'tool-group',
        position: { x: 0, y: 0 },
        data: {
          label: toolNode.toolName,
          state: toolNode.state,
          toolName: toolNode.toolName,
          count: 1,
          groupId: toolNode.id,
          ...(toolNode.hooks && toolNode.hooks.length > 0 ? { hooks: toolNode.hooks } : {}),
        },
      };
      nodes.push(singleToolFlowNode);

      edges.push({
        id: `e-${chainPoint}-${singleToolNodeId}`,
        source: chainPoint,
        target: singleToolNodeId,
        type: 'smoothstep',
        animated: toolNode.state === 'active',
        style: { stroke: '#f59e0b', strokeWidth: 1.5 },
      });

      chainPoint = singleToolNodeId;

    } else if (item.type === 'user-prompt') {
      // Add user prompt node to main timeline
      const node = item.data as AnyNode;
      if (node.type !== 'user-prompt') continue;  // Type guard

      const promptNodeId = createNodeId(session.id, node.id);

      const promptFlowNode: Node<UserPromptNodeData> = {
        id: promptNodeId,
        type: 'user-prompt',
        position: { x: 0, y: 0 },
        data: {
          label: node.promptText.length > 50 ? node.promptText.slice(0, 50) + '...' : node.promptText,
          state: node.state,
          promptText: node.promptText,
          isCommand: node.isCommand,
          commandName: node.commandName,
        },
      };
      nodes.push(promptFlowNode);

      edges.push({
        id: `e-${chainPoint}-${promptNodeId}`,
        source: chainPoint,
        target: promptNodeId,
        type: 'smoothstep',
        animated: node.state === 'active',
        style: { stroke: '#10b981', strokeWidth: 1.5 },
      });

      chainPoint = promptNodeId;

    } else if (item.type === 'clear-marker') {
      // Add clear marker node to main timeline
      const node = item.data as AnyNode;
      if (node.type !== 'clear-marker') continue;  // Type guard

      const clearNodeId = createNodeId(session.id, node.id);

      const clearFlowNode: Node<ClearMarkerNodeData> = {
        id: clearNodeId,
        type: 'clear-marker',
        position: { x: 0, y: 0 },
        data: {
          label: '/clear',
          state: node.state,
          clearIndex: node.clearIndex,
        },
      };
      nodes.push(clearFlowNode);

      edges.push({
        id: `e-${chainPoint}-${clearNodeId}`,
        source: chainPoint,
        target: clearNodeId,
        type: 'smoothstep',
        animated: node.state === 'active',
        style: { stroke: '#dc2626', strokeWidth: 1.5, strokeDasharray: '5,5' },
      });

      chainPoint = clearNodeId;

    } else if (item.type === 'model') {
      // Add single model output node to main timeline
      const node = item.data as AnyNode;
      if (node.type !== 'message') continue;

      const modelNodeId = createNodeId(session.id, node.id);
      const content = (node as any).content || '';

      const modelFlowNode: Node<ModelOutputNodeData> = {
        id: modelNodeId,
        type: 'model-output',
        position: { x: 0, y: 0 },
        data: {
          label: 'Model Output',
          state: node.state,
          content,
          agentColor: '#8b5cf6',  // Purple for main session model outputs
          nodeData: node,
        },
      };
      nodes.push(modelFlowNode);

      edges.push({
        id: `e-${chainPoint}-${modelNodeId}`,
        source: chainPoint,
        target: modelNodeId,
        type: 'smoothstep',
        animated: node.state === 'active',
        style: { stroke: '#8b5cf6', strokeWidth: 1.5 },
      });

      chainPoint = modelNodeId;

    } else if (item.type === 'model-group') {
      // Add grouped model output node to main timeline
      const modelNodes = item.nodes!;
      const firstNode = modelNodes[0];
      const groupId = `model-group-main-${firstNode.id}`;
      const modelNodeId = createNodeId(session.id, groupId);
      const content = (firstNode as any).content || '';

      const modelFlowNode: Node<ModelOutputNodeData> = {
        id: modelNodeId,
        type: 'model-output',
        position: { x: 0, y: 0 },
        data: {
          label: `Model Output (${item.count})`,
          state: firstNode.state,
          content,
          count: item.count,
          agentColor: '#8b5cf6',
          nodeData: item.count! > 1 ? modelNodes : modelNodes[0],
          groupId,
        },
      };
      nodes.push(modelFlowNode);

      edges.push({
        id: `e-${chainPoint}-${modelNodeId}`,
        source: chainPoint,
        target: modelNodeId,
        type: 'smoothstep',
        animated: firstNode.state === 'active',
        style: { stroke: '#8b5cf6', strokeWidth: 1.5 },
      });

      chainPoint = modelNodeId;

    } else if (item.type === 'subagent') {
      const subagent = item.data as Session;

      // Skip if already processed as part of a parallel group
      if (processedSubagents.has(subagent.id)) {
        continue;
      }

      const isParallel = parallelSubagentIds.has(subagent.id);

      if (isParallel) {
        // PARALLEL GROUP: Find all siblings from the same parallel group
        let parallelSiblings: Session[] = [];
        for (const [, groupIds] of parallelGroups) {
          if (groupIds.includes(subagent.id)) {
            parallelSiblings = sortedSubagents.filter(s => groupIds.includes(s.id));
            break;
          }
        }

        // Create join node for this parallel group
        const groupJoinNodeId = `${session.id}-join-parallel-${parallelGroupIndex}`;
        const groupJoinNode: Node<CustomNodeData> = {
          id: groupJoinNodeId,
          type: 'join-node' as any,
          position: { x: 0, y: 0 },
          data: { label: '' } as any,
        };
        nodes.push(groupJoinNode);

        // Process each parallel subagent with subagent-box nodes
        for (const parallelSubagent of parallelSiblings) {
          const toolCalls = extractToolCallSummaries(parallelSubagent);
          const agentId = parallelSubagent.id;
          // Find the corresponding subagent node to get agentType, agentName, and agentColor
          const subagentNode = subagentNodes.find(n => n.agentId === parallelSubagent.id);
          const agentType = subagentNode?.agentType || 'Task';
          const agentName = subagentNode?.agentName;
          const agentColor = (subagentNode as any)?.agentColor;

          // Improved request text extraction - prioritize SubagentNode.prompt field
          const requestText = subagentNode?.prompt || parallelSubagent.firstUserPrompt || '';

          // Improved response text extraction - check last assistant message
          const lastAssistantMsg = [...parallelSubagent.nodes]
            .reverse()
            .find(n => n.type === 'message' && n.role === 'assistant');
          const responseText = parallelSubagent.summary ||
            (lastAssistantMsg?.type === 'message' ? lastAssistantMsg.content?.slice(0, 200) : '') ||
            '';

          // Determine if this subagent box is expanded
          const isExpanded = expandedSubagentBoxes.has(parallelSubagent.id);

          // Build internal nodes array
          const internalNodes: SubagentBoxNodeData['internalNodes'] = [];

          // Split subagent hooks: Pre/Start → request, Post/Stop → response
          const saHooks = subagentNode?.hooks || [];
          const requestHooks = saHooks.filter(h => /pre|start/i.test(h.event));
          const responseHooks = saHooks.filter(h => /post|stop/i.test(h.event));

          // First: Request node
          internalNodes.push({
            id: `${parallelSubagent.id}-request`,
            type: 'request',
            label: 'Request',
            state: parallelSubagent.state,
            nodeData: null,
            ...(requestHooks.length > 0 ? { hooks: requestHooks } : {}),
          });

          // Middle: Interleave tool nodes and assistant (model) messages chronologically
          // Collect assistant messages with non-empty content
          const assistantMessages = parallelSubagent.nodes.filter(
            (n): n is AnyNode & { type: 'message'; role: 'assistant' } =>
              n.type === 'message' && n.role === 'assistant' && typeof n.content === 'string' && n.content.trim() !== ''
          );

          // Build chronologically sorted list of tools and assistant messages
          interface TimelineItem {
            timestamp: number;
            itemType: 'tool' | 'model';
            data: AnyNode;
            toolSummary?: ToolCallSummary;
          }

          const timelineItems: TimelineItem[] = [];

          // Add tool calls with their timestamps
          toolCalls.forEach((tc) => {
            const toolNode = parallelSubagent.nodes.find(n => n.id === tc.id);
            if (toolNode) {
              timelineItems.push({
                timestamp: toolNode.timestamp,
                itemType: 'tool',
                data: toolNode,
                toolSummary: tc,
              });
            }
          });

          // Add assistant messages with their timestamps
          assistantMessages.forEach((msg) => {
            timelineItems.push({
              timestamp: msg.timestamp,
              itemType: 'model',
              data: msg,
            });
          });

          // Sort chronologically
          timelineItems.sort((a, b) => a.timestamp - b.timestamp);

          // Group consecutive tool calls (matching main graph logic)
          // Convert timelineItems to AnyNode array for grouping
          const ungroupedNodes: AnyNode[] = timelineItems.map(item => item.data);
          const groupedNodes = groupConsecutiveToolCalls(ungroupedNodes);

          // Build internal nodes from grouped timeline
          for (const node of groupedNodes) {
            if (node.type === 'message' && node.role === 'assistant') {
              // Model output node
              const modelData = node as AnyNode & { content?: string; state: SessionState };
              internalNodes.push({
                id: modelData.id,
                type: 'model',
                label: 'Model Output',
                content: modelData.content || '',
                state: modelData.state,
                nodeData: modelData,
              });
              continue;
            }

            if (node.type === 'tool-group') {
              // Tool group node
              const toolGroup = node as ToolGroup;
              const groupHooks = toolGroup.nodes.flatMap(n => n.hooks || []);
              internalNodes.push({
                id: toolGroup.id,
                type: 'tool',
                label: `${toolGroup.toolName} (${toolGroup.count})`,
                toolName: toolGroup.toolName,
                inputSummary: '', // No single input summary for groups
                state: toolGroup.state,
                nodeData: toolGroup.nodes,
                count: toolGroup.count,
                ...(groupHooks.length > 0 ? { hooks: groupHooks } : {}),
              });
              continue;
            }

            if (node.type === 'tool') {
              // Single tool node
              const toolData = node as AnyNode & { toolName: string; state: SessionState };
              const toolNode = parallelSubagent.nodes.find(n => n.id === toolData.id);
              const singleHooks = toolNode && 'hooks' in toolNode && Array.isArray(toolNode.hooks) ? toolNode.hooks : [];
              internalNodes.push({
                id: toolData.id,
                type: 'tool',
                label: toolData.toolName,
                toolName: toolData.toolName,
                inputSummary: toolCalls.find(tc => tc.id === toolData.id)?.inputSummary || '',
                state: toolData.state,
                nodeData: toolNode || null,
                ...(singleHooks.length > 0 ? { hooks: singleHooks } : {}),
              });
            }
          }

          // Last: Response node
          internalNodes.push({
            id: `${parallelSubagent.id}-response`,
            type: 'response',
            label: 'Response',
            state: parallelSubagent.state,
            nodeData: null,
            ...(responseHooks.length > 0 ? { hooks: responseHooks } : {}),
          });

          // Filter internal nodes based on hiddenNodeTypes
          let filteredInternalNodes = internalNodes.filter((iNode) => {
            if (hiddenNodeTypes.has('tools') && iNode.type === 'tool') return false;
            if (hiddenNodeTypes.has('model') && iNode.type === 'model') return false;
            // Request and response nodes don't have a direct filter (they're structural)
            return true;
          });

          // Apply content-level filters to internal nodes
          if (nodeTypeFilters.size > 0) {
            filteredInternalNodes = filteredInternalNodes.filter((iNode) => {
              // For tool nodes: check toolName against 'tools' filter
              if (iNode.type === 'tool') {
                const toolFilter = nodeTypeFilters.get('tools');
                if (toolFilter && iNode.toolName) {
                  if (!iNode.toolName.toLowerCase().includes(toolFilter.toLowerCase())) return false;
                }
              }

              // For model nodes: check content against 'model' filter
              if (iNode.type === 'model') {
                const modelFilter = nodeTypeFilters.get('model');
                if (modelFilter && iNode.content) {
                  if (!iNode.content.toLowerCase().includes(modelFilter.toLowerCase())) return false;
                }
              }

              return true;
            });
          }

          // Determine lastNodeLabel for collapsed view
          let lastNodeLabel = 'Response';
          let lastNodeType: 'request' | 'tool' | 'response' = 'response';

          if (parallelSubagent.state === 'active' && toolCalls.length > 0) {
            // If active, show last tool's input summary
            const lastTool = toolCalls[toolCalls.length - 1];
            lastNodeLabel = lastTool.inputSummary;
            lastNodeType = 'tool';
          } else if (parallelSubagent.state === 'completed' && toolCalls.length > 0) {
            // If completed, show "Response"
            lastNodeLabel = 'Response';
            lastNodeType = 'response';
          } else if (toolCalls.length === 0) {
            // No tools executed yet
            lastNodeLabel = 'Request';
            lastNodeType = 'request';
          }

          const computedAgentColor = generateAgentColor(agentId, agentType, agentColor);

          {
            // Both expanded and collapsed use a subagent-box node.
            // When expanded, child RF nodes are placed inside the box using parentId.
            const boxNodeId = createNodeId(session.id, `${parallelSubagent.id}-box`);
            const childNodeIds: string[] = [];

            // Calculate expanded dimensions based on filtered nodes
            const childWidth = 160;
            const childGap = 40;
            const childStep = childWidth + childGap;
            const boxPadding = 15;
            const headerHeight = 38;
            const childNodeHeight = 65;

            let rfChildCount = 2; // request + response
            for (const iNode of filteredInternalNodes) {
              if (iNode.type === 'tool' || iNode.type === 'model') rfChildCount++;
            }

            const expandedWidth = boxPadding * 2 + rfChildCount * childWidth + Math.max(0, rfChildCount - 1) * childGap;
            const expandedHeight = headerHeight + childNodeHeight + boxPadding;

            const boxNode: Node<SubagentBoxNodeData> = {
              id: boxNodeId,
              type: 'subagent-box',
              position: { x: 0, y: 0 },
              ...(isExpanded ? { style: { width: expandedWidth, height: expandedHeight } } : {}),
              data: {
                label: `${agentType}${agentName ? ` (${agentName})` : ''} (${toolCalls.length} tools)`,
                state: parallelSubagent.state,
                agentType,
                agentName,
                agentId,
                agentColor: computedAgentColor,
                isExpanded,
                toolCount: toolCalls.length,
                sessionId: session.id,
                lastNodeLabel,
                lastNodeType,
                prompt: requestText,
                summary: responseText,
                internalNodes: filteredInternalNodes,
                expandedWidth,
                expandedHeight,
                ...(subagentNode?.hooks && subagentNode.hooks.length > 0 ? { hooks: subagentNode.hooks } : {}),
              },
            };
            nodes.push(boxNode);

            if (isExpanded) {
              // Create child RF nodes positioned inside the box
              let childIdx = 0;

              // 1. Request node
              const requestNodeId = createNodeId(session.id, `${parallelSubagent.id}-request`);
              nodes.push({
                id: requestNodeId,
                type: 'request',
                position: { x: boxPadding + childIdx * childStep, y: headerHeight },
                parentId: boxNodeId,
                extent: 'parent' as const,
                data: {
                  label: 'Request',
                  state: parallelSubagent.state,
                  prompt: requestText,
                  agentType,
                  agentColor: computedAgentColor,
                  ...(requestHooks.length > 0 ? { hooks: requestHooks } : {}),
                },
              } as Node<RequestNodeData>);
              childNodeIds.push(requestNodeId);
              childIdx++;

              // 2. Tool and model nodes (using filtered nodes)
              for (const iNode of filteredInternalNodes) {
                if (iNode.type === 'tool') {
                  const toolNodeId = createNodeId(session.id, `${parallelSubagent.id}-${iNode.id}`);
                  nodes.push({
                    id: toolNodeId,
                    type: 'tool-group',
                    position: { x: boxPadding + childIdx * childStep, y: headerHeight },
                    parentId: boxNodeId,
                    extent: 'parent' as const,
                    data: {
                      label: iNode.label,
                      state: iNode.state,
                      toolName: iNode.toolName || 'Tool',
                      count: iNode.count || 1,
                      groupId: iNode.id,
                      ...(iNode.hooks && iNode.hooks.length > 0 ? { hooks: iNode.hooks } : {}),
                    },
                  } as Node<ToolGroupNodeData>);
                  childNodeIds.push(toolNodeId);
                  childIdx++;
                } else if (iNode.type === 'model') {
                  const modelNodeId = createNodeId(session.id, `${parallelSubagent.id}-${iNode.id}`);
                  nodes.push({
                    id: modelNodeId,
                    type: 'model-output',
                    position: { x: boxPadding + childIdx * childStep, y: headerHeight },
                    parentId: boxNodeId,
                    extent: 'parent' as const,
                    data: {
                      label: iNode.label,
                      state: iNode.state,
                      content: iNode.content || '',
                      count: iNode.count,
                      agentColor: computedAgentColor,
                      nodeData: iNode.nodeData,
                      groupId: iNode.count && iNode.count > 1 ? iNode.id : undefined,  // Track group ID for expansion state
                    },
                  } as Node<ModelOutputNodeData>);
                  childNodeIds.push(modelNodeId);
                  childIdx++;
                }
              }

              // 3. Response node
              const responseNodeId = createNodeId(session.id, `${parallelSubagent.id}-response`);
              nodes.push({
                id: responseNodeId,
                type: 'response',
                position: { x: boxPadding + childIdx * childStep, y: headerHeight },
                parentId: boxNodeId,
                extent: 'parent' as const,
                data: {
                  label: 'Response',
                  state: parallelSubagent.state,
                  summary: responseText,
                  agentType,
                  agentColor: computedAgentColor,
                  ...(responseHooks.length > 0 ? { hooks: responseHooks } : {}),
                },
              } as Node<ResponseNodeData>);
              childNodeIds.push(responseNodeId);

              // 4. Internal edges between child nodes
              for (let i = 0; i < childNodeIds.length - 1; i++) {
                edges.push({
                  id: `e-internal-${childNodeIds[i]}-${childNodeIds[i + 1]}`,
                  source: childNodeIds[i],
                  target: childNodeIds[i + 1],
                  type: 'smoothstep',
                  animated: parallelSubagent.state === 'active' || parallelSubagent.state === 'waiting',
                  style: { stroke: '#8b5cf6', strokeWidth: 1.5 },
                });
              }
            }

            // Fork edge: chainPoint -> box
            edges.push({
              id: `e-fork-${chainPoint}-${boxNodeId}`,
              source: chainPoint,
              target: boxNodeId,
              type: 'smoothstep',
              animated: parallelSubagent.state === 'active' || parallelSubagent.state === 'waiting',
              style: { stroke: '#8b5cf6', strokeWidth: 1.5 },
            });

            // Join edge: box -> group join
            edges.push({
              id: `e-join-${boxNodeId}-${groupJoinNodeId}`,
              source: boxNodeId,
              target: groupJoinNodeId,
              type: 'smoothstep',
              style: { stroke: '#8b5cf6', strokeWidth: 1.5 },
            });
          }

          processedSubagents.add(parallelSubagent.id);
        }

        // Update chain point to group join node
        chainPoint = groupJoinNodeId;
        parallelGroupIndex++;

      } else {
        // SEQUENTIAL SUBAGENT: Create subagent-box node
        const toolCalls = extractToolCallSummaries(subagent);
        const agentId = subagent.id;
        // Find the corresponding subagent node to get agentType, agentName, and agentColor
        const subagentNode = subagentNodes.find(n => n.agentId === subagent.id);
        const agentType = subagentNode?.agentType || 'Task';
        const agentName = subagentNode?.agentName;
        const agentColor = (subagentNode as any)?.agentColor;

        // Improved request text extraction - prioritize SubagentNode.prompt field
        const requestText = subagentNode?.prompt || subagent.firstUserPrompt || '';

        // Improved response text extraction - check last assistant message
        const lastAssistantMsg = [...subagent.nodes]
          .reverse()
          .find(n => n.type === 'message' && n.role === 'assistant');
        const responseText = subagent.summary ||
          (lastAssistantMsg?.type === 'message' ? lastAssistantMsg.content?.slice(0, 200) : '') ||
          '';

        // Determine if this subagent box is expanded
        const isExpanded = expandedSubagentBoxes.has(subagent.id);

        // Build internal nodes array
        const internalNodes: SubagentBoxNodeData['internalNodes'] = [];

        // Split subagent hooks: Pre/Start → request, Post/Stop → response
        const saHooks = subagentNode?.hooks || [];
        const requestHooks = saHooks.filter(h => /pre|start/i.test(h.event));
        const responseHooks = saHooks.filter(h => /post|stop/i.test(h.event));

        // First: Request node
        internalNodes.push({
          id: `${subagent.id}-request`,
          type: 'request',
          label: 'Request',
          state: subagent.state,
          nodeData: null,
          ...(requestHooks.length > 0 ? { hooks: requestHooks } : {}),
        });

        // Middle: Interleave tool nodes and assistant (model) messages chronologically
        // Collect assistant messages with non-empty content
        const assistantMessages = subagent.nodes.filter(
          (n): n is AnyNode & { type: 'message'; role: 'assistant' } =>
            n.type === 'message' && n.role === 'assistant' && typeof n.content === 'string' && n.content.trim() !== ''
        );

        // Build chronologically sorted list of tools and assistant messages
        interface TimelineItem {
          timestamp: number;
          itemType: 'tool' | 'model';
          data: AnyNode;
          toolSummary?: ToolCallSummary;
        }

        const timelineItems: TimelineItem[] = [];

        // Add tool calls with their timestamps
        toolCalls.forEach((tc) => {
          const toolNode = subagent.nodes.find(n => n.id === tc.id);
          if (toolNode) {
            timelineItems.push({
              timestamp: toolNode.timestamp,
              itemType: 'tool',
              data: toolNode,
              toolSummary: tc,
            });
          }
        });

        // Add assistant messages with their timestamps
        assistantMessages.forEach((msg) => {
          timelineItems.push({
            timestamp: msg.timestamp,
            itemType: 'model',
            data: msg,
          });
        });

        // Sort chronologically
        timelineItems.sort((a, b) => a.timestamp - b.timestamp);

        // Group consecutive tool calls (matching main graph logic)
        // Convert timelineItems to AnyNode array for grouping
        const ungroupedNodes: AnyNode[] = timelineItems.map(item => item.data);
        const groupedNodes = groupConsecutiveToolCalls(ungroupedNodes);

        // Build internal nodes from grouped timeline
        for (const node of groupedNodes) {
          if (node.type === 'message' && node.role === 'assistant') {
            // Model output node
            const modelData = node as AnyNode & { content?: string; state: SessionState };
            internalNodes.push({
              id: modelData.id,
              type: 'model',
              label: 'Model Output',
              content: modelData.content || '',
              state: modelData.state,
              nodeData: modelData,
            });
            continue;
          }

          if (node.type === 'tool-group') {
            // Tool group node
            const toolGroup = node as ToolGroup;
            const groupHooks = toolGroup.nodes.flatMap(n => n.hooks || []);
            internalNodes.push({
              id: toolGroup.id,
              type: 'tool',
              label: `${toolGroup.toolName} (${toolGroup.count})`,
              toolName: toolGroup.toolName,
              inputSummary: '', // No single input summary for groups
              state: toolGroup.state,
              nodeData: toolGroup.nodes,
              count: toolGroup.count,
              ...(groupHooks.length > 0 ? { hooks: groupHooks } : {}),
            });
            continue;
          }

          if (node.type === 'tool') {
            // Single tool node
            const toolData = node as AnyNode & { toolName: string; state: SessionState };
            const toolNode = subagent.nodes.find(n => n.id === toolData.id);
            const singleHooks = toolNode && 'hooks' in toolNode && Array.isArray(toolNode.hooks) ? toolNode.hooks : [];
            internalNodes.push({
              id: toolData.id,
              type: 'tool',
              label: toolData.toolName,
              toolName: toolData.toolName,
              inputSummary: toolCalls.find(tc => tc.id === toolData.id)?.inputSummary || '',
              state: toolData.state,
              nodeData: toolNode || null,
              ...(singleHooks.length > 0 ? { hooks: singleHooks } : {}),
            });
          }
        }

        // Last: Response node
        internalNodes.push({
          id: `${subagent.id}-response`,
          type: 'response',
          label: 'Response',
          state: subagent.state,
          nodeData: null,
          ...(responseHooks.length > 0 ? { hooks: responseHooks } : {}),
        });

        // Filter internal nodes based on hiddenNodeTypes
        let filteredInternalNodes = internalNodes.filter((iNode) => {
          if (hiddenNodeTypes.has('tools') && iNode.type === 'tool') return false;
          if (hiddenNodeTypes.has('model') && iNode.type === 'model') return false;
          // Request and response nodes don't have a direct filter (they're structural)
          return true;
        });

        // Apply content-level filters to internal nodes
        if (nodeTypeFilters.size > 0) {
          filteredInternalNodes = filteredInternalNodes.filter((iNode) => {
            // For tool nodes: check toolName against 'tools' filter
            if (iNode.type === 'tool') {
              const toolFilter = nodeTypeFilters.get('tools');
              if (toolFilter && iNode.toolName) {
                if (!iNode.toolName.toLowerCase().includes(toolFilter.toLowerCase())) return false;
              }
            }

            // For model nodes: check content against 'model' filter
            if (iNode.type === 'model') {
              const modelFilter = nodeTypeFilters.get('model');
              if (modelFilter && iNode.content) {
                if (!iNode.content.toLowerCase().includes(modelFilter.toLowerCase())) return false;
              }
            }

            return true;
          });
        }

        // Determine lastNodeLabel for collapsed view
        let lastNodeLabel = 'Response';
        let lastNodeType: 'request' | 'tool' | 'response' = 'response';

        if (subagent.state === 'active' && toolCalls.length > 0) {
          // If active, show last tool's input summary
          const lastTool = toolCalls[toolCalls.length - 1];
          lastNodeLabel = lastTool.inputSummary;
          lastNodeType = 'tool';
        } else if (subagent.state === 'completed' && toolCalls.length > 0) {
          // If completed, show "Response"
          lastNodeLabel = 'Response';
          lastNodeType = 'response';
        } else if (toolCalls.length === 0) {
          // No tools executed yet
          lastNodeLabel = 'Request';
          lastNodeType = 'request';
        }

        const computedAgentColor = generateAgentColor(agentId, agentType, agentColor);

        {
          // Both expanded and collapsed use a subagent-box node.
          // When expanded, child RF nodes are placed inside the box using parentId.
          const boxNodeId = createNodeId(session.id, `${subagent.id}-box`);
          const childNodeIds: string[] = [];

          // Calculate expanded dimensions based on child count
          const childWidth = 160;
          const childGap = 15;
          const childStep = childWidth + childGap;
          const boxPadding = 15;
          const headerHeight = 38;
          const childNodeHeight = 65;

          // Count actual child RF nodes (request + tools/models + response) based on filtered nodes
          let rfChildCount = 2; // request + response
          for (const iNode of filteredInternalNodes) {
            if (iNode.type === 'tool' || iNode.type === 'model') rfChildCount++;
          }

          const expandedWidth = boxPadding * 2 + rfChildCount * childWidth + Math.max(0, rfChildCount - 1) * childGap;
          const expandedHeight = headerHeight + childNodeHeight + boxPadding;

          const boxNode: Node<SubagentBoxNodeData> = {
            id: boxNodeId,
            type: 'subagent-box',
            position: { x: 0, y: 0 },
            ...(isExpanded ? { style: { width: expandedWidth, height: expandedHeight } } : {}),
            data: {
              label: `${agentType}${agentName ? ` (${agentName})` : ''} (${toolCalls.length} tools)`,
              state: subagent.state,
              agentType,
              agentName,
              agentId,
              agentColor: computedAgentColor,
              isExpanded,
              toolCount: toolCalls.length,
              sessionId: session.id,
              lastNodeLabel,
              lastNodeType,
              prompt: requestText,
              summary: responseText,
              internalNodes: filteredInternalNodes,
              expandedWidth,
              expandedHeight,
              ...(subagentNode?.hooks && subagentNode.hooks.length > 0 ? { hooks: subagentNode.hooks } : {}),
            },
          };
          nodes.push(boxNode);

          if (isExpanded) {
            // Create child RF nodes positioned inside the box
            let childIdx = 0;

            // 1. Request node
            const requestNodeId = createNodeId(session.id, `${subagent.id}-request`);
            nodes.push({
              id: requestNodeId,
              type: 'request',
              position: { x: boxPadding + childIdx * childStep, y: headerHeight },
              parentId: boxNodeId,
              extent: 'parent' as const,
              data: {
                label: 'Request',
                state: subagent.state,
                prompt: requestText,
                agentType,
                agentColor: computedAgentColor,
                ...(requestHooks.length > 0 ? { hooks: requestHooks } : {}),
              },
            } as Node<RequestNodeData>);
            childNodeIds.push(requestNodeId);
            childIdx++;

            // 2. Tool and model nodes (using filtered nodes)
            for (const iNode of filteredInternalNodes) {
              if (iNode.type === 'tool') {
                const toolNodeId = createNodeId(session.id, `${subagent.id}-${iNode.id}`);
                nodes.push({
                  id: toolNodeId,
                  type: 'tool-group',
                  position: { x: boxPadding + childIdx * childStep, y: headerHeight },
                  parentId: boxNodeId,
                  extent: 'parent' as const,
                  data: {
                    label: iNode.label,
                    state: iNode.state,
                    toolName: iNode.toolName || 'Tool',
                    count: iNode.count || 1,
                    groupId: iNode.id,
                    ...(iNode.hooks && iNode.hooks.length > 0 ? { hooks: iNode.hooks } : {}),
                  },
                } as Node<ToolGroupNodeData>);
                childNodeIds.push(toolNodeId);
                childIdx++;
              } else if (iNode.type === 'model') {
                const modelNodeId = createNodeId(session.id, `${subagent.id}-${iNode.id}`);
                nodes.push({
                  id: modelNodeId,
                  type: 'model-output',
                  position: { x: boxPadding + childIdx * childStep, y: headerHeight },
                  parentId: boxNodeId,
                  extent: 'parent' as const,
                  data: {
                    label: iNode.label,
                    state: iNode.state,
                    content: iNode.content || '',
                    count: iNode.count,
                    agentColor: computedAgentColor,
                    nodeData: iNode.nodeData,
                    groupId: iNode.count && iNode.count > 1 ? iNode.id : undefined,  // Track group ID for expansion state
                  },
                } as Node<ModelOutputNodeData>);
                childNodeIds.push(modelNodeId);
                childIdx++;
              }
            }

            // 3. Response node
            const responseNodeId = createNodeId(session.id, `${subagent.id}-response`);
            nodes.push({
              id: responseNodeId,
              type: 'response',
              position: { x: boxPadding + childIdx * childStep, y: headerHeight },
              parentId: boxNodeId,
              extent: 'parent' as const,
              data: {
                label: 'Response',
                state: subagent.state,
                summary: responseText,
                agentType,
                agentColor: computedAgentColor,
                ...(responseHooks.length > 0 ? { hooks: responseHooks } : {}),
              },
            } as Node<ResponseNodeData>);
            childNodeIds.push(responseNodeId);

            // 4. Internal edges between child nodes
            for (let i = 0; i < childNodeIds.length - 1; i++) {
              edges.push({
                id: `e-internal-${childNodeIds[i]}-${childNodeIds[i + 1]}`,
                source: childNodeIds[i],
                target: childNodeIds[i + 1],
                type: 'smoothstep',
                animated: subagent.state === 'active' || subagent.state === 'waiting',
                style: { stroke: '#8b5cf6', strokeWidth: 1.5 },
              });
            }
          }

          // Chain edge: previous -> box
          edges.push({
            id: `e-chain-${chainPoint}-${boxNodeId}`,
            source: chainPoint,
            target: boxNodeId,
            type: 'smoothstep',
            animated: subagent.state === 'active' || subagent.state === 'waiting',
            style: { stroke: '#8b5cf6', strokeWidth: 1.5 },
          });

          // Update chain point to box node
          chainPoint = boxNodeId;
        }

        processedSubagents.add(subagent.id);
      }
    }
  }

  return { nodes, edges };
}

// Convert all sessions to a combined graph
export function convertSessionsToGraph(
  sessions: Session[],
  expandedGroups: Set<string>,
  expandedSubagents: Set<string>,
  expandedSubagentBoxesMap?: Map<string, Set<string>>,
  hiddenNodeTypes: Set<string> = new Set(),
  nodeTypeFilters: Map<string, string> = new Map()
): GraphData {
  const allNodes: Node<CustomNodeData>[] = [];
  const allEdges: Edge[] = [];

  for (const session of sessions) {
    const sessionExpandedBoxes = expandedSubagentBoxesMap?.get(session.id) || new Set<string>();
    const { nodes, edges } = convertSessionToGraph(session, expandedGroups, expandedSubagents, sessionExpandedBoxes, hiddenNodeTypes, nodeTypeFilters);
    allNodes.push(...nodes);
    allEdges.push(...edges);
  }

  return { nodes: allNodes, edges: allEdges };
}

// Apply dagre layout to position nodes hierarchically
export function applyDagreLayout(
  nodes: Node<CustomNodeData>[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'LR'
): Node<CustomNodeData>[] {
  if (nodes.length === 0) return nodes;

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Set graph options
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: direction === 'LR' ? 80 : 60,
    ranksep: direction === 'LR' ? 120 : 80,
    marginx: 20,
    marginy: 20,
  });

  // Add nodes to dagre graph with dynamic dimensions for subagent-box
  // Skip child nodes (they're positioned relative to their parent)
  nodes.forEach((node) => {
    if (node.parentId) return;

    let dimensions = NODE_DIMENSIONS[node.type as keyof typeof NODE_DIMENSIONS] ||
                     { width: 140, height: 60 };

    // Handle dynamic sizing for subagent-box nodes
    if (node.type === 'subagent-box') {
      const boxData = node.data as SubagentBoxNodeData;
      if (boxData.isExpanded && boxData.expandedWidth && boxData.expandedHeight) {
        dimensions = {
          width: boxData.expandedWidth,
          height: boxData.expandedHeight,
        };
      } else {
        dimensions = { width: 220, height: 70 };
      }
    }

    dagreGraph.setNode(node.id, {
      width: dimensions.width,
      height: dimensions.height,
    });
  });

  // Add edges to dagre graph - only edges between nodes present in dagre
  edges.forEach((edge) => {
    if (dagreGraph.hasNode(edge.source) && dagreGraph.hasNode(edge.target)) {
      dagreGraph.setEdge(edge.source, edge.target);
    }
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Apply positions to nodes with dynamic dimensions for subagent-box
  // Skip child nodes - they keep their relative positions within the parent
  return nodes.map((node) => {
    if (node.parentId) return node;

    const nodeWithPosition = dagreGraph.node(node.id);
    let dimensions = NODE_DIMENSIONS[node.type as keyof typeof NODE_DIMENSIONS] ||
                     { width: 140, height: 60 };

    // Handle dynamic sizing for subagent-box nodes
    if (node.type === 'subagent-box') {
      const boxData = node.data as SubagentBoxNodeData;
      if (boxData.isExpanded && boxData.expandedWidth && boxData.expandedHeight) {
        dimensions = {
          width: boxData.expandedWidth,
          height: boxData.expandedHeight,
        };
      } else {
        dimensions = { width: 220, height: 70 };
      }
    }

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - dimensions.width / 2,
        y: nodeWithPosition.y - dimensions.height / 2,
      },
    };
  });
}

// Get state-based edge animation
export function getEdgeAnimation(sourceState: SessionState, targetState: SessionState): boolean {
  return sourceState === 'active' || targetState === 'active';
}

// Create the full graph with layout applied
export function createLayoutedGraph(
  sessions: Session[],
  expandedGroups: Set<string>,
  expandedSubagents: Set<string>,
  expandedSubagentBoxesMap?: Map<string, Set<string>>,
  hiddenNodeTypes: Set<string> = new Set(),
  nodeTypeFilters: Map<string, string> = new Map()
): GraphData {
  const { nodes, edges } = convertSessionsToGraph(sessions, expandedGroups, expandedSubagents, expandedSubagentBoxesMap, hiddenNodeTypes, nodeTypeFilters);
  const layoutedNodes = applyDagreLayout(nodes, edges);

  return { nodes: layoutedNodes, edges };
}
