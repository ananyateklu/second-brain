import React, { useRef, useMemo } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import { useTheme } from '../../../contexts/ThemeContext';
import type { Stylesheet } from 'cytoscape';
import { Note } from '../../../types/note';

interface NotesGraphProps {
  notes: Note[];
  onNoteClick: (noteId: string) => void;
}

export function NotesGraph({ notes, onNoteClick }: NotesGraphProps) {
  const { theme } = useTheme();
  const cyRef = useRef<Cytoscape.Core | null>(null);

  const elements = React.useMemo(() => {
    // Only show notes that have connections
    const notesWithLinks = notes.filter(note =>
      note.linkedNoteIds && note.linkedNoteIds.length > 0
    );

    // Create nodes
    const nodes = notesWithLinks.map(note => ({
      data: {
        id: note.id,
        label: note.title,
        isFavorite: note.isFavorite,
        isPinned: note.isPinned,
        isIdea: note.tags.includes('idea')
      },
      position: { x: 0, y: 0 } // Add initial position
    }));

    // Create edges (only between existing nodes)
    const edges = notesWithLinks.flatMap(note =>
      (note.linkedNoteIds || [])
        .filter(targetId => notesWithLinks.some(n => n.id === targetId))
        .map(targetId => ({
          data: {
            id: `${note.id}-${targetId}`,
            source: note.id,
            target: targetId,
          }
        }))
    );

    return [...nodes, ...edges];
  }, [notes]);

  // Update layout to match LinkedNotes
  const layout = {
    name: 'concentric',
    fit: true,
    padding: 50,
    spacingFactor: 0.85,
    minNodeSpacing: 50,
    concentric: (node: any) => node.connectedEdges().length,
    levelWidth: () => 2.5,
    animate: false,
    animationDuration: 500,
    animationEasing: 'ease-out'
  };

  const stylesheet: Stylesheet[] = [
    {
      selector: 'node',
      style: {
        'background-color': theme === 'dark' ? '#1E1E1E' : '#FFFFFF',
        'border-color': theme === 'dark' ? '#2196F3' : '#1976D2',
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
        'transition-duration': '0.2s'
      }
    },
    {
      selector: 'node[?isIdea]',
      style: {
        'border-color': theme === 'dark' ? '#FFA726' : '#FB8C00',
        'border-width': 1.5,
        'border-style': 'solid'
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
      selector: 'node[?isPinned]',
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
        'background-color': theme === 'dark' ? '#2A332A' : '#F0F7F0'
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

  return (
    <div className="relative h-full backdrop-blur-sm bg-white/30 dark:bg-gray-800/30 border border-gray-200/30 dark:border-gray-700/30 rounded-xl overflow-hidden">
      <CytoscapeComponent
        elements={elements}
        stylesheet={stylesheet}
        layout={layout}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '400px'
        }}
        cy={(cy) => {
          cyRef.current = cy;
          cy.minZoom(0.5);
          cy.maxZoom(2.0);
          
          cy.on('tap', 'node', (event) => {
            const nodeId = event.target.id();
            onNoteClick(nodeId);
          });
          
          cy.fit(undefined, 50);
        }}
        wheelSensitivity={0.2}
      />
      
      <div className="absolute bottom-4 right-4 backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-gray-200/30 dark:border-gray-700/30 p-3 rounded-lg shadow-lg">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 rounded bg-white/50 dark:bg-gray-800/50"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Notes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-orange-500 rounded bg-white/50 dark:bg-gray-800/50"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Ideas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-green-500 rounded bg-[#F0F7F0] dark:bg-[#2A332A]"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Selected</span>
          </div>
        </div>
      </div>
    </div>
  );
} 