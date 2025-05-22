import { useState, useMemo } from 'react';
import { GraphView } from './GraphView';
import { NoteDetailsPanel } from './NoteDetailsPanel';
import { TaskDetailsPanel } from './TaskDetailsPanel';
import { ListView } from './ListView';
import { List, Network, Link2, Type, Lightbulb, GitBranch, Info, CheckSquare, Bell } from 'lucide-react';
import type { Note, LinkedItem } from '../../../types/note';
import { useNotes } from '../../../contexts/notesContextUtils';
import { useTheme } from '../../../contexts/themeContextUtils';
import { shouldShowTooltip, markTooltipAsSeen } from './utils/graphStorage';
import { useIdeas } from '../../../contexts/ideasContextUtils';
import { useTasks } from '../../../contexts/tasksContextUtils';
import { useReminders } from '../../../contexts/remindersContextUtils';
import { Idea } from '../../../types/idea';
import { Task } from '../../../types/task';

interface NoteConnection {
  noteId: string;
  createdAt: string;
}

interface NoteWithConnections extends Note {
  connections?: NoteConnection[];
}

interface IdeaWithConnections extends Idea {
  connections?: NoteConnection[];
}

interface TaskWithConnections extends Task {
  connections?: NoteConnection[];
}

const renderContent = (
  viewMode: 'graph' | 'list',
  notes: Note[],
  ideas: Idea[],
  tasks: Task[],
  handleNodeSelect: (itemId: string, itemType: 'note' | 'idea' | 'task') => void,
  selectedItemId: string | null
) => {
  if (viewMode !== 'graph') {
    return <ListView onItemSelect={handleNodeSelect} />;
  }

  const hasItems = notes.length > 0 || ideas.length > 0 || tasks.length > 0;

  if (!hasItems) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3">
        <Link2 className="w-8 h-8 text-gray-600 dark:text-gray-400" />
        <p className="text-gray-600 dark:text-gray-400">
          No connected items to display
        </p>
      </div>
    );
  }

  return (
    <GraphView
      onNodeSelect={handleNodeSelect}
      selectedItemId={selectedItemId}
    />
  );
};

const processNoteConnections = (note: NoteWithConnections, oneWeekAgo: Date, oneMonthAgo: Date) => {
  let recentWeek = 0;
  let recentMonth = 0;

  if (note.linkedItems && note.linkedItems.length > 0) {
    const linkActivityDate = new Date(note.updatedAt || note.createdAt);
    if (linkActivityDate > oneWeekAgo) recentWeek += note.linkedItems.length;
    if (linkActivityDate > oneMonthAgo) recentMonth += note.linkedItems.length;
  }

  return { recentWeek, recentMonth };
};

const processIdeaConnections = (idea: IdeaWithConnections, oneWeekAgo: Date, oneMonthAgo: Date) => {
  let recentWeek = 0;
  let recentMonth = 0;

  if (idea.linkedItems && idea.linkedItems.length > 0) {
    const linkActivityDate = new Date(idea.updatedAt || idea.createdAt);
    if (linkActivityDate > oneWeekAgo) recentWeek += idea.linkedItems.length;
    if (linkActivityDate > oneMonthAgo) recentMonth += idea.linkedItems.length;
  }

  return { recentWeek, recentMonth };
};

const processTaskConnections = (task: TaskWithConnections, oneWeekAgo: Date, oneMonthAgo: Date) => {
  let recentWeek = 0;
  let recentMonth = 0;

  if (task.linkedItems && task.linkedItems.length > 0) {
    const linkActivityDate = new Date(task.updatedAt || task.createdAt);
    if (linkActivityDate > oneWeekAgo) recentWeek += task.linkedItems.length;
    if (linkActivityDate > oneMonthAgo) recentMonth += task.linkedItems.length;
  }

  return { recentWeek, recentMonth };
};

const findClusters = (notes: Note[], ideas: Idea[], tasks: Task[]) => {
  const visited = new Set<string>();
  const clusters = new Set<string>();

  // Process notes
  notes.forEach(note => {
    if (!visited.has(note.id)) {
      clusters.add(note.id);
      const stack = [note.id];

      while (stack.length > 0) {
        const currentId = stack.pop()!;
        visited.add(currentId);

        const currentNote = notes.find(n => n.id === currentId);
        currentNote?.linkedItems?.forEach((linkedItem: LinkedItem) => {
          if ((linkedItem.type === 'Note' || linkedItem.type === 'Idea' || linkedItem.type === 'Task') && !visited.has(linkedItem.id)) {
            stack.push(linkedItem.id);
          }
        });
      }
    }
  });

  // Process ideas
  ideas.forEach(idea => {
    if (!visited.has(idea.id)) {
      clusters.add(idea.id);
      const stack = [idea.id];

      while (stack.length > 0) {
        const currentId = stack.pop()!;
        visited.add(currentId);

        const currentIdea = ideas.find(i => i.id === currentId);
        currentIdea?.linkedItems?.forEach((item: LinkedItem) => {
          if ((item.type === 'Note' || item.type === 'Idea' || item.type === 'Task') && !visited.has(item.id)) {
            stack.push(item.id);
          }
        });
      }
    }
  });

  // Process tasks
  tasks.forEach(task => {
    if (!visited.has(task.id)) {
      clusters.add(task.id);
      const stack = [task.id];

      while (stack.length > 0) {
        const currentId = stack.pop()!;
        visited.add(currentId);

        const currentTask = tasks.find(t => t.id === currentId);
        currentTask?.linkedItems?.forEach(item => {
          // task.linkedItems.type is 'string', so we check if it's one of the expected types
          const itemType = item.type as 'Note' | 'Idea' | 'Task' | 'Reminder' | string;
          if ((itemType === 'Note' || itemType === 'Idea' || itemType === 'Task') && !visited.has(item.id)) {
            stack.push(item.id);
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
  const { state: { ideas } } = useIdeas();
  const { tasks } = useTasks();
  const { reminders } = useReminders();
  const { theme } = useTheme();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<'note' | 'idea' | 'task' | null>(null);
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');
  const [showTooltip, setShowTooltip] = useState(shouldShowTooltip());

  const handleNodeSelect = (itemId: string, itemType: 'note' | 'idea' | 'task') => {
    console.log('[LinkedItemsGraphPage] handleNodeSelect called with:', itemId, itemType);
    setSelectedItemId(itemId);
    setSelectedItemType(itemType);
  };

  // Calculate stats including most connected note and idea
  const stats = useMemo(() => {
    // Count notes, ideas, tasks, and reminders
    const notesCount = notes.length;
    const ideasCount = ideas.length;
    const tasksCount = tasks.length;
    const remindersCount = reminders.length;

    // Calculate total connections
    // Use a Set to track unique connections between items
    const connectionSet = new Set<string>();

    // Count note-to-note connections and note-to-reminder connections
    notes.forEach(note => {
      (note.linkedItems || []).forEach((linkedItem: LinkedItem) => {
        const pairId = [note.id, linkedItem.id].sort().join('-');
        connectionSet.add(pairId);
      });
    });

    // Count idea connections
    ideas.forEach(idea => {
      (idea.linkedItems || []).forEach(linkedItem => {
        const pairId = [idea.id, linkedItem.id].sort().join('-');
        connectionSet.add(pairId);
      });
    });

    // Count task connections
    tasks.forEach(task => {
      (task.linkedItems || []).forEach(linkedItem => {
        const pairId = [task.id, linkedItem.id].sort().join('-');
        connectionSet.add(pairId);
      });
    });

    // Count reminder connections (reminders can be linked to notes and ideas)
    reminders.forEach(reminder => {
      (reminder.linkedItems || []).forEach(linkedItem => {
        const pairId = [reminder.id, linkedItem.id].sort().join('-');
        connectionSet.add(pairId);
      });
    });

    const totalConnections = connectionSet.size;

    // Count isolated notes, ideas, tasks and reminders (those without connections)
    const isolatedNotes = notes.filter(note =>
      (!note.linkedItems || note.linkedItems.length === 0)
    ).length;

    const isolatedIdeas = ideas.filter(idea =>
      !idea.linkedItems || idea.linkedItems.length === 0
    ).length;

    const isolatedTasks = tasks.filter(task =>
      !task.linkedItems || task.linkedItems.length === 0
    ).length;

    const isolatedReminders = reminders.filter(reminder =>
      !reminder.linkedItems || reminder.linkedItems.length === 0
    ).length;

    // Calculate recent connections
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    let recentConnectionsWeek = 0;
    let recentConnectionsMonth = 0;

    notes.forEach(note => {
      const { recentWeek, recentMonth } = processNoteConnections(
        note as NoteWithConnections,
        oneWeekAgo,
        oneMonthAgo
      );

      recentConnectionsWeek += recentWeek;
      recentConnectionsMonth += recentMonth;
    });

    ideas.forEach(idea => {
      const { recentWeek, recentMonth } = processIdeaConnections(
        idea as IdeaWithConnections,
        oneWeekAgo,
        oneMonthAgo
      );

      recentConnectionsWeek += recentWeek;
      recentConnectionsMonth += recentMonth;
    });

    tasks.forEach(task => {
      const { recentWeek, recentMonth } = processTaskConnections(
        task as TaskWithConnections,
        oneWeekAgo,
        oneMonthAgo
      );

      recentConnectionsWeek += recentWeek;
      recentConnectionsMonth += recentMonth;
    });

    // Calculate connection density
    const totalItems = notesCount + ideasCount + tasksCount;
    // Total possible connections in a complete graph = n(n-1)/2
    const totalPossibleConnections = totalItems > 1 ? (totalItems * (totalItems - 1)) / 2 : 0;
    const connectionDensity = totalPossibleConnections > 0
      ? Math.round((totalConnections / totalPossibleConnections) * 100)
      : 0;

    // Calculate clusters
    const clusterCount = findClusters(notes, ideas, tasks);

    return {
      totalNotes: notesCount,
      totalIdeas: ideasCount,
      totalTasks: tasksCount,
      totalReminders: remindersCount,
      totalConnections,
      isolatedNotes,
      isolatedIdeas,
      isolatedTasks,
      isolatedReminders,
      connectionDensity,
      clusterCount,
      recentConnectionsWeek,
      recentConnectionsMonth
    };
  }, [notes, ideas, tasks, reminders]);

  const handleDismissTooltip = () => {
    setShowTooltip(false);
    markTooltipAsSeen();
  };

  return (
    <div className="h-[calc(100vh-11rem)] overflow-visible bg-fixed">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-fixed dark:bg-gradient-to-br dark:from-gray-900 dark:via-slate-900 dark:to-slate-800 bg-gradient-to-br from-white to-gray-100 -z-10" />

      <div className="flex flex-col h-full w-full py-4">
        {/* Integrated Container - single outer container with shared border */}
        <div className={`
          flex-1
          min-h-0
          relative 
          overflow-visible
          animate-in fade-in slide-in-from-bottom-5 duration-500
          rounded-lg
          ${getContainerBackground(theme)}
          shadow-[0_8px_30px_-12px_rgba(0,0,0,0.2),0_4px_10px_-6px_rgba(0,0,0,0.1)]
          dark:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.4),0_4px_10px_-6px_rgba(0,0,0,0.3)]
          border border-gray-200/20 dark:border-gray-700/30
        `}>
          {/* Header Section with Stats - NO borders */}
          <div className={`
            rounded-t-lg
            transition-all duration-300
          `}>
            {/* Header Section */}
            <div className="flex justify-between items-center px-4 py-3">
              <div className="flex items-center space-x-2">
                <div className="flex items-center">
                  <div className="p-1.5 flex items-center justify-center rounded-md bg-blue-500/10 backdrop-blur-xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 bg-[var(--color-surface)]/10 group-hover:scale-110 transition-transform duration-300">
                    <Link2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h1 className="text-xl font-semibold text-[var(--color-text)] ml-2">Linked Items</h1>
                </div>
                <div className="text-xs text-[var(--color-textSecondary)] ml-2 bg-white/5 dark:bg-black/10 px-2 py-0.5 rounded-full">
                  {stats.totalConnections} connections • {stats.connectionDensity}% density
                </div>
              </div>

              {/* View Toggle Buttons */}
              <div className="flex gap-1 bg-white/5 dark:bg-black/10 p-1 rounded-lg">
                <button
                  onClick={() => setViewMode('graph')}
                  className={`p-1.5 rounded-md transition-all ${getButtonBackground(viewMode === 'graph', theme)}`}
                  title="Graph View"
                >
                  <Network className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-all ${getButtonBackground(viewMode === 'list', theme)}`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Feature info tooltip */}
            {showTooltip && viewMode === 'graph' && (
              <div className="absolute top-14 right-4 z-10 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/50 rounded-lg shadow-md p-3 max-w-xs animate-in fade-in slide-in-from-right duration-300">
                <div className="flex items-start">
                  <Info className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5 mr-2" />
                  <div>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Node positions are now saved to your account! Your graph layout will be remembered across devices and browser sessions.
                    </p>
                    <button
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
                      onClick={handleDismissTooltip}
                    >
                      Got it
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Stats Bar - no borders, just a subtle background change */}
            <div className="flex px-4 py-2 gap-5 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="p-1 flex items-center justify-center rounded-md bg-blue-500/10 backdrop-blur-xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 bg-[var(--color-surface)]/10">
                  <Type className="w-3.5 h-3.5 text-[var(--color-note)]" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-[var(--color-note)]">{stats.totalNotes}</span>
                  <span className="text-xs text-[var(--color-textSecondary)]">Notes</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="p-1 flex items-center justify-center rounded-md bg-amber-500/10 backdrop-blur-xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 bg-[var(--color-surface)]/10">
                  <Lightbulb className="w-3.5 h-3.5 text-[var(--color-idea)]" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-[var(--color-idea)]">{stats.totalIdeas}</span>
                  <span className="text-xs text-[var(--color-textSecondary)]">Ideas</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="p-1 flex items-center justify-center rounded-md bg-green-500/10 backdrop-blur-xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 bg-[var(--color-surface)]/10">
                  <CheckSquare className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-green-600 dark:text-green-400">{stats.totalTasks}</span>
                  <span className="text-xs text-[var(--color-textSecondary)]">Tasks</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="p-1 flex items-center justify-center rounded-md bg-purple-500/10 backdrop-blur-xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 bg-[var(--color-surface)]/10">
                  <Bell className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-purple-600 dark:text-purple-400">{stats.totalReminders}</span>
                  <span className="text-xs text-[var(--color-textSecondary)]">Reminders</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="p-1 flex items-center justify-center rounded-md bg-blue-500/10 backdrop-blur-xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 bg-[var(--color-surface)]/10">
                  <Network className="w-3.5 h-3.5 text-[var(--color-note)]" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-[var(--color-note)]">{stats.connectionDensity}%</span>
                  <span className="text-xs text-[var(--color-textSecondary)]">Density</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="p-1 flex items-center justify-center rounded-md bg-blue-500/10 backdrop-blur-xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 bg-[var(--color-surface)]/10">
                  <GitBranch className="w-3.5 h-3.5 text-[var(--color-note)]" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-[var(--color-note)]">{stats.clusterCount}</span>
                  <span className="text-xs text-[var(--color-textSecondary)]">Topics</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area - NO separate borders */}
          <div className="transition-all duration-300 h-[calc(100%-80px)]">
            <div className="flex h-full overflow-auto">
              <div className="flex-1">
                {renderContent(viewMode, notes, ideas, tasks, handleNodeSelect, selectedItemId)}
              </div>
              {((): JSX.Element | null => {
                console.log('[LinkedItemsGraphPage] Checking panel render. Selected ID:', selectedItemId, 'Type:', selectedItemType);
                if (selectedItemId) {
                  if (selectedItemType === 'note' || selectedItemType === 'idea') {
                    return (
                      <div className="w-96 h-full overflow-hidden border-l border-gray-200/10 dark:border-gray-700/20">
                        <NoteDetailsPanel
                          selectedNoteId={selectedItemId}
                          onClose={() => {
                            setSelectedItemId(null);
                            setSelectedItemType(null);
                          }}
                        />
                      </div>
                    );
                  }
                  if (selectedItemType === 'task') {
                    return (
                      <div className="w-96 h-full overflow-hidden border-l border-gray-200/10 dark:border-gray-700/20">
                        <TaskDetailsPanel
                          selectedTaskId={selectedItemId}
                          onClose={() => {
                            setSelectedItemId(null);
                            setSelectedItemType(null);
                          }}
                        />
                      </div>
                    );
                  }
                  console.warn('[LinkedItemsGraphPage] selectedItemId is set, but selectedItemType is unexpected:', selectedItemType);
                  return null; // Or some fallback UI if type is wrong but ID is set
                }
                return null;
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}