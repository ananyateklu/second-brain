import { useState, useMemo } from 'react';
import { GraphView } from './GraphView';
import { NoteDetailsPanel } from './NoteDetailsPanel';
import { ListView } from './ListView';
import { List, Network, Link2, Type, Lightbulb, GitBranch } from 'lucide-react';
import type { Note } from '../../../types/note';
import { useNotes } from '../../../contexts/notesContextUtils';
import { useTheme } from '../../../contexts/themeContextUtils';

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

const getContainerBackground = (theme: string) => {
  if (theme === 'dark') return 'bg-gray-900/30 backdrop-blur-xl';
  if (theme === 'midnight') return 'bg-[#1e293b]/30 backdrop-blur-xl';
  return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))] backdrop-blur-xl';
};

const getHeaderBackground = (theme: string) => {
  if (theme === 'dark') return 'bg-gray-800/20';
  if (theme === 'midnight') return 'bg-[#1e293b]/20';
  return 'bg-white/20';
};

const getButtonBackground = (isActive: boolean, theme: string) => {
  if (isActive) {
    return 'bg-blue-500/20 text-blue-600 dark:text-blue-400';
  }

  if (theme === 'dark') {
    return 'bg-gray-800/20 text-gray-400 hover:bg-gray-800/30';
  }
  if (theme === 'midnight') {
    return 'bg-[#1e293b]/20 text-gray-400 hover:bg-[#1e293b]/30';
  }
  return 'bg-white/20 text-gray-600 hover:bg-white/30';
};

export function LinkedNotesPage() {
  const { notes } = useNotes();
  const { theme } = useTheme();
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');

  const handleNodeSelect = (noteId: string) => {
    setSelectedNoteId(noteId);
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

  return (
    <div className="h-[calc(100vh-11rem)] overflow-visible bg-fixed">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-fixed dark:bg-gradient-to-br dark:from-gray-900 dark:via-slate-900 dark:to-slate-800 bg-gradient-to-br from-white to-gray-100 -z-10" />

      <div className="flex flex-col h-full mx-3 mt-1 mb-1 space-y-1.5">
        {/* Header - more compact version */}
        <div className={`
          relative 
          overflow-visible 
          rounded-lg 
          ${getHeaderBackground(theme)} 
          border-[0.5px] 
          border-white/10
          shadow-[4px_0_24px_-2px_rgba(0,0,0,0.12),8px_0_16px_-4px_rgba(0,0,0,0.08)]
          dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)]
          ring-1
          ring-white/5
          backdrop-blur-xl
        `}>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent" />
          <div className="relative px-2 py-0.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-blue-100/50 dark:bg-blue-900/30 rounded-lg">
                  <Link2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[var(--color-text)]">Linked Notes</h1>
                  <p className="text-xs text-[var(--color-textSecondary)]">
                    {stats.totalConnections} connections • {stats.connectionDensity}% density
                  </p>
                </div>
              </div>

              {/* View Toggle Buttons */}
              <div className="flex gap-0.5">
                <button
                  onClick={() => setViewMode('graph')}
                  className={`p-1 rounded-lg border border-white/40 dark:border-white/30 transition-all ${getButtonBackground(viewMode === 'graph', theme)}`}
                  title="Graph View"
                >
                  <Network className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1 rounded-lg border border-white/40 dark:border-white/30 transition-all ${getButtonBackground(viewMode === 'list', theme)}`}
                  title="List View"
                >
                  <List className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Stats Row - more compact */}
            <div className="flex gap-3 text-xs mt-1">
              <div className="flex items-center gap-1">
                <Type className="w-3 h-3 text-[var(--color-note)]" />
                <span className="font-medium text-[var(--color-note)]">{stats.notes}</span>
                <span className="text-[var(--color-textSecondary)]">Notes</span>
              </div>

              <div className="flex items-center gap-1">
                <Lightbulb className="w-3 h-3 text-[var(--color-idea)]" />
                <span className="font-medium text-[var(--color-idea)]">{stats.ideas}</span>
                <span className="text-[var(--color-textSecondary)]">Ideas</span>
              </div>

              <div className="flex items-center gap-1">
                <Network className="w-3 h-3 text-[var(--color-note)]" />
                <span className="font-medium text-[var(--color-note)]">{stats.connectionDensity}%</span>
                <span className="text-[var(--color-textSecondary)]">Density</span>
              </div>

              <div className="flex items-center gap-1">
                <GitBranch className="w-3 h-3 text-[var(--color-note)]" />
                <span className="font-medium text-[var(--color-note)]">{stats.clusterCount}</span>
                <span className="text-[var(--color-textSecondary)]">Topics</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className={`
          flex-1
          min-h-0
          relative 
          rounded-lg 
          ${getContainerBackground(theme)} 
          border-[0.5px] 
          border-white/10
          shadow-[4px_0_24px_-2px_rgba(0,0,0,0.12),8px_0_16px_-4px_rgba(0,0,0,0.08)]
          dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)]
          ring-1
          ring-white/5
          overflow-visible
        `}>
          <div className="flex h-full overflow-auto">
            <div className={`flex-1 ${selectedNoteId ? 'border-r border-[var(--color-border)]' : ''}`}>
              {renderContent(viewMode, notes, handleNodeSelect, selectedNoteId)}
            </div>
            {selectedNoteId && (
              <div className="w-96">
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