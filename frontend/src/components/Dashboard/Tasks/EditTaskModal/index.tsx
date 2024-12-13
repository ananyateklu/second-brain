import { useState, useEffect } from 'react';
import { useTasks } from '../../../../contexts/tasksContextUtils';
import { AddLinkModal } from './AddLinkModal';
import { LinkedItemsPanel } from './LinkedItemsPanel';
import { Header } from './Header';
import { MainContent } from './MainContent';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { Save } from 'lucide-react';
import { Task } from '../../../../api/types/task';

interface EditTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: Task | null;
}

export function EditTaskModal({ isOpen, onClose, task }: EditTaskModalProps) {
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
    const currentTask = tasks.find(t => t.id === task?.id);

    // Update form data when task changes
    useEffect(() => {
        if (currentTask) {
            setTitle(currentTask.title);
            setDescription(currentTask.description);
            setPriority(currentTask.priority);
            if (currentTask.dueDate) {
                const date = new Date(currentTask.dueDate);
                const formattedDate = date.toISOString().slice(0, 16);
                setDueDate(formattedDate);
            } else {
                setDueDate(null);
            }
            setStatus(currentTask.status.charAt(0).toUpperCase() + currentTask.status.slice(1) as 'Incomplete' | 'Completed');
            setTags(currentTask.tags);
            setError(null);
        }
    }, [currentTask]);

    if (!currentTask) return null;
    if (!isOpen) return null;

    const handleUnlinkItem = async (itemId: string) => {
        try {
            setIsLoading(true);
            setError(null);
            await removeTaskLink(task?.id ?? '', itemId);
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

            await updateTask(task?.id ?? '', updates);
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
            await deleteTask(task?.id ?? '');
            onClose();
        } catch (err) {
            console.error('Failed to delete task:', err);
            setError('Failed to delete task. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
                
                <div className="relative w-full max-w-4xl h-[calc(75vh-8rem)] bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl flex flex-col overflow-hidden">
                    <form onSubmit={handleSubmit} className="flex flex-col h-full">
                        <Header
                            task={currentTask}
                            onClose={onClose}
                            onShowDeleteConfirm={() => setShowDeleteConfirm(true)}
                            isSaving={isLoading}
                        />

                        <div className="flex flex-1 min-h-0">
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
                                linkedItems={currentTask.linkedItems}
                                onShowAddLink={() => setShowAddLinkModal(true)}
                                onUnlink={handleUnlinkItem}
                            />
                        </div>

                        <div className="shrink-0 px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-background)]">
                            <div className="flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={isLoading}
                                    className="px-4 py-2 text-[var(--color-textSecondary)] hover:text-[var(--color-text)] rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="px-4 py-2 flex items-center gap-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent)]/90 transition-colors disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" />
                                    {isLoading ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            <AddLinkModal
                isOpen={showAddLinkModal}
                onClose={() => setShowAddLinkModal(false)}
                currentTaskId={task?.id ?? ''}
            />

            <DeleteConfirmDialog
                isOpen={showDeleteConfirm}
                isLoading={isLoading}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
            />
        </>
    );
} 