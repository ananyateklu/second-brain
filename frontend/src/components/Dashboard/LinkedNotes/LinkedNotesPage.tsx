import React, { useState, useMemo } from 'react';
import { GraphView } from './GraphView';
import { NoteDetailsPanel } from './NoteDetailsPanel';
import { ListView } from './ListView';
import { List, Network, Link2, Type, Lightbulb, GitBranch } from 'lucide-react';
import { Note, useNotes } from '../../../contexts/NotesContext';

interface NoteConnection {
  noteId: string;
  createdAt: string;
}

interface NoteWithConnections extends Note {
  connections?: NoteConnection[];
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
          const connection = note.connections?.find(c => c.noteId === id);
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
      {/* Keep the existing background gradient */}
      <div className="fixed inset-0 bg-fixed dark:bg-gradient-to-br dark:from-gray-900 dark:via-slate-900 dark:to-slate-800 bg-gradient-to-br from-white to-gray-100 -z-10" />

      <div className="space-y-6 relative">
        {/* Stats Container */}
        <div className="bg-[#2C2C2E] dark:bg-[#2C2C2E] border border-[#2C2C2E] dark:border-[#2C2C2E] shadow-sm p-3 rounded-xl">
          <div className="flex flex-col gap-3">
            {/* Title and View Toggle */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-[#64ab6f] dark:text-[#64ab6f]" />
                <h1 className="text-base font-semibold text-gray-100 dark:text-gray-100">
                  Linked Notes
                </h1>
              </div>

              {/* View Toggle Buttons */}
              <div className="flex gap-1.5">
                <button
                  onClick={() => setViewMode('graph')}
                  className={`p-1.5 rounded-lg transition-colors duration-200 ${
                    viewMode === 'graph'
                      ? 'bg-[#64ab6f]/20 text-[#64ab6f]'
                      : 'text-gray-400 hover:bg-[#1C1C1E]'
                  }`}
                  title="Graph View"
                >
                  <Network className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-colors duration-200 ${
                    viewMode === 'list'
                      ? 'bg-[#64ab6f]/20 text-[#64ab6f]'
                      : 'text-gray-400 hover:bg-[#1C1C1E]'
                  }`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Stats Display Grid - Reorganized to be more compact */}
            <div className="grid grid-cols-6 gap-1.5"> {/* Changed to 6 columns for better space usage */}
              {/* Basic Stats Row */}
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#2C2C2E] dark:border-[#2C2C2E] rounded-lg">
                <Type className="shrink-0 w-3.5 h-3.5 text-[#64ab6f]" />
                <div className="text-xs truncate">
                  <span className="text-[#64ab6f] font-medium">{stats.notes}</span>
                  <span className="text-gray-300"> Notes</span>
                </div>
              </div>

              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#2C2C2E] dark:border-[#2C2C2E] rounded-lg">
                <Lightbulb className="shrink-0 w-3.5 h-3.5 text-[#64ab6f] dark:text-[#64ab6f]" />
                <div className="text-xs truncate">
                  <span className="text-[#64ab6f] font-medium">{stats.ideas}</span>
                  <span className="text-gray-300"> Ideas</span>
                </div>
              </div>

              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#2C2C2E] dark:border-[#2C2C2E] rounded-lg">
                <Network className="shrink-0 w-3.5 h-3.5 text-[#64ab6f] dark:text-[#64ab6f]" />
                <div className="text-xs truncate">
                  <span className="text-[#64ab6f] font-medium">{stats.connectionDensity}%</span>
                </div>
              </div>

              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#2C2C2E] dark:border-[#2C2C2E] rounded-lg">
                <GitBranch className="shrink-0 w-3.5 h-3.5 text-[#64ab6f] dark:text-[#64ab6f]" />
                <div className="text-xs truncate">
                  <span className="text-[#64ab6f] font-medium">{stats.clusterCount}</span>
                  <span className="text-gray-300"> Topics</span>
                </div>
              </div>

              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#2C2C2E] dark:border-[#2C2C2E] rounded-lg">
                <Type className="shrink-0 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                <div className="text-xs truncate">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">{stats.isolatedNotes}</span>
                  <span className="text-gray-300"> Unconnected Notes</span>
                </div>
              </div>

              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#2C2C2E] dark:border-[#2C2C2E] rounded-lg">
                <Lightbulb className="shrink-0 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                <div className="text-xs truncate">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">{stats.isolatedIdeas}</span>
                  <span className="text-gray-300"> Unconnected Ideas</span>
                </div>
              </div>

              {/* Most Connected Items Row */}
              {stats.mostConnectedNote && stats.mostConnectedNote.connectionCount > 0 && (
                <div className={`col-span-3 flex items-center gap-2 px-3 py-1.5 bg-[#1C1C1E] dark:bg-[#1C1C1E] border transition-colors duration-200 rounded-lg ${
                  selectedNoteId === stats.mostConnectedNote.note.id
                    ? 'border-[#64ab6f]/50 dark:border-[#64ab6f]/50 bg-[#64ab6f]/10 dark:bg-[#64ab6f]/10'
                    : 'border-gray-200/50 dark:border-gray-700/30'
                }`}>
                  <Type className={`shrink-0 w-3.5 h-3.5 ${
                    selectedNoteId === stats.mostConnectedNote.note.id
                      ? 'text-[#64ab6f] dark:text-[#64ab6f]'
                      : 'text-[#64ab6f]/80 dark:text-[#64ab6f]/80'
                  }`} />
                  <button 
                    onClick={() => stats.mostConnectedNote?.note.id ? setSelectedNoteId(stats.mostConnectedNote.note.id) : null}
                    className="flex-1 flex items-center justify-between text-xs transition-colors"
                    title={stats.mostConnectedNote.note.title}
                  >
                    <span className={`truncate pr-3 ${
                      selectedNoteId === stats.mostConnectedNote.note.id
                        ? 'text-[#64ab6f] dark:text-[#64ab6f]'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      Most Connected: {stats.mostConnectedNote.note.title}
                    </span>
                    <span className="shrink-0 text-[#64ab6f] dark:text-[#64ab6f]">
                      ({stats.mostConnectedNote.connectionCount})
                    </span>
                  </button>
                </div>
              )}

              {stats.mostConnectedIdea && stats.mostConnectedIdea.connectionCount > 0 && (
                <div className={`col-span-3 flex items-center gap-2 px-3 py-1.5 bg-[#1C1C1E] dark:bg-[#1C1C1E] border transition-colors duration-200 rounded-lg ${
                  selectedNoteId === stats.mostConnectedIdea.note.id
                    ? 'border-[#64ab6f]/50 dark:border-[#64ab6f]/50 bg-[#64ab6f]/10 dark:bg-[#64ab6f]/10'
                    : 'border-gray-200/50 dark:border-gray-700/30'
                }`}>
                  <Lightbulb className={`shrink-0 w-3.5 h-3.5 ${
                    selectedNoteId === stats.mostConnectedIdea.note.id
                      ? 'text-[#64ab6f] dark:text-[#64ab6f]'
                      : 'text-[#64ab6f]/80 dark:text-[#64ab6f]/80'
                  }`} />
                  <button 
                    onClick={() => stats.mostConnectedIdea?.note.id ? setSelectedNoteId(stats.mostConnectedIdea.note.id) : null}
                    className="flex-1 flex items-center justify-between text-xs transition-colors"
                    title={stats.mostConnectedIdea.note.title}
                  >
                    <span className={`truncate pr-3 ${
                      selectedNoteId === stats.mostConnectedIdea.note.id
                        ? 'text-[#64ab6f] dark:text-[#64ab6f]'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      Most Connected: {stats.mostConnectedIdea.note.title}
                    </span>
                    <span className="shrink-0 text-[#64ab6f] dark:text-[#64ab6f]">
                      ({stats.mostConnectedIdea.connectionCount})
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-[#2C2C2E] dark:bg-[#2C2C2E] border border-[#2C2C2E] dark:border-[#2C2C2E] shadow-sm rounded-xl">
          <div className="h-[calc(100vh-320px)] flex relative"> {/* Added relative positioning here */}
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
              <div className="w-[30%] border-l border-[#2C2C2E] dark:border-[#2C2C2E]">
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