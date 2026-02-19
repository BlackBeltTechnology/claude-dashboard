import React, { useMemo, useCallback, useEffect, useRef } from 'react';
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
  type Edge,
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

function stableStringifyWithoutFunctions(value: unknown): string {
  const seen = new WeakSet<object>();
  return JSON.stringify(value, (_key, val) => {
    if (typeof val === 'function') return '__fn__';
    if (val && typeof val === 'object') {
      if (seen.has(val as object)) return '__cycle__';
      seen.add(val as object);
    }
    return val;
  }) || '';
}

function nodeSignature(node: Node): string {
  return [
    node.type,
    node.parentId || '',
    node.position.x,
    node.position.y,
    stableStringifyWithoutFunctions(node.data),
  ].join('|');
}

function edgeSignature(edge: Edge): string {
  return [
    edge.source,
    edge.target,
    edge.type || '',
    edge.animated ? '1' : '0',
    stableStringifyWithoutFunctions(edge.style || {}),
  ].join('|');
}

// Helper component to handle tree-to-graph focus synchronization
// Must be child of ReactFlow to use useReactFlow hook
function GraphFocusHandler() {
  const { fitView, getNodes, getEdges, getZoom, setCenter } = useReactFlow();
  const focusedNodeId = useSessionStore((state) => state.focusedNodeId);
  const jumpToEndTrigger = useSessionStore((state) => state.jumpToEndTrigger);
  const followPipelineEnd = useSessionStore((state) => state.followPipelineEnd);
  const expandedSubagentBoxes = useSessionStore((state) => state.expandedSubagentBoxes);
  const selectedSessionId = useSessionStore((state) => state.selectedSessionId);
  const lastFollowedNodeIdRef = useRef<string | null>(null);
  const lastFollowedPosRef = useRef<{ x: number; y: number } | null>(null);
  const didInitialFitRef = useRef(false);
  const followPipelineEndRef = useRef(followPipelineEnd);

  const getRightmostByGeometry = useCallback((nodes: Node[], nodeMap: Map<string, Node>): Node | null => {
    if (nodes.length === 0) return null;

    const getAbsPos = (node: Node): { x: number; y: number } => {
      let x = node.position.x;
      let y = node.position.y;
      let parentId = node.parentId;
      while (parentId) {
        const parent = nodeMap.get(parentId);
        if (!parent) break;
        x += parent.position.x;
        y += parent.position.y;
        parentId = parent.parentId;
      }
      return { x, y };
    };

    const rightEdge = (node: Node): number => {
      const p = getAbsPos(node);
      const w = node.measured?.width ?? node.width ?? 0;
      return p.x + w;
    };

    return nodes.reduce((best, n) => {
      const nr = rightEdge(n);
      const br = rightEdge(best);
      if (nr !== br) return nr > br ? n : best;
      return n.position.y > best.position.y ? n : best;
    });
  }, []);

  const getEndTargetNodeId = useCallback((): string | null => {
    const allNodes = getNodes();
    if (allNodes.length === 0) return null;
    const nodeMap = new Map(allNodes.map((n) => [n.id, n]));

    // Step 1: Find the rightmost TOP-LEVEL node (no parentId), excluding structural nodes.
    // Dagre places nodes left-to-right in timeline order, so the rightmost top-level node
    // is always the correct follow target regardless of parallel groups or subagent nesting.
    const topLevel = allNodes.filter((n) =>
      !n.parentId && n.type !== 'session' && n.type !== 'join-node'
    );
    if (topLevel.length === 0) return allNodes[0]?.id ?? null;

    const rightmostTopLevel = getRightmostByGeometry(topLevel, nodeMap);
    if (!rightmostTopLevel) return null;

    // Step 2: If the rightmost top-level node is an EXPANDED subagent-box,
    // dive into it and find the rightmost child node inside.
    if (rightmostTopLevel.type === 'subagent-box') {
      const boxData = rightmostTopLevel.data as any;
      const currentSessionExpandedBoxes = selectedSessionId
        ? (expandedSubagentBoxes.get(selectedSessionId) || new Set<string>())
        : new Set<string>();

      if (boxData?.agentId && currentSessionExpandedBoxes.has(boxData.agentId)) {
        const childNodes = allNodes.filter((n) => n.parentId === rightmostTopLevel.id);
        if (childNodes.length > 0) {
          const rightmostChild = getRightmostByGeometry(childNodes, nodeMap);
          if (rightmostChild) return rightmostChild.id;
        }
      }
    }

    return rightmostTopLevel.id;
  }, [getNodes, getRightmostByGeometry, expandedSubagentBoxes, selectedSessionId]);

  const focusNodeById = useCallback((nodeId: string, xOffset = 0, duration = 220) => {
    const allNodes = getNodes();
    const nodeMap = new Map(allNodes.map((n) => [n.id, n]));
    const target = nodeMap.get(nodeId);
    if (!target) return;

    let absX = target.position.x;
    let absY = target.position.y;
    let parentId = target.parentId;
    while (parentId) {
      const parent = nodeMap.get(parentId);
      if (!parent) break;
      absX += parent.position.x;
      absY += parent.position.y;
      parentId = parent.parentId;
    }

    const width = target.measured?.width ?? target.width ?? 0;
    const height = target.measured?.height ?? target.height ?? 0;
    const centerX = absX + width / 2;
    const centerY = absY + height / 2;

    // Preserve current zoom to avoid zoom-out / zoom-in jitter.
    setCenter(centerX + xOffset, centerY, {
      zoom: getZoom(),
      duration,
    });

    lastFollowedPosRef.current = { x: centerX + xOffset, y: centerY };
  }, [getNodes, getZoom, setCenter]);

  const focusRightmostNode = useCallback(() => {
    const nodeId = getEndTargetNodeId();
    if (!nodeId) return;
    focusNodeById(nodeId);
    lastFollowedNodeIdRef.current = nodeId;
  }, [getEndTargetNodeId, focusNodeById]);

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

  // Initial one-time fit for first render only (no repeated auto-fit on updates).
  useEffect(() => {
    if (didInitialFitRef.current) return;
    const timer = setTimeout(() => {
      if (getNodes().length === 0) return;
      fitView({ padding: 0.2, duration: 250 });
      didInitialFitRef.current = true;
    }, 120);
    return () => clearTimeout(timer);
  }, [fitView, getNodes]);

  useEffect(() => {
    if (jumpToEndTrigger > 0) {
      const timer = setTimeout(() => focusRightmostNode(), 180);
      return () => clearTimeout(timer);
    }
  }, [jumpToEndTrigger, focusRightmostNode]);

  // Follow mode: keep jumping to latest rightmost node as pipeline grows
  useEffect(() => {
    // Update ref synchronously so interval callback can check latest value
    followPipelineEndRef.current = followPipelineEnd;

    if (!followPipelineEnd) return;

    // Initial focus when follow is turned on
    const initialTimer = setTimeout(() => {
      const nodeId = getEndTargetNodeId();
      if (!nodeId) return;
      focusNodeById(nodeId, 8, 140);
      lastFollowedNodeIdRef.current = nodeId;
    }, 120);

    // Poll for newly appended pipeline nodes and follow the true end target.
    const interval = setInterval(() => {
      // Guard: check if follow-end is still enabled (prevents race condition on disable)
      if (!followPipelineEndRef.current) return;

      const targetId = getEndTargetNodeId();
      if (!targetId) return;

      const allNodes = getNodes();
      const nodeMap = new Map(allNodes.map((n) => [n.id, n]));
      const targetNode = nodeMap.get(targetId);

      let center: { x: number; y: number } | null = null;
      if (targetNode) {
        let ax = targetNode.position.x;
        let ay = targetNode.position.y;
        let pId = targetNode.parentId;
        while (pId) {
          const p = nodeMap.get(pId);
          if (!p) break;
          ax += p.position.x;
          ay += p.position.y;
          pId = p.parentId;
        }
        const width = targetNode.measured?.width ?? targetNode.width ?? 0;
        const height = targetNode.measured?.height ?? targetNode.height ?? 0;
        center = { x: ax + width / 2 + 8, y: ay + height / 2 };
      }

      const prev = lastFollowedPosRef.current;
      const moved = !!(center && prev && (Math.abs(center.x - prev.x) > 2 || Math.abs(center.y - prev.y) > 2));

      if (lastFollowedNodeIdRef.current !== targetId || moved) {
        focusNodeById(targetId, 8, 140);
        lastFollowedNodeIdRef.current = targetId;
      }
    }, 650);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [followPipelineEnd, getEndTargetNodeId, focusNodeById]);

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

  const [nodes, setNodes] = useNodesState(enrichedNodes);
  const [edges, setEdges] = useEdgesState(layoutedEdges);

  // Reconcile nodes/edges to keep stable object identity for unchanged IDs.
  // This avoids visible reload/flicker in expanded subagent internals.
  useEffect(() => {
    setNodes((prev) => {
      const prevMap = new Map(prev.map((n) => [n.id, n]));
      return enrichedNodes.map((nextNode) => {
        const prevNode = prevMap.get(nextNode.id);
        if (!prevNode) return nextNode;
        return nodeSignature(prevNode as Node) === nodeSignature(nextNode as Node)
          ? prevNode
          : nextNode;
      });
    });

    setEdges((prev) => {
      const prevMap = new Map(prev.map((e) => [e.id, e]));
      return layoutedEdges.map((nextEdge) => {
        const prevEdge = prevMap.get(nextEdge.id);
        if (!prevEdge) return nextEdge;
        return edgeSignature(prevEdge as Edge) === edgeSignature(nextEdge as Edge)
          ? prevEdge
          : nextEdge;
      });
    });
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
            // Only use tools + assistant messages (matching graphLayout's grouping input)
            // Other node types (subagent, user-prompt, etc.) are excluded so they don't
            // create extra group breaks that differ from how the graph was built
            const toolAndMsgNodes = session.nodes.filter(
              n => n.type === 'tool' || (n.type === 'message' && (n as any).role === 'assistant')
            );
            const toolRuns: ToolNodeType[][] = [];
            let currentRun: ToolNodeType[] = [];

            for (const node of toolAndMsgNodes) {
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
              if (run[0].toolName === extractedToolName) {
                const matchingNode = run.find(n => n.id === firstNodeId);
                if (matchingNode) {
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
        const data = node.data as any;
        // Use nodeData embedded in the RF node (set by graphLayout) — no reconstruction needed
        if (data.nodeData && Array.isArray(data.nodeData) && data.nodeData.length > 0) {
          setSelectedNodeData({
            id: data.groupId,
            type: 'tool-group',
            toolName: data.toolName,
            nodes: data.nodeData,
            count: data.nodeData.length,
            state: data.state,
            timestamp: data.nodeData[0].timestamp,
            parentId: data.nodeData[0].parentId,
          } as any);
        } else {
          // Fallback: try reconstructing from sessions
          const foundGroup = findToolGroupInSessions(node.id, node.data);
          if (foundGroup) {
            setSelectedNodeData(foundGroup.toolGroup);
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
              id: modelData.groupId || node.id,
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
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        proOptions={proOptions}
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
