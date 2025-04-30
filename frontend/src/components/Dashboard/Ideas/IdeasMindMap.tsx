import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Node,
  Background,
  NodeProps,
  Handle,
  Position,
  useReactFlow,
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
import { GraphControls } from '../LinkedNotes/GraphControls';
import clsx from 'clsx';
import type { Note } from '../../../types/note';
import { IdeaCard } from './IdeaCard';

interface IdeasMindMapProps {
  ideas: Note[];
  onIdeaClick: (ideaId: string) => void;
  selectedIdeaId?: string | null;
}

interface NodeData {
  idea: Note;
  selected: boolean;
  isFavorite: boolean;
}

type CustomNode = {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: NodeData;
  selected: boolean;
};

const CustomNode = ({ data }: NodeProps) => {
  const { theme } = useTheme();

  const getBorderColor = () => {
    if (data.selected) return theme === 'dark' ? '#64AB6F' : '#059669';
    if (data.isFavorite) return theme === 'dark' ? '#FCD34D' : '#F59E0B';
    return theme === 'dark' ? '#FFA726' : '#FB8C00';
  };

  const borderColor = getBorderColor();

  return (
    <div className="group">
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-transparent !border-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ borderColor, top: -8 }}
      />

      <div className={clsx(
        data.selected && 'ring-2 ring-[#64AB6F] dark:ring-[#059669]'
      )}>
        <IdeaCard
          idea={data.idea}
          viewMode="mindMap"
          isSelected={data.selected}
        />
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-transparent !border-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ borderColor, bottom: -8 }}
      />
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

const prepareEdges = (ideas: Note[]): FlowEdge[] => {
  const processedPairs = new Set<string>();

  return ideas.flatMap(idea =>
    (idea.linkedNoteIds || [])
      .filter(targetId => {
        const pairId = [idea.id, targetId].sort((a, b) => a.localeCompare(b)).join('-');
        if (processedPairs.has(pairId)) return false;
        processedPairs.add(pairId);
        return ideas.some(i => i.id === targetId);
      })
      .map(targetId => ({
        id: `${idea.id}-${targetId}`,
        source: idea.id,
        target: targetId,
        type: 'default',
        animated: false,
        style: {
          strokeWidth: 1.5,
          stroke: '#9CA3AFCC',
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 15,
          height: 15
        }
      }))
  );
};

const getDagreLayout = (nodes: CustomNode[], edges: FlowEdge[]) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: 'TB',
    ranksep: 60,
    nodesep: 30,
    edgesep: 20
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 160, height: 90 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  return {
    nodes: nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      node.position = {
        x: nodeWithPosition.x - 80,
        y: nodeWithPosition.y - 45,
      };
      return node;
    }),
    edges
  };
};

function IdeasMindMapContent({ ideas, onIdeaClick, selectedIdeaId }: IdeasMindMapProps) {
  const { theme } = useTheme();
  const { fitView, zoomIn, zoomOut, setCenter } = useReactFlow();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const initialNodes = useMemo<CustomNode[]>(() => {
    return ideas.map((idea) => ({
      id: idea.id,
      type: 'custom',
      position: { x: 0, y: 0 },
      data: {
        idea,
        selected: idea.id === selectedIdeaId,
        isFavorite: idea.isFavorite || false,
      },
      selected: idea.id === selectedIdeaId,
    }));
  }, [ideas, selectedIdeaId]);

  const edges = useMemo(() => prepareEdges(ideas), [ideas]);

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    return getDagreLayout(initialNodes, edges);
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
    onIdeaClick(node.id);
  }, [onIdeaClick]);

  useEffect(() => {
    setNodes((prevNodes) =>
      prevNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          selected: node.id === selectedIdeaId,
        },
        selected: node.id === selectedIdeaId,
      }))
    );
  }, [selectedIdeaId]);

  const handleCenter = useCallback(() => {
    const selectedNode = nodes.find(node => node.id === selectedIdeaId);
    if (selectedNode) {
      setCenter(selectedNode.position.x + 90, selectedNode.position.y + 35, { duration: 800 });
    }
  }, [selectedIdeaId, nodes, setCenter]);

  const handleResetPositions = useCallback(() => {
    const newNodes = getDagreLayout(initialNodes, edges).nodes;
    setNodes(newNodes);
    setTimeout(() => fitView({ padding: 0.5, duration: 800 }), 50);
  }, [initialNodes, edges, fitView]);

  if (ideas.length === 0) {
    return (
      <div className="h-[50vh] flex items-center justify-center text-gray-500 dark:text-gray-400">
        No ideas to display in mind map
      </div>
    );
  }

  return (
    <div className="h-[50vh] w-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-xl overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={flowEdges}
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
            stroke: theme === 'dark' ? '#4B5563CC' : '#9CA3AFCC',
            strokeWidth: 1.5,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: theme === 'dark' ? '#4B5563CC' : '#9CA3AFCC',
            width: 15,
            height: 15
          }
        }}
      >
        <Background
          color={theme === 'dark' ? '#374151' : '#E5E7EB'}
          gap={32}
          size={1}
          style={{ opacity: 0.2 }}
        />
        <GraphControls
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onFit={() => fitView({ padding: 0.5, duration: 800 })}
          onCenter={handleCenter}
          onResetPositions={handleResetPositions}
        />
      </ReactFlow>
    </div>
  );
}

export const IdeasMindMap = (props: IdeasMindMapProps) => (
  <ReactFlowProvider>
    <IdeasMindMapContent {...props} />
  </ReactFlowProvider>
);
