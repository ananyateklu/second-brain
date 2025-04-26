import { useEffect, useState } from 'react';
import { useTasks } from '../../../contexts/tasksContextUtils';
import { TickTickTask } from '../../../types/integrations';
import { useTheme } from '../../../contexts/themeContextUtils';
import { CheckCircle, Loader2, Save, Edit, X, Check, Trash2, AlertTriangle, CheckSquare, Calendar, AlignLeft, Type } from 'lucide-react';
import { Input } from '../../shared/Input';
import { TextArea } from '../../shared/TextArea';
import { formatTickTickDate } from '../../../utils/dateUtils';

interface TickTickTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    taskId: string;
}

export function TickTickTaskModal({ isOpen, onClose, projectId, taskId }: TickTickTaskModalProps) {
    const { getTickTickTask, updateTickTickTask, completeTickTickTask, deleteTickTickTask } = useTasks();
    const { theme } = useTheme();
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
                        // 1. Parse the incoming date (assume it's UTC or has timezone info)
                        const incomingDate = new Date(data.dueDate);

                        // 2. Format it for the datetime-local input in the *local* timezone
                        //    - Create a date object adjusted for the local timezone offset.
                        const tzoffset = (new Date()).getTimezoneOffset() * 60000; // offset in milliseconds
                        const localISOTime = (new Date(incomingDate.getTime() - tzoffset)).toISOString().slice(0, 16);

                        console.log(`Original dueDate: ${data.dueDate}, Parsed Date: ${incomingDate}, Formatted for input: ${localISOTime}`);
                        setDueDate(localISOTime);
                    } catch (e) {
                        console.error('Error parsing dueDate:', e, 'Original value:', data.dueDate);
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
                dueDate: dueDate ? formatTickTickDate(new Date(dueDate)) : undefined
            };

            console.log("Submitting task update with data:", updateData);

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

    const getBorderStyle = () => {
        if (theme === 'midnight') return 'border-white/5';
        if (theme === 'dark') return 'border-gray-700/30';
        return 'border-[var(--color-border)]';
    };

    const renderViewMode = () => {
        if (!task) return <div className="text-sm text-[var(--color-textSecondary)]">Task not found.</div>;

        return (
            <div className="space-y-4 p-4 bg-[var(--color-surface)]">
                <div className="flex justify-between items-start">
                    <div className="space-y-2">
                        <h3 className="text-lg font-medium text-[var(--color-text)]">{task.title}</h3>
                        {task.content && (
                            <div className="text-[var(--color-textSecondary)] text-sm whitespace-pre-wrap">
                                {task.content}
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {task.status !== 2 && (
                            <button
                                onClick={handleCompleteTask}
                                disabled={completingTask}
                                className="p-2 text-green-500 hover:bg-[var(--color-surfaceHover)] dark:text-green-400 dark:hover:bg-[var(--color-surfaceHover)] rounded-lg transition-colors"
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
                            className="p-2 text-blue-600 hover:bg-[var(--color-surfaceHover)] dark:text-blue-400 dark:hover:bg-[var(--color-surfaceHover)] rounded-lg transition-colors"
                        >
                            <Edit className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="p-2 text-red-600 hover:bg-[var(--color-surfaceHover)] dark:text-red-400 dark:hover:bg-[var(--color-surfaceHover)] rounded-lg transition-colors"
                            title="Delete task"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--color-textSecondary)]">Status:</span>
                        <span className={task.status === 2 ? "text-green-500 dark:text-green-400" : "text-yellow-500 dark:text-yellow-400"}>
                            {task.status === 2 ? 'Completed' : 'Incomplete'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--color-textSecondary)]">Priority:</span>
                        <span className={
                            task.priority === 5 ? "text-red-500 dark:text-red-400" :
                                task.priority === 3 ? "text-yellow-500 dark:text-yellow-400" :
                                    task.priority === 1 ? "text-green-500 dark:text-green-400" :
                                        "text-[var(--color-textSecondary)]"
                        }>
                            {task.priority === 5 ? 'High' :
                                task.priority === 3 ? 'Medium' :
                                    task.priority === 1 ? 'Low' : 'None'}
                        </span>
                    </div>
                    {task.dueDate && (
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-[var(--color-textSecondary)]">Due:</span>
                            <span className="text-[var(--color-text)]">{new Date(task.dueDate).toLocaleString()}</span>
                        </div>
                    )}
                    {task.createdTime && (
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-[var(--color-textSecondary)]">Created:</span>
                            <span className="text-[var(--color-text)]">{new Date(task.createdTime).toLocaleString()}</span>
                        </div>
                    )}
                    {task.modifiedTime && (
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-[var(--color-textSecondary)]">Updated:</span>
                            <span className="text-[var(--color-text)]">{new Date(task.modifiedTime).toLocaleString()}</span>
                        </div>
                    )}
                </div>

                {task.tags && task.tags.length > 0 && (
                    <div>
                        <span className="font-medium text-[var(--color-textSecondary)]">Tags:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {task.tags.map(tag => (
                                <span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-[var(--color-task)]/10 text-[var(--color-task)]">
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
            <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-[var(--color-surface)]">
                {/* Title */}
                <Input
                    label="Title"
                    icon={Type}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="focus:ring-[var(--color-task)]"
                    placeholder="Enter task title"
                    disabled={loading}
                />

                {/* Content / Description */}
                <TextArea
                    label="Content"
                    icon={AlignLeft}
                    value={content || ''}
                    onChange={(e) => setContent(e.target.value)}
                    rows={3}
                    className="focus:ring-[var(--color-task)]"
                    placeholder="Add content"
                    disabled={loading}
                />

                <div className="grid grid-cols-2 gap-4">
                    {/* Left Column - Due Date */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-textSecondary)]">
                            <Calendar className="w-4 h-4" />
                            Due Date
                        </label>
                        <input
                            type="datetime-local"
                            value={dueDate ?? ''}
                            onChange={(e) => setDueDate(e.target.value || null)}
                            className={`w-full h-[38px] px-3 bg-[var(--color-surface-elevated)] border ${getBorderStyle()} rounded-lg focus:ring-2 focus:ring-[var(--color-task)] focus:border-transparent text-[var(--color-text)] disabled:opacity-50 transition-colors`}
                            disabled={loading}
                        />
                    </div>

                    {/* Right Column - Priority */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-textSecondary)]">
                            Priority
                        </label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setPriority(0)}
                                disabled={loading}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${priority === 0
                                    ? 'bg-gray-500/10 text-gray-400'
                                    : `bg-[var(--color-surface-elevated)] text-[var(--color-textSecondary)] hover:bg-[var(--color-surfaceHover)] border ${getBorderStyle()}`
                                    }`}
                            >
                                None
                            </button>
                            <button
                                type="button"
                                onClick={() => setPriority(1)}
                                disabled={loading}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${priority === 1
                                    ? 'bg-green-500/10 text-green-400'
                                    : `bg-[var(--color-surface-elevated)] text-[var(--color-textSecondary)] hover:bg-[var(--color-surfaceHover)] border ${getBorderStyle()}`
                                    }`}
                            >
                                Low
                            </button>
                            <button
                                type="button"
                                onClick={() => setPriority(3)}
                                disabled={loading}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${priority === 3
                                    ? 'bg-yellow-500/10 text-yellow-400'
                                    : `bg-[var(--color-surface-elevated)] text-[var(--color-textSecondary)] hover:bg-[var(--color-surfaceHover)] border ${getBorderStyle()}`
                                    }`}
                            >
                                Medium
                            </button>
                            <button
                                type="button"
                                onClick={() => setPriority(5)}
                                disabled={loading}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${priority === 5
                                    ? 'bg-red-500/10 text-red-400'
                                    : `bg-[var(--color-surface-elevated)] text-[var(--color-textSecondary)] hover:bg-[var(--color-surfaceHover)] border ${getBorderStyle()}`
                                    }`}
                            >
                                High
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                    <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className={`px-4 py-2 border ${getBorderStyle()} rounded-lg text-sm font-medium text-[var(--color-textSecondary)] hover:bg-[var(--color-surfaceHover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-task)] transition-colors`}
                        disabled={loading}
                    >
                        <div className="flex items-center">
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                        </div>
                    </button>

                    <button
                        type="submit"
                        className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[var(--color-task)] hover:bg-[var(--color-task)]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-task)] disabled:opacity-50 transition-colors"
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
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60]">
                <div className="bg-[var(--color-background)] p-6 rounded-lg shadow-xl max-w-md w-full border border-[var(--color-border)]">
                    <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-4">
                        <AlertTriangle className="w-6 h-6" />
                        <h3 className="text-lg font-medium text-[var(--color-text)]">Delete Task?</h3>
                    </div>

                    <p className="text-[var(--color-text)] mb-6">
                        Are you sure you want to delete this task? This action cannot be undone.
                    </p>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setShowDeleteConfirm(false)}
                            className={`px-4 py-2 border ${getBorderStyle()} rounded-lg text-[var(--color-textSecondary)] hover:bg-[var(--color-surfaceHover)] transition-colors`}
                            disabled={deletingTask}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDeleteTask}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 transition-colors"
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

    // Header component
    const renderHeader = () => {
        return (
            <div className={`shrink-0 flex items-center justify-between px-4 py-3 border-b ${getBorderStyle()} bg-[var(--color-surface)]`}>
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-[var(--color-task)]/10 rounded-lg">
                        <CheckSquare className="w-5 h-5 text-[var(--color-task)]" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-[var(--color-text)]">
                            {isEditing ? "Edit TickTick Task" : "TickTick Task Details"}
                        </h2>
                        {task && task.modifiedTime && (
                            <p className="text-xs text-[var(--color-textSecondary)]">
                                Last updated {new Date(task.modifiedTime).toLocaleDateString()}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    {!isEditing && (
                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={loading || !task}
                            className="p-1.5 text-[var(--color-textSecondary)] hover:text-red-400 hover:bg-[var(--color-surfaceHover)] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete task"
                        >
                            <Trash2 className="w-4.5 h-4.5" />
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="p-1.5 text-[var(--color-textSecondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surfaceHover)] rounded-lg transition-colors"
                    >
                        <X className="w-4.5 h-4.5" />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-3xl max-h-[85vh] bg-[var(--color-background)] rounded-2xl shadow-xl overflow-hidden border border-[var(--color-border)]" onClick={e => e.stopPropagation()}>
                {renderHeader()}

                <div className="flex-1 overflow-auto">
                    {loading && !isEditing ? (
                        <div className="flex items-center justify-center p-6 bg-[var(--color-surface)]">
                            <Loader2 className="w-5 h-5 animate-spin text-[var(--color-task)]" />
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-red-500/10 text-red-400 m-4 rounded-lg">{error}</div>
                    ) : success ? (
                        <div className="flex items-center gap-2 p-3 bg-green-500/10 text-green-500 dark:text-green-400 rounded-lg m-4">
                            <CheckCircle className="w-5 h-5" />
                            <p className="text-sm">{success}</p>
                        </div>
                    ) : null}

                    {!loading && (isEditing ? renderEditMode() : renderViewMode())}
                </div>

                {renderDeleteConfirmDialog()}
            </div>
        </div>
    );
} 