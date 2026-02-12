import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';
import type { Session, AnyNode, SessionState, ToolGroup, DisplayNode } from 'shared';
import type { SessionNodeData } from '../components/nodes/SessionNode';
import type { SubagentNodeData } from '../components/nodes/SubagentNode';
import type { SkillNodeData } from '../components/nodes/SkillNode';
import type { ToolGroupNodeData } from '../components/nodes/ToolGroupNode';
import type { UserPromptNodeData } from '../components/nodes/UserPromptNode';
import type { ClearMarkerNodeData } from '../components/nodes/ClearMarkerNode';
import { getSessionDisplayName } from './sessionName';
import { groupConsecutiveToolCalls } from './groupingUtils';

interface TimelineItem {
  itemType: 'tool' | 'model';
  data: AnyNode;
  timestamp: number;
  toolSummary?: { inputSummary: string };
}

interface ModelGroup {
  id: string;
  type: 'model-group';
  count: number;
  nodes: { data: AnyNode }[];
}

// Helper to group consecutive model outputs (assistant messages)
function groupConsecutiveModelOutputs(items: TimelineItem[]): (TimelineItem | ModelGroup)[] {
  const result: (TimelineItem | ModelGroup)[] = [];
  let i = 0;

  while (i < items.length) {
    const item = items[i];

    // Non-model items pass through
    if (item.itemType !== 'model') {
      result.push(item);
      i++;
      continue;
    }

    // Collect contiguous run of model nodes
    const runStart = i;
    while (i < items.length && items[i].itemType === 'model') {
      i++;
    }

    // Items from runStart to i-1 are all model nodes
    const run = items.slice(runStart, i);

    if (run.length === 1) {
      // Single model output - pass through as-is
      result.push(run[0]);
    } else {
      // Multiple consecutive model outputs - create a group
      result.push({
        id: `model-group-${runStart}`,
        type: 'model-group',
        count: run.length,
        nodes: run,
      });
    }
  }

  return result;
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
    nodeData: AnyNode | AnyNode[] | null;  // Original node data for detail panel clicks (array for grouped model outputs)
    count?: number;  // For grouped tool cards: number of tools in the group
  }>;
  // Callbacks (injected by GraphView post-layout)
  onToggleExpand?: () => void;
  onInternalNodeClick?: (nodeId: string) => void;
  [key: string]: unknown;
}

// Union of all custom node data types
type CustomNodeData = SessionNodeData | SubagentNodeData | SkillNodeData | ToolGroupNodeData | UserPromptNodeData | ClearMarkerNodeData | SubagentBoxNodeData;

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
 * Detect parallel subagent groups by examining subagent parentIds.
 * Returns a map of parentId -> array of subagent session IDs.
 * Only includes groups with 2+ parallel subagents.
 */
function detectParallelSubagentGroups(
  subagents: Session[],
  subagentNodes: AnyNode[]
): Map<string, string[]> {
  // Map subagent Session IDs to parentIds from SubagentNode entries
  const subagentParentIds = new Map<string, string>();
  const sortedSubagents = [...subagents].sort((a, b) => a.createdAt - b.createdAt);

  for (let i = 0; i < sortedSubagents.length && i < subagentNodes.length; i++) {
    const subagentNode = subagentNodes[i];
    if (subagentNode.type === 'subagent' && subagentNode.parentId) {
      subagentParentIds.set(sortedSubagents[i].id, subagentNode.parentId);
    }
  }

  // Group by parentId
  const byParent = new Map<string, string[]>();
  for (const [subId, parentId] of subagentParentIds) {
    if (!parentId) continue;
    const existing = byParent.get(parentId);
    if (existing) existing.push(subId);
    else byParent.set(parentId, [subId]);
  }

  // Filter to only parallel groups (2+ subagents)
  const parallelGroups = new Map<string, string[]>();
  for (const [parentId, subIds] of byParent) {
    if (subIds.length > 1) {
      parallelGroups.set(parentId, subIds);
    }
  }

  return parallelGroups;
}

// Convert session hierarchy to React Flow nodes and edges
export function convertSessionToGraph(
  session: Session,
  expandedGroups: Set<string>,  // No longer used for main graph, kept for signature compatibility
  expandedSubagents: Set<string>,  // No longer used, kept for signature compatibility
  expandedSubagentBoxes: Set<string> = new Set()  // Set of expanded subagent box IDs for this session
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
    },
  };

  nodes.push(sessionNode);

  // Build unified timeline from skills, tool-groups, subagents, user prompts, and clear markers
  interface TimelineItem {
    type: 'skill' | 'tool' | 'tool-group' | 'subagent' | 'user-prompt' | 'clear-marker';
    timestamp: number;
    data: AnyNode | Session | ToolGroup;
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

  // Collect tool groups from session.nodes
  // First filter out non-tool nodes and group consecutive tool calls
  const nonMessageNodes = session.nodes.filter(node => node.type !== 'message');
  const groupedNodes = groupConsecutiveToolCalls(nonMessageNodes);

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

  // Detect parallel subagent groups
  const sortedSubagents = [...session.subagents].sort((a, b) => a.createdAt - b.createdAt);
  const subagentNodes = session.nodes.filter(n => n.type === 'subagent');
  const parallelGroups = detectParallelSubagentGroups(sortedSubagents, subagentNodes);

  // Build set of all parallel subagent IDs
  const parallelSubagentIds = new Set<string>();
  for (const subIds of parallelGroups.values()) {
    subIds.forEach(id => parallelSubagentIds.add(id));
  }

  // Process timeline items
  let chainPoint = sessionNodeId;
  const processedSubagents = new Set<string>();
  let parallelGroupIndex = 0;

  for (const item of timeline) {
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

    } else if (item.type === 'subagent') {
      const subagent = item.data as Session;

      // Skip if already processed as part of a parallel group
      if (processedSubagents.has(subagent.id)) {
        continue;
      }

      const isParallel = parallelSubagentIds.has(subagent.id);

      if (isParallel) {
        // PARALLEL GROUP: Find all sibling subagents with same parentId
        const subagentParentIds = new Map<string, string>();
        for (let i = 0; i < sortedSubagents.length && i < subagentNodes.length; i++) {
          const subNode = subagentNodes[i];
          if (subNode.type === 'subagent' && subNode.parentId) {
            subagentParentIds.set(sortedSubagents[i].id, subNode.parentId);
          }
        }

        const parentId = subagentParentIds.get(subagent.id);
        const parallelSiblings = sortedSubagents.filter(s =>
          subagentParentIds.get(s.id) === parentId && parallelSubagentIds.has(s.id)
        );

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

          // First: Request node
          internalNodes.push({
            id: `${parallelSubagent.id}-request`,
            type: 'request',
            label: 'Request',
            state: parallelSubagent.state,
            nodeData: null,
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

          // Group consecutive tool calls
          const pseudoNodes: AnyNode[] = timelineItems
            .filter(item => item.itemType === 'tool')
            .map(item => {
              const toolData = item.data as AnyNode & { toolName: string; state: SessionState };
              return {
                type: 'tool' as const,
                toolName: toolData.toolName,
                id: toolData.id,
                state: toolData.state,
                timestamp: 0,
                parentId: null,
                input: {},
              };
            });
          const groupedToolNodes = groupConsecutiveToolCalls(pseudoNodes);

          // Group consecutive model outputs
          const modelItems = timelineItems.filter(item => item.itemType === 'model');
          const groupedModelNodes = groupConsecutiveModelOutputs(modelItems);
          let currentModelIndex = 0;

          // Build internal nodes from timeline in chronological order
          let currentToolIndex = 0;
          for (const item of timelineItems) {
            if (item.itemType === 'model') {
              // Get the corresponding grouped model node
              const groupedModel = groupedModelNodes[currentModelIndex];
              currentModelIndex++;

              if (groupedModel) {
                // Use grouped info - check if it's a group (has 'type' property indicating ModelGroup)
                const isModelGroup = 'type' in groupedModel && groupedModel.type === 'model-group';
                const isGroup = isModelGroup && groupedModel.count > 1;
                const label = isGroup ? `Model Output (${groupedModel.count})` : 'Model Output';
                const firstMsgData = isModelGroup
                  ? (groupedModel as ModelGroup).nodes[0].data as AnyNode & { content?: string; state: SessionState }
                  : (groupedModel as TimelineItem).data as AnyNode & { content?: string; state: SessionState };
                internalNodes.push({
                  id: isModelGroup ? (groupedModel as ModelGroup).id : (groupedModel as TimelineItem).data.id,
                  type: 'model',
                  label,
                  content: firstMsgData.content || '',
                  state: firstMsgData.state,
                  nodeData: isModelGroup ? (groupedModel as ModelGroup).nodes[0]?.data ?? null : (groupedModel as TimelineItem).data,
                  count: isGroup ? (groupedModel as ModelGroup).count : undefined,
                });
              }
            } else if (item.itemType === 'tool') {
              // Get the corresponding grouped node
              const groupedNode = groupedToolNodes[currentToolIndex];
              currentToolIndex++;

              if (groupedNode?.type === 'tool-group') {
                const firstTool = groupedNode.nodes[0] as AnyNode;
                const toolNode = parallelSubagent.nodes.find(n => n.id === firstTool.id);
                internalNodes.push({
                  id: groupedNode.id,
                  type: 'tool',
                  label: `${groupedNode.toolName} (${groupedNode.count})`,
                  toolName: groupedNode.toolName,
                  inputSummary: '',
                  state: groupedNode.state,
                  nodeData: toolNode || null,
                  count: groupedNode.count,
                });
              } else if (groupedNode?.type === 'tool') {
                const toolNode = parallelSubagent.nodes.find(n => n.id === groupedNode.id);
                internalNodes.push({
                  id: groupedNode.id,
                  type: 'tool',
                  label: groupedNode.toolName,
                  toolName: groupedNode.toolName,
                  inputSummary: item.toolSummary?.inputSummary || '',
                  state: groupedNode.state,
                  nodeData: toolNode || null,
                });
              }
            }
          }

          // Last: Response node
          internalNodes.push({
            id: `${parallelSubagent.id}-response`,
            type: 'response',
            label: 'Response',
            state: parallelSubagent.state,
            nodeData: null,
          });

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

          // Create the subagent-box node
          const boxNodeId = createNodeId(session.id, `${parallelSubagent.id}-box`);
          const boxNode: Node<SubagentBoxNodeData> = {
            id: boxNodeId,
            type: 'subagent-box',
            position: { x: 0, y: 0 },
            data: {
              label: `${agentType}${agentName ? ` (${agentName})` : ''} (${toolCalls.length} tools)`,
              state: parallelSubagent.state,
              agentType,
              agentName,
              agentId,
              agentColor: generateAgentColor(agentId, agentType, agentColor),
              isExpanded,
              toolCount: toolCalls.length,
              lastNodeLabel,
              lastNodeType,
              prompt: requestText,
              summary: responseText,
              internalNodes,
            },
          };
          nodes.push(boxNode);

          // Fork edge: chainPoint -> box
          edges.push({
            id: `e-fork-${chainPoint}-${boxNodeId}`,
            source: chainPoint,
            target: boxNodeId,
            type: 'smoothstep',
            animated: parallelSubagent.state === 'active',
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

        // First: Request node
        internalNodes.push({
          id: `${subagent.id}-request`,
          type: 'request',
          label: 'Request',
          state: subagent.state,
          nodeData: null,
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

        // Group consecutive tool calls
        const pseudoNodes: AnyNode[] = timelineItems
          .filter(item => item.itemType === 'tool')
          .map(item => {
            const toolData = item.data as AnyNode & { toolName: string; state: SessionState };
            return {
              type: 'tool' as const,
              toolName: toolData.toolName,
              id: toolData.id,
              state: toolData.state,
              timestamp: 0,
              parentId: null,
              input: {},
            };
          });
        const groupedToolNodes = groupConsecutiveToolCalls(pseudoNodes);

        // Group consecutive model outputs
        const modelItems = timelineItems.filter(item => item.itemType === 'model');
        const groupedModelNodes = groupConsecutiveModelOutputs(modelItems);
        let currentModelIndex = 0;

        // Build internal nodes from timeline in chronological order
        let currentToolIndex = 0;
        for (const item of timelineItems) {
          if (item.itemType === 'model') {
            // Get the corresponding grouped model node
            const groupedModel = groupedModelNodes[currentModelIndex];
            currentModelIndex++;

            if (groupedModel) {
              // Use grouped info - check if it's a group (has 'type' property indicating ModelGroup)
              const isModelGroup = 'type' in groupedModel && groupedModel.type === 'model-group';
              const isGroup = isModelGroup && groupedModel.count > 1;
              const label = isGroup ? `Model Output (${groupedModel.count})` : 'Model Output';
              const firstMsgData = isModelGroup
                ? (groupedModel as ModelGroup).nodes[0].data as AnyNode & { content?: string; state: SessionState }
                : (groupedModel as TimelineItem).data as AnyNode & { content?: string; state: SessionState };
              internalNodes.push({
                id: isModelGroup ? (groupedModel as ModelGroup).id : (groupedModel as TimelineItem).data.id,
                type: 'model',
                label,
                content: firstMsgData.content || '',
                state: firstMsgData.state,
                nodeData: isModelGroup ? (groupedModel as ModelGroup).nodes[0]?.data ?? null : (groupedModel as TimelineItem).data,
                count: isGroup ? (groupedModel as ModelGroup).count : undefined,
              });
            }
          } else if (item.itemType === 'tool') {
            // Get the corresponding grouped node
            const groupedNode = groupedToolNodes[currentToolIndex];
            currentToolIndex++;

            if (groupedNode?.type === 'tool-group') {
              const firstTool = groupedNode.nodes[0] as AnyNode;
              const toolNode = subagent.nodes.find(n => n.id === firstTool.id);
              internalNodes.push({
                id: groupedNode.id,
                type: 'tool',
                label: `${groupedNode.toolName} (${groupedNode.count})`,
                toolName: groupedNode.toolName,
                inputSummary: '',
                state: groupedNode.state,
                nodeData: toolNode || null,
                count: groupedNode.count,
              });
            } else if (groupedNode?.type === 'tool') {
              const toolNode = subagent.nodes.find(n => n.id === groupedNode.id);
              internalNodes.push({
                id: groupedNode.id,
                type: 'tool',
                label: groupedNode.toolName,
                toolName: groupedNode.toolName,
                inputSummary: item.toolSummary?.inputSummary || '',
                state: groupedNode.state,
                nodeData: toolNode || null,
              });
            }
          }
        }

        // Last: Response node
        internalNodes.push({
          id: `${subagent.id}-response`,
          type: 'response',
          label: 'Response',
          state: subagent.state,
          nodeData: null,
        });

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

        // Create the subagent-box node
        const boxNodeId = createNodeId(session.id, `${subagent.id}-box`);
        const boxNode: Node<SubagentBoxNodeData> = {
          id: boxNodeId,
          type: 'subagent-box',
          position: { x: 0, y: 0 },
          data: {
            label: `${agentType}${agentName ? ` (${agentName})` : ''} (${toolCalls.length} tools)`,
            state: subagent.state,
            agentType,
            agentName,
            agentId,
            agentColor: generateAgentColor(agentId, agentType, agentColor),
            isExpanded,
            toolCount: toolCalls.length,
            lastNodeLabel,
            lastNodeType,
            prompt: requestText,
            summary: responseText,
            internalNodes,
          },
        };
        nodes.push(boxNode);

        // Chain edge: previous -> box
        edges.push({
          id: `e-chain-${chainPoint}-${boxNodeId}`,
          source: chainPoint,
          target: boxNodeId,
          type: 'smoothstep',
          animated: subagent.state === 'active',
          style: { stroke: '#8b5cf6', strokeWidth: 1.5 },
        });

        // Update chain point to box node
        chainPoint = boxNodeId;

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
  expandedSubagentBoxesMap?: Map<string, Set<string>>
): GraphData {
  const allNodes: Node<CustomNodeData>[] = [];
  const allEdges: Edge[] = [];

  for (const session of sessions) {
    const sessionExpandedBoxes = expandedSubagentBoxesMap?.get(session.id) || new Set<string>();
    const { nodes, edges } = convertSessionToGraph(session, expandedGroups, expandedSubagents, sessionExpandedBoxes);
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
  nodes.forEach((node) => {
    let dimensions = NODE_DIMENSIONS[node.type as keyof typeof NODE_DIMENSIONS] ||
                     { width: 140, height: 60 };

    // Handle dynamic sizing for subagent-box nodes
    if (node.type === 'subagent-box') {
      const boxData = node.data as SubagentBoxNodeData;
      if (boxData.isExpanded) {
        const nodeCount = boxData.internalNodes?.length || 3;
        dimensions = {
          width: Math.max(280, nodeCount * 160),
          height: 160,
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

  // Add edges to dagre graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Apply positions to nodes with dynamic dimensions for subagent-box
  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    let dimensions = NODE_DIMENSIONS[node.type as keyof typeof NODE_DIMENSIONS] ||
                     { width: 140, height: 60 };

    // Handle dynamic sizing for subagent-box nodes
    if (node.type === 'subagent-box') {
      const boxData = node.data as SubagentBoxNodeData;
      if (boxData.isExpanded) {
        const nodeCount = boxData.internalNodes?.length || 3;
        dimensions = {
          width: Math.max(280, nodeCount * 160),
          height: 160,
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
  expandedSubagentBoxesMap?: Map<string, Set<string>>
): GraphData {
  const { nodes, edges } = convertSessionsToGraph(sessions, expandedGroups, expandedSubagents, expandedSubagentBoxesMap);
  const layoutedNodes = applyDagreLayout(nodes, edges);

  return { nodes: layoutedNodes, edges };
}
