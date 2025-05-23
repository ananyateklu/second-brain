import { useState } from 'react';
import { X, Search, CheckSquare, AlertCircle, Calendar } from 'lucide-react';
import { useTasks } from '../../../../contexts/tasksContextUtils';
import { useIdeas } from '../../../../contexts/ideasContextUtils';

interface IdeaAddTaskLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    ideaId: string;
    onLinkAdded: () => void;
}

export function IdeaAddTaskLinkModal({ isOpen, onClose, ideaId, onLinkAdded }: IdeaAddTaskLinkModalProps) {
    const { tasks, addTaskLink } = useTasks();
    const { addLink, state: { ideas } } = useIdeas();
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    // Get current idea to check for already linked tasks
    const currentIdea = ideas.find(idea => idea.id === ideaId);
    const alreadyLinkedTaskIds = currentIdea?.linkedItems
        .filter(item => item.type === 'Task')
        .map(item => item.id) || [];

    const filteredTasks = tasks
        .filter(task => !alreadyLinkedTaskIds.includes(task.id))
        .filter(task =>
            task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.description.toLowerCase().includes(searchQuery.toLowerCase())
        );

    const handleLinkTask = async (taskId: string) => {
        setIsLoading(true);
        setError('');

        try {
            // Create bidirectional links
            // First link from idea to task
            await addLink(ideaId, taskId, 'Task');
            // Then link from task back to idea
            await addTaskLink({
                taskId: taskId,
                linkedItemId: ideaId,
                itemType: 'idea'
            });

            onLinkAdded();
            onClose();
        } catch (err) {
            console.error('Failed to link task:', err);
            setError('Failed to link task. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-lg bg-[var(--color-surface)] rounded-xl shadow-2xl overflow-hidden border border-[var(--color-border)]">
                <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
                    <h3 className="text-lg font-medium text-[var(--color-text)]">
                        Link to Task
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 text-[var(--color-textSecondary)] hover:text-[var(--color-text)]"
                        disabled={isLoading}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4">
                    <div className="space-y-4">
                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-textSecondary)]" />
                            <input
                                type="text"
                                placeholder="Search tasks..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-transparent transition-colors text-[var(--color-text)] placeholder-[var(--color-textSecondary)]"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <div className="flex items-center gap-2 text-red-500">
                                    <AlertCircle className="w-4 h-4" />
                                    <span>{error}</span>
                                </div>
                            </div>
                        )}

                        {/* Tasks List */}
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {filteredTasks.length > 0 ? (
                                filteredTasks.map(task => (
                                    <div
                                        key={task.id}
                                        className="group relative p-3 rounded-lg bg-[var(--color-surface)] hover:bg-[var(--color-surface)]/80 transition-colors cursor-pointer border border-[var(--color-border)]"
                                        onClick={() => handleLinkTask(task.id)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="p-1.5 rounded-lg bg-[var(--color-task)]/10">
                                                <CheckSquare className="w-4 h-4 text-[var(--color-task)]" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h6 className="font-medium text-[var(--color-text)] truncate">
                                                    {task.title}
                                                </h6>
                                                <p className="text-sm text-[var(--color-textSecondary)] line-clamp-2 mt-0.5">
                                                    {task.description}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <span className="text-xs bg-[var(--color-task)]/10 text-[var(--color-task)] px-2 py-0.5 rounded-full">
                                                        {task.status}
                                                    </span>
                                                    {task.dueDate && (
                                                        <div className="flex items-center gap-1 text-xs text-[var(--color-textSecondary)]">
                                                            <Calendar className="w-3.5 h-3.5" />
                                                            <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-[var(--color-textSecondary)]">
                                        {searchQuery
                                            ? 'No matching tasks found'
                                            : 'No tasks available to link'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 