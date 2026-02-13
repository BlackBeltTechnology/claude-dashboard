import type { AnyNode, ToolNode, ToolGroup } from 'shared';

/**
 * Groups only truly consecutive same-name tool calls.
 * [Bash, Bash, Read, Read] → ToolGroup(Bash,2), ToolGroup(Read,2)
 * [Bash, Read, Bash, Read] → Bash, Read, Bash, Read (no grouping - interleaved)
 * Non-tool nodes pass through unchanged and break tool runs.
 *
 * @param nodes - Array of nodes to process (may include non-tool nodes)
 * @returns Array with consecutive same-name tool nodes grouped
 */
export function groupConsecutiveToolCalls(nodes: AnyNode[]): (AnyNode | ToolGroup)[] {
  const result: (AnyNode | ToolGroup)[] = [];
  let i = 0;

  while (i < nodes.length) {
    const node = nodes[i];

    // Non-tool nodes pass through unchanged
    if (node.type !== 'tool') {
      result.push(node);
      i++;
      continue;
    }

    // Collect consecutive tool nodes with the SAME toolName
    const toolNode = node as ToolNode;
    const currentName = toolNode.toolName;
    const run: ToolNode[] = [toolNode];
    let j = i + 1;
    while (j < nodes.length && nodes[j].type === 'tool' && (nodes[j] as ToolNode).toolName === currentName) {
      run.push(nodes[j] as ToolNode);
      j++;
    }

    if (run.length === 1) {
      // Single tool call - no grouping needed
      result.push(run[0]);
    } else {
      // Multiple consecutive same-name tools - create group
      const firstNode = run[0];
      const group: ToolGroup = {
        id: `tool-group-${currentName}-${firstNode.id}`,
        type: 'tool-group',
        toolName: currentName,
        nodes: run,
        count: run.length,
        state: run.some(n => n.state === 'active') ? 'active' : firstNode.state,
        timestamp: firstNode.timestamp,
        parentId: firstNode.parentId,
      };
      result.push(group);
    }

    i = j;
  }

  return result;
}
