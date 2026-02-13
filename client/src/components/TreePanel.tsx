import React from 'react';
import { TreeView } from './TreeView';

interface TreePanelProps {
  isOpen: boolean;
}

const styles = {
  panel: {
    position: 'absolute' as const,
    left: 0,
    top: 0,
    height: '100%',
    width: '280px',
    backgroundColor: '#16213e',
    borderRight: '1px solid #0f3460',
    zIndex: 10,
    overflowY: 'auto' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    transition: 'transform 250ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

export function TreePanel({ isOpen }: TreePanelProps) {
  const transform = isOpen ? 'translateX(0)' : 'translateX(-100%)';

  return (
    <div
      style={{
        ...styles.panel,
        transform,
      }}
    >
      <TreeView />
    </div>
  );
}
