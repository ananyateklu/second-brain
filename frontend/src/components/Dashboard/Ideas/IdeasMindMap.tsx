import React, { useEffect, useRef } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import { useTheme } from '../../../contexts/ThemeContext';
import { Note } from '../../../contexts/NotesContext';

interface IdeasMindMapProps {
  ideas: Note[];
  onIdeaClick: (ideaId: string) => void;
}

export function IdeasMindMap({ ideas, onIdeaClick }: IdeasMindMapProps) {
  const { theme } = useTheme();
  const cyRef = useRef<any>(null);

  const elements = React.useMemo(() => {
    const nodes = ideas.map(idea => ({
      data: {
        id: idea.id,
        label: idea.title,
        isFavorite: idea.isFavorite
      }
    }));

    const edges = ideas.flatMap(idea =>
      (idea.linkedNotes || [])
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
        'min-zoomed-font-size': 8
      }
    },
    {
      selector: 'node[?isFavorite]',
      style: {
        'border-color': '#F59E0B',
        'border-width': 3
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
        'opacity': 0.8
      }
    },
    {
      selector: ':selected',
      style: {
        'border-width': 3,
        'border-color': theme === 'dark' ? '#66BB6A' : '#43A047'
      }
    }
  ];

  useEffect(() => {
    if (cyRef.current) {
      const cy = cyRef.current;

      cy.on('tap', 'node', (event: any) => {
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
    <div className="h-[500px] glass-morphism rounded-xl overflow-hidden">
      <CytoscapeComponent
        elements={elements}
        stylesheet={stylesheet}
        layout={{
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
          minTemp: 1.0
        }}
        style={{ width: '100%', height: '100%' }}
        cy={(cy) => { cyRef.current = cy; }}
        wheelSensitivity={0.2}
      />
    </div>
  );
}