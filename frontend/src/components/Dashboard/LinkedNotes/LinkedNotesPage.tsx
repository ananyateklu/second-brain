import React, { useState, useMemo } from 'react';
import { GraphView } from './GraphView';
import { NoteDetailsPanel } from './NoteDetailsPanel';
import { ListView } from './ListView';
import { List, Network, Link2, Type, Lightbulb, Workflow, GitBranch } from 'lucide-react';
import { Note, useNotes } from '../../../contexts/NotesContext';
import { formatDistanceToNow } from 'date-fns';

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

        const note = notes.find(n => n.id === noteId);
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
    <div className="space-y-3">
      {/* Header Section */}
      <div className="bg-white/20 dark:bg-gray-800/20 border border-gray-200/50 dark:border-gray-700/30 shadow-sm p-3 rounded-xl">
        <div className="flex flex-col gap-3">
          {/* Title and View Toggle */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-primary-600 dark:text-primary-500" />
              <h1 className="text-base font-semibold text-gray-900 dark:text-white">
                Linked Notes
              </h1>
            </div>

            {/* View Toggle Buttons */}
            <div className="flex gap-1.5">
              <button
                onClick={() => setViewMode('graph')}
                className={`p-1.5 rounded-lg transition-colors duration-200 ${viewMode === 'graph'
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                title="Graph View"
              >
                <Network className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors duration-200 ${viewMode === 'list'
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
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
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white/20 dark:bg-gray-800/20 border border-gray-200/50 dark:border-gray-700/30 rounded-lg">
              <Type className="shrink-0 w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <div className="text-xs truncate">
                <span className="text-blue-600 dark:text-blue-400 font-medium">{stats.notes}</span>
                <span className="text-gray-700 dark:text-gray-300"> Notes</span>
              </div>
            </div>

            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white/20 dark:bg-gray-800/20 border border-gray-200/50 dark:border-gray-700/30 rounded-lg">
              <Lightbulb className="shrink-0 w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <div className="text-xs truncate">
                <span className="text-amber-600 dark:text-amber-400 font-medium">{stats.ideas}</span>
                <span className="text-gray-700 dark:text-gray-300"> Ideas</span>
              </div>
            </div>

            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white/20 dark:bg-gray-800/20 border border-gray-200/50 dark:border-gray-700/30 rounded-lg">
              <Network className="shrink-0 w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <div className="text-xs truncate">
                <span className="text-indigo-600 dark:text-indigo-400 font-medium">{stats.connectionDensity}%</span>
              </div>
            </div>

            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white/20 dark:bg-gray-800/20 border border-gray-200/50 dark:border-gray-700/30 rounded-lg">
              <GitBranch className="shrink-0 w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <div className="text-xs truncate">
                <span className="text-purple-600 dark:text-purple-400 font-medium">{stats.clusterCount}</span>
                <span className="text-gray-700 dark:text-gray-300"> Topics</span>
              </div>
            </div>

            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white/20 dark:bg-gray-800/20 border border-gray-200/50 dark:border-gray-700/30 rounded-lg">
              <Type className="shrink-0 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
              <div className="text-xs truncate">
                <span className="text-gray-500 dark:text-gray-400 font-medium">{stats.isolatedNotes}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white/20 dark:bg-gray-800/20 border border-gray-200/50 dark:border-gray-700/30 rounded-lg">
              <Lightbulb className="shrink-0 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
              <div className="text-xs truncate">
                <span className="text-gray-500 dark:text-gray-400 font-medium">{stats.isolatedIdeas}</span>
              </div>
            </div>

            {/* Most Connected Items Row */}
            {stats.mostConnectedNote && stats.mostConnectedNote.connectionCount > 0 && (
              <div className={`col-span-3 flex items-center gap-2 px-3 py-1.5 bg-white/20 dark:bg-gray-800/20 border transition-colors duration-200 rounded-lg ${
                selectedNoteId === stats.mostConnectedNote.note.id
                  ? 'border-blue-400/50 dark:border-blue-400/50 bg-blue-50/10 dark:bg-blue-900/10'
                  : 'border-gray-200/50 dark:border-gray-700/30'
              }`}>
                <Type className={`shrink-0 w-3.5 h-3.5 ${
                  selectedNoteId === stats.mostConnectedNote.note.id
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-blue-600/80 dark:text-blue-400/80'
                }`} />
                <button 
                  onClick={() => setSelectedNoteId(stats.mostConnectedNote?.note.id)}
                  className="flex-1 flex items-center justify-between text-xs transition-colors"
                  title={stats.mostConnectedNote.note.title}
                >
                  <span className={`truncate pr-3 ${
                    selectedNoteId === stats.mostConnectedNote.note.id
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    Most Connected: {stats.mostConnectedNote.note.title}
                  </span>
                  <span className="shrink-0 text-blue-600 dark:text-blue-400">
                    ({stats.mostConnectedNote.connectionCount})
                  </span>
                </button>
              </div>
            )}

            {stats.mostConnectedIdea && stats.mostConnectedIdea.connectionCount > 0 && (
              <div className={`col-span-3 flex items-center gap-2 px-3 py-1.5 bg-white/20 dark:bg-gray-800/20 border transition-colors duration-200 rounded-lg ${
                selectedNoteId === stats.mostConnectedIdea.note.id
                  ? 'border-amber-400/50 dark:border-amber-400/50 bg-amber-50/10 dark:bg-amber-900/10'
                  : 'border-gray-200/50 dark:border-gray-700/30'
              }`}>
                <Lightbulb className={`shrink-0 w-3.5 h-3.5 ${
                  selectedNoteId === stats.mostConnectedIdea.note.id
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-amber-600/80 dark:text-amber-400/80'
                }`} />
                <button 
                  onClick={() => setSelectedNoteId(stats.mostConnectedIdea?.note.id)}
                  className="flex-1 flex items-center justify-between text-xs transition-colors"
                  title={stats.mostConnectedIdea.note.title}
                >
                  <span className={`truncate pr-3 ${
                    selectedNoteId === stats.mostConnectedIdea.note.id
                      ? 'text-amber-700 dark:text-amber-300'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    Most Connected: {stats.mostConnectedIdea.note.title}
                  </span>
                  <span className="shrink-0 text-amber-600 dark:text-amber-400">
                    ({stats.mostConnectedIdea.connectionCount})
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white/20 dark:bg-gray-800/20 border border-gray-200/50 dark:border-gray-700/30 shadow-sm rounded-xl">
        <div className="h-[calc(100vh-290px)] flex">
          {/* Graph/List Container */}
          <div className={`${selectedNoteId ? 'w-[60%]' : 'w-full'} transition-all duration-300`}>
            {viewMode === 'graph' ? (
              notes.length > 0 ? (
                <GraphView
                  onNodeSelect={setSelectedNoteId}
                  selectedNoteId={selectedNoteId}
                  isDetailsPanelOpen={!!selectedNoteId}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-3">
                  <Link2 className="w-8 h-8 text-gray-400 dark:text-gray-600" />
                  <p className="text-gray-500 dark:text-gray-400">
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
            <div className="w-[40%] border-l border-gray-200/50 dark:border-gray-700/30">
              <NoteDetailsPanel
                selectedNoteId={selectedNoteId}
                onClose={() => setSelectedNoteId(null)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}