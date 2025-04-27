import { useEffect, useState } from 'react';
import { useNotes } from '../../../contexts/notesContextUtils';
import { TickTickTask } from '../../../types/integrations';
import { useTheme } from '../../../contexts/themeContextUtils';
import { FileText, Loader2, Save, Edit, X, Trash2, AlertTriangle, StickyNote, AlignLeft, Type } from 'lucide-react';
import { Input } from '../../shared/Input';
import { TextArea } from '../../shared/TextArea';

interface TickTickNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    noteId: string;
}

export function TickTickNoteModal({ isOpen, onClose, projectId, noteId }: TickTickNoteModalProps) {
    const { getTickTickNote, updateTickTickNote, deleteTickTickNote } = useNotes();
    const { theme } = useTheme();
    const [note, setNote] = useState<TickTickTask | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletingNote, setDeletingNote] = useState(false);

    // Editable fields
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tags, setTags] = useState<string[]>([]);

    useEffect(() => {
        const fetchNote = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getTickTickNote(projectId, noteId);
                setNote(data);

                // Initialize form fields
                setTitle(data?.title || '');
                setContent(data?.content || '');
                setTags(data?.tags || []);
            } catch (err) {
                console.error('Failed to fetch TickTick note:', err);
                setError('Failed to load note information.');
            } finally {
                setLoading(false);
            }
        };

        if (isOpen) {
            fetchNote();
        }
    }, [isOpen, projectId, noteId, getTickTickNote]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!note) return;

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const updateData = {
                id: note.id,
                projectId: note.projectId,
                title,
                content,
                tags
            };

            console.log("Submitting note update with data:", updateData);

            const updatedNote = await updateTickTickNote(note.id, updateData);
            if (updatedNote) {
                setNote(updatedNote);
                setSuccess('Note updated successfully!');
                setIsEditing(false);
            } else {
                setError('Failed to update note.');
            }
        } catch (err) {
            console.error('Error updating note:', err);
            setError('Failed to update note. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteNote = async () => {
        if (!note) return;

        setDeletingNote(true);
        setError(null);
        setSuccess(null);

        try {
            const success = await deleteTickTickNote(note.projectId, note.id);
            if (success) {
                setSuccess('Note deleted successfully!');
                // Close the modal after a short delay so the user can see the success message
                setTimeout(() => {
                    onClose();
                }, 1500);
            } else {
                setError('Failed to delete note.');
                setShowDeleteConfirm(false);
            }
        } catch (err) {
            console.error('Error deleting note:', err);
            setError('Failed to delete note. Please try again.');
            setShowDeleteConfirm(false);
        } finally {
            setDeletingNote(false);
        }
    };

    const getBorderStyle = () => {
        if (theme === 'midnight') return 'border-white/5';
        if (theme === 'dark') return 'border-gray-700/30';
        return 'border-[var(--color-border)]';
    };

    const renderViewMode = () => {
        if (!note) return <div className="text-sm text-[var(--color-textSecondary)]">Note not found.</div>;

        return (
            <div className="space-y-4 p-4 bg-[var(--color-surface)]">
                <div className="flex justify-between items-start">
                    <div className="space-y-2">
                        <h3 className="text-lg font-medium text-[var(--color-text)]">{note.title}</h3>
                        {note.content && (
                            <div className="text-[var(--color-textSecondary)] text-sm whitespace-pre-wrap">
                                {note.content}
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsEditing(true)}
                            className="p-2 text-blue-600 hover:bg-[var(--color-surfaceHover)] dark:text-blue-400 dark:hover:bg-[var(--color-surfaceHover)] rounded-lg transition-colors"
                        >
                            <Edit className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="p-2 text-red-600 hover:bg-[var(--color-surfaceHover)] dark:text-red-400 dark:hover:bg-[var(--color-surfaceHover)] rounded-lg transition-colors"
                            title="Delete note"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                    {note.createdTime && (
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-[var(--color-textSecondary)]">Created:</span>
                            <span className="text-[var(--color-text)]">{new Date(note.createdTime).toLocaleString()}</span>
                        </div>
                    )}
                    {note.modifiedTime && (
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-[var(--color-textSecondary)]">Updated:</span>
                            <span className="text-[var(--color-text)]">{new Date(note.modifiedTime).toLocaleString()}</span>
                        </div>
                    )}
                </div>

                {note.tags && note.tags.length > 0 && (
                    <div>
                        <span className="font-medium text-[var(--color-textSecondary)]">Tags:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {note.tags.map(tag => (
                                <span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-[var(--color-note)]/10 text-[var(--color-note)]">
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
        if (!note) return null;

        return (
            <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-[var(--color-surface)]">
                {/* Title */}
                <Input
                    label="Title"
                    icon={Type}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="focus:ring-[var(--color-note)]"
                    placeholder="Enter note title"
                    disabled={loading}
                />

                {/* Content */}
                <TextArea
                    label="Content"
                    icon={AlignLeft}
                    value={content || ''}
                    onChange={(e) => setContent(e.target.value)}
                    rows={6}
                    className="focus:ring-[var(--color-note)]"
                    placeholder="Add content to your note"
                    disabled={loading}
                />

                {/* Tags Input */}
                <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-textSecondary)]">
                        Tags (comma separated)
                    </label>
                    <input
                        type="text"
                        value={tags.join(', ')}
                        onChange={(e) => setTags(e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag))}
                        className={`w-full h-[38px] px-3 bg-[var(--color-surface-elevated)] border ${getBorderStyle()} rounded-lg focus:ring-2 focus:ring-[var(--color-note)] focus:border-transparent text-[var(--color-text)] disabled:opacity-50 transition-colors`}
                        placeholder="Enter tags separated by commas"
                        disabled={loading}
                    />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                    <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className={`px-4 py-2 border ${getBorderStyle()} rounded-lg text-sm font-medium text-[var(--color-textSecondary)] hover:bg-[var(--color-surfaceHover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-note)] transition-colors`}
                        disabled={loading}
                    >
                        <div className="flex items-center">
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                        </div>
                    </button>

                    <button
                        type="submit"
                        className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[var(--color-note)] hover:bg-[var(--color-note)]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-note)] disabled:opacity-50 transition-colors"
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
                        <h3 className="text-lg font-medium text-[var(--color-text)]">Delete Note?</h3>
                    </div>

                    <p className="text-[var(--color-text)] mb-6">
                        Are you sure you want to delete this note? This action cannot be undone.
                    </p>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setShowDeleteConfirm(false)}
                            className={`px-4 py-2 border ${getBorderStyle()} rounded-lg text-[var(--color-textSecondary)] hover:bg-[var(--color-surfaceHover)] transition-colors`}
                            disabled={deletingNote}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDeleteNote}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 transition-colors"
                            disabled={deletingNote}
                        >
                            {deletingNote ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4" />
                                    Delete Note
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
                    <div className="p-1.5 bg-[var(--color-note)]/10 rounded-lg">
                        <FileText className="w-5 h-5 text-[var(--color-note)]" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-[var(--color-text)]">
                            {isEditing ? "Edit TickTick Note" : "TickTick Note Details"}
                        </h2>
                        {note && note.modifiedTime && (
                            <p className="text-xs text-[var(--color-textSecondary)]">
                                Last updated {new Date(note.modifiedTime).toLocaleDateString()}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
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
                            <Loader2 className="w-5 h-5 animate-spin text-[var(--color-note)]" />
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-red-500/10 text-red-400 m-4 rounded-lg">{error}</div>
                    ) : success ? (
                        <div className="flex items-center gap-2 p-3 bg-green-500/10 text-green-500 dark:text-green-400 rounded-lg m-4">
                            <StickyNote className="w-5 h-5" />
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