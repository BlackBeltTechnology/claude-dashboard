import { create } from 'zustand';
import type {
  Session,
  WSMessage,
  SnapshotPayload,
  SessionUpdatePayload,
  SubagentUpdatePayload,
  StateChangePayload,
  AnyNode,
  NodeType,
  ToolGroup,
} from 'shared';

export type FilterType = 'all' | 'session' | 'subagent' | 'tool' | 'skill';
export type ViewMode = 'tree' | 'graph' | 'directory';
export type NavigationView = 'directory' | 'session-timeline';

function loadViewMode(): ViewMode {
  try {
    const stored = localStorage.getItem('claude-dashboard-view-mode');
    if (stored === 'tree' || stored === 'graph' || stored === 'directory') return stored;
  } catch {
    // localStorage unavailable
  }
  return 'directory';
}

interface SessionStore {
  sessions: Session[];
  selectedSessionId: string | null;
  viewMode: ViewMode;

  // Navigation state
  navigationView: NavigationView;
  treePanelOpen: boolean;
  focusedNodeId: string | null;
  jumpToEndTrigger: number;
  followPipelineEnd: boolean;
  currentDirectoryCwd: string | null;

  // Filter / search state
  filter: FilterType;
  searchTerm: string;

  // Tool group expansion state
  expandedGroups: Set<string>;

  // Subagent expansion state
  expandedSubagents: Set<string>;

  // Subagent box expansion state (per session)
  expandedSubagentBoxes: Map<string, Set<string>>;

  // Hidden working directories state
  hiddenCwds: Set<string>;

  // Directory overview expansion state (cwd values)
  expandedDirectories: Set<string>;

  // Session status visibility toggles
  showActive: boolean;
  showArchived: boolean;

  // Node type visibility filters (for session timeline graph)
  hiddenNodeTypes: Set<string>;

  // Node type content filters (for filtering within visible categories)
  nodeTypeFilters: Map<string, string>;

  // Group drill-down state
  selectedGroupId: string | null;
  selectedGroupData: ToolGroup | null;

  // Individual node inspection state (can be AnyNode or full Session object)
  selectedNodeData: AnyNode | Session | null;

  // Actions
  setSelectedSession: (id: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  updateSession: (session: Session) => void;
  handleWebSocketMessage: (message: WSMessage) => void;
  setFilter: (filter: FilterType) => void;
  setSearchTerm: (term: string) => void;
  toggleGroupExpansion: (groupId: string) => void;
  toggleSubagentExpansion: (subagentId: string) => void;
  toggleSubagentBox: (sessionId: string, subagentId: string) => void;
  expandAllSubagentBoxes: (sessionId: string, subagentIds: string[]) => void;
  collapseAllSubagentBoxes: (sessionId: string) => void;
  isSubagentBoxExpanded: (sessionId: string, subagentId: string) => boolean;
  hideSessionsByCwd: (cwd: string) => void;
  unhideAllCwds: () => void;
  toggleDirectoryExpansion: (cwd: string) => void;
  expandAllDirectories: () => void;
  collapseAllDirectories: () => void;
  setShowActive: (show: boolean) => void;
  setShowArchived: (show: boolean) => void;
  toggleNodeTypeVisibility: (nodeType: string) => void;
  setNodeTypeFilter: (category: string, filter: string) => void;
  clearNodeTypeFilter: (category: string) => void;
  clearAllNodeTypeFilters: () => void;
  setSelectedGroupId: (groupId: string | null) => void;
  setSelectedGroupData: (data: ToolGroup | null) => void;
  setSelectedNodeData: (data: AnyNode | Session | null) => void;

  // Navigation actions
  enterSession: (sessionId: string, cwd: string) => void;
  exitToDirectory: () => void;
  toggleTreePanel: () => void;
  setFocusedNode: (nodeId: string | null) => void;
  jumpToEnd: () => void;
  setFollowPipelineEnd: (enabled: boolean) => void;

  // Selectors
  getFilteredSessions: () => Session[];

  // Internal helpers
  setSessions: (sessions: Session[]) => void;
  updateSubagent: (parentSessionId: string, agentId: string, subagent: Session) => void;
  updateSessionState: (
    sessionId: string,
    newState: Session['state'],
    agentId?: string
  ) => void;
}

/** Check whether an AnyNode matches the active filter type. */
function nodeMatchesFilter(node: AnyNode, filter: FilterType): boolean {
  if (filter === 'all') return true;
  // Map FilterType to NodeType(s)
  const mapping: Record<Exclude<FilterType, 'all'>, NodeType[]> = {
    session: ['session'],
    subagent: ['subagent'],
    tool: ['tool'],
    skill: ['skill'],
  };
  return mapping[filter].includes(node.type);
}

/** Check whether text in a node matches the search term (case-insensitive). */
function nodeMatchesSearch(node: AnyNode, term: string): boolean {
  if (!term) return true;
  const lower = term.toLowerCase();

  // Search across the most useful text fields depending on node type
  switch (node.type) {
    case 'session':
      return (
        (node.summary?.toLowerCase().includes(lower) ?? false) ||
        node.sessionId.toLowerCase().includes(lower) ||
        (node.gitBranch?.toLowerCase().includes(lower) ?? false)
      );
    case 'message':
      return (
        node.content.toLowerCase().includes(lower) ||
        node.role.toLowerCase().includes(lower) ||
        (node.toolUses?.some((tu) => tu.name.toLowerCase().includes(lower)) ?? false)
      );
    case 'skill':
      return (
        node.skillName.toLowerCase().includes(lower) ||
        (node.args?.toLowerCase().includes(lower) ?? false)
      );
    case 'subagent':
      return (
        node.agentType.toLowerCase().includes(lower) ||
        node.agentId.toLowerCase().includes(lower) ||
        (node.description?.toLowerCase().includes(lower) ?? false)
      );
    case 'tool':
      return (
        node.toolName.toLowerCase().includes(lower) ||
        (node.output?.toLowerCase().includes(lower) ?? false)
      );
    default:
      return false;
  }
}

/** Check whether a Session (root or subagent) matches the search term. */
function sessionMatchesSearch(session: Session, term: string): boolean {
  if (!term) return true;
  const lower = term.toLowerCase();
  return (
    (session.summary?.toLowerCase().includes(lower) ?? false) ||
    session.id.toLowerCase().includes(lower) ||
    (session.gitBranch?.toLowerCase().includes(lower) ?? false)
  );
}

/**
 * Filter a session's nodes and subagents based on filter type and search term.
 * Returns a new Session with only the matching nodes/subagents,
 * or null if nothing matches (session itself + children).
 */
function filterSession(
  session: Session,
  filter: FilterType,
  searchTerm: string
): Session | null {
  // If filter is 'all' and no search term, return as-is
  if (filter === 'all' && !searchTerm) return session;

  // Filter child nodes
  const filteredNodes = session.nodes.filter(
    (node) => nodeMatchesFilter(node, filter) && nodeMatchesSearch(node, searchTerm)
  );

  // Recursively filter subagents
  const filteredSubagents: Session[] = [];
  for (const sub of session.subagents) {
    const filtered = filterSession(sub, filter, searchTerm);
    if (filtered) {
      filteredSubagents.push(filtered);
    }
  }

  // Session itself matches if it passes search (for 'all' or 'session' filter)
  const sessionSelfMatches =
    (filter === 'all' || filter === 'session') &&
    sessionMatchesSearch(session, searchTerm);

  // Include session if it matches or has matching children
  if (sessionSelfMatches || filteredNodes.length > 0 || filteredSubagents.length > 0) {
    return {
      ...session,
      nodes: filteredNodes,
      subagents: filteredSubagents,
    };
  }

  return null;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessions: [],
  selectedSessionId: null,
  viewMode: loadViewMode(),
  navigationView: 'directory',
  treePanelOpen: false,
  focusedNodeId: null,
  jumpToEndTrigger: 0,
  followPipelineEnd: false,
  currentDirectoryCwd: null,
  filter: 'all',
  searchTerm: '',
  expandedGroups: new Set<string>(),
  expandedSubagents: new Set<string>(),
  expandedSubagentBoxes: new Map<string, Set<string>>(),
  hiddenCwds: new Set<string>(),
  expandedDirectories: new Set<string>(),
  showActive: true,
  showArchived: true,
  hiddenNodeTypes: new Set<string>(),
  nodeTypeFilters: new Map<string, string>(),
  selectedGroupId: null,
  selectedGroupData: null,
  selectedNodeData: null,

  setFilter: (filter) => {
    set({ filter });
  },

  setSearchTerm: (searchTerm) => {
    set({ searchTerm });
  },

  toggleGroupExpansion: (groupId: string) => {
    set((state) => {
      const newSet = new Set(state.expandedGroups);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return { expandedGroups: newSet };
    });
  },

  toggleSubagentExpansion: (subagentId: string) => {
    set((state) => {
      const newSet = new Set(state.expandedSubagents);
      if (newSet.has(subagentId)) {
        newSet.delete(subagentId);
      } else {
        newSet.add(subagentId);
      }
      return { expandedSubagents: newSet };
    });
  },

  toggleSubagentBox: (sessionId: string, subagentId: string) => {
    set((state) => {
      const newMap = new Map(state.expandedSubagentBoxes);
      const sessionBoxes = newMap.get(sessionId) || new Set<string>();
      const newSet = new Set(sessionBoxes);

      if (newSet.has(subagentId)) {
        newSet.delete(subagentId);
      } else {
        newSet.add(subagentId);
      }

      newMap.set(sessionId, newSet);
      return { expandedSubagentBoxes: newMap };
    });
  },

  expandAllSubagentBoxes: (sessionId: string, subagentIds: string[]) => {
    set((state) => {
      const newMap = new Map(state.expandedSubagentBoxes);
      newMap.set(sessionId, new Set(subagentIds));
      return { expandedSubagentBoxes: newMap };
    });
  },

  collapseAllSubagentBoxes: (sessionId: string) => {
    set((state) => {
      const newMap = new Map(state.expandedSubagentBoxes);
      newMap.set(sessionId, new Set<string>());
      return { expandedSubagentBoxes: newMap };
    });
  },

  isSubagentBoxExpanded: (sessionId: string, subagentId: string) => {
    const state = get();
    const sessionBoxes = state.expandedSubagentBoxes.get(sessionId);
    return sessionBoxes?.has(subagentId) ?? false;
  },

  hideSessionsByCwd: (cwd: string) => {
    set((state) => {
      const newSet = new Set(state.hiddenCwds);
      newSet.add(cwd);
      return { hiddenCwds: newSet };
    });
  },

  unhideAllCwds: () => {
    set({ hiddenCwds: new Set<string>() });
  },

  toggleDirectoryExpansion: (cwd: string) => {
    set((state) => {
      const next = new Set(state.expandedDirectories);
      if (next.has(cwd)) {
        next.delete(cwd);
      } else {
        next.add(cwd);
      }
      return { expandedDirectories: next };
    });
  },

  expandAllDirectories: () => {
    const { sessions } = get();
    const allCwds = new Set<string>();
    for (const session of sessions) {
      allCwds.add(session.cwd || '__no_cwd__');
    }
    set({ expandedDirectories: allCwds });
  },

  collapseAllDirectories: () => {
    set({ expandedDirectories: new Set<string>() });
  },

  setShowActive: (show) => {
    set({ showActive: show });
  },

  setShowArchived: (show) => {
    set({ showArchived: show });
  },

  toggleNodeTypeVisibility: (nodeType) => {
    set((state) => {
      const newSet = new Set(state.hiddenNodeTypes);
      if (newSet.has(nodeType)) {
        newSet.delete(nodeType);
      } else {
        newSet.add(nodeType);
      }
      return { hiddenNodeTypes: newSet };
    });
  },

  setNodeTypeFilter: (category, filter) => {
    set((state) => {
      const newMap = new Map(state.nodeTypeFilters);
      if (filter === '') {
        newMap.delete(category);
      } else {
        newMap.set(category, filter);
      }
      return { nodeTypeFilters: newMap };
    });
  },

  clearNodeTypeFilter: (category) => {
    set((state) => {
      const newMap = new Map(state.nodeTypeFilters);
      newMap.delete(category);
      return { nodeTypeFilters: newMap };
    });
  },

  clearAllNodeTypeFilters: () => {
    set({ nodeTypeFilters: new Map<string, string>() });
  },

  setSelectedGroupId: (groupId) => set({ selectedGroupId: groupId, ...(groupId === null ? { selectedGroupData: null, selectedNodeData: null } : {}) }),

  setSelectedGroupData: (data) => set({ selectedGroupData: data }),

  setSelectedNodeData: (data) => set({
    selectedNodeData: data,
    selectedGroupId: data ? `node-detail-${data.id}` : null,
    selectedGroupData: null,
  }),

  enterSession: (sessionId: string, cwd: string) => {
    set({
      navigationView: 'session-timeline',
      selectedSessionId: sessionId,
      currentDirectoryCwd: cwd,
      viewMode: 'graph',
      treePanelOpen: false,
      focusedNodeId: null,
    });
  },

  exitToDirectory: () => {
    set({
      navigationView: 'directory',
      selectedSessionId: null,
      currentDirectoryCwd: null,
      treePanelOpen: false,
      focusedNodeId: null,
      viewMode: 'directory',
      selectedNodeData: null,
      selectedGroupId: null,
    });
  },

  toggleTreePanel: () => {
    set((state) => ({ treePanelOpen: !state.treePanelOpen }));
  },

  setFocusedNode: (nodeId: string | null) => {
    set({ focusedNodeId: nodeId });
  },

  jumpToEnd: () => {
    set((state) => ({ jumpToEndTrigger: state.jumpToEndTrigger + 1 }));
  },

  setFollowPipelineEnd: (enabled: boolean) => {
    set({ followPipelineEnd: enabled });
  },

  getFilteredSessions: () => {
    const { sessions, filter, searchTerm, hiddenCwds, showActive, showArchived } = get();

    // Filter by session status visibility toggles
    // 'active' (running/green) and 'waiting' (yellow) map to the Active toggle
    // 'idle' and 'completed' map to the Archived toggle
    let result: Session[] = sessions.filter((s) => {
      if (s.state === 'active' || s.state === 'waiting') return showActive;
      if (s.state === 'idle' || s.state === 'completed') return showArchived;
      return true;
    });
    if (filter !== 'all' || searchTerm) {
      result = [];
      for (const session of sessions) {
        const filtered = filterSession(session, filter, searchTerm);
        if (filtered) {
          result.push(filtered);
        }
      }
    }

    // Then filter out sessions from hidden working directories
    if (hiddenCwds.size > 0) {
      result = result.filter((session) => {
        const cwd = session.cwd || '__no_cwd__';
        return !hiddenCwds.has(cwd);
      });
    }

    return result;
  },

  setViewMode: (viewMode) => {
    set({ viewMode });
    try {
      localStorage.setItem('claude-dashboard-view-mode', viewMode);
    } catch {
      // localStorage unavailable
    }
  },

  setSelectedSession: (id) => {
    set({ selectedSessionId: id });
  },

  setSessions: (sessions) => {
    set((state) => {
      let expandedDirectories = state.expandedDirectories;

      // First data load: expand all directories by default for discoverability
      if (state.sessions.length === 0 && state.expandedDirectories.size === 0 && sessions.length > 0) {
        expandedDirectories = new Set<string>();
        for (const session of sessions) {
          expandedDirectories.add(session.cwd || '__no_cwd__');
        }
      }

      // Auto-navigate to directory view if the currently selected session has disappeared
      if (
        state.navigationView === 'session-timeline' &&
        state.selectedSessionId &&
        !sessions.find((s) => s.id === state.selectedSessionId)
      ) {
        // Session has disappeared from the snapshot - reset navigation
        return {
          sessions,
          expandedDirectories,
          navigationView: 'directory',
          selectedSessionId: null,
          currentDirectoryCwd: null,
          treePanelOpen: false,
          focusedNodeId: null,
          viewMode: 'directory',
          selectedNodeData: null,
          selectedGroupId: null,
        };
      }

      return { sessions, expandedDirectories };
    });
  },

  updateSession: (session) => {
    set((state) => {
      const cwd = session.cwd || '__no_cwd__';
      const expandedDirectories = new Set(state.expandedDirectories);
      // Auto-expand brand new directories so newly created sessions are visible
      expandedDirectories.add(cwd);

      const index = state.sessions.findIndex((s) => s.id === session.id);
      if (index === -1) {
        // New session, add to list
        return { sessions: [...state.sessions, session], expandedDirectories };
      }
      // Update existing session
      const newSessions = [...state.sessions];
      newSessions[index] = session;
      return { sessions: newSessions, expandedDirectories };
    });
  },

  updateSubagent: (parentSessionId, agentId, subagent) => {
    set((state) => {
      const newSessions = state.sessions.map((session) => {
        if (session.id !== parentSessionId) return session;

        const subagentIndex = session.subagents.findIndex(
          (sa) => sa.id === agentId
        );

        if (subagentIndex === -1) {
          // New subagent
          return {
            ...session,
            subagents: [...session.subagents, subagent],
          };
        }

        // Update existing subagent
        const newSubagents = [...session.subagents];
        newSubagents[subagentIndex] = subagent;
        return { ...session, subagents: newSubagents };
      });

      return { sessions: newSessions };
    });
  },

  updateSessionState: (sessionId, newState, agentId) => {
    set((state) => {
      const newSessions = state.sessions.map((session) => {
        if (session.id !== sessionId) return session;

        if (agentId) {
          // Update subagent state
          const newSubagents = session.subagents.map((sa) =>
            sa.id === agentId ? { ...sa, state: newState } : sa
          );
          return { ...session, subagents: newSubagents };
        }

        // Update session state
        return { ...session, state: newState };
      });

      return { sessions: newSessions };
    });
  },

  handleWebSocketMessage: (message) => {
    const { type, payload } = message;

    switch (type) {
      case 'snapshot': {
        const { sessions } = payload as SnapshotPayload;
        get().setSessions(sessions);
        break;
      }

      case 'session-update': {
        const { session } = payload as SessionUpdatePayload;
        get().updateSession(session);
        break;
      }

      case 'subagent-update': {
        const { parentSessionId, agentId, subagent } =
          payload as SubagentUpdatePayload;
        get().updateSubagent(parentSessionId, agentId, subagent);
        break;
      }

      case 'state-change': {
        const { sessionId, agentId, newState } = payload as StateChangePayload;
        get().updateSessionState(sessionId, newState, agentId);
        break;
      }

      case 'error': {
        console.error('[SessionStore] Server error:', payload);
        break;
      }

      default:
        console.warn('[SessionStore] Unknown message type:', type);
    }
  },
}));

// Convenience selector hook for checking if a group is expanded
export const useIsGroupExpanded = (groupId: string) =>
  useSessionStore((state) => state.expandedGroups.has(groupId));

// Convenience selector hook for checking if a subagent is expanded
export const useIsSubagentExpanded = (subagentId: string) =>
  useSessionStore((state) => state.expandedSubagents.has(subagentId));

// Convenience selector hook for checking if a subagent box is expanded
export const useIsSubagentBoxExpanded = (sessionId: string, subagentId: string) =>
  useSessionStore((state) => {
    const sessionBoxes = state.expandedSubagentBoxes.get(sessionId);
    return sessionBoxes?.has(subagentId) ?? false;
  });

// Convenience selector hook for accessing the selected group ID
export const useSelectedGroupId = () =>
  useSessionStore((state) => state.selectedGroupId);
