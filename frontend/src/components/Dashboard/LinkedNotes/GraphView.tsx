import { useEffect, useRef, useCallback } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import { useTheme } from '../../../contexts/themeContextUtils';
import { useNotes } from '../../../contexts/notesContextUtils';
import type { Core, NodeSingular, Stylesheet, Position } from 'cytoscape';

interface GraphViewProps {
  onNodeSelect: (noteId: string) => void;
  isDetailsPanelOpen: boolean;
  selectedNoteId: string | null;
}

// Layout configuration - moved outside component
const graphLayout = {
  name: 'cose',
  fit: true,
  padding: 100,
  animate: 'end',
  animationDuration: 1000,
  animationEasing: 'ease-out',
  nodeDimensionsIncludeLabels: true,
  nodeRepulsion: () => 100000,
  nodeOverlap: 50,
  idealEdgeLength: () => 250,
  edgeElasticity: 0.45,
  nestingFactor: 1.2,
  gravity: 0.1,
  numIter: 2000,
  initialTemp: 1000,
  coolingFactor: 0.99,
  minTemp: 1.0,
  randomize: false,
  refresh: 30,
  componentSpacing: 150,
  maxSimulationTime: 8000,
  weaver: true,
  quality: "proof",
  infinite: false,
} as const;

// Helper functions
const checkNodeOverlap = (
  pos: Position,
  existingPos: Position,
  width: number,
  height: number,
  existingNode: NodeSingular,
  padding: number
) => {
  const dx = Math.abs(pos.x - existingPos.x);
  const dy = Math.abs(pos.y - existingPos.y);
  const minX = (width + existingNode.width()) / 2 + padding;
  const minY = (height + existingNode.height()) / 2 + padding;
  return dx < minX && dy < minY;
};

const adjustNodePosition = (
  pos: Position,
  node: NodeSingular,
  existingNode: NodeSingular
) => {
  if (node.edgesWith(existingNode).length > 0) {
    pos.x += (Math.random() - 0.5) * 50;
    pos.y += (Math.random() - 0.5) * 50;
  } else {
    pos.x += (Math.random() - 0.5) * 150;
    pos.y += (Math.random() - 0.5) * 150;
  }
  return pos;
};

const organizeNodes = (cy: Core) => {
  const nodes = cy.nodes();
  const nodePositions = new Map<NodeSingular, Position>();
  const padding = 30;

  nodes.forEach((node: NodeSingular) => {
    const pos = node.position();
    const width = node.width();
    const height = node.height();

    let overlapping = true;
    let attempts = 0;
    const maxAttempts = 50;

    while (overlapping && attempts < maxAttempts) {
      overlapping = false;

      nodePositions.forEach((existingPos: Position, existingNode: NodeSingular) => {
        if (checkNodeOverlap(pos, existingPos, width, height, existingNode, padding)) {
          overlapping = true;
          adjustNodePosition(pos, node, existingNode);
        }
      });

      attempts++;
    }

    node.position(pos);
    nodePositions.set(node, pos);
  });
};

export function GraphView({ onNodeSelect, isDetailsPanelOpen, selectedNoteId }: Readonly<GraphViewProps>) {
  const { notes } = useNotes();
  const { theme } = useTheme();
  const cyRef = useRef<Core | null>(null);

  // Filter notes to only include those with links or tasks
  const notesWithLinks = notes.filter(note =>
    (note.linkedNoteIds?.length > 0) || ((note.linkedTasks?.length ?? 0) > 0)
  );

  // Create nodes with task information embedded
  const elements = [
    // Note nodes with task information
    ...notesWithLinks.map(note => {
      const linkedTasks = note.linkedTasks || [];
      const hasCompletedTasks = linkedTasks.some(task => task.status === 'completed');
      const hasHighPriorityTasks = linkedTasks.some(task => task.priority === 'high');
      const taskCount = linkedTasks.length;

      return {
        data: {
          id: note.id,
          label: note.title,
          isIdea: note.isIdea,
          type: 'note',
          tags: note.tags,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          preview: note.content?.substring(0, 50) + '...',
          taskCount,
          hasCompletedTasks,
          hasHighPriorityTasks,
          taskSummary: linkedTasks.map(t => `${t.status === 'completed' ? '✓' : '○'} ${t.title}`).join('\n')
        }
      };
    }),
    // Note-to-note edges
    ...notesWithLinks.flatMap(note =>
      (note.linkedNoteIds || [])
        .filter(targetId => notesWithLinks.some(n => n.id === targetId))
        .map(targetId => ({
          data: {
            id: `${note.id}-${targetId}`,
            source: note.id,
            target: targetId
          }
        }))
    )
  ];

  // Function to smoothly center on a node without disturbing layout
  const centerOnNode = useCallback((nodeId: string) => {
    if (!cyRef.current) return;

    const cy = cyRef.current;
    const node = cy.$id(nodeId);

    if (!node.length) return;

    const currentZoom = cy.zoom();
    const targetZoom = Math.max(currentZoom, 1); // Reduced from 1.5 to 1.2 for a more zoomed-out view
    const currentPan = cy.pan();
    const nodePosition = node.position();
    const renderedPosition = node.renderedPosition();

    // Calculate the target pan position
    const targetPan = {
      x: currentPan.x - (nodePosition.x * targetZoom - renderedPosition.x),
      y: currentPan.y - (nodePosition.y * targetZoom - renderedPosition.y)
    };

    // Perform the animation in a single smooth motion
    cy.animate({
      zoom: targetZoom,
      pan: targetPan,
      duration: 500,
      easing: 'ease-in-out',
      queue: false
    });
  }, []);

  // Initial layout effect - only runs once
  useEffect(() => {
    if (!cyRef.current) return;

    const cy = cyRef.current;

    // Enable node dragging
    cy.nodes().forEach(node => {
      node.grabify();

      // Add drag event handlers
      node.on('dragfree', (event) => {
        const draggedNode = event.target;
        const pos = draggedNode.position();
        draggedNode.unlock();
        draggedNode.position(pos);
      });

      // Lock position during selection
      node.on('select', () => {
        node.lock();
      });

      node.on('unselect', () => {
        node.unlock();
      });
    });

    // Run initial layout
    cy.layout(graphLayout).run();

    // After layout completes, organize nodes and then handle centering
    cy.one('layoutstop', () => {
      // First organize nodes
      organizeNodes(cy);

      // Then handle centering in a separate animation
      setTimeout(() => {
        if (selectedNoteId) {
          centerOnNode(selectedNoteId);
        } else {
          cy.animate({
            fit: {
              eles: cy.elements(),
              padding: 50
            },
            duration: 500,
            easing: 'ease-in-out',
            queue: false
          });
        }
      }, 100); // Small delay to ensure organization is complete
    });

    return () => {
      cy.removeListener('layoutstop');
    };
  }, [selectedNoteId, centerOnNode]);

  // Handle panel state changes without affecting layout
  useEffect(() => {
    const resizeTimer = setTimeout(() => {
      if (cyRef.current) {
        cyRef.current.resize();
        // Only fit to view if no node is selected
        if (!selectedNoteId) {
          cyRef.current.fit(undefined, 50);
        }
      }
    }, 300);

    return () => clearTimeout(resizeTimer);
  }, [isDetailsPanelOpen, selectedNoteId]);

  // Update the stylesheet configuration
  const stylesheet: Stylesheet[] = [
    {
      selector: 'node[type = "note"]',
      style: {
        'background-color': theme === 'dark' || theme === 'midnight' ? '#1e1e1e' : '#FFFFFF',
        'border-color': (node: NodeSingular) => {
          if (node.data('isIdea')) {
            return theme === 'dark' || theme === 'midnight' ? '#FCD34D' : '#F59E0B';
          }
          return theme === 'dark' || theme === 'midnight' ? 'rgb(59, 130, 246)' : 'rgb(37, 99, 235)';
        },
        'border-width': 2,
        'width': 220,
        'height': (node: NodeSingular) => {
          const taskCount = node.data('taskCount') || 0;
          return Math.max(100, 100 + (taskCount * 20));
        },
        'shape': 'round-rectangle',
        'text-valign': 'center',
        'text-halign': 'center',
        'text-wrap': 'wrap',
        'text-max-width': '160px',
        'font-family': 'system-ui, -apple-system, sans-serif',
        'font-size': 14,
        'font-weight': 500,
        'color': theme === 'dark' || theme === 'midnight' ? '#E5E7EB' : '#1F2937',
        'text-outline-color': theme === 'dark' || theme === 'midnight' ? '#1e1e1e' : '#FFFFFF',
        'text-outline-width': 2,
        'text-margin-y': 0,
        'text-margin-x': 0,
        'label': (node: NodeSingular) => {
          const title = node.data('label');
          const taskCount = node.data('taskCount') || 0;
          const linkedCount = node.data('linkedNoteIds')?.length || 0;

          let label = title;
          if (linkedCount > 0 || taskCount > 0) {
            label += '\n\n';
            if (linkedCount > 0) {
              label += `${linkedCount} notes`;
            }
            if (taskCount > 0) {
              if (linkedCount > 0) label += '   ';
              label += `✅ ${taskCount} tasks`;
            }
          }
          return label;
        },
        'background-image': (node: NodeSingular) => {
          const isIdea = node.data('isIdea');
          const ideaColor = theme === 'dark' || theme === 'midnight' ? '#FCD34D' : '#F59E0B';
          const noteColor = theme === 'dark' || theme === 'midnight' ? '#60A5FA' : '#3B82F6';
          return isIdea
            ? 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${ideaColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8A6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>`)
            : 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${noteColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>`);
        },
        'background-width': '24px',
        'background-height': '24px',
        'background-position-x': '16px',
        'background-position-y': '16px',
        'background-fit': 'none',
        'background-clip': 'none',
        'background-image-opacity': 1,
      }
    },
    {
      selector: 'node[type = "note"]:selected',
      style: {
        'border-color': theme === 'dark' || theme === 'midnight' ? '#64AB6F' : '#059669',
        'border-width': 2,
        'overlay-opacity': 0.1,
        'overlay-color': theme === 'dark' || theme === 'midnight' ? '#64AB6F' : '#059669'
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
        'line-color': theme === 'dark' || theme === 'midnight' ? '#4B5563' : '#9CA3AF',
        'target-arrow-color': theme === 'dark' || theme === 'midnight' ? '#4B5563' : '#9CA3AF'
      }
    }
  ];

  return (
    <div className="h-full w-full relative">
      <CytoscapeComponent
        elements={elements}
        stylesheet={stylesheet}
        layout={graphLayout}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '600px',
          maxHeight: '80vh'
        }}
        cy={(cy) => {
          cyRef.current = cy;
          cy.minZoom(0.2);
          cy.maxZoom(3.0);
          cy.userZoomingEnabled(true);
          cy.userPanningEnabled(true);

          // Add click handlers that only handle selection and centering
          cy.on('tap', 'node', (event) => {
            const node = event.target;
            const nodeId = node.id();
            cy.nodes().unlock(); // Temporarily unlock for selection
            onNodeSelect(nodeId);
            // Delay the centering slightly to ensure selection is processed
            requestAnimationFrame(() => {
              centerOnNode(nodeId);
            });
            cy.nodes().lock(); // Lock again after selection
          });

          cy.on('tap', (event) => {
            if (event.target === cy) {
              cy.elements().unselect();
              onNodeSelect('');
              cy.animate({
                fit: {
                  eles: cy.elements(),
                  padding: 50
                },
                duration: 500,
                easing: 'ease-in-out',
                queue: false
              });
            }
          });
        }}
      />

      {/* Zoom Controls */}
      <div className="absolute bottom-44 right-6 bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 backdrop-blur-sm p-3 rounded-xl shadow-lg">
        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              if (!cyRef.current) return;
              const cy = cyRef.current;
              const currentZoom = cy.zoom();
              cy.animate({
                zoom: currentZoom * 1.2,
                duration: 200
              });
            }}
            className="p-2 hover:bg-white/30 dark:hover:bg-gray-700/30 rounded-lg transition-colors"
            title="Zoom in"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 dark:text-gray-400">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="11" y1="8" x2="11" y2="14"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          </button>
          <button
            onClick={() => {
              if (!cyRef.current) return;
              const cy = cyRef.current;
              const currentZoom = cy.zoom();
              cy.animate({
                zoom: currentZoom / 1.2,
                duration: 200
              });
            }}
            className="p-2 hover:bg-white/30 dark:hover:bg-gray-700/30 rounded-lg transition-colors"
            title="Zoom out"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 dark:text-gray-400">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          </button>
          <button
            onClick={() => {
              if (!cyRef.current) return;
              const cy = cyRef.current;
              cy.fit(undefined, 50);
            }}
            className="p-2 hover:bg-white/30 dark:hover:bg-gray-700/30 rounded-lg transition-colors"
            title="Fit to view"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 dark:text-gray-400">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path>
            </svg>
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-6 right-6 bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 backdrop-blur-sm p-3 rounded-xl shadow-lg">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className={`w-4 h-4 border-2 rounded bg-white/20 dark:bg-gray-800/20`} 
              style={{ borderColor: theme === 'dark' ? 'rgb(59, 130, 246)' : 'rgb(37, 99, 235)' }}>
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Notes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-4 h-4 border-2 rounded bg-white/20 dark:bg-gray-800/20`}
              style={{ borderColor: theme === 'dark' ? '#FCD34D' : '#F59E0B' }}>
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Ideas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-4 h-4 border-2 rounded bg-white/20 dark:bg-gray-800/20`}
              style={{ borderColor: theme === 'dark' ? '#64AB6F' : '#059669' }}>
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-4 h-4 border-2 rounded bg-white/20 dark:bg-gray-800/20`}
              style={{ borderColor: theme === 'dark' ? '#64AB6F' : '#059669' }}>
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">With Tasks</span>
          </div>
        </div>
      </div>
    </div>
  );
}