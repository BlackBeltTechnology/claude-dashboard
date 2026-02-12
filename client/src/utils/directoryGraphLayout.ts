import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';
import type { Session } from 'shared';
import type { DirectoryNodeData } from '../components/nodes/DirectoryNode';
import type { SessionNodeData } from '../components/nodes/SessionNode';
import { getSessionTitle } from './sessionName';

// State priority for sorting (lower number = higher priority)
const STATE_PRIORITY: Record<string, number> = {
  active: 0,
  waiting: 1,
  idle: 2,
  completed: 3,
};

// Union of node data types used in directory overview
type DirectoryGraphNodeData = DirectoryNodeData | SessionNodeData;

export interface DirectoryGraphData {
  nodes: Node<DirectoryGraphNodeData>[];
  edges: Edge[];
}

// Node dimensions for layout
const NODE_DIMENSIONS = {
  directory: { width: 190, height: 80 },
  session: { width: 200, height: 100 },
};

/**
 * Create directory overview graph with directories as primary nodes
 * and sessions as children, using horizontal LR layout.
 */
export function createDirectoryOverviewGraph(
  sessions: Session[],
  expandedGroups: Set<string>
): DirectoryGraphData {
  const nodes: Node<DirectoryGraphNodeData>[] = [];
  const edges: Edge[] = [];

  // Group sessions by working directory
  const sessionsByDirectory = new Map<string, Session[]>();

  for (const session of sessions) {
    const cwd = session.cwd || '__no_cwd__';
    if (!sessionsByDirectory.has(cwd)) {
      sessionsByDirectory.set(cwd, []);
    }
    sessionsByDirectory.get(cwd)!.push(session);
  }

  // Sort sessions within each directory by state priority then last activity
  for (const [, cwdSessions] of sessionsByDirectory.entries()) {
    cwdSessions.sort((a, b) => {
      const priorityDiff = (STATE_PRIORITY[a.state] ?? 99) - (STATE_PRIORITY[b.state] ?? 99);
      if (priorityDiff !== 0) return priorityDiff;
      return (b.lastActivity ?? 0) - (a.lastActivity ?? 0); // Most recent first within same state
    });
  }

  // Create directory nodes and session nodes
  for (const [cwd, cwdSessions] of sessionsByDirectory.entries()) {
    // Create directory node
    const directoryNodeId = `directory-${cwd}`;

    // Extract last part of path for display
    const displayName = cwd === '__no_cwd__'
      ? 'No Directory'
      : cwd.split('/').filter(Boolean).pop() || cwd;

    const directoryNode: Node<DirectoryNodeData> = {
      id: directoryNodeId,
      type: 'directory',
      position: { x: 0, y: 0 }, // Will be calculated by dagre
      data: {
        label: displayName,
        sessionCount: cwdSessions.length,
        cwd,
      },
    };
    nodes.push(directoryNode);

    // Create session nodes for this directory
    for (const session of cwdSessions) {
      const sessionNodeId = `session-${session.id}`;

      const sessionNode: Node<SessionNodeData> = {
        id: sessionNodeId,
        type: 'session',
        position: { x: 0, y: 0 }, // Will be calculated by dagre
        data: {
          label: getSessionTitle(session),
          state: session.state,
          projectHash: session.projectHash,
          gitBranch: session.gitBranch,
          tmuxTarget: session.tmuxTarget,
          subagentCount: session.subagents.length,
          nodeCount: session.nodes.length,
          sessionId: session.id,
          lastCommand: session.lastUserPrompt && session.lastUserPrompt !== session.firstUserPrompt
            ? (session.lastUserPrompt.length > 50 ? session.lastUserPrompt.slice(0, 50) + '...' : session.lastUserPrompt)
            : undefined,
          hasClearPrefix: session.hasClearPrefix,
          lastActivity: session.lastActivity,
        },
      };
      nodes.push(sessionNode);

      // Create edge from directory to session
      edges.push({
        id: `e-${directoryNodeId}-${sessionNodeId}`,
        source: directoryNodeId,
        target: sessionNodeId,
        type: 'smoothstep',
        animated: session.state === 'active' || session.state === 'waiting',
        style: { stroke: '#93c5fd', strokeWidth: 2 },
      });
    }
  }

  // Apply dagre layout with LR (left-to-right) direction
  const layoutedNodes = applyDagreLayout(nodes, edges);

  return { nodes: layoutedNodes, edges };
}

/**
 * Apply dagre layout to position nodes hierarchically with LR direction
 * (directories on left, sessions on right)
 */
function applyDagreLayout(
  nodes: Node<DirectoryGraphNodeData>[],
  edges: Edge[]
): Node<DirectoryGraphNodeData>[] {
  if (nodes.length === 0) return nodes;

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Set graph options for horizontal layout
  dagreGraph.setGraph({
    rankdir: 'LR',      // Left to right
    nodesep: 100,       // Vertical space between nodes on same rank
    ranksep: 150,       // Horizontal space between ranks (directory → session)
    marginx: 20,
    marginy: 20,
  });

  // Add nodes to dagre graph
  nodes.forEach((node) => {
    const dimensions = NODE_DIMENSIONS[node.type as keyof typeof NODE_DIMENSIONS] ||
                       NODE_DIMENSIONS.session;
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

  // Apply positions to nodes
  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const dimensions = NODE_DIMENSIONS[node.type as keyof typeof NODE_DIMENSIONS] ||
                       NODE_DIMENSIONS.session;

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - dimensions.width / 2,
        y: nodeWithPosition.y - dimensions.height / 2,
      },
    };
  });
}
