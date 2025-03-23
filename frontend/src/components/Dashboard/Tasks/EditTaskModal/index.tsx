import { useState, useEffect } from 'react';
import { useTasks } from '../../../../contexts/tasksContextUtils';
import { useNotes } from '../../../../contexts/notesContextUtils';
import { LinkedItemsPanel } from './LinkedItemsPanel';
import { Header } from './Header';
import { MainContent } from './MainContent';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { Save, X, Search, Lightbulb, Type, CheckCircle } from 'lucide-react';
import { Task } from '../../../../api/types/task';

interface EditTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: Task | null;
}

export function EditTaskModal({ isOpen, onClose, task: initialTask }: EditTaskModalProps) {
    const { tasks, updateTask, removeTaskLink, deleteTask, addTaskLink } = useTasks();
    const { notes } = useNotes();
    const [showAddLinkModal, setShowAddLinkModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [dueDate, setDueDate] = useState<string | null>(null);
    const [status, setStatus] = useState<'Incomplete' | 'Completed'>('Incomplete');
    const [tags, setTags] = useState<string[]>([]);
    const [task, setTask] = useState<Task | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState<'all' | 'notes' | 'ideas'>('all');
    const [filteredItems, setFilteredItems] = useState<{ id: string; title: string; content: string; isIdea: boolean }[]>([]);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Initialize from the initial task when modal opens or when initialTask changes
    useEffect(() => {
        if (isOpen && initialTask) {
            // Find the task in the context to ensure we have the latest data
            const contextTask = tasks.find(t => t.id === initialTask.id) || initialTask;
            // Only update if task ID has changed or if there's no current task
            if (!task || task.id !== contextTask.id) {
                setTask(contextTask);
            } else if (JSON.stringify(task.linkedItems) !== JSON.stringify(contextTask.linkedItems)) {
                // If linked items have changed, update those specifically
                setTask(prev => {
                    if (!prev) return contextTask;
                    return {
                        ...prev,
                        linkedItems: contextTask.linkedItems
                    };
                });
            }
        }
    }, [isOpen, initialTask, tasks, task]);

    // Update filtered items when search query, selected type, or notes change
    useEffect(() => {
        if (task) {
            const alreadyLinkedIds = task.linkedItems.map(item => item.id);
            const filtered = notes.filter(note =>
                !alreadyLinkedIds.includes(note.id) && // Don't show already linked items
                (selectedType === 'all' ||
                    (selectedType === 'ideas' && note.isIdea) ||
                    (selectedType === 'notes' && !note.isIdea)) &&
                (note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    note.content.toLowerCase().includes(searchQuery.toLowerCase()))
            );
            setFilteredItems(filtered);
        }
    }, [searchQuery, selectedType, notes, task]);

    // Update form data when task changes
    useEffect(() => {
        if (task) {
            setTitle(task.title);
            setDescription(task.description);
            setPriority(task.priority);
            if (task.dueDate) {
                const date = new Date(task.dueDate);
                const formattedDate = date.toISOString().slice(0, 16);
                setDueDate(formattedDate);
            } else {
                setDueDate(null);
            }
            setStatus(task.status.charAt(0).toUpperCase() + task.status.slice(1) as 'Incomplete' | 'Completed');
            setTags(task.tags);
            setError(null);
        }
    }, [task]);

    // Reset states when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setShowDeleteConfirm(false);
            setError(null);
        }
    }, [isOpen]);

    if (!task) return null;
    if (!isOpen) return null;

    const handleUnlinkItem = async (itemId: string) => {
        try {
            setIsLoading(true);
            setError(null);
            await removeTaskLink(task.id, itemId);

            // Update local state to remove the unlinked item
            setTask(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    linkedItems: prev.linkedItems.filter(item => item.id !== itemId)
                };
            });
        } catch (err) {
            console.error('Failed to unlink item:', err);
            setError('Failed to unlink item. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim()) {
            setError('Title is required');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const updates = {
                title: title.trim(),
                description: description.trim(),
                priority,
                dueDate: dueDate ? new Date(dueDate).toISOString() : null,
                status,
                tags
            };

            await updateTask(task.id, updates);
            onClose();
        } catch (err) {
            console.error('Failed to update task:', err);
            setError('Failed to update task. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        setIsLoading(true);
        setError(null);

        try {
            await deleteTask(task.id);
            onClose();
        } catch (err) {
            console.error('Failed to delete task:', err);
            setError('Failed to delete task. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddLink = async (linkedItemId: string, itemType: string) => {
        try {
            setIsLoading(true);
            setError(null);
            await addTaskLink({
                taskId: task.id,
                linkedItemId,
                itemType: itemType as "note" | "idea"
            });

            // Find the note/idea to get its title
            const linkedNote = notes.find(n => n.id === linkedItemId);

            // Update our local state with the new linked item
            setTask(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    linkedItems: [
                        ...prev.linkedItems,
                        {
                            id: linkedItemId,
                            type: itemType,
                            title: linkedNote?.title || 'Linked Item',
                            createdAt: new Date().toISOString()
                        }
                    ]
                };
            });

            // Don't close the modal
        } catch (err) {
            console.error('Failed to add link:', err);
            setError('Failed to add link. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLinkItem = async (itemId: string, itemType: string) => {
        try {
            setIsLoading(true);
            setError(null);
            await handleAddLink(itemId, itemType);
            setSuccessMessage('Item linked successfully');
        } catch (err) {
            console.error('Failed to link item:', err);
            setError('Failed to link item. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={(e) => {
                e.stopPropagation();
                onClose();
            }} />

            <div className="relative w-full max-w-5xl max-h-[85vh] bg-[var(--color-background)] rounded-2xl shadow-xl overflow-hidden border border-[var(--color-border)]" onClick={e => e.stopPropagation()}>
                <form onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSubmit(e);
                }} className="flex flex-col h-full">
                    <Header
                        task={task}
                        onClose={onClose}
                        onShowDeleteConfirm={() => setShowDeleteConfirm(true)}
                        isSaving={isLoading}
                    />

                    <div className="flex-1 grid grid-cols-[1fr,360px] min-h-0 overflow-hidden">
                        <div className="flex-1 flex flex-col min-w-0">
                            <MainContent
                                title={title}
                                description={description}
                                priority={priority}
                                dueDate={dueDate}
                                status={status}
                                tags={tags}
                                error={error}
                                isLoading={isLoading}
                                onTitleChange={setTitle}
                                onDescriptionChange={setDescription}
                                onPriorityChange={setPriority}
                                onDueDateChange={setDueDate}
                                onStatusChange={setStatus}
                                onTagsChange={setTags}
                            />
                        </div>

                        <LinkedItemsPanel
                            linkedItems={task.linkedItems}
                            onShowAddLink={() => setShowAddLinkModal(true)}
                            onUnlink={handleUnlinkItem}
                        />
                    </div>

                    <div className="shrink-0 flex justify-end gap-3 px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-4 py-2 text-[var(--color-textSecondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surfaceHover)] rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-task)] hover:bg-[var(--color-task)]/90 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Save className="w-4 h-4" />
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>

            {showAddLinkModal && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                    onClick={(e) => {
                        // Prevent clicks from bubbling to parent elements
                        e.stopPropagation();
                    }}
                >
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={(e) => {
                            // Prevent clicks from affecting parent
                            e.stopPropagation();
                            setShowAddLinkModal(false);
                        }}
                    />

                    <div
                        className="relative w-full max-w-lg bg-white dark:bg-[#111111] rounded-xl shadow-2xl overflow-hidden border border-gray-200/30 dark:border-[#1C1C1E]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-4 border-b border-gray-200/30 dark:border-[#1C1C1E]">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                Link to Note or Idea
                            </h3>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowAddLinkModal(false);
                                }}
                                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                disabled={isLoading}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4">
                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#1C1C1E] border border-gray-200/50 dark:border-[#2C2C2E] rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-transparent transition-colors text-gray-700 dark:text-gray-300"
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <select
                                        value={selectedType}
                                        onChange={(e) => setSelectedType(e.target.value as 'all' | 'notes' | 'ideas')}
                                        className="px-3 py-2 bg-white dark:bg-[#1C1C1E] border border-gray-200/50 dark:border-[#2C2C2E] rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-transparent transition-colors text-gray-700 dark:text-gray-300"
                                        disabled={isLoading}
                                    >
                                        <option value="all">All Items</option>
                                        <option value="notes">Notes Only</option>
                                        <option value="ideas">Ideas Only</option>
                                    </select>
                                </div>

                                <div className="max-h-60 overflow-y-auto">
                                    {filteredItems.map(item => (
                                        <button
                                            key={item.id}
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                await handleLinkItem(item.id, item.isIdea ? 'idea' : 'note');
                                            }}
                                            disabled={isLoading}
                                            className="w-full flex items-center gap-3 p-3 bg-white dark:bg-[#1C1C1E] hover:bg-gray-50 dark:hover:bg-[#2C2C2E] rounded-lg transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200/50 dark:border-[#2C2C2E] mb-2"
                                        >
                                            <div className={`p-1.5 rounded-lg ${item.isIdea
                                                ? 'bg-amber-100 dark:bg-amber-900/30'
                                                : 'bg-blue-100 dark:bg-blue-900/30'
                                                }`}>
                                                {item.isIdea ? (
                                                    <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                                ) : (
                                                    <Type className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                    {item.title}
                                                </h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                                    {item.content}
                                                </p>
                                            </div>
                                        </button>
                                    ))}

                                    {filteredItems.length === 0 && (
                                        <p className="text-center py-4 text-gray-500 dark:text-gray-400">
                                            No items available to link
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Success message */}
                            {successMessage && (
                                <div className="mt-4 flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg">
                                    <CheckCircle className="w-5 h-5" />
                                    <p className="text-sm">{successMessage}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <DeleteConfirmDialog
                isOpen={showDeleteConfirm}
                isLoading={isLoading}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
            />
        </div>
    );
} 