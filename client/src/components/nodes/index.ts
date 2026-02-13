import { memo, createElement } from 'react';
import { Handle, Position } from '@xyflow/react';

export { SessionNode, type SessionNodeData, type SessionNodeType } from './SessionNode';
export { SubagentNode, type SubagentNodeData, type SubagentNodeType } from './SubagentNode';
export { SubagentBoxNode, type SubagentBoxNodeType } from './SubagentBoxNode';
export { ToolNode, type ToolNodeData, type ToolNodeType } from './ToolNode';
export { ToolGroupNode, type ToolGroupNodeData, type ToolGroupNodeType } from './ToolGroupNode';
export { SkillNode, type SkillNodeData, type SkillNodeType } from './SkillNode';
export { DirectoryNode, type DirectoryNodeData, type DirectoryNodeType } from './DirectoryNode';
export { UserPromptNode, type UserPromptNodeData, type UserPromptNodeType } from './UserPromptNode';
export { ClearMarkerNode, type ClearMarkerNodeData, type ClearMarkerNodeType } from './ClearMarkerNode';
export { RequestNode, type RequestNodeData, type RequestNodeType } from './RequestNode';
export { ResponseNode, type ResponseNodeData, type ResponseNodeType } from './ResponseNode';
export { ModelOutputNode, type ModelOutputNodeData, type ModelOutputNodeType } from './ModelOutputNode';

// Join node: invisible convergence point for fork-join pattern.
// Must render Handle components so React Flow can compute edge positions;
// without handles, getEdgePosition() returns null and all connected edges
// are silently dropped.
const joinHandleStyle = { opacity: 0, width: 1, height: 1 } as const;

const JoinNodeComponent = () =>
  createElement('div', { style: { width: 1, height: 1 } },
    createElement(Handle, { type: 'target', position: Position.Left, style: joinHandleStyle }),
    createElement(Handle, { type: 'source', position: Position.Right, style: joinHandleStyle }),
  );

export const JoinNode = memo(JoinNodeComponent);
