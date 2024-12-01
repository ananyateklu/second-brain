import { useState, useEffect } from 'react';
import { useTasks } from '../../../../contexts/TasksContext';
import { AddLinkModal } from './AddLinkModal';
import { AlertCircle, Loader2, X, Link2, Star } from 'lucide-react';

interface EditTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    taskId: string;
}

export function EditTaskModal({ isOpen, onClose, taskId }: EditTaskModalProps) {
    const { tasks, updateTask, removeTaskLink } = useTasks();
    const [showAddLinkModal, setShowAddLinkModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [dueDate, setDueDate] = useState<string | null>(null);
    const [status, setStatus] = useState<'Incomplete' | 'Completed'>('Incomplete');
    const [tags, setTags] = useState<string[]>([]);

    // Get current task from context to ensure we have latest data
    const currentTask = tasks.find(t => t.id === taskId);

    // Update form data when task changes
    useEffect(() => {
        if (currentTask) {
            setTitle(currentTask.title);
            setDescription(currentTask.description);
            setPriority(currentTask.priority);
            // Format the date for datetime-local input
            if (currentTask.dueDate) {
                const date = new Date(currentTask.dueDate);
                // Format: YYYY-MM-DDThh:mm
                const formattedDate = date.toISOString().slice(0, 16);
                setDueDate(formattedDate);
            } else {
                setDueDate(null);
            }
            // Capitalize the status to match backend enum
            setStatus(currentTask.status.charAt(0).toUpperCase() + currentTask.status.slice(1) as 'Incomplete' | 'Completed');
            setTags(currentTask.tags);
            setError(null);
        }
    }, [currentTask]);

    if (!currentTask) return null;

    const handleUnlinkItem = async (itemId: string) => {
        try {
            setIsLoading(true);
            setError(null);
            await removeTaskLink(taskId, itemId);
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
            // Format the data to match the API expectations
            const updates = {
                title: title.trim(),
                description: description.trim(),
                priority,
                dueDate: dueDate ? new Date(dueDate).toISOString() : null,
                status,
                tags
            };

            await updateTask(taskId, updates);
            onClose();
        } catch (err) {
            console.error('Failed to update task:', err);
            setError('Failed to update task. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`
      fixed inset-0 z-50 overflow-hidden
      ${isOpen ? 'pointer-events-auto' : 'pointer-events-none opacity-0'}
    `}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="absolute inset-0 flex items-center justify-center p-4">
                <div
                    className="relative w-full max-w-6xl max-h-[90vh] bg-white/50 dark:bg-gray-900/50 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md border border-gray-200/30 dark:border-gray-700/30"
                    style={{
                        transform: 'translate3d(0, 0, 0)',
                        backfaceVisibility: 'hidden',
                    }}
                >
                    <form onSubmit={handleSubmit} className="flex flex-col h-full">
                        {/* Header */}
                        <div className="shrink-0 px-6 py-4 border-b border-gray-200/30 dark:border-gray-700/30">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                        Edit Task
                                    </h2>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        Last updated {new Date(currentTask.updatedAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 grid grid-cols-[1fr,300px] min-h-0 overflow-hidden">
                            {/* Main content area */}
                            <div className="p-6 overflow-y-auto">
                                {error && (
                                    <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-900/50 rounded-lg">
                                        <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                                            <AlertCircle className="w-4 h-4" />
                                            <span>{error}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    {/* Title */}
                                    <div>
                                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Title
                                        </label>
                                        <input
                                            type="text"
                                            id="title"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500"
                                            placeholder="Task title"
                                        />
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Description
                                        </label>
                                        <textarea
                                            id="description"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            rows={4}
                                            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500"
                                            placeholder="Task description"
                                        />
                                    </div>

                                    {/* Priority and Due Date */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Priority
                                            </label>
                                            <select
                                                id="priority"
                                                value={priority}
                                                onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                                                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500"
                                            >
                                                <option value="low">Low</option>
                                                <option value="medium">Medium</option>
                                                <option value="high">High</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Due Date
                                            </label>
                                            <input
                                                type="datetime-local"
                                                id="dueDate"
                                                value={dueDate || ''}
                                                onChange={(e) => setDueDate(e.target.value || null)}
                                                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Status */}
                                    <div>
                                        <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Status
                                        </label>
                                        <select
                                            id="status"
                                            value={status}
                                            onChange={(e) => setStatus(e.target.value as 'Incomplete' | 'Completed')}
                                            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500"
                                        >
                                            <option value="Incomplete">Incomplete</option>
                                            <option value="Completed">Completed</option>
                                        </select>
                                    </div>

                                    {/* Tags */}
                                    <div>
                                        <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Tags
                                        </label>
                                        <div className="mt-1 flex flex-wrap gap-2">
                                            {tags.map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full text-sm"
                                                >
                                                    {tag}
                                                    <button
                                                        type="button"
                                                        onClick={() => setTags(tags.filter(t => t !== tag))}
                                                        className="p-0.5 hover:text-red-500 dark:hover:text-red-400"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            ))}
                                            <input
                                                type="text"
                                                id="tags"
                                                placeholder="Add tag..."
                                                className="flex-1 min-w-[150px] rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        const value = e.currentTarget.value.trim();
                                                        if (value && !tags.includes(value)) {
                                                            setTags([...tags, value]);
                                                            e.currentTarget.value = '';
                                                        }
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right panel */}
                            <div className="border-l border-gray-200/30 dark:border-gray-700/30 flex flex-col min-h-0">
                                <div className="shrink-0 px-4 py-3 border-b border-gray-200/30 dark:border-gray-700/30 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Link2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                                                Connections
                                            </h3>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowAddLinkModal(true)}
                                            className="flex items-center gap-1.5 px-2 py-1 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                                        >
                                            Connect
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50 dark:bg-gray-800/50">
                                    {currentTask.linkedItems && currentTask.linkedItems.length > 0 ? (
                                        currentTask.linkedItems.map(item => (
                                            <div
                                                key={item.id}
                                                className="group relative p-3 rounded-lg bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`p-1.5 rounded-lg ${item.type === 'idea'
                                                            ? 'bg-amber-100 dark:bg-amber-900/30'
                                                            : 'bg-blue-100 dark:bg-blue-900/30'
                                                        }`}>
                                                        {item.type === 'idea' ? (
                                                            <Star className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                                        ) : (
                                                            <Link2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h6 className="font-medium text-gray-900 dark:text-white truncate">
                                                            {item.title}
                                                        </h6>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            {item.type === 'idea' ? 'Idea' : 'Note'}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleUnlinkItem(item.id);
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 rounded transition-opacity"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-8 text-center">
                                            <Link2 className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                No connections yet
                                            </p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                Click "Connect" to link with notes or ideas
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="shrink-0 flex justify-end gap-3 px-6 py-4 border-t border-gray-200/30 dark:border-gray-700/30">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isLoading}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isLoading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>

                    {/* Loading overlay */}
                    {isLoading && (
                        <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50">
                            <Loader2 className="w-8 h-8 text-primary-600 dark:text-primary-400 animate-spin" />
                        </div>
                    )}
                </div>
            </div>

            <AddLinkModal
                isOpen={showAddLinkModal}
                onClose={() => setShowAddLinkModal(false)}
                currentTaskId={taskId}
            />
        </div>
    );
} 