import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Node,
  Background,
  NodeProps,
  Handle,
  Position,
  useReactFlow,
  Panel,
  ReactFlowProvider,
  MarkerType,
  ConnectionMode,
  OnNodesChange,
  applyNodeChanges,
  Edge as FlowEdge,
  PanOnScrollMode,
  SelectionMode
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { useTheme } from '../../../contexts/themeContextUtils';
import { useNotes } from '../../../contexts/notesContextUtils';
import { themeConfig } from '../../../config/theme.config';
import { ThemeConfig } from '../../../types/themeConfig.types';
import clsx from 'clsx';

interface GraphViewProps {
  onNodeSelect: (noteId: string) => void;
  selectedNoteId: string | null;
}

interface NodeData {
  selected: boolean;
  isIdea: boolean;
  title: string;
  taskCount: number;
  linkedCount: number;
  preview: string;
}

// Add a Note interface
interface NoteType {
  id: string;
  title: string;
  isIdea: boolean;
  content?: string;
  linkedNoteIds?: string[];
  linkedTasks?: Array<{ status: string; priority: string; }>;
}

// Define a custom node type
type CustomNode = {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: NodeData;
  selected: boolean;
};

// Helper function to determine the border color of a node
const getBorderColor = (
  data: NodeData,
  colors: ThemeConfig['colors']['light' | 'dark']
) => {
  if (data.selected) return colors.note;
  if (data.isIdea) return colors.idea;
  return colors.note;
};

// Custom node component
const CustomNode = ({ data }: NodeProps) => {
  const { theme } = useTheme();
  const config = themeConfig;
  const colors = config.colors[theme === 'dark' ? 'dark' : 'light'];

  const getSelectedColor = () => {
    return theme === 'dark' ? '#64AB6F' : '#059669';
  };

  const getGlowOpacity = () => {
    if (data.selected) return "opacity-100";
    if (theme === 'midnight') return "opacity-40 group-hover:opacity-80";
    return "opacity-50 group-hover:opacity-100";
  };

  const borderColor = data.selected 
    ? getSelectedColor()
    : getBorderColor(data, colors);

  return (
    <div
      className={clsx(
        'relative p-6 rounded-2xl border transition-all duration-300 hover:shadow-2xl hover:scale-105 group',
        data.selected
          ? 'bg-task' // You may need a Tailwind class for bg-task
          : 'bg-white/90 dark:bg-gray-900/90'
      )}
      style={{
        width: 250,
        minHeight: 100,
        borderColor: 'transparent',
        boxShadow:
          theme === 'dark'
            ? '0 8px 24px -12px rgba(0, 0, 0, 0.3)'
            : '0 8px 24px -12px rgba(0, 0, 0, 0.15)',
        zIndex: 0,
      }}
    >
      <div 
        className={`absolute inset-0 rounded-2xl transition-opacity duration-300 ${getGlowOpacity()}`}
        style={{
          background: `linear-gradient(45deg, ${borderColor}20, ${borderColor}40)`,
        }}
      />

      <div className="relative z-10">
        <div 
          className="rounded-lg p-2 mb-4 w-10 h-10 flex items-center justify-center"
          style={{ 
            backgroundColor: `${borderColor}15`,
            color: borderColor
          }}
        >
          {data.isIdea ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" 
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8A6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
              <path d="M9 18h6"/>
              <path d="M10 22h4"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" 
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          )}
        </div>

        <div className="font-medium text-gray-900 dark:text-gray-100 mb-2">
          {data.title}
        </div>

        {(data.linkedCount > 0 || data.taskCount > 0) && (
          <div className="flex gap-2 text-sm">
            {data.linkedCount > 0 && (
              <span 
                className="px-2 py-1 rounded-md text-xs"
                style={{ 
                  backgroundColor: `${borderColor}15`,
                  color: borderColor
                }}
              >
                🔗 {data.linkedCount} links
              </span>
            )}
            {data.taskCount > 0 && (
              <span 
                className="px-2 py-1 rounded-md text-xs"
                style={{ 
                  backgroundColor: `${borderColor}15`,
                  color: borderColor
                }}
              >
                ✓ {data.taskCount} tasks
              </span>
            )}
          </div>
        )}
      </div>

      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-3 !h-3 !bg-transparent !border-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300" 
        style={{ borderColor }}
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-3 !h-3 !bg-transparent !border-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300" 
        style={{ borderColor }}
      />
    </div>
  );
};

// Node types definition
const nodeTypes = {
  custom: CustomNode,
};

// Zoom controls component
const ZoomControls = ({ zoomIn, zoomOut, fitView }: { 
  zoomIn: () => void;
  zoomOut: () => void;
  fitView: (params: { padding: number; duration: number; }) => void;
}) => (
  <div className="bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 backdrop-blur-sm p-3 rounded-xl shadow-lg">
    <div className="flex flex-row gap-2">
      <button
        onClick={() => zoomIn()}
        className="p-2 hover:bg-white/30 dark:hover:bg-gray-700/30 rounded-lg transition-colors"
        title="Zoom in"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" 
             viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" 
             strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 dark:text-gray-400">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          <line x1="11" y1="8" x2="11" y2="14"></line>
          <line x1="8" y1="11" x2="14" y2="11"></line>
        </svg>
      </button>
      <button
        onClick={() => zoomOut()}
        className="p-2 hover:bg-white/30 dark:hover:bg-gray-700/30 rounded-lg transition-colors"
        title="Zoom out"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" 
             viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" 
             strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 dark:text-gray-400">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          <line x1="8" y1="11" x2="14" y2="11"></line>
        </svg>
      </button>
      <button
        onClick={() => fitView({ padding: 0.2, duration: 1000 })}
        className="p-2 hover:bg-white/30 dark:hover:bg-gray-700/30 rounded-lg transition-colors"
        title="Fit to view"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" 
             viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" 
             strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 dark:text-gray-400">
          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path>
        </svg>
      </button>
    </div>
  </div>
);

// Legend component
const Legend = ({ theme }: { theme: string }) => (
  <div className="bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 backdrop-blur-sm p-3 rounded-xl shadow-lg">
    <div className="flex flex-row gap-4">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 border-2 rounded bg-white/20 dark:bg-gray-800/20"
          style={{ borderColor: theme === 'dark' ? 'rgb(59, 130, 246)' : 'rgb(37, 99, 235)' }}>
        </div>
        <span className="text-xs text-gray-600 dark:text-gray-400">Notes</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 border-2 rounded bg-white/20 dark:bg-gray-800/20"
          style={{ borderColor: theme === 'dark' ? '#FCD34D' : '#F59E0B' }}>
        </div>
        <span className="text-xs text-gray-600 dark:text-gray-400">Ideas</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 border-2 rounded bg-white/20 dark:bg-gray-800/20"
          style={{ borderColor: theme === 'dark' ? '#64AB6F' : '#059669' }}>
        </div>
        <span className="text-xs text-gray-600 dark:text-gray-400">Selected</span>
      </div>
    </div>
  </div>
);

// Prepare edges from notes
const prepareEdges = (notesWithLinks: NoteType[]): FlowEdge[] => {
  const processedPairs = new Set<string>();
  
  return notesWithLinks.flatMap(note =>
    (note.linkedNoteIds || [])
      .filter((targetId: string) => {
        const pairId = [note.id, targetId].sort((a, b) => a.localeCompare(b)).join('-');
        if (processedPairs.has(pairId)) return false;
        processedPairs.add(pairId);
        return notesWithLinks.some(n => n.id === targetId);
      })
      .map((targetId: string) => ({
        id: `${note.id}-${targetId}`,
        source: note.id,
        target: targetId,
        type: 'default',
        animated: false,
        style: {
          strokeWidth: 1.5,
          stroke: '#9CA3AFCC',
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          zIndex: 1
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20
        }
      }))
  );
};

// Use Dagre to layout the graph
const getDagreLayoutedElements = (nodes: CustomNode[], edges: FlowEdge[], direction: 'TB' | 'LR' = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  dagreGraph.setGraph({ 
    rankdir: direction, 
    ranksep: 200,
    nodesep: 150,
    edgesep: 100
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 250, height: 100 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const updatedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.position = {
      x: nodeWithPosition.x - (250 / 2),
      y: nodeWithPosition.y - (100 / 2),
    };
    return node;
  });

  return { nodes: updatedNodes, edges };
};

// Main content component
function GraphViewContent({ onNodeSelect, selectedNoteId }: Readonly<GraphViewProps>) {
  const { notes } = useNotes();
  const { theme } = useTheme();
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Filter notes that have links or tasks
  const notesWithLinks = useMemo(() => notes.filter(note =>
    (note.linkedNoteIds?.length ?? 0) > 0 || (note.linkedTasks?.length ?? 0) > 0
  ), [notes]);

  // Prepare nodes
  const initialNodes = useMemo<CustomNode[]>(() => {
    return notesWithLinks.map((note) => ({
      id: note.id,
      type: 'custom',
      position: { x: 0, y: 0 }, // temporary, Dagre will update this
      data: {
        title: note.title,
        isIdea: note.isIdea,
        taskCount: note.linkedTasks?.length ?? 0,
        linkedCount: note.linkedNoteIds?.length ?? 0,
        preview: (note.content ?? '').substring(0, 50) + '...',
        selected: note.id === selectedNoteId,
      },
      selected: note.id === selectedNoteId,
    }));
  }, [notesWithLinks, selectedNoteId]);

  // Prepare edges
  const edges = useMemo(() => prepareEdges(notesWithLinks), [notesWithLinks]);

  // Layout nodes using Dagre
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    return getDagreLayoutedElements(initialNodes, edges, 'TB'); // top-to-bottom
  }, [initialNodes, edges]);

  const [nodes, setNodes] = useState<CustomNode[]>(layoutedNodes);
  const [flowEdges] = useState<FlowEdge[]>(layoutedEdges);

  useEffect(() => {
    if (nodes.length === 0) return;

    const timer = setTimeout(() => {
      fitView({
        padding: 0.5,
        duration: isInitialLoad ? 0 : 800,
        maxZoom: 1.5
      });
      setIsInitialLoad(false);
    }, isInitialLoad ? 0 : 100);

    return () => clearTimeout(timer);
  }, [nodes.length, fitView, isInitialLoad]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds) as CustomNode[]),
    []
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    onNodeSelect(node.id);
  }, [onNodeSelect]);

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
  }, [selectedNoteId]);

  return (
    <div className="h-full w-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <ReactFlow
        className="react-flow__edge-path-selector"
        nodes={nodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onNodesChange={onNodesChange}
        draggable={true}
        fitView={false}
        fitViewOptions={{ 
          padding: 0.5,
          duration: 800,
          maxZoom: 1.5
        }}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.05}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        panOnScroll={true}
        panOnDrag={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={true}
        panOnScrollMode={PanOnScrollMode.Free}
        selectionMode={SelectionMode.Full}
        panOnScrollSpeed={0.5}
        connectionMode={ConnectionMode.Loose}
        defaultEdgeOptions={{
          type: 'default',
          animated: false,
          style: {
            stroke: theme === 'dark' ? '#4B5563CC' : '#9CA3AFCC',
            strokeWidth: 1.5,
            strokeLinecap: 'round',
            strokeLinejoin: 'round'
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: theme === 'dark' ? '#4B5563CC' : '#9CA3AFCC',
            width: 20,
            height: 20
          }
        }}
      >
        <Background 
          color={theme === 'dark' ? '#374151' : '#E5E7EB'} 
          gap={32} 
          size={1}
          style={{ opacity: 0.2 }}
        />
        <Panel position="bottom-right" className="flex flex-col gap-4 mb-4 mr-4">
          <div className="flex flex-row gap-4">
            <ZoomControls zoomIn={zoomIn} zoomOut={zoomOut} fitView={fitView} />
            <Legend theme={theme} />
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

// Wrap with provider
const GraphViewWithProvider = (props: Readonly<GraphViewProps>) => {
  return (
    <ReactFlowProvider>
      <GraphViewContent {...props} />
    </ReactFlowProvider>
  );
};

export const GraphView = GraphViewWithProvider;
