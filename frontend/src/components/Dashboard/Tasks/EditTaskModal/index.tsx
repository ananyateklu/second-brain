import { useState, useEffect } from 'react';
import { useTasks } from '../../../../contexts/TasksContext';
import { AddLinkModal } from './AddLinkModal';
import { LinkedItemsPanel } from './LinkedItemsPanel';
import { Header } from './Header';
import { MainContent } from './MainContent';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { Loader2 } from 'lucide-react';

interface EditTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    taskId: string;
}

export function EditTaskModal({ isOpen, onClose, taskId }: EditTaskModalProps) {
    const { tasks, updateTask, removeTaskLink, deleteTask } = useTasks();
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

    const handleDelete = async () => {
        setIsLoading(true);
        setError(null);

        try {
            await deleteTask(taskId);
            onClose();
        } catch (err) {
            console.error('Failed to delete task:', err);
            setError('Failed to delete task. Please try again.');
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
                    className="relative w-full max-w-5xl max-h-[80vh] bg-white/50 dark:bg-gray-900/50 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md border border-gray-200/30 dark:border-gray-700/30"
                    style={{
                        transform: 'translate3d(0, 0, 0)',
                        backfaceVisibility: 'hidden',
                    }}
                >
                    <form onSubmit={handleSubmit} className="flex flex-col h-full">
                        <Header
                            task={currentTask}
                            onClose={onClose}
                            onShowDeleteConfirm={() => setShowDeleteConfirm(true)}
                        />

                        <div className="flex-1 grid grid-cols-[1fr,300px] min-h-0 overflow-hidden">
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

                            <LinkedItemsPanel
                                linkedItems={currentTask.linkedItems}
                                onShowAddLink={() => setShowAddLinkModal(true)}
                                onUnlink={handleUnlinkItem}
                            />
                        </div>

                        {/* Footer */}
                        <div className="shrink-0 flex justify-end gap-3 px-6 py-4 border-t border-gray-200/30 dark:border-gray-700/30 bg-white dark:bg-[#111111]">
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

            <DeleteConfirmDialog
                isOpen={showDeleteConfirm}
                isLoading={isLoading}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
            />
        </div>
    );
} 