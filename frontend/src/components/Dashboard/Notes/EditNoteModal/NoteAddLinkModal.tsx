import { useState } from 'react';
import { X, Search, Type, AlertCircle, Tag, Lightbulb } from 'lucide-react';
import { useNotes } from '../../../../contexts/notesContextUtils';
import { useIdeas } from '../../../../contexts/ideasContextUtils';
import { Idea } from '../../../../types/idea';

interface NoteAddLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    noteId: string;
    onLinkAdded: () => void;
}

export function NoteAddLinkModal({ isOpen, onClose, noteId, onLinkAdded }: NoteAddLinkModalProps) {
    const { notes, addLink: addNoteLink } = useNotes(); // Use addLink from useNotes
    const { state: { ideas } } = useIdeas(); // Correctly access ideas via state
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [linkType, setLinkType] = useState('default');
    const [itemTypeFilter, setItemTypeFilter] = useState<'all' | 'note' | 'idea'>('all');

    if (!isOpen) return null;

    // Get current note to check for already linked notes and ideas
    const currentNote = notes.find(note => note.id === noteId);
    const alreadyLinkedItemIds = currentNote?.linkedItems
        .filter(item => item.type === 'Note' || item.type === 'Idea')
        .map(item => item.id) || [];

    // Filter and format other notes
    const formattedNotes = notes
        .filter(note => note.id !== noteId && !alreadyLinkedItemIds.includes(note.id))
        .map(note => ({
            id: note.id,
            title: note.title,
            content: note.content,
            type: 'note'
        }));

    // Filter and format ideas
    const formattedIdeas = ideas
        .filter(idea => !alreadyLinkedItemIds.includes(idea.id)) // Ideas don't need to check against noteId
        .map((idea: Idea) => ({ // Added explicit type for idea
            id: idea.id,
            title: idea.title,
            content: idea.content,
            type: 'idea'
        }));

    // Combine and filter by search query and item type
    const allItems = [...formattedNotes, ...formattedIdeas]
        .filter(item =>
            itemTypeFilter === 'all' ||
            (itemTypeFilter === 'note' && item.type === 'note') ||
            (itemTypeFilter === 'idea' && item.type === 'idea')
        )
        .filter(item =>
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.content.toLowerCase().includes(searchQuery.toLowerCase())
        );

    const handleLinkItem = async (targetItemId: string, itemType: 'note' | 'idea') => {
        setIsLoading(true);
        setError('');

        try {
            // Use notes context addLink with the correct item type
            await addNoteLink(noteId, targetItemId, itemType === 'note' ? 'Note' : 'Idea');
            onLinkAdded();
            onClose();
        } catch (err) {
            console.error('Failed to link item:', err);
            setError(`Failed to link ${itemType}. Please try again.`);
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

    const itemTypeOptions = [
        { id: 'all', label: 'All Items' },
        { id: 'note', label: 'Notes Only' },
        { id: 'idea', label: 'Ideas Only' }
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
                        {/* Search and Item Type Filter */}
                        <div className="flex gap-2">
                            <div className="relative flex-1">
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
                            <div className="w-40">
                                <select
                                    value={itemTypeFilter}
                                    onChange={(e) => setItemTypeFilter(e.target.value as 'all' | 'note' | 'idea')}
                                    className="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-transparent transition-colors text-[var(--color-text)]"
                                    disabled={isLoading}
                                >
                                    {itemTypeOptions.map(option => (
                                        <option key={option.id} value={option.id}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
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
                            {allItems.length > 0 ? (
                                allItems.map(item => (
                                    <div
                                        key={item.id}
                                        className="group relative p-3 rounded-lg bg-[var(--color-surface)] hover:bg-[var(--color-surface)]/80 transition-colors cursor-pointer border border-[var(--color-border)]"
                                        onClick={() => handleLinkItem(item.id, item.type as 'note' | 'idea')}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`p-1.5 rounded-lg ${item.type === 'idea'
                                                ? 'bg-[var(--color-idea)]/10'
                                                : 'bg-[var(--color-note)]/10'}`}
                                            >
                                                {item.type === 'idea' ? (
                                                    <Lightbulb className="w-4 h-4 text-[var(--color-idea)]" />
                                                ) : (
                                                    <Type className="w-4 h-4 text-[var(--color-note)]" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h6 className="font-medium text-[var(--color-text)] truncate">
                                                    {item.title}
                                                </h6>
                                                <p className="text-sm text-[var(--color-textSecondary)] line-clamp-2 mt-0.5">
                                                    {item.content}
                                                </p>
                                                <div className="mt-1">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${item.type === 'idea'
                                                        ? 'bg-[var(--color-idea)]/10 text-[var(--color-idea)]'
                                                        : 'bg-[var(--color-note)]/10 text-[var(--color-note)]'
                                                        }`}>
                                                        {item.type === 'idea' ? 'Idea' : 'Note'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-[var(--color-textSecondary)]">
                                        {searchQuery
                                            ? 'No matching items found'
                                            : 'No items available to link'}
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