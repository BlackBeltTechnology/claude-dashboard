import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { ToolNode, ToolGroup, Session, SkillNode, SubagentNode, AnyNode } from 'shared';
import { useSessionStore } from '../store/sessionStore';
import { groupConsecutiveToolCalls } from '../utils/groupingUtils';
import { useClickOutside } from '../hooks/useClickOutside';
import { ToolDetailFormatter, SkillDetailFormatter, SubagentDetailFormatter } from '../utils/toolFormatters';
import { NodeDetail } from './NodeDetail';
import type { TreeNodeData } from './TreeNode';

/**
 * GroupDrillDownPanel displays a side panel with master-detail view of a tool group.
 * Shows list of individual tool calls, and clicking one shows its input/output details.
 */
export function GroupDrillDownPanel() {
  const selectedGroupId = useSessionStore((state) => state.selectedGroupId);
  const setSelectedGroupId = useSessionStore((state) => state.setSelectedGroupId);
  const selectedGroupData = useSessionStore((state) => state.selectedGroupData);
  const setSelectedGroupData = useSessionStore((state) => state.setSelectedGroupData);
  const selectedNodeData = useSessionStore((state) => state.selectedNodeData);
  const setSelectedNodeData = useSessionStore((state) => state.setSelectedNodeData);
  const sessions = useSessionStore((state) => state.sessions);

  const [selectedToolIndex, setSelectedToolIndex] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close handler wrapped in useCallback to prevent stale closures
  const handleClose = useCallback(() => {
    setSelectedGroupId(null);
    setSelectedGroupData(null);
    setSelectedNodeData(null);
    setSelectedToolIndex(null);
  }, [setSelectedGroupId, setSelectedGroupData, setSelectedNodeData]);

  // Click outside to close
  useClickOutside(panelRef, handleClose);

  // Escape key to close
  useEffect(() => {
    if (!selectedGroupId) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedGroupId, handleClose]);

  // Find the ToolGroup matching selectedGroupId
  const findToolGroup = (): ToolGroup | null => {
    if (!selectedGroupId) return null;

    // If selectedGroupData exists, return it directly
    if (selectedGroupData && selectedGroupData.id === selectedGroupId) {
      return selectedGroupData;
    }

    const searchSession = (session: Session): ToolGroup | null => {
      // Filter out message nodes and group tool calls
      const nonMessageNodes = session.nodes.filter((node) => node.type !== 'message');
      const grouped = groupConsecutiveToolCalls(nonMessageNodes);

      // Find the matching group
      for (const item of grouped) {
        if (item.type === 'tool-group' && item.id === selectedGroupId) {
          return item;
        }
      }

      // Recursively search subagents
      for (const subagent of session.subagents) {
        const found = searchSession(subagent);
        if (found) return found;
      }

      return null;
    };

    for (const session of sessions) {
      const found = searchSession(session);
      if (found) return found;
    }

    return null;
  };

  const toolGroup = findToolGroup();

  // If selectedNodeData exists and no toolGroup was found, render individual node detail panel
  if (selectedNodeData && !toolGroup) {
    // Determine header title based on node type
    let headerTitle = 'Node Details';
    if ('type' in selectedNodeData) {
      const nodeType = (selectedNodeData as any).type;
      if (nodeType === 'tool-group') {
        // ToolGroup type (not in AnyNode union)
        headerTitle = `${(selectedNodeData as any).toolName} (${(selectedNodeData as any).count} calls)`;
      } else {
        switch (nodeType) {
          case 'session':
            headerTitle = `Session: ${(selectedNodeData as any).summary || (selectedNodeData as any).sessionId}`;
            break;
          case 'message':
            headerTitle = `Message`;
            break;
          case 'skill':
            headerTitle = `Skill: ${(selectedNodeData as SkillNode).skillName}`;
            break;
          case 'subagent':
            headerTitle = `Subagent: ${(selectedNodeData as any).agentName || (selectedNodeData as SubagentNode).agentType}`;
            break;
          case 'tool':
            headerTitle = `Tool: ${(selectedNodeData as ToolNode).toolName}`;
            break;
        }
      }
    } else {
      // Session object (no 'type' property)
      headerTitle = `Session: ${(selectedNodeData as any).summary || (selectedNodeData as any).id}`;
    }

    return (
      <>
        {/* Backdrop overlay */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9998,
          }}
        />

        {/* Side panel */}
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '400px',
            backgroundColor: '#16213e',
            zIndex: 9999,
            boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.3)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px',
              borderBottom: '1px solid #0f3460',
              flexShrink: 0,
            }}
          >
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#fff' }}>
              {headerTitle}
            </h3>
            <button
              onClick={handleClose}
              style={{
                background: 'none',
                border: '1px solid #0f3460',
                borderRadius: '4px',
                color: '#888',
                cursor: 'pointer',
                padding: '4px 8px',
                fontSize: '14px',
              }}
            >
              X
            </button>
          </div>

          {/* Detail view using NodeDetail component */}
          <NodeDetail node={selectedNodeData as TreeNodeData} />
        </div>
      </>
    );
  }

  // If no group selected or not found, render nothing
  if (!selectedGroupId || !toolGroup) return null;

  const toolName = toolGroup.toolName;
  const count = toolGroup.count;
  const nodes = toolGroup.nodes;

  const selectedToolNode = selectedToolIndex !== null ? nodes[selectedToolIndex] : null;

  // Format timestamp for display
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Status dot color based on node state
  const getStatusColor = (state: ToolNode['state']) => {
    switch (state) {
      case 'active':
        return '#3b82f6'; // blue
      case 'completed':
        return '#10b981'; // green
      default:
        return '#6b7280';
    }
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998,
        }}
      />

      {/* Side panel */}
      <div
        ref={panelRef}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '400px',
          backgroundColor: '#16213e',
          zIndex: 9999,
          boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.3)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px',
            borderBottom: '1px solid #0f3460',
            flexShrink: 0,
          }}
        >
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#fff' }}>
            {toolName} ({count} {count === 1 ? 'call' : 'calls'})
          </h3>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: '1px solid #0f3460',
              borderRadius: '4px',
              color: '#888',
              cursor: 'pointer',
              padding: '4px 8px',
              fontSize: '14px',
            }}
          >
            X
          </button>
        </div>

        {/* Master list: tool calls */}
        {selectedToolIndex === null && (
          <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
            {nodes.map((toolNode, index) => {
              // Generate preview text based on tool type
              let previewText = '';
              if (toolNode.toolName === 'Bash' && toolNode.input.command) {
                const cmd = String(toolNode.input.command);
                previewText = cmd.length > 40 ? cmd.substring(0, 40) + '...' : cmd;
              } else if ((toolNode.toolName === 'Read' || toolNode.toolName === 'Write') && toolNode.input.file_path) {
                const path = String(toolNode.input.file_path);
                previewText = path.length > 40 ? '...' + path.substring(path.length - 37) : path;
              }

              return (
                <div
                  key={toolNode.id}
                  onClick={() => setSelectedToolIndex(index)}
                  style={{
                    padding: '12px',
                    marginBottom: '8px',
                    backgroundColor: '#1a1a2e',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    border: '1px solid transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, color: '#93c5fd', minWidth: '30px' }}>
                      #{index + 1}
                    </span>
                    <span style={{ flex: 1, color: '#e2e8f0' }}>{toolNode.toolName}</span>
                    {toolNode.hooks && toolNode.hooks.length > 0 && (
                      <span style={{ fontSize: '10px', color: '#fbbf24' }}>
                        🪝 {toolNode.hooks.length}
                      </span>
                    )}
                    <span style={{ fontSize: '12px', color: '#888' }}>
                      {formatTimestamp(toolNode.timestamp)}
                    </span>
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: getStatusColor(toolNode.state),
                      }}
                      title={toolNode.state}
                    />
                  </div>
                  {previewText && (
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#6b7280',
                        fontFamily: 'monospace',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '100%',
                        paddingLeft: '38px',
                      }}
                    >
                      {previewText}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Detail view: individual call details */}
        {selectedToolIndex !== null && selectedToolNode && (
          <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
            {/* Detail header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#fff' }}>
                Call #{selectedToolIndex + 1} Details
              </h4>
              <button
                onClick={() => setSelectedToolIndex(null)}
                style={{
                  background: 'none',
                  border: '1px solid #0f3460',
                  borderRadius: '4px',
                  color: '#888',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  fontSize: '14px',
                }}
              >
                Back to list
              </button>
            </div>

            {/* Tool details with formatted input/output */}
            <ToolDetailFormatter toolNode={selectedToolNode} />
          </div>
        )}
      </div>
    </>
  );
}
