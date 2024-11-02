import React, { useEffect, useRef, useState } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import { useTheme } from '../../../contexts/ThemeContext';
import { useNotes } from '../../../contexts/NotesContext';
import type { Core, NodeSingular } from 'cytoscape';

interface GraphViewProps {
  onNodeSelect: (noteId: string) => void;
  isDetailsPanelOpen: boolean;
}

export function GraphView({ onNodeSelect, isDetailsPanelOpen }: GraphViewProps) {
  const { notes } = useNotes();
  const { theme } = useTheme();
  const cyRef = useRef<Core | null>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout>();
  const animationFrameRef = useRef<number>();
  const [isInitialized, setIsInitialized] = useState(false);

  // Filter notes to only include those with links
  const notesWithLinks = notes.filter(note => 
    note.linkedNoteIds && note.linkedNoteIds.length > 0
  );

  // Create nodes first
  const elements = notesWithLinks.map(note => ({
    data: { 
      id: note.id,
      label: note.title,
      isIdea: note.tags.includes('idea')
    }
  }));

  // Then create edges only between existing nodes
  const edges = notesWithLinks.flatMap(note => 
    (note.linkedNoteIds || [])
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

  const stylesheet = [
    {
      selector: 'node',
      style: {
        'background-color': theme === 'dark' ? '#1E1E1E' : '#FFFFFF',
        'border-color': theme === 'dark' ? '#4a9153' : '#388E3C',
        'border-width': 2,
        'label': 'data(label)',
        'color': theme === 'dark' ? '#E3E3E3' : '#333333',
        'text-valign': 'center',
        'text-halign': 'center',
        'font-size': '12px',
        'font-weight': '500',
        'width': '120px',
        'height': '40px',
        'padding': '5px',
        'text-wrap': 'wrap',
        'text-max-width': '100px',
        'shape': 'roundrectangle',
        'text-margin-y': '2px',
        'transition-property': 'background-color, border-color, border-width',
        'transition-duration': '0.2s',
        'text-outline-color': theme === 'dark' ? '#1E1E1E' : '#FFFFFF',
        'text-outline-width': 1,
        'min-zoomed-font-size': 8,
        'transition-timing-function': 'ease-in-out'
      }
    },
    {
      selector: 'node[?isPinned]',
      style: {
        'border-width': 3,
        'border-color': theme === 'dark' ? '#66BB6A' : '#43A047',
      }
    },
    {
      selector: 'node[?isFavorite]',
      style: {
        'background-color': theme === 'dark' ? '#2C1810' : '#FFF8E1',
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': theme === 'dark' ? '#4a9153' : '#388E3C',
        'target-arrow-color': theme === 'dark' ? '#4a9153' : '#388E3C',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'arrow-scale': 0.8,
        'opacity': 0.8,
        'transition-property': 'opacity, line-color',
        'transition-duration': '0.2s',
        'transition-timing-function': 'ease-in-out'
      }
    },
    {
      selector: ':selected',
      style: {
        'border-width': 3,
        'border-color': theme === 'dark' ? '#66BB6A' : '#43A047',
      }
    }
  ];

  const layout = {
    name: 'cose',
    animate: false,
    nodeDimensionsIncludeLabels: true,
    padding: 50,
    componentSpacing: 100,
    nodeRepulsion: 8000,
    idealEdgeLength: 100,
    edgeElasticity: 0.45,
    nestingFactor: 0.1,
    gravity: 0.3,
    numIter: 1000,
    initialTemp: 200,
    coolingFactor: 0.95,
    minTemp: 1.0,
    fit: true,
    spacingFactor: 1.2
  };

  const smoothPanAndZoom = (targetPan: any, targetZoom: number, duration: number = 300) => {
    if (!cyRef.current) return;

    const cy = cyRef.current;
    const startPan = { ...cy.pan() };
    const startZoom = cy.zoom();
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Cubic easing
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      const currentPan = {
        x: startPan.x + (targetPan.x - startPan.x) * eased,
        y: startPan.y + (targetPan.y - startPan.y) * eased
      };
      const currentZoom = startZoom + (targetZoom - startZoom) * eased;

      cy.viewport({
        zoom: currentZoom,
        pan: currentPan
      });

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(animate);
  };

  const centerGraph = () => {
    if (cyRef.current) {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }

      resizeTimeoutRef.current = setTimeout(() => {
        const cy = cyRef.current;
        if (cy) {
          cy.fit(undefined, 50);
          const targetPan = cy.pan();
          const targetZoom = cy.zoom();
          smoothPanAndZoom(targetPan, targetZoom);
        }
      }, 300);
    }
  };

  useEffect(() => {
    if (isInitialized) {
      centerGraph();
    }
  }, [isDetailsPanelOpen, isInitialized]);

  useEffect(() => {
    if (cyRef.current) {
      const cy = cyRef.current;

      cy.on('tap', 'node', (event: any) => {
        const nodeId = event.target.id();
        onNodeSelect(nodeId);
      });

      cy.minZoom(0.5);
      cy.maxZoom(2);

      const resizeObserver = new ResizeObserver(() => {
        centerGraph();
      });

      const container = cy.container();
      if (container) {
        resizeObserver.observe(container);
      }

      setIsInitialized(true);

      return () => {
        cy.removeAllListeners();
        resizeObserver.disconnect();
        if (resizeTimeoutRef.current) {
          clearTimeout(resizeTimeoutRef.current);
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [onNodeSelect]);

  return (
    <div className="h-full relative">
      <CytoscapeComponent
        elements={graphElements}
        stylesheet={stylesheet}
        layout={layout}
        style={{ width: '100%', height: '100%' }}
        cy={(cy) => { cyRef.current = cy; }}
        wheelSensitivity={0.2}
      />
    </div>
  );
}