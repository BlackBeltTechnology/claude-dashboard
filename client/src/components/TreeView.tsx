import React, { useState, useCallback, useMemo } from 'react';
import type { Session, AnyNode, ToolGroup } from 'shared';
import { TreeNode, TreeNodeData } from './TreeNode';
import { useSessionStore } from '../store/sessionStore';
import { groupConsecutiveToolCalls } from '../utils/groupingUtils';
import { createNodeId } from '../utils/graphLayout';

const styles = {
  container: {
    padding: '12px',
    overflowY: 'auto' as const,
    height: '100%',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
    color: '#666',
    fontSize: '14px',
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    color: '#888',
    letterSpacing: '0.5px',
    marginBottom: '12px',
  },
  filterNotice: {
    fontSize: '11px',
    color: '#888',
    marginBottom: '8px',
    fontStyle: 'italic' as const,
  },
};

// Generate a unique key for each node
function getNodeKey(node: TreeNodeData, parentKey: string = ''): string {
  if ('type' in node && node.type === 'tool-group') {
    return `${parentKey}-group-${node.id}`;
  }
  if ('type' in node) {
    return `${parentKey}-${node.type}-${node.id}`;
  }
  // Session
  return `session-${node.id}`;
}

// Check if a node has children
function nodeHasChildren(node: TreeNodeData): boolean {
  if ('type' in node && node.type === 'tool-group') {
    // Tool groups should NOT be expandable - they navigate to tool-group node in graph
    return false;
  }
  if ('type' in node) {
    return false;
  }
  // Session has nodes and subagents
  return node.nodes.length > 0 || node.subagents.length > 0;
}

/**
 * Check whether a node matches the current search term, used for highlighting.
 */
function doesNodeMatchSearch(node: TreeNodeData, searchTerm: string): boolean {
  if (!searchTerm) return false;
  const lower = searchTerm.toLowerCase();

  if ('type' in node) {
    if (node.type === 'tool-group') {
      return node.toolName.toLowerCase().includes(lower);
    }
    switch (node.type) {
      case 'session':
        return (
          (node.summary?.toLowerCase().includes(lower) ?? false) ||
          node.sessionId.toLowerCase().includes(lower)
        );
      case 'message':
        return (
          node.content.toLowerCase().includes(lower) ||
          (node.toolUses?.some((tu) => tu.name.toLowerCase().includes(lower)) ?? false)
        );
      case 'skill':
        return node.skillName.toLowerCase().includes(lower);
      case 'subagent':
        return (
          node.agentType.toLowerCase().includes(lower) ||
          node.agentId.toLowerCase().includes(lower)
        );
      case 'tool':
        return node.toolName.toLowerCase().includes(lower);
      case 'user-prompt':
        return node.promptText.toLowerCase().includes(lower) ||
          (node.commandName?.toLowerCase().includes(lower) ?? false);
      case 'clear-marker':
        return 'clear'.includes(lower);
      default:
        return false;
    }
  }

  // Session object
  return (
    (node.summary?.toLowerCase().includes(lower) ?? false) ||
    node.id.toLowerCase().includes(lower)
  );
}

/**
 * Build subagent metadata map from a session's nodes.
 * Maps subagent session ID -> { agentType, agentName }
 */
function buildSubagentMeta(session: Session): Map<string, { agentType: string; agentName?: string }> {
  const map = new Map<string, { agentType: string; agentName?: string }>();
  for (const node of session.nodes) {
    if (node.type === 'subagent') {
      map.set(node.agentId, {
        agentType: node.agentType,
        agentName: node.agentName,
      });
    }
  }
  return map;
}

/**
 * Build a unified timeline from session data, matching graphLayout.ts logic.
 * Filters nodes, groups consecutive tool calls, merges with subagents,
 * sorts chronologically, and applies hiddenNodeTypes filter and content filters.
 */
function buildSessionTimeline(
  session: Session,
  hiddenNodeTypes: Set<string>,
  nodeTypeFilters: Map<string, string>
): Array<{ item: AnyNode | ToolGroup | Session; timestamp: number }> {
  // Filter session nodes for timeline (same logic as graphLayout.ts)
  const timelineNodes = session.nodes.filter((n) => {
    // Skip user-role messages (represented by user-prompt nodes)
    if (n.type === 'message' && n.role === 'user') return false;
    // Skip empty assistant messages
    if (n.type === 'message' && (!n.content || !n.content.trim())) return false;
    // Skip subagent metadata nodes (data is in session.subagents)
    if (n.type === 'subagent') return false;
    return true;
  });

  // Group consecutive same-name tool calls (non-tool nodes pass through)
  const groupedNodes = groupConsecutiveToolCalls(timelineNodes);

  // Build timestamped items
  const items: Array<{ item: AnyNode | ToolGroup | Session; timestamp: number }> = [];

  for (const node of groupedNodes) {
    items.push({ item: node, timestamp: node.timestamp });
  }

  for (const subagent of session.subagents) {
    items.push({ item: subagent, timestamp: subagent.createdAt });
  }

  // Sort chronologically (earliest first)
  items.sort((a, b) => a.timestamp - b.timestamp);

  // Apply hiddenNodeTypes filter (category-level visibility)
  let filteredItems = items;
  if (hiddenNodeTypes.size > 0) {
    filteredItems = items.filter(({ item }) => {
      if ('type' in item) {
        if (hiddenNodeTypes.has('tools') && (item.type === 'tool' || item.type === 'tool-group')) return false;
        if (hiddenNodeTypes.has('model') && item.type === 'message') return false;
        if (hiddenNodeTypes.has('prompts') && (item.type === 'user-prompt' || item.type === 'clear-marker')) return false;
        if (hiddenNodeTypes.has('skills') && item.type === 'skill') return false;
      } else {
        // Session (subagent)
        if (hiddenNodeTypes.has('subagents')) return false;
      }
      return true;
    });
  }

  // Apply content-level filters (within visible categories)
  if (nodeTypeFilters.size > 0) {
    filteredItems = filteredItems.filter(({ item }) => {
      if ('type' in item) {
        // For tool/tool-group: check toolName against 'tools' filter
        if (item.type === 'tool' || item.type === 'tool-group') {
          const toolFilter = nodeTypeFilters.get('tools');
          if (toolFilter) {
            const toolName = item.type === 'tool-group'
              ? item.toolName
              : item.toolName;
            if (!toolName.toLowerCase().includes(toolFilter.toLowerCase())) return false;
          }
        }

        // For user-prompt: check promptText against 'prompts' filter
        if (item.type === 'user-prompt') {
          const promptFilter = nodeTypeFilters.get('prompts');
          if (promptFilter) {
            if (!item.promptText.toLowerCase().includes(promptFilter.toLowerCase())) return false;
          }
        }

        // For message (model output): check content against 'model' filter
        if (item.type === 'message') {
          const modelFilter = nodeTypeFilters.get('model');
          if (modelFilter) {
            const content = item.content || '';
            if (!content.toLowerCase().includes(modelFilter.toLowerCase())) return false;
          }
        }

        // For skill: check skillName against 'skills' filter
        if (item.type === 'skill') {
          const skillFilter = nodeTypeFilters.get('skills');
          if (skillFilter) {
            if (!item.skillName.toLowerCase().includes(skillFilter.toLowerCase())) return false;
          }
        }
      } else {
        // Session (subagent): check agentType/agentName against 'subagents' filter
        const subagentFilter = nodeTypeFilters.get('subagents');
        if (subagentFilter) {
          // Find corresponding SubagentNode for agentType/agentName
          const subagentNode = session.nodes.find((n): n is import('shared').SubagentNode => n.type === 'subagent' && n.agentId === item.id);
          const agentType = subagentNode?.agentType || '';
          const agentName = subagentNode?.agentName || '';
          const searchText = `${agentType} ${agentName}`.toLowerCase();
          if (!searchText.includes(subagentFilter.toLowerCase())) return false;
        }
      }
      return true;
    });
  }

  return filteredItems;
}

/**
 * Get the tree label for a timeline item.
 * Returns a label override for subagent sessions,
 * or undefined to use TreeNode's default label.
 */
function getTimelineItemLabel(
  item: AnyNode | ToolGroup | Session,
  subagentMeta?: Map<string, { agentType: string; agentName?: string }>
): string | undefined {
  if ('type' in item) {
    // Use default TreeNode label for all node types (including model outputs)
    return undefined;
  }

  // Session (subagent) - look up agent metadata for proper naming
  if (subagentMeta) {
    const meta = subagentMeta.get(item.id);
    if (meta) {
      return meta.agentName ? `${meta.agentType} (${meta.agentName})` : meta.agentType;
    }
  }

  return item.summary || 'Task Agent';
}

interface TreeViewProps {
  onNodeSelect?: (node: TreeNodeData) => void;
}

export function TreeView({ onNodeSelect }: TreeViewProps) {
  const sessions = useSessionStore((state) => state.sessions);
  const selectedSessionId = useSessionStore((state) => state.selectedSessionId);
  const filter = useSessionStore((state) => state.filter);
  const searchTerm = useSessionStore((state) => state.searchTerm);
  const getFilteredSessions = useSessionStore((state) => state.getFilteredSessions);
  const expandedGroups = useSessionStore((state) => state.expandedGroups);
  const toggleGroupExpansion = useSessionStore((state) => state.toggleGroupExpansion);
  const expandedSubagents = useSessionStore((state) => state.expandedSubagents);
  const toggleSubagentExpansion = useSessionStore((state) => state.toggleSubagentExpansion);
  const expandAllSubagentBoxes = useSessionStore((state) => state.expandAllSubagentBoxes);
  const setFocusedNode = useSessionStore((state) => state.setFocusedNode);
  const hiddenNodeTypes = useSessionStore((state) => state.hiddenNodeTypes);
  const nodeTypeFilters = useSessionStore((state) => state.nodeTypeFilters);

  // Track expanded nodes
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Track selected node key
  const [selectedNodeKey, setSelectedNodeKey] = useState<string | null>(null);

  const isFiltering = filter !== 'all' || searchTerm !== '' || hiddenNodeTypes.size > 0;

  const hiddenCwds = useSessionStore((state) => state.hiddenCwds);
  const showActive = useSessionStore((state) => state.showActive);

  // Compute filtered sessions via the store selector
  const filteredSessions = useMemo(() => {
    return getFilteredSessions();
  }, [getFilteredSessions, sessions, filter, searchTerm, hiddenCwds, showActive]);

  const toggleNode = useCallback((nodeKey: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeKey)) {
        next.delete(nodeKey);
      } else {
        next.add(nodeKey);
      }
      return next;
    });
  }, []);

  const selectNode = useCallback(
    (nodeKey: string, node: TreeNodeData, parentSubagentId?: string) => {
      setSelectedNodeKey(nodeKey);
      onNodeSelect?.(node);

      // If clicking on a node inside a subagent session, expand the parent box and navigate to the internal RF node
      if (parentSubagentId && selectedSessionId) {
        // Expand the parent subagent box so RF nodes are generated
        expandAllSubagentBoxes(selectedSessionId, [parentSubagentId]);

        // Build the graph node ID for the internal RF node
        const nodeId = 'type' in node ? node.id : '';
        const isRequestOrResponse = nodeId.startsWith(parentSubagentId + '-request') ||
                                     nodeId.startsWith(parentSubagentId + '-response');

        let graphNodeId: string;
        if (isRequestOrResponse) {
          graphNodeId = createNodeId(selectedSessionId, nodeId);
        } else {
          graphNodeId = createNodeId(selectedSessionId, `${parentSubagentId}-${nodeId}`);
        }

        setFocusedNode(graphNodeId);
      } else if ('type' in node) {
        // Regular node click - navigate to graph node
        if (selectedSessionId) {
          const graphNodeId = createNodeId(selectedSessionId, node.id);
          setFocusedNode(graphNodeId);
        }
      } else {
        // Session node - subagent sessions use "-box" suffix in graph
        const isSubagent = node.id.length < 20;
        if (isSubagent && selectedSessionId) {
          const graphNodeId = createNodeId(selectedSessionId, `${node.id}-box`);
          setFocusedNode(graphNodeId);
        } else {
          setFocusedNode(node.id);
        }
      }
    },
    [onNodeSelect, setFocusedNode, selectedSessionId, expandAllSubagentBoxes]
  );

  // Render a single node and its children recursively
  const renderNode = useCallback(
    (node: TreeNodeData, depth: number, parentKey: string = '', parentSubagentId?: string, labelOverride?: string) => {
      const nodeKey = getNodeKey(node, parentKey);

      // For tool-group nodes, use store's expandedGroups; for subagent nodes, use store's expandedSubagents; for others use local expandedNodes
      const isToolGroup = 'type' in node && node.type === 'tool-group';
      const isSubagentNode = 'type' in node && node.type === 'subagent';
      const isExpanded = isToolGroup
        ? expandedGroups.has(node.id)
        : isSubagentNode
          ? expandedSubagents.has(node.id)
          : expandedNodes.has(nodeKey);
      const onToggle = isToolGroup
        ? () => toggleGroupExpansion(node.id)
        : isSubagentNode
          ? () => toggleSubagentExpansion(node.id)
          : () => toggleNode(nodeKey);

      const isSelected = selectedNodeKey === nodeKey;
      const hasChildren = nodeHasChildren(node);
      const isMatch = doesNodeMatchSearch(node, searchTerm);

      // Determine children to render
      let childNodes: React.ReactNode = null;

      if (isExpanded && hasChildren) {
        if ('type' in node && node.type === 'tool-group') {
          // ToolGroup - render individual tool nodes
          const isGroupExpanded = expandedGroups.has(node.id);
          if (isGroupExpanded) {
            childNodes = node.nodes.map((toolNode) =>
              renderNode(toolNode, depth + 1, nodeKey, parentSubagentId)
            );
          }
        } else if ('type' in node) {
          // AnyNode - no children
        } else {
          // Session - build unified timeline (matching graph layout logic)
          const timelineItems = buildSessionTimeline(node, hiddenNodeTypes, nodeTypeFilters);
          const subagentMeta = buildSubagentMeta(node);
          const isSubagentSession = node.id.length < 20;

          if (isSubagentSession) {
            const subagentSessionId = node.id;
            const subagentChildren: React.ReactNode[] = [];

            // Add request entry at the beginning
            const requestText = node.firstUserPrompt || node.summary || '';
            if (requestText && !hiddenNodeTypes.has('prompts')) {
              const requestNode: TreeNodeData = {
                id: `${node.id}-request`,
                type: 'message' as const,
                parentId: null,
                state: 'completed' as const,
                timestamp: node.createdAt,
                role: 'user' as const,
                content: requestText,
              };
              subagentChildren.push(renderNode(requestNode, depth + 1, nodeKey, subagentSessionId, 'Request'));
            }

            // Add timeline items with proper labels
            for (const { item } of timelineItems) {
              const itemLabel = getTimelineItemLabel(item, subagentMeta);
              subagentChildren.push(renderNode(item as TreeNodeData, depth + 1, nodeKey, subagentSessionId, itemLabel));
            }

            // Add response entry at the end
            const responseText = node.summary || '';
            if (responseText && !hiddenNodeTypes.has('model')) {
              const responseNode: TreeNodeData = {
                id: `${node.id}-response`,
                type: 'message' as const,
                parentId: null,
                state: node.state,
                timestamp: node.lastActivity,
                role: 'assistant' as const,
                content: responseText,
              };
              subagentChildren.push(renderNode(responseNode, depth + 1, nodeKey, subagentSessionId, 'Response'));
            }

            childNodes = subagentChildren;
          } else {
            // Root session - render sorted timeline
            const sessionChildren: React.ReactNode[] = [];
            for (const { item } of timelineItems) {
              const itemLabel = getTimelineItemLabel(item, subagentMeta);
              sessionChildren.push(renderNode(item as TreeNodeData, depth, nodeKey, undefined, itemLabel));
            }
            childNodes = sessionChildren;
          }
        }
      }

      return (
        <TreeNode
          key={nodeKey}
          node={node}
          depth={depth}
          isExpanded={isExpanded}
          isSelected={isSelected}
          hasChildren={hasChildren}
          isHighlighted={isMatch}
          labelOverride={labelOverride}
          onToggle={onToggle}
          onSelect={() => selectNode(nodeKey, node, parentSubagentId)}
        >
          {childNodes}
        </TreeNode>
      );
    },
    [expandedNodes, selectedNodeKey, toggleNode, selectNode, searchTerm, expandedGroups, toggleGroupExpansion, expandedSubagents, toggleSubagentExpansion, hiddenNodeTypes, nodeTypeFilters]
  );

  // Filter to selected session if one is selected, otherwise show all
  const displaySessions = useMemo(() => {
    if (selectedSessionId) {
      const selected = filteredSessions.find((s) => s.id === selectedSessionId);
      return selected ? [selected] : filteredSessions;
    }
    return filteredSessions;
  }, [filteredSessions, selectedSessionId]);

  if (displaySessions.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          {isFiltering
            ? 'No nodes match the current filter'
            : 'No active sessions'}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.sectionTitle}>Timeline</div>
      {isFiltering && (
        <div style={styles.filterNotice}>
          Showing filtered results
        </div>
      )}
      {displaySessions.map((session) => renderNode(session, 0))}
    </div>
  );
}
