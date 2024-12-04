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
    <div className="min-h-screen overflow-x-hidden bg-fixed">
      {/* Background */}
      <div className="fixed inset-0 bg-[var(--color-background)] -z-10" />

      <div className="space-y-6 relative">
        {/* Stats Container */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm p-3 rounded-xl">
          <div className="flex flex-col gap-3">
            {/* Title and View Toggle */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-[var(--color-accent)]" />
                <h1 className="text-base font-semibold text-[var(--color-text)]">
                  Linked Notes
                </h1>
              </div>

              {/* View Toggle Buttons */}
              <div className="flex gap-1.5">
                <button
                  onClick={() => setViewMode('graph')}
                  className={`p-1.5 rounded-lg transition-colors duration-200 ${
                    viewMode === 'graph'
                      ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                      : 'text-[var(--color-textSecondary)] hover:bg-[var(--color-surface)]/80'
                  }`}
                  title="Graph View"
                >
                  <Network className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-colors duration-200 ${
                    viewMode === 'list'
                      ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                      : 'text-[var(--color-textSecondary)] hover:bg-[var(--color-surface)]/80'
                  }`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Stats Display Grid */}
            <div className="grid grid-cols-6 gap-1.5">
              {/* Basic Stats Items */}
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg">
                <Type className="shrink-0 w-3.5 h-3.5 text-[var(--color-accent)]" />
                <div className="text-xs truncate">
                  <span className="text-[var(--color-accent)] font-medium">{stats.notes}</span>
                  <span className="text-[var(--color-textSecondary)]"> Notes</span>
                </div>
              </div>

              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg">
                <Lightbulb className="shrink-0 w-3.5 h-3.5 text-[var(--color-accent)]" />
                <div className="text-xs truncate">
                  <span className="text-[var(--color-accent)] font-medium">{stats.ideas}</span>
                  <span className="text-[var(--color-textSecondary)]"> Ideas</span>
                </div>
              </div>

              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg">
                <Network className="shrink-0 w-3.5 h-3.5 text-[var(--color-accent)]" />
                <div className="text-xs truncate">
                  <span className="text-[var(--color-accent)] font-medium">{stats.connectionDensity}%</span>
                </div>
              </div>

              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg">
                <GitBranch className="shrink-0 w-3.5 h-3.5 text-[var(--color-accent)]" />
                <div className="text-xs truncate">
                  <span className="text-[var(--color-accent)] font-medium">{stats.clusterCount}</span>
                  <span className="text-[var(--color-textSecondary)]"> Topics</span>
                </div>
              </div>

              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg">
                <Type className="shrink-0 w-3.5 h-3.5 text-[var(--color-textSecondary)]" />
                <div className="text-xs truncate">
                  <span className="text-[var(--color-textSecondary)] font-medium">{stats.isolatedNotes}</span>
                  <span className="text-[var(--color-textSecondary)]"> Unconnected Notes</span>
                </div>
              </div>

              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg">
                <Lightbulb className="shrink-0 w-3.5 h-3.5 text-[var(--color-textSecondary)]" />
                <div className="text-xs truncate">
                  <span className="text-[var(--color-textSecondary)] font-medium">{stats.isolatedIdeas}</span>
                  <span className="text-[var(--color-textSecondary)]"> Unconnected Ideas</span>
                </div>
              </div>

              {/* Most Connected Items */}
              {stats.mostConnectedNote && stats.mostConnectedNote.connectionCount > 0 && (
                <div className={`col-span-3 flex items-center gap-2 px-3 py-1.5 bg-[var(--color-surface)] border transition-colors duration-200 rounded-lg ${
                  selectedNoteId === stats.mostConnectedNote.note.id
                    ? 'border-[var(--color-accent)]/50 bg-[var(--color-accent)]/10'
                    : 'border-[var(--color-border)]'
                }`}>
                  <Type className={`shrink-0 w-3.5 h-3.5 ${
                    selectedNoteId === stats.mostConnectedNote.note.id
                      ? 'text-[var(--color-accent)]'
                      : 'text-[var(--color-textSecondary)]/80'
                  }`} />
                  <button
                    onClick={() => stats.mostConnectedNote?.note.id ? setSelectedNoteId(stats.mostConnectedNote.note.id) : null}
                    className="flex-1 flex items-center justify-between text-xs transition-colors"
                    title={stats.mostConnectedNote.note.title}
                  >
                    <span className={`truncate pr-3 ${
                      selectedNoteId === stats.mostConnectedNote.note.id
                        ? 'text-[var(--color-accent)]'
                        : 'text-[var(--color-text)]'
                    }`}>
                      Most Connected: {stats.mostConnectedNote.note.title}
                    </span>
                    <span className="shrink-0 text-[var(--color-accent)]">
                      ({stats.mostConnectedNote.connectionCount})
                    </span>
                  </button>
                </div>
              )}

              {stats.mostConnectedIdea && stats.mostConnectedIdea.connectionCount > 0 && (
                <div className={`col-span-3 flex items-center gap-2 px-3 py-1.5 bg-[var(--color-surface)] border transition-colors duration-200 rounded-lg ${
                  selectedNoteId === stats.mostConnectedIdea.note.id
                    ? 'border-[var(--color-accent)]/50 bg-[var(--color-accent)]/10'
                    : 'border-[var(--color-border)]'
                }`}>
                  <Lightbulb className={`shrink-0 w-3.5 h-3.5 ${
                    selectedNoteId === stats.mostConnectedIdea.note.id
                      ? 'text-[var(--color-accent)]'
                      : 'text-[var(--color-textSecondary)]/80'
                  }`} />
                  <button
                    onClick={() => stats.mostConnectedIdea?.note.id ? setSelectedNoteId(stats.mostConnectedIdea.note.id) : null}
                    className="flex-1 flex items-center justify-between text-xs transition-colors"
                    title={stats.mostConnectedIdea.note.title}
                  >
                    <span className={`truncate pr-3 ${
                      selectedNoteId === stats.mostConnectedIdea.note.id
                        ? 'text-[var(--color-accent)]'
                        : 'text-[var(--color-text)]'
                    }`}>
                      Most Connected: {stats.mostConnectedIdea.note.title}
                    </span>
                    <span className="shrink-0 text-[var(--color-accent)]">
                      ({stats.mostConnectedIdea.connectionCount})
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm rounded-xl">
          <div className="h-[calc(100vh-320px)] flex relative">
            {/* Graph/List Container */}
            <div className={`${selectedNoteId ? 'w-[70%]' : 'w-full'} transition-all duration-300`}>
              {viewMode === 'graph' ? (
                notes.length > 0 ? (
                  <>
                    <GraphView
                      onNodeSelect={setSelectedNoteId}
                      selectedNoteId={selectedNoteId}
                      isDetailsPanelOpen={!!selectedNoteId}
                    />
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-3">
                    <Link2 className="w-8 h-8 text-gray-600" />
                    <p className="text-gray-400">
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
              <div className="w-[30%] border-l border-[var(--color-border)]/30">
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