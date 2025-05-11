import { useState, useMemo } from 'react';
import { X, Link2, Tag, Plus, Type, Lightbulb, CheckSquare, AlertCircle } from 'lucide-react';
import { useTasks } from '../../../contexts/tasksContextUtils';
import { useNotes } from '../../../contexts/notesContextUtils';
import { useIdeas } from '../../../contexts/ideasContextUtils';
import { formatDistanceToNow } from 'date-fns';
import { AddLinkModal } from './AddLinkModal';
import { Note } from '../../../types/note';
import { Idea } from '../../../types/idea';
import { useTheme } from '../../../contexts/themeContextUtils';

// Assuming TaskLinkTuple is the type of items in task.linkedItems
interface TaskLinkTuple {
    id: string;
    type: 'note' | 'idea';
    description?: string;
}

interface TaskDetailsPanelProps {
    selectedTaskId: string;
    onClose: () => void;
}

// Combined type for linked items that can be processed by the panel
type ProcessedLinkedNote = Note & { type: 'note'; linkDescription?: string };
type ProcessedLinkedIdea = Idea & { type: 'idea'; linkDescription?: string };

type IconType = 'notes' | 'idea' | 'task' | 'reminder';

export function TaskDetailsPanel({ selectedTaskId, onClose }: TaskDetailsPanelProps) {
    const { colors, theme } = useTheme();
    const { tasks, removeTaskLink } = useTasks();
    const { notes: allNotes } = useNotes();
    const { state: { ideas: allIdeas } } = useIdeas();
    const [showAddLinkModal, setShowAddLinkModal] = useState(false);

    const task = tasks.find(t => t.id === selectedTaskId);

    const getIconBg = (type: IconType) => {
        const baseBgKey = theme === 'light' ? '100/50' : '900/30';
        const finalBgKey = theme === 'midnight' ? '900/30' : baseBgKey;

        switch (type) {
            case 'notes': return `bg-blue-${finalBgKey}`;
            case 'idea': return `bg-amber-${finalBgKey}`;
            case 'task': return `bg-emerald-${finalBgKey}`;
            case 'reminder': return `bg-purple-${finalBgKey}`;
            default: return `bg-gray-${finalBgKey}`;
        }
    };

    const linkedItems = useMemo(() => {
        if (!task || !task.linkedItems) return { notes: [] as ProcessedLinkedNote[], ideas: [] as ProcessedLinkedIdea[] };

        const linkedNotes: ProcessedLinkedNote[] = task.linkedItems
            .filter(item => (item as TaskLinkTuple).type === 'note')
            .map(item => {
                const currentItem = item as TaskLinkTuple; // Explicit cast
                const foundNote = allNotes.find(n => n.id === currentItem.id);
                if (!foundNote) return null;
                return {
                    ...foundNote,
                    type: 'note' as const,
                    linkDescription: currentItem.description
                } as ProcessedLinkedNote;
            })
            .filter((n): n is ProcessedLinkedNote => n !== null);

        const linkedIdeas: ProcessedLinkedIdea[] = task.linkedItems
            .filter(item => (item as TaskLinkTuple).type === 'idea')
            .map(item => {
                const currentItem = item as TaskLinkTuple; // Explicit cast
                const foundIdea = allIdeas.find(i => i.id === currentItem.id);
                if (!foundIdea) return null;
                return {
                    ...foundIdea,
                    type: 'idea' as const,
                    linkDescription: currentItem.description
                } as ProcessedLinkedIdea;
            })
            .filter((i): i is ProcessedLinkedIdea => i !== null);

        return { notes: linkedNotes, ideas: linkedIdeas };
    }, [task, allNotes, allIdeas]);

    const handleUnlinkItem = async (linkedItemId: string) => {
        if (!task) return;
        try {
            await removeTaskLink(task.id, linkedItemId);
        } catch (error) {
            console.error('Failed to unlink item from task:', error);
        }
    };

    if (!task) {
        return (
            <div className={`
        h-full flex flex-col items-center justify-center overflow-hidden p-4
        ${theme === 'light' ? 'bg-gray-50' : 'bg-gray-800'}
        shadow-lg
      `}>
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <p className="text-lg font-medium text-[var(--color-text)]">Task not found</p>
                <p className="text-sm text-[var(--color-textSecondary)] mb-4">The selected task could not be loaded.</p>
                <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-[var(--color-text)] rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                    Close
                </button>
            </div>
        );
    }

    const getPriorityColor = (priority?: string) => {
        switch (priority?.toLowerCase()) {
            case 'high': return 'text-red-500';
            case 'urgent': return 'text-red-700 dark:text-red-400';
            case 'medium': return 'text-yellow-500';
            case 'low': return 'text-blue-500';
            default: return 'text-[var(--color-textSecondary)]';
        }
    };

    const getStatusColor = (status?: string) => {
        switch (status?.toLowerCase()) {
            case 'completed': return 'text-green-500';
            case 'inprogress': return 'text-blue-500';
            case 'pending': return 'text-yellow-500';
            case 'cancelled': return 'text-gray-500';
            default: return 'text-[var(--color-textSecondary)]';
        }
    };

    return (
        <div className={`
      h-full flex flex-col overflow-hidden
      shadow-[4px_0_24px_-2px_rgba(0,0,0,0.12),8px_0_16px_-4px_rgba(0,0,0,0.08)] 
      dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)]
    `}>
            {/* Header */}
            <div className={`
        shrink-0 p-4
        ${theme === 'light'
                    ? 'bg-[var(--color-surface)]/80 border-b border-[var(--color-border)]/50'
                    : theme === 'midnight'
                        ? 'bg-[#1e293b]/20 border-b border-white/[0.02]'
                        : 'bg-[var(--color-surface)]/30 border-b border-white/[0.02]'
                }
        backdrop-blur-xl
      `}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${getIconBg('task')}`}>
                            <CheckSquare className="w-4 h-4" style={{ color: colors.task || '#10b981' }} />
                        </div>
                        <h3 className="text-base font-medium text-[var(--color-text)]">
                            Task Details
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className={`
              p-1.5 rounded-lg transition-colors
              hover:bg-[var(--color-surfaceHover)]
            `}
                    >
                        <X className="w-4 h-4 text-[var(--color-textSecondary)]" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className={`
        flex-1 overflow-y-auto p-4 space-y-4
        ${theme === 'light'
                    ? 'bg-[var(--color-surface)]/80'
                    : theme === 'midnight'
                        ? 'bg-[#0f172a]/30'
                        : 'bg-[var(--color-surface)]/30'
                }
        backdrop-blur-xl
      `}>
                {/* Title and Description */}
                <div className={`
          p-4 rounded-lg shadow-sm
          ${theme === 'light'
                        ? 'bg-[var(--color-surface)]/50 border border-[var(--color-border)]/40'
                        : theme === 'midnight'
                            ? 'bg-[#1e293b]/20 border border-white/[0.02]'
                            : 'bg-[var(--color-surface)]/20 border border-white/[0.02]'
                    }
          shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3)]
        `}>
                    <h2 className="text-xl font-semibold text-[var(--color-text)] mb-2">
                        {task.title}
                    </h2>
                    {task.description && (
                        <p className="text-[var(--color-textSecondary)] whitespace-pre-wrap">
                            {task.description}
                        </p>
                    )}
                </div>

                {/* Task Properties (Status, Priority, DueDate) */}
                <div className={`
          p-4 rounded-lg shadow-sm
          ${theme === 'light'
                        ? 'bg-[var(--color-surface)]/50 border border-[var(--color-border)]/40'
                        : theme === 'midnight'
                            ? 'bg-[#1e293b]/20 border border-white/[0.02]'
                            : 'bg-[var(--color-surface)]/20 border border-white/[0.02]'
                    }
          shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3)]
          grid grid-cols-1 sm:grid-cols-3 gap-4
        `}>
                    <div>
                        <h4 className="text-xs font-medium text-[var(--color-textSecondary)] mb-1">Status</h4>
                        <p className={`font-medium ${getStatusColor(task.status)}`}>{task.status || 'N/A'}</p>
                    </div>
                    <div>
                        <h4 className="text-xs font-medium text-[var(--color-textSecondary)] mb-1">Priority</h4>
                        <p className={`font-medium ${getPriorityColor(task.priority)}`}>{task.priority || 'N/A'}</p>
                    </div>
                    <div>
                        <h4 className="text-xs font-medium text-[var(--color-textSecondary)] mb-1">Due Date</h4>
                        <p className="text-[var(--color-text)]">
                            {task.dueDate ? formatDistanceToNow(new Date(task.dueDate), { addSuffix: true }) : 'Not set'}
                        </p>
                    </div>
                </div>

                {/* Tags */}
                {task.tags && task.tags.length > 0 && (
                    <div className={`
            p-4 rounded-lg shadow-sm
            ${theme === 'light'
                            ? 'bg-[var(--color-surface)]/50 border border-[var(--color-border)]/40'
                            : theme === 'midnight'
                                ? 'bg-[#1e293b]/20 border border-white/[0.02]'
                                : 'bg-[var(--color-surface)]/20 border border-white/[0.02]'
                        }
            shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3)]
          `}>
                        <h4 className="text-sm font-medium text-[var(--color-text)] mb-2 flex items-center gap-2">
                            <Tag className="w-4 h-4 text-[var(--color-textSecondary)]" />
                            Tags
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {task.tags.map(tag => (
                                <span
                                    key={tag}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium max-w-full"
                                    style={{
                                        backgroundColor: `${colors.tag}10`,
                                        color: colors.tag
                                    }}
                                >
                                    <Tag className="w-3 h-3 flex-shrink-0" />
                                    <span className="truncate">{tag}</span>
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Connected Items */}
                <div className={`
          p-4 rounded-lg shadow-sm
          ${theme === 'light'
                        ? 'bg-[var(--color-surface)]/50 border border-[var(--color-border)]/40'
                        : theme === 'midnight'
                            ? 'bg-[#1e293b]/20 border border-white/[0.02]'
                            : 'bg-[var(--color-surface)]/20 border border-white/[0.02]'
                    }
          shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3)]
        `}>
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-[var(--color-text)] flex items-center gap-2">
                            <Link2 className="w-4 h-4 text-[var(--color-textSecondary)]" />
                            Connected Items ({linkedItems.notes.length + linkedItems.ideas.length})
                        </h4>
                        <button
                            onClick={() => setShowAddLinkModal(true)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-[var(--color-accent)] bg-[var(--color-accent)]/10 hover:bg-[var(--color-accent)]/20 rounded-lg transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Add Link
                        </button>
                    </div>

                    <div className="space-y-3">
                        {/* Notes Section */}
                        {linkedItems.notes.map(linkedNote => (
                            <div
                                key={linkedNote.id}
                                className={`
                        group relative p-3 rounded-lg transition-all
                        ${theme === 'light'
                                        ? 'bg-[var(--color-surface)]/30 border border-[var(--color-border)]/30'
                                        : theme === 'midnight'
                                            ? 'bg-[#0f172a]/20 border border-white/[0.02]'
                                            : 'bg-[var(--color-surface)]/10 border border-white/[0.02]'
                                    }
                        hover:border-[var(--color-accent)]/50
                        shadow-[0_1px_4px_-2px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_4px_-2px_rgba(0,0,0,0.2)]
                      `}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`p-1.5 rounded-lg ${getIconBg('notes')}`}>
                                        <Type className="w-4 h-4" style={{ color: colors.note }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h6 className="font-medium text-[var(--color-text)] truncate">
                                            {linkedNote.title}
                                        </h6>
                                        {linkedNote.content && (
                                            <p className="text-sm text-[var(--color-textSecondary)] line-clamp-2">
                                                {linkedNote.content}
                                            </p>
                                        )}
                                        {linkedNote.linkDescription && (
                                            <p className="mt-1 text-xs text-gray-400 italic">Link: {linkedNote.linkDescription}</p>
                                        )}
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                                                Note
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleUnlinkItem(linkedNote.id)}
                                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-red-500 transition-all absolute right-2 top-2"
                                        title="Unlink note"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Ideas Section */}
                        {linkedItems.ideas.map(linkedIdea => (
                            <div
                                key={linkedIdea.id}
                                className={`
                        group relative p-3 rounded-lg transition-all
                        ${theme === 'light'
                                        ? 'bg-[var(--color-surface)]/30 border border-[var(--color-border)]/30'
                                        : theme === 'midnight'
                                            ? 'bg-[#0f172a]/20 border border-white/[0.02]'
                                            : 'bg-[var(--color-surface)]/10 border border-white/[0.02]'
                                    }
                        hover:border-[var(--color-accent)]/50
                        shadow-[0_1px_4px_-2px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_4px_-2px_rgba(0,0,0,0.2)]
                      `}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`p-1.5 rounded-lg ${getIconBg('idea')}`}>
                                        <Lightbulb className="w-4 h-4" style={{ color: colors.idea }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h6 className="font-medium text-[var(--color-text)] truncate">
                                            {linkedIdea.title}
                                        </h6>
                                        {linkedIdea.content && (
                                            <p className="text-sm text-[var(--color-textSecondary)] line-clamp-2">
                                                {linkedIdea.content}
                                            </p>
                                        )}
                                        {linkedIdea.linkDescription && (
                                            <p className="mt-1 text-xs text-gray-400 italic">Link: {linkedIdea.linkDescription}</p>
                                        )}
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-xs px-2 py-0.5 rounded-full" style={{
                                                backgroundColor: `${colors.idea}10`,
                                                color: colors.idea
                                            }}>
                                                Idea
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleUnlinkItem(linkedIdea.id)}
                                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-red-500 transition-all absolute right-2 top-2"
                                        title="Unlink idea"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* No items message */}
                        {linkedItems.notes.length === 0 && linkedItems.ideas.length === 0 && (
                            <div className="text-center py-4">
                                <p className="text-[var(--color-textSecondary)]">No connected items yet</p>
                                <p className="text-sm text-[var(--color-textTertiary)] mt-1">
                                    Click "Add Link" to connect this task with notes or ideas.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Add Link Modal */}
                {showAddLinkModal && (
                    <AddLinkModal
                        isOpen={showAddLinkModal}
                        onClose={() => setShowAddLinkModal(false)}
                        sourceId={selectedTaskId}
                        onLinkAdded={() => {
                            setShowAddLinkModal(false);
                        }}
                        sourceType="task"
                    />
                )}
            </div>
        </div>
    );
} 