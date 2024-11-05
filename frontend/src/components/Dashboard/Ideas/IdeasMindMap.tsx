import React, { useEffect, useRef } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import { useTheme } from '../../../contexts/ThemeContext';
import { Note } from '../../../contexts/NotesContext';
import Cytoscape , { Stylesheet } from 'cytoscape';

interface IdeasMindMapProps {
  ideas: Note[];
  onIdeaClick: (ideaId: string) => void;
}

export function IdeasMindMap({ ideas, onIdeaClick }: IdeasMindMapProps) {
  const { theme } = useTheme();
  const cyRef = useRef<Cytoscape.Core | null>(null);

  const elements = React.useMemo(() => {
    const nodes = ideas.map(idea => ({
      data: {
        id: idea.id,
        label: idea.title,
        isFavorite: idea.isFavorite
      }
    }));

    const edges = ideas.flatMap(idea =>
      (idea.linkedNoteIds || [])
        .filter(linkedId => ideas.some(i => i.id === linkedId))
        .map(linkedId => ({
          data: {
            id: `${idea.id}-${linkedId}`,
            source: idea.id,
            target: linkedId,
          }
        }))
    );

    return [...nodes, ...edges];
  }, [ideas]);

  const stylesheet: Stylesheet[] = [
    {
      selector: 'node',
      style: {
        'background-color': theme === 'dark' ? '#1E1E1E' : '#FFFFFF',
        'border-color': theme === 'dark' ? '#FFA726' : '#FB8C00',
        'border-width': 1.5,
        'border-style': 'solid',
        'label': 'data(label)',
        'color': theme === 'dark' ? '#E3E3E3' : '#333333',
        'text-valign': 'center',
        'text-halign': 'center',
        'font-size': '8px',
        'width': '60px',
        'height': '25px',
        'text-wrap': 'wrap',
        'text-max-width': '85px',
        'shape': 'round-rectangle',
        'text-outline-color': theme === 'dark' ? '#1E1E1E' : '#FFFFFF',
        'text-outline-width': 1.5,
        'min-zoomed-font-size': 8,
        'transition-property': 'border-color, border-width',
        'transition-duration': '0.2s',
      }
    },
    {
      selector: 'node[?isFavorite]',
      style: {
        'border-width': 1.5,
        'border-style': 'solid'
      }
    },
    {
      selector: ':selected',
      style: {
        'border-color': theme === 'dark' ? '#66BB6A' : '#43A047',
        'border-width': 1.5,
        'border-style': 'solid',
        'background-color': theme === 'dark' ? '#2A332A' : '#F0F7F0',
        'transition-property': 'border-color, background-color',
        'transition-duration': '0.2s'
      }
    },
    {
      selector: 'edge',
      style: {
        'target-arrow-shape': 'triangle-tee',
        'arrow-scale': 0.7,
        'width': 1.4,
        'target-endpoint': '0%',
        'source-endpoint': '100%',
        'edge-distances': 'node-position',
        'curve-style': 'straight',
        'opacity': 0.75,
        'target-distance-from-node': 6,
        'line-color': theme === 'dark' ? '#5a5a5a' : '#3a3a3a',
        'target-arrow-color': theme === 'dark' ? '#5a5a5a' : '#3a3a3a'
      }
    }
  ];

  const layout = {
    name: 'concentric',
    fit: true,
    padding: 50,
    spacingFactor: 0.85,
    minNodeSpacing: 50,
    concentric: (node: any) => node.connectedEdges().length,
    levelWidth: () => 2.5,
    animate: false
  };

  useEffect(() => {
    if (cyRef.current) {
      const cy = cyRef.current;

      cy.on('tap', 'node', (event: Cytoscape.EventObject) => {
        const nodeId = event.target.id();
        onIdeaClick(nodeId);
      });

      cy.fit(undefined, 50);
    }
  }, [onIdeaClick]);

  if (ideas.length === 0) {
    return (
      <div className="h-[500px] flex items-center justify-center text-gray-500 dark:text-gray-400">
        No ideas to display in mind map
      </div>
    );
  }

  return (
    <div className="h-[500px] glass-morphism rounded-xl overflow-hidden relative">
      <CytoscapeComponent
        elements={elements}
        stylesheet={stylesheet}
        layout={layout}
        style={{ width: '100%', height: '100%' }}
        cy={(cy) => {
          cyRef.current = cy;
          cy.minZoom(0.5);
          cy.maxZoom(2.0);
        }}
        wheelSensitivity={0.2}
      />
      
      <div className="absolute bottom-4 right-4 bg-opacity-80 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-orange-500 rounded"></div>
            <span className="text-sm">Ideas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-orange-500 rounded"></div>
            <span className="text-sm">Favorites</span>
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
