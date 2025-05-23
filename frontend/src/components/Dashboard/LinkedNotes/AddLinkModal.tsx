import { useState } from 'react';
import { X, Search, Type, Lightbulb, AlertCircle, Tag } from 'lucide-react';
import { useNotes } from '../../../contexts/notesContextUtils';
import { useIdeas } from '../../../contexts/ideasContextUtils';
import { useTasks } from '../../../contexts/tasksContextUtils';

interface AddLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    sourceId: string;
    onLinkAdded: () => void;
    sourceType: 'note' | 'idea' | 'task';
}

export function AddLinkModal({ isOpen, onClose, sourceId, onLinkAdded, sourceType }: AddLinkModalProps) {
    const { notes, addLink } = useNotes();
    const { state: { ideas }, addLink: addIdeaLink } = useIdeas();
    const { addTaskLink } = useTasks();
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [linkType, setLinkType] = useState('default');
    const [selectedItemType, setSelectedItemType] = useState<'note' | 'idea'>('note');

    if (!isOpen) return null;

    const filteredNotes = notes
        .filter(note => {
            if (sourceType === 'note') {
                return note.id !== sourceId && !note.linkedItems?.some(item => item.id === sourceId);
            }
            return true;
        })
        .filter(note =>
            note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            note.content.toLowerCase().includes(searchQuery.toLowerCase())
        );

    const filteredIdeas = ideas
        .filter(idea => {
            if (sourceType === 'idea') {
                // Don't show the current idea in the list
                if (idea.id === sourceId) return false;

                // Don't show ideas that are already linked
                const alreadyLinkedIdeas = idea.linkedItems
                    .filter(link => link.type === 'Idea')
                    .map(link => link.id);
                return !alreadyLinkedIdeas.includes(sourceId);
            }
            return true;
        })
        .filter(idea =>
            idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            idea.content.toLowerCase().includes(searchQuery.toLowerCase())
        );

    const handleLinkItem = async (targetId: string, targetType: 'note' | 'idea') => {
        setIsLoading(true);
        setError('');

        try {
            if (sourceType === 'note') {
                if (targetType === 'note') {
                    // Link note to note - this should create bidirectional links
                    await addLink(sourceId, targetId, 'Note', linkType);
                } else {
                    // Link note to idea - create bidirectional links
                    // First link from note to idea (via notes API)
                    await addLink(sourceId, targetId, 'Idea', linkType);
                    // Then link from idea to note (via ideas API) 
                    await addIdeaLink(targetId, sourceId, 'Note', linkType);
                }
            } else if (sourceType === 'task') {
                // Link task to note or idea
                await addTaskLink({
                    taskId: sourceId,
                    linkedItemId: targetId,
                    itemType: targetType,
                    description: ''
                });

                // Create reverse link so the target item also shows in graph
                if (targetType === 'note') {
                    // Link note back to task
                    await addLink(targetId, sourceId, 'Task', linkType);
                } else {
                    // Link idea back to task
                    await addIdeaLink(targetId, sourceId, 'Task', linkType);
                }
            } else {
                // Source is an idea
                if (targetType === 'note') {
                    // Link idea to note and note to idea
                    await addIdeaLink(sourceId, targetId, 'Note', linkType);
                    await addLink(targetId, sourceId, 'Idea', linkType);
                } else {
                    // Link idea to idea - this should create bidirectional links
                    await addIdeaLink(sourceId, targetId, 'Idea', linkType);
                }
            }

            onLinkAdded();
            onClose();
        } catch (err) {
            console.error('Failed to link items:', err);
            setError('Failed to link. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const linkTypeOptions = [
        { id: 'default', label: 'Default' },
        { id: 'related', label: 'Related' },
        { id: 'reference', label: 'Reference' },
        { id: 'child', label: 'Child' },
        { id: 'parent', label: 'Parent' }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-lg bg-[var(--color-surface)] rounded-xl shadow-2xl overflow-hidden border border-[var(--color-border)]">
                <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
                    <h3 className="text-lg font-medium text-[var(--color-text)]">
                        Link to Note or Idea
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
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-transparent transition-colors text-[var(--color-text)] placeholder-[var(--color-textSecondary)]"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Item Type Toggle */}
                        <div className="flex gap-2 mb-2">
                            <button
                                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 ${selectedItemType === 'note'
                                    ? 'bg-[var(--color-note)]/10 text-[var(--color-note)] border border-[var(--color-note)]/30'
                                    : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-textSecondary)] hover:bg-[var(--color-surfaceHover)]'
                                    } transition-colors`}
                                onClick={() => setSelectedItemType('note')}
                            >
                                <Type className="w-4 h-4" />
                                Notes
                            </button>
                            <button
                                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 ${selectedItemType === 'idea'
                                    ? 'bg-[var(--color-idea)]/10 text-[var(--color-idea)] border border-[var(--color-idea)]/30'
                                    : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-textSecondary)] hover:bg-[var(--color-surfaceHover)]'
                                    } transition-colors`}
                                onClick={() => setSelectedItemType('idea')}
                            >
                                <Lightbulb className="w-4 h-4" />
                                Ideas
                            </button>
                        </div>

                        {/* Link Type Selector */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
                                <Tag className="w-4 h-4" />
                                Link Type
                            </label>
                            <select
                                value={linkType}
                                onChange={(e) => setLinkType(e.target.value)}
                                className="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-transparent transition-colors text-[var(--color-text)]"
                                disabled={isLoading}
                            >
                                {linkTypeOptions.map(option => (
                                    <option key={option.id} value={option.id}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
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

                        {/* Items List */}
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {selectedItemType === 'note' ? (
                                filteredNotes.length > 0 ? (
                                    filteredNotes.map(note => (
                                        <div
                                            key={note.id}
                                            className="group relative p-3 rounded-lg bg-[var(--color-surface)] hover:bg-[var(--color-surface)]/80 transition-colors cursor-pointer border border-[var(--color-border)]"
                                            onClick={() => handleLinkItem(note.id, 'note')}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="p-1.5 rounded-lg bg-[var(--color-note)]/10">
                                                    <Type className="w-4 h-4 text-[var(--color-note)]" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h6 className="font-medium text-[var(--color-text)] truncate">
                                                        {note.title}
                                                    </h6>
                                                    <p className="text-sm text-[var(--color-textSecondary)] line-clamp-2 mt-0.5">
                                                        {note.content}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8">
                                        <p className="text-[var(--color-textSecondary)]">
                                            {searchQuery
                                                ? 'No matching notes found'
                                                : 'No notes available to link'}
                                        </p>
                                    </div>
                                )
                            ) : (
                                filteredIdeas.length > 0 ? (
                                    filteredIdeas.map(idea => (
                                        <div
                                            key={idea.id}
                                            className="group relative p-3 rounded-lg bg-[var(--color-surface)] hover:bg-[var(--color-surface)]/80 transition-colors cursor-pointer border border-[var(--color-border)]"
                                            onClick={() => handleLinkItem(idea.id, 'idea')}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="p-1.5 rounded-lg bg-[var(--color-idea)]/10">
                                                    <Lightbulb className="w-4 h-4 text-[var(--color-idea)]" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h6 className="font-medium text-[var(--color-text)] truncate">
                                                        {idea.title}
                                                    </h6>
                                                    <p className="text-sm text-[var(--color-textSecondary)] line-clamp-2 mt-0.5">
                                                        {idea.content}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8">
                                        <p className="text-[var(--color-textSecondary)]">
                                            {searchQuery
                                                ? 'No matching ideas found'
                                                : 'No ideas available to link'}
                                        </p>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}