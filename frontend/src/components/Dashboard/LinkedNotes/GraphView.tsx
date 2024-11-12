import { useEffect, useRef, useCallback } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import { useTheme } from '../../../contexts/ThemeContext';
import { useNotes } from '../../../contexts/NotesContext';
import type { Core, NodeSingular, LayoutOptions, Stylesheet } from 'cytoscape';

interface GraphViewProps {
  onNodeSelect: (noteId: string) => void;
  isDetailsPanelOpen: boolean;
  selectedNoteId: string;
}

const debounce = <T extends (...args: unknown[]) => unknown>(func: T, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>): void {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export function GraphView({ onNodeSelect, isDetailsPanelOpen, selectedNoteId }: Readonly<GraphViewProps>) {
  const { notes } = useNotes();
  const { theme } = useTheme();
  const cyRef = useRef<Core | null>(null);

  // Filter notes to only include those with links
  const notesWithLinks = notes.filter(note =>
    note.linkedNoteIds && note.linkedNoteIds.length > 0
  );

  // Create nodes
  const elements = notesWithLinks.map(note => ({
    data: {
      id: note.id,
      label: note.title,
      isIdea: note.isIdea,
      tags: note.tags,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      preview: note.content?.substring(0, 50) + '...'
    }
  }));

  // Create edges
  const edges = notesWithLinks.flatMap(note =>
    note.linkedNoteIds
      .filter(targetId => notesWithLinks.some(n => n.id === targetId))
      .map(targetId => ({
        data: {
          id: `${note.id}-${targetId}`,
          source: note.id,
          target: targetId
        }
      }))
  );

  // Combine nodes and edges
  const graphElements = [...elements, ...edges];

  // Select the initial node in the graph
  useEffect(() => {
    if (!cyRef.current || !selectedNoteId) return;

    const cy = cyRef.current;
    const selectedNode = cy.$id(selectedNoteId);
    
    if (selectedNode.length) {
      cy.elements().unselect();
      selectedNode.select();
    }
  }, [selectedNoteId]);

  // Update layout to allow free movement with animation
  const layout: LayoutOptions = {
    name: 'concentric',
    fit: true,
    padding: 50,
    spacingFactor: 0.4,
    minNodeSpacing: 100,
    animate: true,
    animationDuration: 800,
    animationEasing: 'ease-in-out-cubic',
    animationThreshold: 250,
    refresh: 20,
    // Animate on drag
    boundingBox: undefined,
    randomize: false,
    componentSpacing: 100,
    nodeRepulsion: function(node: any) { return 4500; },
    gravity: 0.2,
    // Prevent overlap during animation
    avoidOverlap: true,
    nodeDimensionsIncludeLabels: true
  };

  const stylesheet: Stylesheet[] = [
    {
      selector: 'node',
      style: {
        'background-color': theme === 'dark' ? '#1E1E1E' : '#FFFFFF',
        'border-color': theme === 'dark' ? '#2196F3' : '#1976D2',
        'border-width': 2,
        'label': 'data(label)',
        'color': theme === 'dark' ? '#E3E3E3' : '#333333',
        'text-valign': 'center',
        'text-halign': 'center',
        'font-size': '8px',
        'width': '90px',
        'height': '30px',
        'text-wrap': 'wrap',
        'text-max-width': '85px',
        'shape': 'round-rectangle',
        'text-outline-color': theme === 'dark' ? '#1E1E1E' : '#FFFFFF',
        'text-outline-width': 1.5,
        'min-zoomed-font-size': 8,
        'transition-property': 'border-color, border-width',
        'transition-duration': 200,
      }
    },
    {
      selector: 'node[?isIdea]',
      style: {
        'border-color': theme === 'dark' ? '#FFA726' : '#FB8C00',
        'border-width': 2.5,
        'border-style': 'solid'
      }
    },
    {
      selector: ':selected',
      style: {
        'border-color': theme === 'dark' ? '#66BB6A' : '#43A047',
        'border-width': 2,
        'background-color': theme === 'dark' ? '#2A332A' : '#F0F7F0',  // Very subtle green tint
        'transition-property': 'border-color, background-color',
        'transition-duration': 200
      }
    },
    {
      selector: 'edge',
      style: {
        'target-arrow-shape': 'triangle-tee',
        'arrow-scale': 0.7,
        'width': 1.4,
        'curve-style': 'straight',
        'opacity': 0.75,
        'source-distance-from-node': 0,
        'target-distance-from-node': 6,
        'line-color': theme === 'dark' ? '#5a5a5a' : '#3a3a3a',
        'target-arrow-color': theme === 'dark' ? '#5a5a5a' : '#3a3a3a'
      }
    }
  ];

  const centerGraph = useCallback(() => {
    if (cyRef.current) {
      cyRef.current.fit(undefined, 30);
    }
  }, []);

  // Watch for panel state changes
  useEffect(() => {
    if (!cyRef.current) return;

    const timeoutId = setTimeout(() => {
      centerGraph();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [isDetailsPanelOpen, centerGraph]);

  // Handle node clicks
  useEffect(() => {
    if (!cyRef.current) return;

    const cy = cyRef.current;

    const handleNodeTap = (event: { target: NodeSingular }) => {
      const clickedNode = event.target;
      const clickedNodeId = clickedNode.id();

      if (selectedNoteId === clickedNodeId) {
        cy.elements().unselect();
        onNodeSelect('');
      } else {
        cy.elements().unselect();
        clickedNode.select();
        onNodeSelect(clickedNodeId);
      }
    };

    const handleBackgroundTap = (event: { target: cytoscape.Core }) => {
      if (event.target === cy) {
        if (selectedNoteId) {
          cy.elements().unselect();
          onNodeSelect('');
        }
      }
    };

    cy.on('tap', 'node', handleNodeTap);
    cy.on('click', handleBackgroundTap);

    return () => {
      cy.removeListener('tap', 'node', handleNodeTap);
      cy.removeListener('click', handleBackgroundTap);
    };
  }, [onNodeSelect, selectedNoteId]);

  // Handle window resize
  useEffect(() => {
    const handleResize = debounce(() => {
      centerGraph();
    }, 250);

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [centerGraph]);

  return (
    <div className="h-full w-full relative">
      <CytoscapeComponent
        elements={graphElements}
        stylesheet={stylesheet}
        layout={layout}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '600px',
          maxHeight: '80vh'
        }}
        cy={(cy) => {
          cyRef.current = cy;
          cy.minZoom(0.5);
          cy.maxZoom(2.0);
        }}
      />
      <div className="absolute bottom-4 right-4 bg-opacity-80 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 rounded"></div>
            <span className="text-sm">Notes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-orange-500 rounded"></div>
            <span className="text-sm">Ideas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-green-500 rounded bg-[#F0F7F0] dark:bg-[#2A332A]"></div>
            <span className="text-sm">Selected</span>
          </div>
        </div>
      </div>
    </div>
  );
}