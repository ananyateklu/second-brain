export interface LinkType {
  id: string;
  label: string;
  color: string;
  style: 'solid' | 'dashed' | 'dotted';
}

export const DEFAULT_LINK_TYPES: LinkType[] = [
  { id: 'related', label: 'Related', color: '#4CAF50', style: 'solid' },
  { id: 'supports', label: 'Supports', color: '#2196F3', style: 'solid' },
  { id: 'contradicts', label: 'Contradicts', color: '#F44336', style: 'dashed' },
  { id: 'references', label: 'References', color: '#9C27B0', style: 'dotted' },
  { id: 'task', label: 'Task', color: '#FF9800', style: 'dashed' },
];

export interface StoredNodePosition {
  id: string;
  x: number;
  y: number;
}

export interface GraphPositions {
  positions: StoredNodePosition[];
  updatedAt: string;
}