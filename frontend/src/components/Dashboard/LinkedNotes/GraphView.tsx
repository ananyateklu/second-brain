import { useEffect, useRef, useCallback } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import { useTheme } from '../../../contexts/ThemeContext';
import { useNotes } from '../../../contexts/NotesContext';
import type { Core, NodeSingular, Stylesheet } from 'cytoscape';

interface GraphViewProps {
  onNodeSelect: (noteId: string) => void;
  isDetailsPanelOpen: boolean;
  selectedNoteId: string | null;
}

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

  // Layout configuration - only run once at initial render
  const layout = {
    name: 'cose',
    fit: true,
    padding: 100,
    animate: 'end',
    animationDuration: 1000,
    animationEasing: 'ease-out',
    nodeDimensionsIncludeLabels: true,
    // Spacing and organization
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
    // Layout settings
    randomize: false,
    refresh: 30,
    componentSpacing: 150,
    maxSimulationTime: 8000,
    // Quality settings
    weaver: true,
    quality: "proof",
    // Prevent infinite layout
    infinite: false,
    // Don't lock nodes after layout
    stop: () => {
      if (cyRef.current) {
        const cy = cyRef.current;
        // Only lock nodes that aren't being dragged
        cy.nodes().forEach(node => {
          node.unlock();
          node.grabify();
        });
      }
    }
  };

  // Function to smoothly center on a node without disturbing layout
  const centerOnNode = useCallback((nodeId: string) => {
    if (!cyRef.current) return;

    const cy = cyRef.current;
    const node = cy.$id(nodeId);
    
    if (!node.length) return;

    const currentZoom = cy.zoom();
    const targetZoom = Math.max(currentZoom, 1.5); // Set minimum zoom when centering
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

    // Function to organize nodes based on connections
    const organizeNodes = () => {
      const nodes = cy.nodes();
      const nodePositions = new Map<NodeSingular, { x: number; y: number }>();
      const padding = 30;

      nodes.forEach((node) => {
        const pos = node.position();
        const width = node.width();
        const height = node.height();
        
        let overlapping = true;
        let attempts = 0;
        const maxAttempts = 50;
        
        while (overlapping && attempts < maxAttempts) {
          overlapping = false;
          
          nodePositions.forEach((existingPos, existingNode) => {
            const dx = Math.abs(pos.x - existingPos.x);
            const dy = Math.abs(pos.y - existingPos.y);
            const minX = (width + existingNode.width()) / 2 + padding;
            const minY = (height + existingNode.height()) / 2 + padding;
            
            if (dx < minX && dy < minY) {
              overlapping = true;
              // Move connected nodes closer together
              if (node.edgesWith(existingNode).length > 0) {
                pos.x += (Math.random() - 0.5) * 50;
                pos.y += (Math.random() - 0.5) * 50;
              } else {
                pos.x += (Math.random() - 0.5) * 150;
                pos.y += (Math.random() - 0.5) * 150;
              }
            }
          });
          
          attempts++;
        }
        
        node.position(pos);
        nodePositions.set(node, pos);
      });
    };

    // Run initial layout
    cy.layout(layout).run();

    // After layout completes, organize nodes and then handle centering
    cy.one('layoutstop', () => {
      // First organize nodes
      organizeNodes();
      
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
  }, [isDetailsPanelOpen]);

  // Stylesheet configuration
  const stylesheet: Stylesheet[] = [
    {
      selector: 'node[type = "note"]',
      style: {
        'background-color': theme === 'dark' ? '#1E1E1E' : '#FFFFFF',
        'border-color': theme === 'dark' ? '#2196F3' : '#1976D2',
        'border-width': 2,
        'label': (node: NodeSingular) => {
          const title = node.data('label');
          const taskCount = node.data('taskCount');
          if (taskCount === 0) return title;

          const tasks = node.data('taskSummary').split('\n');
          const taskList = tasks.map((task: string) => 
            task.replace('✓', '✅').replace('○', '⭕️')
          ).join('\n');

          return `${title}\n\n${taskList}`;
        },
        'color': theme === 'dark' ? '#E3E3E3' : '#333333',
        'text-valign': 'center',
        'text-halign': 'center',
        'font-size': '14px',
        'font-family': 'system-ui, -apple-system, sans-serif',
        'font-weight': 500,
        'width': '200px',
        'height': (node: NodeSingular) => {
          const taskCount = node.data('taskCount') || 0;
          return Math.max(80, 60 + (taskCount * 25));
        },
        'text-wrap': 'wrap',
        'text-max-width': '180px',
        'shape': 'round-rectangle',
        'text-outline-color': theme === 'dark' ? '#1E1E1E' : '#FFFFFF',
        'text-outline-width': 2,
        'text-margin-y': 8,
        'min-zoomed-font-size': 10,
        'background-image': (node: NodeSingular) => {
          if (node.data('hasHighPriorityTasks')) {
            return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="10" fill="%23F44336" opacity="0.2"/></svg>';
          }
          return 'none';
        },
        'background-width': '100%',
        'background-height': '100%',
        'background-position-y': '100%',
        'background-opacity': 0.5,
        'border-style': (node: NodeSingular) => {
          return node.data('hasCompletedTasks') ? 'double' : 'solid';
        }
      }
    },
    {
      selector: 'node[?isIdea]',
      style: {
        'border-color': theme === 'dark' ? '#FFA726' : '#FB8C00',
        'border-width': 3,
        'border-style': 'solid'
      }
    },
    {
      selector: ':selected',
      style: {
        'border-color': theme === 'dark' ? '#66BB6A' : '#43A047',
        'border-width': 3,
        'background-color': theme === 'dark' ? '#2A332A' : '#F0F7F0',
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

  return (
    <div className="h-full w-full relative">
      <CytoscapeComponent
        elements={elements}
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

      {/* Zoom Controls - Moved further up */}
      <div className="absolute bottom-32 right-6 backdrop-blur-sm bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#2C2C2E] dark:border-[#2C2C2E] p-3 rounded-lg shadow-lg">
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
            className="p-2 hover:bg-[#2C2C2E] rounded-lg transition-colors"
            title="Zoom in"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
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
            className="p-2 hover:bg-[#2C2C2E] rounded-lg transition-colors"
            title="Zoom out"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
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
            className="p-2 hover:bg-[#2C2C2E] rounded-lg transition-colors"
            title="Fit to view"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path>
            </svg>
          </button>
        </div>
      </div>

      {/* Legend - Position unchanged */}
      <div className="absolute bottom-6 right-6 backdrop-blur-sm bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#2C2C2E] dark:border-[#2C2C2E] p-3 rounded-lg shadow-lg">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 rounded bg-[#1C1C1E] dark:bg-[#1C1C1E]"></div>
            <span className="text-sm text-gray-300">Notes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-amber-500 rounded bg-[#1C1C1E] dark:bg-[#1C1C1E]"></div>
            <span className="text-sm text-gray-300">Ideas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-[#64ab6f] rounded bg-[#2C2C2E] dark:bg-[#2C2C2E]"></div>
            <span className="text-sm text-gray-300">Selected</span>
          </div>
        </div>
      </div>
    </div>
  );
}