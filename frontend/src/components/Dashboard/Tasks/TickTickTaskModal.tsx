import { useEffect, useState } from 'react';
import { Modal } from '../../shared/Modal';
import { useTasks } from '../../../contexts/tasksContextUtils';
import { TickTickTask } from '../../../types/integrations';
import { CheckCircle, Loader2, Save, Edit, X, Check, Trash2, AlertTriangle } from 'lucide-react';

interface TickTickTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    taskId: string;
}

export function TickTickTaskModal({ isOpen, onClose, projectId, taskId }: TickTickTaskModalProps) {
    const { getTickTickTask, updateTickTickTask, completeTickTickTask, deleteTickTickTask } = useTasks();
    const [task, setTask] = useState<TickTickTask | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [completingTask, setCompletingTask] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletingTask, setDeletingTask] = useState(false);

    // Editable fields
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [priority, setPriority] = useState(0);
    const [dueDate, setDueDate] = useState<string | null>(null);

    useEffect(() => {
        const fetchTask = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getTickTickTask(projectId, taskId);
                setTask(data);

                // Initialize form fields
                setTitle(data?.title || '');
                setContent(data?.content || '');
                setPriority(data?.priority || 0);

                if (data?.dueDate) {
                    try {
                        // Parse and format the date for the datetime-local input
                        const date = new Date(data.dueDate);
                        const formattedDate = date.toISOString().slice(0, 16);
                        setDueDate(formattedDate);
                    } catch (e) {
                        console.error('Error parsing dueDate:', e);
                        setDueDate(null);
                    }
                } else {
                    setDueDate(null);
                }
            } catch (err) {
                console.error('Failed to fetch TickTick task:', err);
                setError('Failed to load task information.');
            } finally {
                setLoading(false);
            }
        };

        if (isOpen) {
            fetchTask();
        }
    }, [isOpen, projectId, taskId, getTickTickTask]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!task) return;

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const updateData = {
                id: task.id,
                projectId: task.projectId,
                title,
                content,
                priority,
                dueDate: dueDate ? new Date(dueDate).toISOString() : undefined
            };

            const updatedTask = await updateTickTickTask(task.id, updateData);
            if (updatedTask) {
                setTask(updatedTask);
                setSuccess('Task updated successfully!');
                setIsEditing(false);
            } else {
                setError('Failed to update task.');
            }
        } catch (err) {
            console.error('Error updating task:', err);
            setError('Failed to update task. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteTask = async () => {
        if (!task) return;

        setCompletingTask(true);
        setError(null);
        setSuccess(null);

        try {
            const success = await completeTickTickTask(task.projectId, task.id);
            if (success) {
                // Update the local task status
                setTask(prev => prev ? { ...prev, status: 2 } : null);
                setSuccess('Task completed successfully!');
            } else {
                setError('Failed to complete task.');
            }
        } catch (err) {
            console.error('Error completing task:', err);
            setError('Failed to complete task. Please try again.');
        } finally {
            setCompletingTask(false);
        }
    };

    const handleDeleteTask = async () => {
        if (!task) return;

        setDeletingTask(true);
        setError(null);
        setSuccess(null);

        try {
            const success = await deleteTickTickTask(task.projectId, task.id);
            if (success) {
                setSuccess('Task deleted successfully!');
                // Close the modal after a short delay so the user can see the success message
                setTimeout(() => {
                    onClose();
                }, 1500);
            } else {
                setError('Failed to delete task.');
                setShowDeleteConfirm(false);
            }
        } catch (err) {
            console.error('Error deleting task:', err);
            setError('Failed to delete task. Please try again.');
            setShowDeleteConfirm(false);
        } finally {
            setDeletingTask(false);
        }
    };

    const renderViewMode = () => {
        if (!task) return <div className="text-sm text-gray-600 dark:text-gray-400">Task not found.</div>;

        return (
            <div className="space-y-4">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-medium">{task.title}</h3>
                        {task.content && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{task.content}</p>}
                    </div>
                    <div className="flex gap-2">
                        {task.status !== 2 && (
                            <button
                                onClick={handleCompleteTask}
                                disabled={completingTask}
                                className="p-2 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30 rounded-full"
                                title="Mark as complete"
                            >
                                {completingTask ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Check className="w-5 h-5" />
                                )}
                            </button>
                        )}
                        <button
                            onClick={() => setIsEditing(true)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-full"
                        >
                            <Edit className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-full"
                            title="Delete task"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="font-medium">Status:</span> {task.status === 2 ? 'Completed' : 'Incomplete'}
                    </div>
                    <div>
                        <span className="font-medium">Priority:</span> {task.priority}
                    </div>
                    {task.dueDate && (
                        <div>
                            <span className="font-medium">Due:</span> {new Date(task.dueDate).toLocaleString()}
                        </div>
                    )}
                    {task.createdTime && (
                        <div>
                            <span className="font-medium">Created:</span> {new Date(task.createdTime).toLocaleString()}
                        </div>
                    )}
                    {task.modifiedTime && (
                        <div>
                            <span className="font-medium">Updated:</span> {new Date(task.modifiedTime).toLocaleString()}
                        </div>
                    )}
                </div>

                {task.tags && task.tags.length > 0 && (
                    <div>
                        <span className="font-medium">Tags:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {task.tags.map(tag => (
                                <span key={tag} className="px-2 py-0.5 text-xs rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderEditMode = () => {
        if (!task) return null;

        return (
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Title
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Content
                    </label>
                    <textarea
                        value={content || ''}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
                        rows={3}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Priority
                        </label>
                        <select
                            value={priority}
                            onChange={(e) => setPriority(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
                        >
                            <option value="0">None</option>
                            <option value="1">Low</option>
                            <option value="3">Medium</option>
                            <option value="5">High</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Due Date
                        </label>
                        <input
                            type="datetime-local"
                            value={dueDate || ''}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
                        />
                    </div>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                    <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        disabled={loading}
                    >
                        <div className="flex items-center">
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                        </div>
                    </button>

                    <button
                        type="submit"
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        disabled={loading}
                    >
                        <div className="flex items-center">
                            {loading ? (
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4 mr-1" />
                            )}
                            Save Changes
                        </div>
                    </button>
                </div>
            </form>
        );
    };

    // Delete confirmation dialog
    const renderDeleteConfirmDialog = () => {
        if (!showDeleteConfirm) return null;

        return (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
                    <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-4">
                        <AlertTriangle className="w-6 h-6" />
                        <h3 className="text-lg font-medium">Delete Task?</h3>
                    </div>

                    <p className="text-gray-700 dark:text-gray-300 mb-6">
                        Are you sure you want to delete this task? This action cannot be undone.
                    </p>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setShowDeleteConfirm(false)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            disabled={deletingTask}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDeleteTask}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2"
                            disabled={deletingTask}
                        >
                            {deletingTask ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4" />
                                    Delete Task
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? "Edit TickTick Task" : "TickTick Task Details"}>
            {loading && !isEditing ? (
                <div className="flex items-center justify-center p-4">
                    <Loader2 className="w-5 h-5 animate-spin" />
                </div>
            ) : error ? (
                <div className="text-red-600 p-4 text-sm">{error}</div>
            ) : success ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg mb-4">
                    <CheckCircle className="w-5 h-5" />
                    <p className="text-sm">{success}</p>
                </div>
            ) : null}

            {!loading && (isEditing ? renderEditMode() : renderViewMode())}

            {renderDeleteConfirmDialog()}
        </Modal>
    );
} 