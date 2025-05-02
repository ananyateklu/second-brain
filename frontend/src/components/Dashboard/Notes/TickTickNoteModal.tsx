import { useEffect, useState } from 'react';
import { useNotes } from '../../../contexts/notesContextUtils';
import { TickTickTask } from '../../../types/integrations';
import { useTheme } from '../../../contexts/themeContextUtils';
import { FileText, Loader2, Save, Edit, X, Trash2, AlertTriangle, StickyNote, AlignLeft, Type } from 'lucide-react';
import { Input } from '../../shared/Input';

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

    // Parse note content to extract sections, items, and their states
    const parseNoteContent = (content: string | undefined) => {
        if (!content) return [];

        const lines = content.split('\n');
        let currentSection = '';
        const sections: {
            title: string;
            items: {
                text: string;
                checked: boolean;
                isNumbered?: boolean;
                number?: number;
                isHorizontalDivider?: boolean;
            }[]
        }[] = [];
        let currentItems: {
            text: string;
            checked: boolean;
            isNumbered?: boolean;
            number?: number;
            isHorizontalDivider?: boolean;
        }[] = [];

        lines.forEach((line) => {
            const trimmedLine = line.trim();

            // Skip empty lines
            if (!trimmedLine) return;

            // Check for horizontal divider
            if (trimmedLine === '---') {
                currentItems.push({
                    text: '',
                    checked: false,
                    isHorizontalDivider: true
                });
                return;
            }

            // Check for various section header formats:
            // 1. Lines ending with colon
            // 2. Lines starting with # 
            // 3. Lines with **Header:** format (markdown-style)
            if (
                /^.*:$/.test(trimmedLine) ||
                trimmedLine.startsWith('#') ||
                /^\*\*.*:\*\*$/.test(trimmedLine)
            ) {
                // If we already have a section, save it before starting a new one
                if (currentSection && currentItems.length > 0) {
                    sections.push({
                        title: currentSection,
                        items: [...currentItems]
                    });
                    currentItems = [];
                }

                // Extract section title based on format
                if (trimmedLine.startsWith('#')) {
                    // Handle # Header format
                    currentSection = trimmedLine.substring(1).trim();
                } else if (/^\*\*.*:\*\*$/.test(trimmedLine)) {
                    // Handle **Header:** format
                    currentSection = trimmedLine.replace(/^\*\*|\*\*$/g, '');
                } else {
                    // Handle regular Header: format
                    currentSection = trimmedLine;
                }
            }
            // Check for numbered list items (1. Item format)
            else if (/^\d+\.\s+/.test(trimmedLine)) {
                const numberMatch = trimmedLine.match(/^(\d+)\.\s+(.*)/);
                if (numberMatch) {
                    const number = parseInt(numberMatch[1], 10);
                    const text = numberMatch[2].trim();
                    currentItems.push({
                        text,
                        checked: false,
                        isNumbered: true,
                        number
                    });
                }
            }
            // Check if this is a list item with a checkbox or bullet
            else if (trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
                // Look for checkbox patterns in various formats
                const hasCheckbox = trimmedLine.includes('[');

                // Check if the item is checked
                const isChecked = hasCheckbox && (
                    trimmedLine.includes('[x]') ||
                    trimmedLine.includes('[X]') ||
                    trimmedLine.includes('[✓]') ||
                    trimmedLine.includes('[✔]')
                );

                // Extract the item text based on the item format
                let itemText = '';

                if (hasCheckbox) {
                    // Handle checkbox format
                    itemText = trimmedLine
                        .replace(/^-\s*\[\s*[xX✓✔]\s*\]\s*/, '')  // Remove checked box
                        .replace(/^-\s*\[\s*\]\s*/, '')           // Remove unchecked box
                        .trim();
                } else {
                    // Handle simple bullet format
                    itemText = trimmedLine
                        .replace(/^-\s*/, '')                     // Remove dash
                        .replace(/^\*\s*/, '')                    // Remove asterisk
                        .trim();
                }

                currentItems.push({ text: itemText, checked: isChecked });
            }
            // If we can't match any special format, treat as plain text item
            else {
                currentItems.push({ text: trimmedLine, checked: false });
            }
        });

        // Add the last section if it exists
        if (currentSection && currentItems.length > 0) {
            sections.push({
                title: currentSection,
                items: [...currentItems]
            });
        } else if (currentItems.length > 0 && !currentSection) {
            // Handle notes with no explicit section
            sections.push({
                title: 'Note',
                items: [...currentItems]
            });
        }

        return sections;
    };

    // Helper function to process text and format bold parts with *text** pattern
    const formatTextWithBold = (text: string) => {
        // Simple approach: replace the pattern directly with styled components
        const boldRegex = /\*(.*?)\*\*/g;

        // If no bold parts were found, return the original text
        if (!boldRegex.test(text)) {
            return <>{text}</>;
        }

        // Reset regex state
        boldRegex.lastIndex = 0;

        // Split the text into parts: regular text and bold text
        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = boldRegex.exec(text)) !== null) {
            // Add text before the match
            if (match.index > lastIndex) {
                parts.push({
                    type: 'regular',
                    text: text.substring(lastIndex, match.index)
                });
            }

            // Add the bold text
            parts.push({
                type: 'bold',
                text: match[1] // The content inside the *...** pattern
            });

            lastIndex = match.index + match[0].length;
        }

        // Add any remaining text after the last match
        if (lastIndex < text.length) {
            parts.push({
                type: 'regular',
                text: text.substring(lastIndex)
            });
        }

        // Render the parts
        return (
            <>
                {parts.map((part, index) =>
                    part.type === 'bold'
                        ? <strong key={index} className="font-semibold">{part.text}</strong>
                        : <span key={index}>{part.text}</span>
                )}
            </>
        );
    };

    const renderViewMode = () => {
        if (!note) return <div className="text-sm text-[var(--color-textSecondary)]">Note not found.</div>;

        const parsedSections = parseNoteContent(note.content);

        return (
            <div className="space-y-6 p-4 bg-[var(--color-surface)]">
                <div className="flex justify-between items-start">
                    <h3 className="text-xl font-medium text-[var(--color-text)]">{note.title}</h3>
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

                {parsedSections.length > 0 ? (
                    <div className="space-y-6">
                        {parsedSections.map((section, sectionIndex) => (
                            <div key={sectionIndex} className="space-y-2">
                                <h4 className="text-md font-semibold text-[var(--color-text)]">
                                    {section.title}
                                </h4>
                                <div className="space-y-2 pl-2 mt-1">
                                    {section.items.map((item, itemIndex) => (
                                        <div key={itemIndex} className={`flex items-start gap-2 ${item.isHorizontalDivider ? 'w-full' : ''}`}>
                                            {item.isHorizontalDivider ? (
                                                // Horizontal divider
                                                <div className="w-full border-t border-[var(--color-border)] my-3"></div>
                                            ) : item.isNumbered ? (
                                                // Numbered list item
                                                <div className="flex-shrink-0 pt-0.5 min-w-[24px] text-right pr-1">
                                                    <span className="text-[var(--color-textSecondary)]">{item.number}.</span>
                                                </div>
                                            ) : (
                                                // Checkbox or bullet item
                                                <div className="flex-shrink-0 pt-0.5">
                                                    <div className={`w-5 h-5 border ${item.checked ? 'bg-blue-500 border-blue-600' : 'bg-white border-gray-400 dark:bg-gray-800 dark:border-gray-600'} flex items-center justify-center rounded-sm`}>
                                                        {item.checked && (
                                                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            {!item.isHorizontalDivider && (
                                                <div className="flex items-center flex-1">
                                                    <span className={`${item.checked ? 'line-through text-[var(--color-textSecondary)]' : 'text-[var(--color-text)]'}`}>
                                                        {formatTextWithBold(item.text)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : note.content ? (
                    <div className="text-[var(--color-text)] whitespace-pre-wrap">
                        {note.content}
                    </div>
                ) : null}

                {note.tags && note.tags.length > 0 && (
                    <div className="pt-2 border-t border-[var(--color-border)]">
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

                <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t border-[var(--color-border)]">
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
                <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-textSecondary)]">
                        <AlignLeft className="w-4 h-4" />
                        Content
                    </label>
                    <textarea
                        value={content || ''}
                        onChange={(e) => setContent(e.target.value)}
                        rows={10}
                        className={`w-full px-3 py-2 bg-[var(--color-surface-elevated)] border ${getBorderStyle()} rounded-lg focus:ring-2 focus:ring-[var(--color-note)] focus:border-transparent text-[var(--color-text)] disabled:opacity-50 transition-colors`}
                        placeholder="Add content to your note"
                        disabled={loading}
                    />
                    <div className="text-xs text-[var(--color-textSecondary)] mt-1">
                        <p>Formatting tips:</p>
                        <ul className="list-disc pl-4 mt-1 space-y-0.5">
                            <li>Use <code className="bg-[var(--color-surface-elevated)] px-1 rounded">Category name:</code> or <code className="bg-[var(--color-surface-elevated)] px-1 rounded">**Category name:**</code> for section headers</li>
                            <li>Use <code className="bg-[var(--color-surface-elevated)] px-1 rounded">- [ ] Item name</code> for unchecked items</li>
                            <li>Use <code className="bg-[var(--color-surface-elevated)] px-1 rounded">- [x] Item name</code> for checked items</li>
                            <li>Use <code className="bg-[var(--color-surface-elevated)] px-1 rounded">1. Step one</code> format for numbered instructions</li>
                            <li>Use <code className="bg-[var(--color-surface-elevated)] px-1 rounded">---</code> on a line by itself to create a horizontal divider</li>
                            <li>Use <code className="bg-[var(--color-surface-elevated)] px-1 rounded">*bold text**</code> to make text bold</li>
                            <li>Add emoji at the end of items for visual icons</li>
                        </ul>
                    </div>
                </div>

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
                            {isEditing ? "Edit Note" : note?.title || "TickTick Note"}
                        </h2>
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