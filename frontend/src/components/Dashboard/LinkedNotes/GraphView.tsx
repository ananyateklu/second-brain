import { useCallback, useEffect, useMemo, useState, memo } from 'react';
import ReactFlow, {
  Node,
  Background,
  NodeProps,
  Handle,
  Position,
  useReactFlow,
  Panel,
  MarkerType,
  ConnectionMode,
  Edge,
  PanOnScrollMode,
  SelectionMode,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  NodeDragHandler
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { useTheme } from '../../../contexts/themeContextUtils';
import { useNotes } from '../../../contexts/notesContextUtils';
import clsx from 'clsx';
import { NoteCard } from '../NoteCard';
import { IdeaCard } from '../Ideas/IdeaCard';
import type { Note } from '../../../types/note';
import { GraphControls } from './GraphControls';
import { StoredNodePosition } from './types';
import { saveNodePositions, loadNodePositions, clearNodePositions } from './utils/graphStorage';

interface GraphViewProps {
  onNodeSelect: (noteId: string) => void;
  selectedNoteId: string | null;
}

type CustomNodeType = {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    note: Note;
    selected: boolean;
  };
  selected: boolean;
};

// Define edge type
type CustomEdge = Edge & {
  data?: {
    animated: boolean;
  };
};

// Memoize the CustomNode component to prevent unnecessary re-renders
const CustomNode = memo(({ data }: NodeProps) => {
  const { theme } = useTheme();

  const getBorderColor = useCallback(() => {
    if (data.selected) return theme === 'dark' ? '#64AB6F' : '#059669';
    return theme === 'dark' ? 'rgb(59, 130, 246)' : 'rgb(37, 99, 235)';
  }, [data.selected, theme]);

  const borderColor = getBorderColor();

  return (
    <div className="group">
      <Handle
        type="target"
        position={Position.Top}
        className={clsx(
          "!w-2 !h-2 !bg-transparent !border-2",
          "opacity-0 group-hover:opacity-100",
          "transition-opacity duration-300"
        )}
        style={{ borderColor, top: -8 }}
      />

      <div className={clsx(
        'transition-all duration-300',
        data.selected && 'ring-2 ring-[#64AB6F] dark:ring-[#059669] rounded-lg'
      )}>
        {data.note.isIdea ? (
          <IdeaCard
            idea={data.note}
            viewMode="mindMap"
            isSelected={data.selected}
          />
        ) : (
          <NoteCard
            note={data.note}
            viewMode="mindMap"
            isSelected={data.selected}
          />
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className={clsx(
          "!w-2 !h-2 !bg-transparent !border-2",
          "opacity-0 group-hover:opacity-100",
          "transition-opacity duration-300"
        )}
        style={{ borderColor, bottom: -8 }}
      />
    </div>
  );
});

CustomNode.displayName = 'CustomNode';

const nodeTypes = {
  custom: CustomNode,
};

// Update edge preparation with proper typing
const prepareEdges = (notes: Note[]): CustomEdge[] => {
  const processedPairs = new Set<string>();

  // Process note-to-note links
  const noteToNoteEdges = notes.flatMap(note =>
    (note.linkedNoteIds || [])
      .filter(targetId => {
        const pairId = [note.id, targetId].sort().join('-');
        if (processedPairs.has(pairId)) return false;
        processedPairs.add(pairId);
        return notes.some(n => n.id === targetId);
      })
      .map(targetId => ({
        id: `${note.id}-${targetId}`,
        source: note.id,
        target: targetId,
        type: 'default',
        animated: false,
        style: {
          strokeWidth: 1.5,
          stroke: 'var(--color-border)',
          strokeLinecap: "round" as const,
          strokeLinejoin: "round" as const
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 15,
          height: 15
        }
      } as CustomEdge))
  );

  return noteToNoteEdges.reduce<CustomEdge[]>((acc, edge) => {
    const parallel = acc.find(e =>
      (e.source === edge.target && e.target === edge.source) ||
      (e.source === edge.source && e.target === edge.target)
    );

    if (parallel) {
      parallel.style = {
        ...parallel.style,
        strokeWidth: 2
      };
      return acc;
    }

    return [...acc, edge];
  }, []);
};

// Optimize layout calculation with configurable parameters
const getDagreLayout = (nodes: CustomNodeType[], edges: CustomEdge[], savedPositions: StoredNodePosition[] = []) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const LAYOUT_CONFIG = {
    rankdir: 'TB',
    ranksep: 80,  // Increased for better spacing
    nodesep: 40,  // Increased for better spacing
    edgesep: 25,
    marginx: 20,
    marginy: 20
  };

  dagreGraph.setGraph(LAYOUT_CONFIG);

  // Use actual node dimensions for more accurate layout
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 280, height: 120 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  // Create a map of saved positions for faster lookup
  const savedPositionsMap = new Map<string, StoredNodePosition>();
  savedPositions.forEach(pos => {
    savedPositionsMap.set(pos.id, pos);
  });

  return {
    nodes: nodes.map((node) => {
      // Check if we have a saved position for this node
      const savedPosition = savedPositionsMap.get(node.id);

      if (savedPosition) {
        // Use saved position if available
        node.position = {
          x: savedPosition.x,
          y: savedPosition.y,
        };
      } else {
        // Otherwise use the calculated dagre position
        const nodeWithPosition = dagreGraph.node(node.id);
        node.position = {
          x: nodeWithPosition.x - 140,
          y: nodeWithPosition.y - 60,
        };
      }
      return node;
    }),
    edges
  };
};

// Memoize the Legend component
const Legend = memo(({ theme }: { theme: string }) => (
  <div className={clsx(
    "bg-white/10 dark:bg-white/5",
    "border border-white/20 dark:border-white/10",
    "backdrop-blur-xl p-3 rounded-lg shadow-lg",
    "transition-all duration-300",
    "z-20 relative"
  )}>
    <div className="flex flex-row gap-4">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 border-2 rounded bg-white/10 dark:bg-white/5 transition-colors"
          style={{ borderColor: theme === 'dark' ? 'rgb(59, 130, 246)' : 'rgb(37, 99, 235)' }}>
        </div>
        <span className="text-xs text-[var(--color-text)]">Notes</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 border-2 rounded bg-white/10 dark:bg-white/5 transition-colors"
          style={{ borderColor: theme === 'dark' ? '#FCD34D' : '#F59E0B' }}>
        </div>
        <span className="text-xs text-[var(--color-text)]">Ideas</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 border-2 rounded bg-white/10 dark:bg-white/5 transition-colors"
          style={{ borderColor: theme === 'dark' ? '#64AB6F' : '#059669' }}>
        </div>
        <span className="text-xs text-[var(--color-text)]">Selected</span>
      </div>
    </div>
  </div>
));

Legend.displayName = 'Legend';

export function GraphView({ onNodeSelect, selectedNoteId }: GraphViewProps) {
  return (
    <ReactFlowProvider>
      <GraphViewContent onNodeSelect={onNodeSelect} selectedNoteId={selectedNoteId} />
    </ReactFlowProvider>
  );
}

function GraphViewContent({ onNodeSelect, selectedNoteId }: GraphViewProps) {
  const { notes } = useNotes();
  const { theme } = useTheme();
  const { fitView, zoomIn, zoomOut, setCenter } = useReactFlow();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // State to track whether positions have changed
  const [positionsChanged, setPositionsChanged] = useState(false);
  // State to store saved positions
  const [savedPositions, setSavedPositions] = useState<StoredNodePosition[]>([]);
  // Added loading state
  const [isLoading, setIsLoading] = useState(true);

  const notesWithLinks = useMemo(() => notes.filter(note =>
    (note.linkedNoteIds?.length ?? 0) > 0 ||
    (note.linkedTasks?.length ?? 0) > 0 ||
    (note.linkedReminders?.length ?? 0) > 0
  ), [notes]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges] = useEdgesState<CustomEdge>([]);

  // Load saved positions from database
  useEffect(() => {
    const fetchSavedPositions = async () => {
      setIsLoading(true);
      try {
        const positions = await loadNodePositions();
        setSavedPositions(positions);
      } catch (error) {
        console.error('Failed to load saved positions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSavedPositions();
  }, []);

  // Initialize layout
  useEffect(() => {
    if (isLoading) return; // Wait until positions are loaded

    const initialNodes = notesWithLinks.map((note) => ({
      id: note.id,
      type: 'custom',
      position: { x: 0, y: 0 },
      data: {
        note,
        selected: note.id === selectedNoteId,
      },
      selected: note.id === selectedNoteId,
    }));

    const initialEdges = prepareEdges(notesWithLinks);
    const { nodes: layoutedNodes, edges: layoutedEdges } = getDagreLayout(initialNodes, initialEdges, savedPositions);

    setNodes(layoutedNodes);
    setEdges(layoutedEdges as Edge[]);
  }, [notesWithLinks, selectedNoteId, setNodes, setEdges, savedPositions, isLoading]);

  // Handle node drag end to save positions
  const onNodeDragStop: NodeDragHandler = useCallback(() => {
    setPositionsChanged(true);

    // Mark that positions need to be saved
  }, []);

  // Save node positions when they change
  useEffect(() => {
    if (!positionsChanged || nodes.length === 0) return;

    const savePositions = async () => {
      const positions: StoredNodePosition[] = nodes.map(node => ({
        id: node.id,
        x: node.position.x,
        y: node.position.y
      }));

      await saveNodePositions(positions);
      setPositionsChanged(false);
    };

    savePositions();
  }, [positionsChanged, nodes]);

  // Optimize view fitting
  useEffect(() => {
    if (nodes.length === 0 || isLoading) return;

    const timer = setTimeout(() => {
      fitView({
        padding: 0.2,
        duration: isInitialLoad ? 0 : 800,
        maxZoom: 1.5
      });
      setIsInitialLoad(false);
    }, isInitialLoad ? 0 : 100);

    return () => clearTimeout(timer);
  }, [nodes.length, fitView, isInitialLoad, isLoading]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    onNodeSelect(node.id);
  }, [onNodeSelect]);

  // Update selected node
  useEffect(() => {
    setNodes((prevNodes) =>
      prevNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          selected: node.id === selectedNoteId,
        },
        selected: node.id === selectedNoteId,
      }))
    );
  }, [selectedNoteId, setNodes]);

  // Handle resetting node positions to default layout
  const handleResetPositions = useCallback(async () => {
    // Clear saved positions from database
    await clearNodePositions();
    setSavedPositions([]);

    // Re-calculate layout without saved positions
    const initialNodes = notesWithLinks.map((note) => ({
      id: note.id,
      type: 'custom',
      position: { x: 0, y: 0 },
      data: {
        note,
        selected: note.id === selectedNoteId,
      },
      selected: note.id === selectedNoteId,
    }));

    const initialEdges = prepareEdges(notesWithLinks);
    const { nodes: layoutedNodes, edges: layoutedEdges } = getDagreLayout(initialNodes, initialEdges);

    setNodes(layoutedNodes);
    setEdges(layoutedEdges as Edge[]);

    // Fit the view after resetting
    setTimeout(() => {
      fitView({
        padding: 0.2,
        duration: 800,
        maxZoom: 1.5
      });
    }, 50);
  }, [notesWithLinks, selectedNoteId, setNodes, setEdges, fitView]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-[var(--color-textSecondary)] flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--color-accent)]"></div>
          <span className="mt-3">Loading graph...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex overflow-hidden">
      <div className="flex-1 relative overflow-hidden" style={{ minHeight: "400px" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onNodesChange={onNodesChange}
          onNodeDragStop={onNodeDragStop}
          fitView={false}
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          panOnScroll={true}
          panOnDrag={true}
          zoomOnScroll={true}
          panOnScrollMode={PanOnScrollMode.Free}
          selectionMode={SelectionMode.Full}
          connectionMode={ConnectionMode.Loose}
          className="!absolute inset-0"
          defaultEdgeOptions={{
            type: 'default',
            animated: false,
            style: {
              stroke: 'var(--color-border)',
              strokeWidth: 1.5,
              strokeLinecap: 'round' as const,
              strokeLinejoin: 'round' as const
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: 'var(--color-border)',
              width: 15,
              height: 15
            }
          }}
        >
          <Background
            color={theme === 'light' ? 'var(--color-border)' : 'rgb(255, 255, 255)'}
            style={{
              backgroundColor: 'transparent',
              opacity: theme === 'light' ? 0.3 : 0.03
            }}
          />
          <Panel
            position="bottom-left"
            className="flex flex-col gap-4 mb-4 mr-4 z-50"
            style={{ position: 'absolute', bottom: '38px', left: '0px' }}
          >
            <Legend theme={theme} />
          </Panel>
        </ReactFlow>
      </div>
      <div className="w-16 flex items-center justify-center">
        <GraphControls
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onFit={() => fitView({ padding: 0.2, duration: 800 })}
          onCenter={() => {
            const selectedNode = nodes.find(node => node.id === selectedNoteId);
            if (selectedNode) {
              setCenter(selectedNode.position.x + 140, selectedNode.position.y + 60, { duration: 800 });
            }
          }}
          onResetPositions={handleResetPositions}
        />
      </div>
    </div>
  );
}
