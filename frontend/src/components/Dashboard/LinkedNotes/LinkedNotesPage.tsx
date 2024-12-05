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

interface Connection {
  noteId: string;
  createdAt: string;
}

export function LinkedNotesPage() {
  const { notes } = useNotes();
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');

  // Calculate stats including most connected note and idea
  const stats = useMemo(() => {
    // Helper function to find clusters
    const findClusters = (notes: Note[]) => {
      const clusters = new Set<string>();
      const visited = new Set<string>();

      const dfs = (noteId: string, clusterId: string) => {
        if (visited.has(noteId)) return;
        visited.add(noteId);
        clusters.add(clusterId);

        const note = notes.find(n => n.id === noteId) as NoteWithConnections;
        note?.linkedNoteIds?.forEach(linkedId => {
          dfs(linkedId, clusterId);
        });
      };

      notes.forEach(note => {
        if (!visited.has(note.id)) {
          dfs(note.id, note.id);
        }
      });

      return clusters.size;
    };

    const counts = notes.reduce(
      (acc, note) => {
        const linkedNoteIds = note.linkedNoteIds || [];
        const linkedIdeas = linkedNoteIds.filter(id =>
          notes.find(n => n.id === id)?.tags?.includes('idea')
        );
        const linkedNotes = linkedNoteIds.filter(id =>
          !notes.find(n => n.id === id)?.tags?.includes('idea')
        );

        const isIdea = note.tags?.includes('idea');
        const hasIdeaConnections = linkedIdeas.length > 0;
        const hasNoteConnections = linkedNotes.length > 0;

        // Track cross-pollination
        if (hasIdeaConnections && hasNoteConnections) {
          acc.crossPollination++;
        }

        // Track recent connections
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        linkedNoteIds.forEach(id => {
          const connection = (note as NoteWithConnections).connections?.find((c: Connection) => c.noteId === id);
          if (connection?.createdAt) {
            const connectionDate = new Date(connection.createdAt);
            if (connectionDate > oneWeekAgo) {
              acc.recentConnectionsWeek++;
            }
            if (connectionDate > oneMonthAgo) {
              acc.recentConnectionsMonth++;
            }
          }
        });

        // Calculate total possible connections
        if (isIdea) {
          acc.totalIdeas++;
          if (linkedNoteIds.length === 0) acc.isolatedIdeas++;
        } else {
          acc.totalNotes++;
          if (linkedNoteIds.length === 0) acc.isolatedNotes++;
        }

        // Track most connected note and idea
        if (!isIdea && linkedNoteIds.length > (acc.mostConnectedNote?.connectionCount || 0)) {
          acc.mostConnectedNote = {
            note: note,
            connectionCount: linkedNoteIds.length
          };
        }

        if (isIdea && linkedNoteIds.length > (acc.mostConnectedIdea?.connectionCount || 0)) {
          acc.mostConnectedIdea = {
            note: note,
            connectionCount: linkedNoteIds.length
          };
        }

        return {
          ...acc,
          notes: acc.notes + linkedNotes.length,
          ideas: acc.ideas + linkedIdeas.length,
          totalConnections: acc.totalConnections + linkedNoteIds.length,
        };
      },
      {
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
        mostConnectedIdea: null as { note: Note, connectionCount: number } | null
      }
    );

    // Calculate connection density
    const totalPossibleConnections = (counts.totalNotes + counts.totalIdeas) * (counts.totalNotes + counts.totalIdeas - 1) / 2;
    const connectionDensity = totalPossibleConnections > 0
      ? Math.round((counts.totalConnections / totalPossibleConnections) * 100)
      : 0;

    // Calculate clusters
    const clusterCount = findClusters(notes);

    // Calculate growth (assuming we store previous month's connection count somewhere)
    const previousMonthConnections = 0; // This should come from storage/API
    const growthRate = previousMonthConnections > 0
      ? Math.round(((counts.totalConnections - previousMonthConnections) / previousMonthConnections) * 100)
      : 0;

    return {
      ...counts,
      connectionDensity,
      clusterCount,
      growthRate
    };
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
        <div className="flex-none relative overflow-hidden rounded-lg bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 shadow-sm mb-2">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent" />
          <div className="relative px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-cyan-100/50 dark:bg-cyan-900/30 rounded-lg">
                  <Link2 className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
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
                  className={`p-1.5 rounded-lg border border-gray-200/30 dark:border-gray-700/30 transition-all ${
                    viewMode === 'graph'
                      ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400'
                      : 'bg-white/20 dark:bg-gray-800/20 text-gray-600 dark:text-gray-400 hover:bg-white/30 dark:hover:bg-gray-800/30'
                  }`}
                  title="Graph View"
                >
                  <Network className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg border border-gray-200/30 dark:border-gray-700/30 transition-all ${
                    viewMode === 'list'
                      ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400'
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
                <Type className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span className="font-medium text-cyan-600 dark:text-cyan-400">{stats.notes}</span>
                <span className="text-gray-600 dark:text-gray-400">Notes</span>
              </div>

              <div className="flex items-center gap-1">
                <Lightbulb className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
                <span className="font-medium text-yellow-600 dark:text-yellow-400">{stats.ideas}</span>
                <span className="text-gray-600 dark:text-gray-400">Ideas</span>
              </div>

              <div className="flex items-center gap-1">
                <Network className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span className="font-medium text-cyan-600 dark:text-cyan-400">{stats.connectionDensity}%</span>
                <span className="text-gray-600 dark:text-gray-400">Density</span>
              </div>

              <div className="flex items-center gap-1">
                <GitBranch className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span className="font-medium text-cyan-600 dark:text-cyan-400">{stats.clusterCount}</span>
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
        <div className="flex-1 bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 shadow-sm rounded-xl overflow-hidden">
          <div className="h-full flex relative">
            {/* Graph/List Container */}
            <div className={`${selectedNoteId ? 'w-[70%]' : 'w-full'} transition-all duration-300`}>
              {viewMode === 'graph' ? (
                notes.length > 0 ? (
                  <GraphView
                    onNodeSelect={setSelectedNoteId}
                    selectedNoteId={selectedNoteId}
                    isDetailsPanelOpen={!!selectedNoteId}
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-3">
                    <Link2 className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                    <p className="text-gray-600 dark:text-gray-400">
                      No connected notes to display
                    </p>
                  </div>
                )
              ) : (
                <ListView onNoteSelect={setSelectedNoteId} />
              )}
            </div>

            {/* Details Panel */}
            {selectedNoteId && (
              <div className="w-[30%] border-l border-gray-200/30 dark:border-gray-700/30">
                <NoteDetailsPanel
                  selectedNoteId={selectedNoteId}
                  onClose={() => setSelectedNoteId(null)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}