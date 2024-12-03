import { useState } from 'react';
import { X, Search, CheckSquare, AlertCircle, Calendar } from 'lucide-react';
import { useTasks } from '../../../../contexts/tasksContextUtils';

interface AddTaskLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    noteId: string;
    onLinkAdded: () => void;
}

export function AddTaskLinkModal({ isOpen, onClose, noteId, onLinkAdded }: AddTaskLinkModalProps) {
    const { tasks, addTaskLink } = useTasks();
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const filteredTasks = tasks
        .filter(task => !task.linkedItems?.some(item => item.id === noteId))
        .filter(task =>
            task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.description.toLowerCase().includes(searchQuery.toLowerCase())
        );

    const handleLinkTask = async (taskId: string) => {
        setIsLoading(true);
        setError('');

        try {
            await addTaskLink({
                taskId,
                linkedItemId: noteId,
                itemType: 'note'
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

            <div className="relative w-full max-w-lg bg-white dark:bg-[#111111] rounded-xl shadow-2xl overflow-hidden border border-gray-200/30 dark:border-[#1C1C1E]">
                <div className="flex items-center justify-between p-4 border-b border-gray-200/30 dark:border-[#1C1C1E]">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        Link to Task
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        disabled={isLoading}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4">
                    <div className="space-y-4">
                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search tasks..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#1C1C1E] border border-gray-200/50 dark:border-[#2C2C2E] rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-transparent transition-colors text-gray-700 dark:text-gray-300"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-900/50 rounded-lg">
                                <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
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
                                        className="group relative p-3 rounded-lg bg-white dark:bg-[#1C1C1E] hover:bg-gray-50 dark:hover:bg-[#2C2C2E] transition-colors cursor-pointer border border-gray-200/50 dark:border-[#2C2C2E]"
                                        onClick={() => handleLinkTask(task.id)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                                <CheckSquare className="w-4 h-4 text-green-600 dark:text-green-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h6 className="font-medium text-gray-900 dark:text-white truncate">
                                                    {task.title}
                                                </h6>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${task.status === 'Completed'
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                        }`}>
                                                        {task.status}
                                                    </span>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${task.priority === 'high'
                                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                        : task.priority === 'medium'
                                                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                        }`}>
                                                        {task.priority}
                                                    </span>
                                                    {task.dueDate && (
                                                        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                                            <Calendar className="w-3 h-3" />
                                                            {new Date(task.dueDate).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-gray-500 dark:text-gray-400">
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