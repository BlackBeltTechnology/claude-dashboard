import React, { useMemo, useCallback } from 'react';
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
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { SessionNode } from './nodes/SessionNode';
import { SubagentNode } from './nodes/SubagentNode';
import { ToolNode } from './nodes/ToolNode';
import { SkillNode } from './nodes/SkillNode';
import { useSessionStore } from '../store/sessionStore';
import { createLayoutedGraph } from '../utils/graphLayout';

const nodeTypes: NodeTypes = {
  session: SessionNode,
  subagent: SubagentNode,
  tool: ToolNode,
  skill: SkillNode,
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

export function GraphView() {
  const sessions = useSessionStore((state) => state.sessions);
  const selectedSessionId = useSessionStore((state) => state.selectedSessionId);
  const setSelectedSession = useSessionStore((state) => state.setSelectedSession);

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
    () => createLayoutedGraph(displaySessions),
    [displaySessions]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  // Update nodes/edges when session data changes
  React.useEffect(() => {
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [layoutedNodes, layoutedEdges, setNodes, setEdges]);

  // Handle node click to select session
  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (node.type === 'session') {
        // Extract the session ID from the node ID
        setSelectedSession(node.id);
      }
    },
    [setSelectedSession]
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
              case 'subagent':
                return '#8b5cf6';
              case 'tool':
                return '#f59e0b';
              case 'skill':
                return '#06b6d4';
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
