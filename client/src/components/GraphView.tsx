import React, { useMemo, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type NodeTypes,
  type Node,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { SessionNode } from './nodes/SessionNode';
import { SubagentNode } from './nodes/SubagentNode';
import { SubagentBoxNode } from './nodes/SubagentBoxNode';
import { ToolNode } from './nodes/ToolNode';
import { ToolGroupNode, type ToolGroupNodeData } from './nodes/ToolGroupNode';
import { SkillNode } from './nodes/SkillNode';
import { UserPromptNode } from './nodes/UserPromptNode';
import { ClearMarkerNode } from './nodes/ClearMarkerNode';
import { RequestNode } from './nodes/RequestNode';
import { ResponseNode } from './nodes/ResponseNode';
import { ModelOutputNode } from './nodes/ModelOutputNode';
import { JoinNode } from './nodes/index';
import { useSessionStore } from '../store/sessionStore';
import { createLayoutedGraph, createNodeId } from '../utils/graphLayout';
import type { Session, ToolNode as ToolNodeType, AnyNode } from 'shared';
import type { SubagentBoxNodeData } from '../utils/graphLayout';

const nodeTypes: NodeTypes = {
  session: SessionNode,
  'subagent-box': SubagentBoxNode,
  subagent: SubagentNode,
  tool: ToolNode,
  'tool-group': ToolGroupNode,
  skill: SkillNode,
  'user-prompt': UserPromptNode,
  'clear-marker': ClearMarkerNode,
  'request': RequestNode,
  'response': ResponseNode,
  'model-output': ModelOutputNode,
  'join-node': JoinNode,
};

const styles = {
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a2e',
  },
  empty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#6b7280',
    fontSize: '14px',
  },
};

const miniMapStyle = {
  backgroundColor: '#16213e',
  maskColor: 'rgba(26, 26, 46, 0.7)',
};

const defaultEdgeOptions = {
  type: 'smoothstep' as const,
  style: { stroke: '#4b5563', strokeWidth: 1.5 },
};

const proOptions = { hideAttribution: true };

// Helper component to handle tree-to-graph focus synchronization
// Must be child of ReactFlow to use useReactFlow hook
function GraphFocusHandler() {
  const { fitView, getNodes } = useReactFlow();
  const focusedNodeId = useSessionStore((state) => state.focusedNodeId);
  const jumpToEndTrigger = useSessionStore((state) => state.jumpToEndTrigger);

  useEffect(() => {
    if (focusedNodeId) {
      // Small delay ensures React Flow layout is calculated
      const timer = setTimeout(() => {
        fitView({
          nodes: [{ id: focusedNodeId }],
          duration: 300,
          padding: 0.3,
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [focusedNodeId, fitView]);

  useEffect(() => {
    if (jumpToEndTrigger > 0) {
      const timer = setTimeout(() => {
        const allNodes = getNodes().filter((n) => !n.parentId);
        if (allNodes.length === 0) return;
        // Find rightmost node (highest x position = last in LR layout)
        const lastNode = allNodes.reduce((best, n) =>
          n.position.x > best.position.x ? n : best
        );
        fitView({
          nodes: [{ id: lastNode.id }],
          duration: 300,
          padding: 0.3,
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [jumpToEndTrigger, fitView, getNodes]);

  return null;
}

export function GraphView() {
  const allSessions = useSessionStore((state) => state.sessions);
  const getFilteredSessions = useSessionStore((state) => state.getFilteredSessions);
  const filter = useSessionStore((state) => state.filter);
  const searchTerm = useSessionStore((state) => state.searchTerm);
  const hiddenCwds = useSessionStore((state) => state.hiddenCwds);
  const showActive = useSessionStore((state) => state.showActive);
  const showArchived = useSessionStore((state) => state.showArchived);
  const selectedSessionId = useSessionStore((state) => state.selectedSessionId);
  const setSelectedSession = useSessionStore((state) => state.setSelectedSession);
  const setSelectedGroupId = useSessionStore((state) => state.setSelectedGroupId);
  const setSelectedGroupData = useSessionStore((state) => state.setSelectedGroupData);
  const setSelectedNodeData = useSessionStore((state) => state.setSelectedNodeData);
  const toggleGroupExpansion = useSessionStore((state) => state.toggleGroupExpansion);
  const expandedGroups = useSessionStore((state) => state.expandedGroups);
  const expandedSubagents = useSessionStore((state) => state.expandedSubagents);
  const expandedSubagentBoxes = useSessionStore((state) => state.expandedSubagentBoxes);
  const toggleSubagentBox = useSessionStore((state) => state.toggleSubagentBox);
  const hiddenNodeTypes = useSessionStore((state) => state.hiddenNodeTypes);
  const nodeTypeFilters = useSessionStore((state) => state.nodeTypeFilters);

  // Filter sessions using store selector (same as sidebar)
  const sessions = useMemo(() => {
    return getFilteredSessions();
  }, [getFilteredSessions, allSessions, filter, searchTerm, hiddenCwds, showActive, showArchived]);

  // Filter to selected session or show all sessions
  const displaySessions = useMemo(() => {
    if (selectedSessionId) {
      const selected = sessions.find((s) => s.id === selectedSessionId);
      return selected ? [selected] : sessions;
    }
    return sessions;
  }, [sessions, selectedSessionId]);

  // Compute graph layout from session data
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => createLayoutedGraph(displaySessions, expandedGroups, expandedSubagents, expandedSubagentBoxes, hiddenNodeTypes, nodeTypeFilters),
    [displaySessions, expandedGroups, expandedSubagents, expandedSubagentBoxes, hiddenNodeTypes, nodeTypeFilters]
  );

  // Enrich subagent nodes with onToolCallClick callback
  const enrichedNodes = useMemo(() => {
    return layoutedNodes.map((node) => {
      if (node.type === 'subagent-box') {
        const boxData = node.data as SubagentBoxNodeData;
        return {
          ...node,
          data: {
            ...boxData,
            onToggleExpand: () => {
              toggleSubagentBox(boxData.sessionId, boxData.agentId);
            },
            onInternalNodeClick: (internalNodeId: string) => {
              // Find the internal node data and open detail panel
              const internalNode = boxData.internalNodes?.find(n => n.id === internalNodeId);
              if (internalNode?.type === 'model') {
                // For model output nodes, pass the original message node data if available
                // Handle both single nodeData and arrays (for grouped model outputs)
                const nodeData = Array.isArray(internalNode.nodeData)
                  ? internalNode.nodeData[0]
                  : internalNode.nodeData;
                if (nodeData) {
                  setSelectedNodeData(nodeData);
                } else if (internalNode.content) {
                  // Create a synthetic message node for display
                  setSelectedNodeData({
                    id: internalNodeId,
                    type: 'message' as const,
                    role: 'assistant' as const,
                    content: internalNode.content,
                    timestamp: Date.now(),
                    state: internalNode.state,
                    parentId: null,
                  } as any);
                }
              } else if (internalNode?.type === 'request') {
                // Open detail panel as subagent node with request info
                setSelectedNodeData({
                  id: internalNodeId,
                  type: 'subagent' as const,
                  agentId: boxData.agentId,
                  agentType: boxData.agentType,
                  agentName: boxData.agentName,
                  prompt: boxData.prompt || '(no prompt)',
                  timestamp: Date.now(),
                  state: internalNode.state,
                  parentId: null,
                  ...(internalNode.hooks && internalNode.hooks.length > 0 ? { hooks: internalNode.hooks } : {}),
                } as any);
              } else if (internalNode?.type === 'response') {
                // Open detail panel as subagent node with response info
                setSelectedNodeData({
                  id: internalNodeId,
                  type: 'subagent' as const,
                  agentId: boxData.agentId,
                  agentType: boxData.agentType,
                  agentName: boxData.agentName,
                  summary: boxData.summary || '(no summary)',
                  timestamp: Date.now(),
                  state: internalNode.state,
                  parentId: null,
                  ...(internalNode.hooks && internalNode.hooks.length > 0 ? { hooks: internalNode.hooks } : {}),
                } as any);
              } else if (internalNode?.nodeData) {
                // For tool nodes with nodeData, pass it through (handle arrays for consistency)
                const toolNodeData = Array.isArray(internalNode.nodeData)
                  ? internalNode.nodeData[0]
                  : internalNode.nodeData;
                if (toolNodeData) {
                  setSelectedNodeData(toolNodeData);
                }
              }
            },
          },
        };
      } else if (node.type === 'subagent') {
        return {
          ...node,
          data: {
            ...node.data,
            onToolCallClick: (toolCallId: string) => {
              // Find the subagent session
              const subagentSessionId = (node.data as any).agentId;
              const findSubagentSession = (): Session | null => {
                const searchSession = (session: Session): Session | null => {
                  for (const sub of session.subagents) {
                    if (sub.id === subagentSessionId) return sub;
                    const nested = searchSession(sub);
                    if (nested) return nested;
                  }
                  return null;
                };
                for (const session of sessions) {
                  const found = searchSession(session);
                  if (found) return found;
                }
                return null;
              };

              const subagentSession = findSubagentSession();
              if (subagentSession) {
                // Find the tool node by ID
                const toolNode = subagentSession.nodes.find(
                  (n) => n.type === 'tool' && n.id === toolCallId
                );
                if (toolNode && toolNode.type === 'tool') {
                  setSelectedNodeData(toolNode);
                }
              }
            },
          },
        };
      }
      return node;
    });
  }, [layoutedNodes, sessions, setSelectedNodeData, selectedSessionId, toggleSubagentBox]);

  const [nodes, setNodes, onNodesChange] = useNodesState(enrichedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  // Update nodes/edges when session data changes
  React.useEffect(() => {
    setNodes(enrichedNodes);
    setEdges(layoutedEdges);
  }, [enrichedNodes, layoutedEdges, setNodes, setEdges]);

  // Helper function to find a tool node in sessions by React Flow node ID
  const findToolNodeInSessions = useCallback(
    (clickedRfNodeId: string): { toolNode: ToolNodeType; sessionId: string } | null => {
      const searchInSession = (session: Session): { toolNode: ToolNodeType; sessionId: string } | null => {
        for (const node of session.nodes) {
          if (node.type === 'tool' && createNodeId(session.id, node.id) === clickedRfNodeId) {
            return { toolNode: node as ToolNodeType, sessionId: session.id };
          }
        }
        for (const subagent of session.subagents) {
          const found = searchInSession(subagent);
          if (found) return found;
        }
        return null;
      };

      for (const session of sessions) {
        const found = searchInSession(session);
        if (found) return found;
      }
      return null;
    },
    [sessions]
  );

  // Helper function to find any AnyNode by React Flow node ID
  const findAnyNodeInSessions = useCallback(
    (clickedRfNodeId: string): AnyNode | null => {
      const searchInSession = (session: Session): AnyNode | null => {
        for (const node of session.nodes) {
          if (createNodeId(session.id, node.id) === clickedRfNodeId) {
            return node;
          }
        }
        for (const subagent of session.subagents) {
          const found = searchInSession(subagent);
          if (found) return found;
        }
        return null;
      };

      for (const session of sessions) {
        const found = searchInSession(session);
        if (found) return found;
      }
      return null;
    },
    [sessions]
  );

  // Helper function to find ToolGroup data by React Flow node ID
  const findToolGroupInSessions = useCallback(
    (clickedRfNodeId: string, nodeData: any): { toolGroup: any; sessionId: string } | null => {
      const { groupId, toolName, count } = nodeData;

      const searchInSession = (session: Session): { toolGroup: any; sessionId: string } | null => {
        // Check if this is a multi-item tool group (groupId starts with 'tool-group-')
        if (groupId.startsWith('tool-group-')) {
          // Parse the groupId to extract toolName and firstNodeId
          // Format: 'tool-group-${toolName}-${firstNodeId}'
          const parts = groupId.split('-');
          if (parts.length >= 4) {
            // parts[0] = 'tool', parts[1] = 'group', parts[2+] = toolName (in case toolName has dashes)
            const extractedToolName = parts.slice(2, -1).join('-');
            const firstNodeId = parts[parts.length - 1];

            // Reconstruct the tool group by finding consecutive tool calls of the same type
            // This matches the logic in groupingUtils.ts
            const nonMessageNodes = session.nodes.filter(node => node.type !== 'message');
            const toolRuns: ToolNodeType[][] = [];
            let currentRun: ToolNodeType[] = [];

            for (const node of nonMessageNodes) {
              if (node.type === 'tool') {
                if (currentRun.length === 0 || currentRun[currentRun.length - 1].toolName === node.toolName) {
                  currentRun.push(node as ToolNodeType);
                } else {
                  if (currentRun.length > 0) {
                    toolRuns.push(currentRun);
                  }
                  currentRun = [node as ToolNodeType];
                }
              } else {
                if (currentRun.length > 0) {
                  toolRuns.push(currentRun);
                  currentRun = [];
                }
              }
            }
            if (currentRun.length > 0) {
              toolRuns.push(currentRun);
            }

            // Find the run that contains the firstNodeId
            for (const run of toolRuns) {
              if (run.length > 1 && run[0].toolName === extractedToolName) {
                // This is a multi-item group - find if firstNodeId is in this run
                const matchingNode = run.find(n => n.id === firstNodeId);
                if (matchingNode) {
                  // Found the group - return all tool nodes in this run
                  return {
                    toolGroup: {
                      id: groupId,
                      type: 'tool-group',
                      toolName: extractedToolName,
                      nodes: run,
                      count: run.length,
                      state: run.some(n => n.state === 'active') ? 'active' : run[0].state,
                      timestamp: run[0].timestamp,
                      parentId: run[0].parentId,
                    },
                    sessionId: session.id,
                  };
                }
              }
            }
          }
        } else {
          // Single tool node (synthetic tool-group)
          const foundNode = session.nodes.find(
            (node) => node.type === 'tool' && createNodeId(session.id, node.id) === clickedRfNodeId
          );
          if (foundNode && foundNode.type === 'tool') {
            return {
              toolGroup: {
                id: groupId,
                type: 'tool-group',
                toolName: foundNode.toolName,
                nodes: [foundNode as ToolNodeType],
                count: 1,
                state: foundNode.state,
                timestamp: foundNode.timestamp,
                parentId: foundNode.parentId,
              },
              sessionId: session.id,
            };
          }
        }

        // Search in subagents
        for (const subagent of session.subagents) {
          const found = searchInSession(subagent);
          if (found) return found;
        }

        return null;
      };

      for (const session of sessions) {
        const found = searchInSession(session);
        if (found) return found;
      }
      return null;
    },
    [sessions]
  );

  // Handle node click to select session or open detail panel
  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (node.type === 'session') {
        // Extract the session ID from the node ID
        setSelectedSession(node.id);
        // Also open the detail panel with session metadata
        const session = sessions.find(s => s.id === node.id);
        if (session) {
          setSelectedNodeData(session);
        }
      } else if (node.type === 'subagent') {
        // Open detail panel for subagent node (start or stop variant)
        // The graph node's data already contains all needed info (populated by graphLayout.ts)
        const subagentData = node.data as any;
        const subagentSessionId = subagentData.agentId;

        // Find the subagent Session to get its tool calls and full node list
        const findSubagentSession = (): Session | null => {
          const searchSession = (session: Session): Session | null => {
            for (const sub of session.subagents) {
              if (sub.id === subagentSessionId) return sub;
              const nested = searchSession(sub);
              if (nested) return nested;
            }
            return null;
          };
          for (const session of sessions) {
            const found = searchSession(session);
            if (found) return found;
          }
          return null;
        };

        const subagentSession = findSubagentSession();

        // Build a combined object for the detail panel
        // Type it as SubagentNode (from shared) enriched with extra fields
        const detailData = {
          id: subagentData.agentId || '',
          type: 'subagent' as const,
          parentId: null,
          state: subagentData.state,
          timestamp: Date.now(),
          agentId: subagentData.agentId || '',
          agentType: subagentData.agentType,
          agentName: subagentData.agentName,
          agentColor: subagentData.agentColor,
          description: subagentData.description,
          prompt: subagentData.prompt,
          summary: subagentData.summary,
          model: subagentData.model,
          sourceFilePath: subagentData.agentType !== 'Task'
            ? `~/.claude/agents/${subagentData.agentType}.md`
            : undefined,
          // Extra fields for detail panel
          toolCalls: subagentData.toolCalls,
          toolCallCount: subagentData.toolCallCount,
          // Attach the full subagent session's nodes for drill-down
          subagentNodes: subagentSession?.nodes || [],
        };

        setSelectedNodeData(detailData as any);
      } else if (node.type === 'skill') {
        const foundNode = findAnyNodeInSessions(node.id);
        if (foundNode) {
          setSelectedNodeData(foundNode);
        }
      } else if (node.type === 'tool') {
        const foundNode = findToolNodeInSessions(node.id);
        if (foundNode) {
          setSelectedNodeData(foundNode.toolNode);
        }
      } else if (node.type === 'tool-group') {
        const foundGroup = findToolGroupInSessions(node.id, node.data);
        if (foundGroup) {
          setSelectedNodeData(foundGroup.toolGroup);
        } else {
          // Fallback: for subagent-internal tool groups, search for the tool node directly
          const searchForToolInSubagents = (): AnyNode | null => {
            const searchSession = (session: Session): AnyNode | null => {
              for (const sub of session.subagents) {
                for (const n of sub.nodes) {
                  if (n.type === 'tool' && n.id === (node.data as any).groupId) return n;
                }
                const nested = searchSession(sub);
                if (nested) return nested;
              }
              return null;
            };
            for (const session of sessions) {
              const found = searchSession(session);
              if (found) return found;
            }
            return null;
          };
          const toolNode = searchForToolInSubagents();
          if (toolNode) {
            setSelectedNodeData(toolNode);
          }
        }
      } else if (node.type === 'request') {
        // Request node clicked - show as subagent with request info
        const requestData = node.data as any;
        setSelectedNodeData({
          id: node.id,
          type: 'subagent' as const,
          agentId: requestData.agentId || '',
          agentType: requestData.agentType || 'Task',
          agentName: requestData.agentName,
          prompt: requestData.prompt || '(no prompt)',
          timestamp: Date.now(),
          state: requestData.state,
          parentId: null,
          ...(requestData.hooks && requestData.hooks.length > 0 ? { hooks: requestData.hooks } : {}),
        } as any);
      } else if (node.type === 'response') {
        // Response node clicked - show as subagent with response info
        const responseData = node.data as any;
        setSelectedNodeData({
          id: node.id,
          type: 'subagent' as const,
          agentId: responseData.agentId || '',
          agentType: responseData.agentType || 'Task',
          agentName: responseData.agentName,
          summary: responseData.summary || '(no summary)',
          timestamp: Date.now(),
          state: responseData.state,
          parentId: null,
          ...(responseData.hooks && responseData.hooks.length > 0 ? { hooks: responseData.hooks } : {}),
        } as any);
      } else if (node.type === 'model-output') {
        // Model output node clicked - toggle expansion if it's a group, show content in detail panel
        const modelData = node.data as any;

        // Toggle expansion if this is a grouped model output
        if (modelData.groupId && modelData.count && modelData.count > 1) {
          toggleGroupExpansion(modelData.groupId);
        }

        // Show content in detail panel
        if (modelData.nodeData) {
          // If it's an array of grouped messages, pass them all for expanded view
          if (Array.isArray(modelData.nodeData)) {
            setSelectedNodeData({
              nodeData: modelData.nodeData,
              count: modelData.count,
            } as any);
          } else {
            // Single message node
            setSelectedNodeData(modelData.nodeData);
          }
        } else if (modelData.content) {
          // Fallback: create synthetic message node
          setSelectedNodeData({
            id: node.id,
            type: 'message' as const,
            role: 'assistant' as const,
            content: modelData.content,
            timestamp: Date.now(),
            state: modelData.state,
            parentId: null,
          } as any);
        }
      } else if (node.type === 'user-prompt' || node.type === 'clear-marker') {
        const foundNode = findAnyNodeInSessions(node.id);
        if (foundNode) {
          setSelectedNodeData(foundNode);
        }
      }
    },
    [setSelectedSession, setSelectedNodeData, toggleGroupExpansion, sessions, findAnyNodeInSessions, findToolGroupInSessions]
  );

  if (sessions.length === 0) {
    return (
      <div style={styles.empty}>
        <p>No sessions available. Connect to the server to see session graphs.</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        proOptions={proOptions}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
      >
        <GraphFocusHandler />
        <Controls
          position="bottom-right"
          style={{ backgroundColor: '#16213e', border: '1px solid #0f3460' }}
        />
        <MiniMap
          position="bottom-left"
          style={miniMapStyle}
          nodeColor={(node: Node) => {
            switch (node.type) {
              case 'session':
                return '#e94560';
              case 'subagent-box': {
                const boxData = node.data as SubagentBoxNodeData;
                return boxData.agentColor || '#8b5cf6';
              }
              case 'subagent':
                return '#8b5cf6';
              case 'tool':
                return '#f59e0b';
              case 'tool-group':
                return '#f59e0b';
              case 'skill':
                return '#06b6d4';
              case 'user-prompt':
                return '#10b981';
              case 'clear-marker':
                return '#dc2626';
              case 'request':
                return '#10b981';  // Green (same as user-prompt)
              case 'response':
                return '#3b82f6';  // Blue
              case 'model-output':
                return '#8b5cf6';  // Purple
              default:
                return '#4b5563';
            }
          }}
        />
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#2a2a4e"
        />
      </ReactFlow>
    </div>
  );
}
