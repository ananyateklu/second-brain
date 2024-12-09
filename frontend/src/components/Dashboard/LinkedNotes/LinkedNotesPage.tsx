import { useState, useMemo } from 'react';
import { GraphView } from './GraphView';
import { NoteDetailsPanel } from './NoteDetailsPanel';
import { ListView } from './ListView';
import { List, Network, Link2, Type, Lightbulb, GitBranch } from 'lucide-react';
import type { Note } from '../../../types/note';
import { useNotes } from '../../../contexts/notesContextUtils';

interface NoteConnection {
  noteId: string;
  createdAt: string;
}

interface NoteWithConnections extends Note {
  connections?: NoteConnection[];
}

const renderContent = (
  viewMode: 'graph' | 'list',
  notes: Note[],
  handleNodeSelect: (noteId: string) => void,
  selectedNoteId: string | null
) => {
  if (viewMode !== 'graph') {
    return <ListView onNoteSelect={handleNodeSelect} />;
  }
  
  if (!notes.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3">
        <Link2 className="w-8 h-8 text-gray-600 dark:text-gray-400" />
        <p className="text-gray-600 dark:text-gray-400">
          No connected notes to display
        </p>
      </div>
    );
  }
  
  return (
    <GraphView
      onNodeSelect={handleNodeSelect}
      selectedNoteId={selectedNoteId}
    />
  );
};

const calculateConnectionStats = (note: Note, notes: Note[]) => {
  const linkedNoteIds = note.linkedNoteIds || [];
  const linkedIdeas = linkedNoteIds.filter(id => 
    notes.find(n => n.id === id)?.tags?.includes('idea')
  );
  const linkedNotes = linkedNoteIds.filter(id => 
    !notes.find(n => n.id === id)?.tags?.includes('idea')
  );
  
  return { linkedNoteIds, linkedIdeas, linkedNotes };
};

const processNoteConnections = (note: NoteWithConnections, oneWeekAgo: Date, oneMonthAgo: Date) => {
  let recentWeek = 0;
  let recentMonth = 0;
  
  note.linkedNoteIds?.forEach(id => {
    const connection = note.connections?.find(c => c.noteId === id);
    if (connection?.createdAt) {
      const connectionDate = new Date(connection.createdAt);
      if (connectionDate > oneWeekAgo) recentWeek++;
      if (connectionDate > oneMonthAgo) recentMonth++;
    }
  });
  
  return { recentWeek, recentMonth };
};

const findClusters = (notes: Note[]) => {
  const visited = new Set<string>();
  const clusters = new Set<string>();

  notes.forEach(note => {
    if (!visited.has(note.id)) {
      clusters.add(note.id);
      const stack = [note.id];
      
      while (stack.length > 0) {
        const currentId = stack.pop()!;
        visited.add(currentId);
        
        const currentNote = notes.find(n => n.id === currentId);
        currentNote?.linkedNoteIds?.forEach(linkedId => {
          if (!visited.has(linkedId)) {
            stack.push(linkedId);
          }
        });
      }
    }
  });

  return clusters.size;
};

export function LinkedNotesPage() {
  const { notes } = useNotes();
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');

  const handleNodeSelect = (noteId: string) => {
    console.log('handleNodeSelect called with:', noteId);
    setSelectedNoteId(noteId);
    console.log('selectedNoteId set to:', noteId);
  };

  // Calculate stats including most connected note and idea
  const stats = useMemo(() => {
    const counts = notes.reduce((acc, note) => {
      const { linkedNoteIds, linkedIdeas, linkedNotes } = calculateConnectionStats(note, notes);
      const isIdea = note.tags?.includes('idea');
      
      const { recentWeek, recentMonth } = processNoteConnections(
        note as NoteWithConnections,
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      );

      // Use isIdea for calculations
      if (isIdea) {
        acc.totalIdeas++;
        if (linkedNoteIds.length === 0) acc.isolatedIdeas++;
      } else {
        acc.totalNotes++;
        if (linkedNoteIds.length === 0) acc.isolatedNotes++;
      }

      return {
        ...acc,
        notes: acc.notes + linkedNotes.length,
        ideas: acc.ideas + linkedIdeas.length,
        totalConnections: acc.totalConnections + linkedNoteIds.length,
        recentConnectionsWeek: acc.recentConnectionsWeek + recentWeek,
        recentConnectionsMonth: acc.recentConnectionsMonth + recentMonth
      };
    }, {
      notes: 0,
      ideas: 0,
      totalConnections: 0,
      totalNotes: 0,
      totalIdeas: 0,
      isolatedNotes: 0,
      isolatedIdeas: 0,
      crossPollination: 0,
      recentConnectionsWeek: 0,
      recentConnectionsMonth: 0,
      mostConnectedNote: null as { note: Note, connectionCount: number } | null,
      mostConnectedIdea: null as { note: Note, connectionCount: number } | null,
      connectionDensity: 0,
      clusterCount: 0
    });

    // Calculate connection density
    const totalPossibleConnections = (counts.totalNotes + counts.totalIdeas) * (counts.totalNotes + counts.totalIdeas - 1) / 2;
    counts.connectionDensity = totalPossibleConnections > 0
      ? Math.round((counts.totalConnections / totalPossibleConnections) * 100)
      : 0;

    // Calculate clusters
    counts.clusterCount = findClusters(notes);

    return counts;
  }, [notes]);

  // Add console.log to debug
  console.log('Most Connected Stats:', {
    note: stats.mostConnectedNote,
    idea: stats.mostConnectedIdea
  });

  return (
    <div className="h-[calc(100vh-9rem)] overflow-hidden bg-fixed">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-fixed dark:bg-gradient-to-br dark:from-gray-900 dark:via-slate-900 dark:to-slate-800 bg-gradient-to-br from-white to-gray-100 -z-10" />

      {/* Main content container */}
      <div className="flex flex-col h-full p-0.5">
        {/* Header - more compact version */}
        <div className="flex-none relative overflow-hidden rounded-lg bg-white/20 dark:bg-gray-800/20 border border-white/40 dark:border-white/30 shadow-sm mb-2 backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent" />
          <div className="relative px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100/50 dark:bg-blue-900/30 rounded-lg">
                  <Link2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Linked Notes</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {stats.totalConnections} connections • {stats.connectionDensity}% density
                  </p>
                </div>
              </div>

              {/* View Toggle Buttons */}
              <div className="flex gap-0.5">
                <button
                  onClick={() => setViewMode('graph')}
                  className={`p-1.5 rounded-lg border border-white/40 dark:border-white/30 transition-all ${
                    viewMode === 'graph'
                      ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                      : 'bg-white/20 dark:bg-gray-800/20 text-gray-600 dark:text-gray-400 hover:bg-white/30 dark:hover:bg-gray-800/30'
                  }`}
                  title="Graph View"
                >
                  <Network className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg border border-white/40 dark:border-white/30 transition-all ${
                    viewMode === 'list'
                      ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                      : 'bg-white/20 dark:bg-gray-800/20 text-gray-600 dark:text-gray-400 hover:bg-white/30 dark:hover:bg-gray-800/30'
                  }`}
                  title="List View"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Stats Row - more compact */}
            <div className="flex gap-3 text-sm mt-3">
              <div className="flex items-center gap-1">
                <Type className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-blue-600 dark:text-blue-400">{stats.notes}</span>
                <span className="text-gray-600 dark:text-gray-400">Notes</span>
              </div>

              <div className="flex items-center gap-1">
                <Lightbulb className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
                <span className="font-medium text-yellow-600 dark:text-yellow-400">{stats.ideas}</span>
                <span className="text-gray-600 dark:text-gray-400">Ideas</span>
              </div>

              <div className="flex items-center gap-1">
                <Network className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-blue-600 dark:text-blue-400">{stats.connectionDensity}%</span>
                <span className="text-gray-600 dark:text-gray-400">Density</span>
              </div>

              <div className="flex items-center gap-1">
                <GitBranch className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-blue-600 dark:text-blue-400">{stats.clusterCount}</span>
                <span className="text-gray-600 dark:text-gray-400">Topics</span>
              </div>

              <div className="flex items-center gap-1">
                <Type className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                <span className="font-medium text-gray-600 dark:text-gray-400">{stats.isolatedNotes}</span>
                <span className="text-gray-600 dark:text-gray-400">Unlinked</span>
              </div>

              <div className="flex items-center gap-1">
                <Lightbulb className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                <span className="font-medium text-gray-600 dark:text-gray-400">{stats.isolatedIdeas}</span>
                <span className="text-gray-600 dark:text-gray-400">Unlinked</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-white/20 dark:bg-gray-800/20 border border-white/40 dark:border-white/30 shadow-sm rounded-xl overflow-hidden backdrop-blur-xl">
          <div className="h-full flex relative">
            {/* Graph/List Container */}
            <div className={`${selectedNoteId ? 'w-[70%]' : 'w-full'} transition-all duration-300`}>
              {renderContent(viewMode, notes, handleNodeSelect, selectedNoteId)}
            </div>

            {/* Details Panel */}
            {selectedNoteId && (
              <div className="w-[30%] border-l border-white/40 dark:border-white/30">
                <NoteDetailsPanel
                  selectedNoteId={selectedNoteId}
                  onClose={() => {
                    console.log('Closing details panel');
                    setSelectedNoteId(null);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}