import React, { useMemo, useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type NodeTypes,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { DirectoryNode } from './nodes/DirectoryNode';
import { SessionNode, type SessionNodeData } from './nodes/SessionNode';
import { useSessionStore } from '../store/sessionStore';
import { createDirectoryOverviewGraph } from '../utils/directoryGraphLayout';

const nodeTypes: NodeTypes = {
  directory: DirectoryNode,
  session: SessionNode,
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
  style: { stroke: '#93c5fd', strokeWidth: 2 },
};

const proOptions = { hideAttribution: true };

export function DirectoryOverview() {
  const allSessions = useSessionStore((state) => state.sessions);
  const getFilteredSessions = useSessionStore((state) => state.getFilteredSessions);
  const filter = useSessionStore((state) => state.filter);
  const searchTerm = useSessionStore((state) => state.searchTerm);
  const hiddenCwds = useSessionStore((state) => state.hiddenCwds);
  const showActive = useSessionStore((state) => state.showActive);
  const showArchived = useSessionStore((state) => state.showArchived);
  const expandedGroups = useSessionStore((state) => state.expandedGroups);
  const enterSession = useSessionStore((state) => state.enterSession);

  // Live ticking for timestamp updates
  const [tickCounter, setTickCounter] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTickCounter(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);
  const setSelectedNodeData = useSessionStore((state) => state.setSelectedNodeData);

  // Directory overview uses same filter logic as sidebar
  const sessions = useMemo(
    () => getFilteredSessions(),
    [getFilteredSessions, allSessions, filter, searchTerm, hiddenCwds, showActive, showArchived]
  );

  // Compute directory graph layout from session data
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => createDirectoryOverviewGraph(sessions, expandedGroups),
    [sessions, expandedGroups, tickCounter]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  // Update nodes/edges when session data changes
  React.useEffect(() => {
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [layoutedNodes, layoutedEdges, setNodes, setEdges]);

  // Handle session node clicks to navigate to session view
  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type === 'session') {
      const data = node.data as SessionNodeData;
      if (data.sessionId) {
        const session = allSessions.find(s => s.id === data.sessionId);
        if (session) {
          enterSession(data.sessionId, session.cwd || '');
        }
      }
    } else if (node.type === 'directory') {
      // Directory nodes show directory metadata
      const data = node.data;
      const directoryInfo = {
        id: data.cwd || data.label,
        type: 'directory',
        label: data.label,
        sessionCount: data.sessionCount,
        cwd: data.cwd,
      };
      setSelectedNodeData(directoryInfo as any);
    }
  }, [allSessions, enterSession, setSelectedNodeData]);

  if (sessions.length === 0) {
    return (
      <div style={styles.empty}>
        <p>No sessions available. Connect to the server to see directory overview.</p>
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
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        proOptions={proOptions}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
      >
        <Controls
          position="bottom-right"
          style={{ backgroundColor: '#16213e', border: '1px solid #0f3460' }}
        />
        <MiniMap
          position="bottom-left"
          style={miniMapStyle}
          nodeColor={(node: Node) => {
            switch (node.type) {
              case 'directory':
                return '#93c5fd';  // Distinct color for directory nodes
              case 'session':
                return '#e94560';
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
