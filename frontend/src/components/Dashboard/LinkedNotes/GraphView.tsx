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
  ReactFlowProvider
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
        data.selected && 'ring-2 ring-[#64AB6F] dark:ring-[#059669]'
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

  const edges = notes.flatMap(note =>
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

  return edges.reduce<CustomEdge[]>((acc, edge) => {
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
const getDagreLayout = (nodes: CustomNodeType[], edges: CustomEdge[]) => {
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

  return {
    nodes: nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      node.position = {
        x: nodeWithPosition.x - 140,
        y: nodeWithPosition.y - 60,
      };
      return node;
    }),
    edges
  };
};

// Memoize the Legend component
const Legend = memo(({ theme }: { theme: string }) => (
  <div className={clsx(
    "bg-white/20 dark:bg-gray-800/20",
    "border border-white/40 dark:border-white/30",
    "backdrop-blur-xl p-3 rounded-xl shadow-lg",
    "transition-all duration-300"
  )}>
    <div className="flex flex-row gap-4">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 border-2 rounded bg-white/20 dark:bg-gray-800/20 transition-colors"
          style={{ borderColor: theme === 'dark' ? 'rgb(59, 130, 246)' : 'rgb(37, 99, 235)' }}>
        </div>
        <span className="text-xs text-gray-600 dark:text-gray-400">Notes</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 border-2 rounded bg-white/20 dark:bg-gray-800/20 transition-colors"
          style={{ borderColor: theme === 'dark' ? '#FCD34D' : '#F59E0B' }}>
        </div>
        <span className="text-xs text-gray-600 dark:text-gray-400">Ideas</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 border-2 rounded bg-white/20 dark:bg-gray-800/20 transition-colors"
          style={{ borderColor: theme === 'dark' ? '#64AB6F' : '#059669' }}>
        </div>
        <span className="text-xs text-gray-600 dark:text-gray-400">Selected</span>
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

  const notesWithLinks = useMemo(() => notes.filter(note =>
    (note.linkedNoteIds?.length ?? 0) > 0 || (note.linkedTasks?.length ?? 0) > 0
  ), [notes]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges] = useEdgesState<CustomEdge>([]);

  // Initialize layout
  useEffect(() => {
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
  }, [notesWithLinks, selectedNoteId, setNodes, setEdges]);

  // Optimize view fitting
  useEffect(() => {
    if (nodes.length === 0) return;

    const timer = setTimeout(() => {
      fitView({
        padding: 0.2,
        duration: isInitialLoad ? 0 : 800,
        maxZoom: 1.5
      });
      setIsInitialLoad(false);
    }, isInitialLoad ? 0 : 100);

    return () => clearTimeout(timer);
  }, [nodes.length, fitView, isInitialLoad]);

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

  return (
    <div className={clsx(
      "h-full w-full rounded-xl overflow-hidden",
      "bg-gradient-to-br from-white/20 to-gray-100/20",
      "dark:from-gray-900/20 dark:to-gray-800/20",
      "backdrop-blur-xl transition-all duration-300"
    )}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onNodesChange={onNodesChange}
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
          color={theme === 'dark' ? '#374151' : '#E5E7EB'}
          gap={32}
          size={1}
          style={{ opacity: 0.1 }}
        />
        <Panel position="bottom-right" className="flex flex-col gap-4 mb-4 mr-4">
          <div className="flex flex-row gap-4">
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
            />
            <Legend theme={theme} />
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
