import React, { useState, useCallback, useMemo } from 'react';
import type { Session, AnyNode, ToolGroup, ToolNode } from 'shared';
import { TreeNode, TreeNodeData } from './TreeNode';
import { useSessionStore } from '../store/sessionStore';
import { groupConsecutiveToolCalls } from '../utils/groupingUtils';

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
  highlight: {
    backgroundColor: '#854d0e',
    color: '#fbbf24',
    borderRadius: '2px',
    padding: '0 1px',
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
    return node.count > 1;
  }
  if ('type' in node) {
    // AnyNode types don't have direct children in our model
    // Messages no longer have toolUses as children since they're flattened
    return false;
  }
  // Session has nodes and subagents
  return node.nodes.length > 0 || node.subagents.length > 0;
}

/**
 * Check if content is empty, null, or whitespace-only
 */
function isEmptyContent(content: string | null | undefined): boolean {
  return !content || content.trim() === '';
}

/**
 * Check whether a node matches the current search term, used for highlighting.
 * This mirrors the logic in sessionStore but operates on TreeNodeData.
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
  const setSelectedGroupId = useSessionStore((state) => state.setSelectedGroupId);
  const setSelectedGroupData = useSessionStore((state) => state.setSelectedGroupData);
  const setSelectedNodeData = useSessionStore((state) => state.setSelectedNodeData);

  // Track expanded nodes
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Track selected node key
  const [selectedNodeKey, setSelectedNodeKey] = useState<string | null>(null);

  const isFiltering = filter !== 'all' || searchTerm !== '';

  const hiddenCwds = useSessionStore((state) => state.hiddenCwds);
  const showActive = useSessionStore((state) => state.showActive);
  const showIdle = useSessionStore((state) => state.showIdle);

  // Compute filtered sessions via the store selector
  const filteredSessions = useMemo(() => {
    return getFilteredSessions();
  }, [getFilteredSessions, sessions, filter, searchTerm, hiddenCwds, showActive, showIdle]);

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
    (nodeKey: string, node: TreeNodeData) => {
      setSelectedNodeKey(nodeKey);
      onNodeSelect?.(node);

      // Handle tool node clicks to open detail panel
      if ('type' in node && node.type === 'tool') {
        const toolNode = node as ToolNode;
        const syntheticGroup: ToolGroup = {
          id: `tool-group-single-${toolNode.id}`,
          type: 'tool-group',
          toolName: toolNode.toolName,
          nodes: [toolNode],
          count: 1,
          state: toolNode.state,
          timestamp: toolNode.timestamp,
          parentId: toolNode.parentId,
        };
        setSelectedGroupData(syntheticGroup);
        setSelectedGroupId(syntheticGroup.id);
      } else if ('type' in node && node.type === 'tool-group') {
        // Handle tool-group node clicks
        setSelectedGroupId(node.id);
      } else if ('type' in node && (node.type === 'skill' || node.type === 'subagent')) {
        // Handle skill and subagent node clicks to open detail panel
        setSelectedNodeData(node as AnyNode);
      } else if ('type' in node && node.type === 'message') {
        // Handle message node clicks to open detail panel
        setSelectedNodeData(node as AnyNode);
      } else if (!('type' in node)) {
        // Handle session node clicks (Session objects don't have 'type' property)
        setSelectedNodeData(node);
      }
    },
    [onNodeSelect, setSelectedGroupId, setSelectedGroupData, setSelectedNodeData]
  );

  // Render a single node and its children recursively
  const renderNode = useCallback(
    (node: TreeNodeData, depth: number, parentKey: string = '') => {
      const nodeKey = getNodeKey(node, parentKey);

      // For tool-group nodes, use store's expandedGroups; for subagent nodes, use store's expandedSubagents; for others use local expandedNodes
      const isToolGroup = 'type' in node && node.type === 'tool-group';
      const isSubagent = 'type' in node && node.type === 'subagent';
      const isExpanded = isToolGroup
        ? expandedGroups.has(node.id)
        : isSubagent
          ? expandedSubagents.has(node.id)
          : expandedNodes.has(nodeKey);
      const onToggle = isToolGroup
        ? () => toggleGroupExpansion(node.id)
        : isSubagent
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
              renderNode(toolNode, depth + 1, nodeKey)
            );
          }
        } else if ('type' in node) {
          // AnyNode - no longer rendering toolUses as children since they're flattened
        } else {
          // Session - render nodes and subagents
          const sessionChildren: React.ReactNode[] = [];

          // Process nodes to filter empty messages and flatten tool calls
          const processedNodes: AnyNode[] = [];

          node.nodes.forEach((childNode) => {
            // Check if it's a message node
            if ('type' in childNode && childNode.type === 'message') {
              const messageNode = childNode as any; // MessageNode type

              // Filter out messages with empty content
              if (isEmptyContent(messageNode.content)) {
                // Skip empty messages entirely
                return;
              }

              // If message has content, remove toolUses and add them separately
              const messageWithoutTools = {
                ...messageNode,
                toolUses: undefined, // Remove toolUses from message to prevent nested rendering
              };
              processedNodes.push(messageWithoutTools);

              // Extract toolUses and add them as separate nodes
              if (messageNode.toolUses && messageNode.toolUses.length > 0) {
                messageNode.toolUses.forEach((toolUse: any) => {
                  const toolNode: any = {
                    id: toolUse.id,
                    type: 'tool',
                    parentId: messageNode.id,
                    state: 'completed',
                    timestamp: messageNode.timestamp,
                    toolName: toolUse.name,
                    input: toolUse.input,
                  };
                  processedNodes.push(toolNode);
                });
              }
            } else {
              // Not a message, keep as is (should be AnyNode)
              if ('type' in childNode) {
                processedNodes.push(childNode as AnyNode);
              }
            }
          });

          // Add processed nodes (with grouping)
          const groupedNodes = groupConsecutiveToolCalls(processedNodes);
          groupedNodes.forEach((childNode) => {
            sessionChildren.push(renderNode(childNode, depth + 1, nodeKey));
          });

          // Add subagents
          node.subagents.forEach((subagent) => {
            sessionChildren.push(renderNode(subagent, depth + 1, nodeKey));
          });

          childNodes = sessionChildren;
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
          onToggle={onToggle}
          onSelect={() => selectNode(nodeKey, node)}
        >
          {childNodes}
        </TreeNode>
      );
    },
    [expandedNodes, selectedNodeKey, toggleNode, selectNode, searchTerm, expandedGroups, toggleGroupExpansion, expandedSubagents, toggleSubagentExpansion]
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
      <div style={styles.sectionTitle}>Session Hierarchy</div>
      {isFiltering && (
        <div style={styles.filterNotice}>
          Showing filtered results
        </div>
      )}
      {displaySessions.map((session) => renderNode(session, 0))}
    </div>
  );
}
