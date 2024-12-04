import { useState } from 'react';
import { X, Search, Type, Lightbulb, AlertCircle } from 'lucide-react';
import { useNotes } from '../../../contexts/notesContextUtils';

interface AddLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    sourceNoteId: string;
    onLinkAdded: () => void;
}

export function AddLinkModal({ isOpen, onClose, sourceNoteId, onLinkAdded }: AddLinkModalProps) {
    const { notes, addLink } = useNotes();
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const filteredNotes = notes
        .filter(note => note.id !== sourceNoteId && !note.linkedNoteIds?.includes(sourceNoteId))
        .filter(note =>
            note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            note.content.toLowerCase().includes(searchQuery.toLowerCase())
        );

    const handleLinkNote = async (targetNoteId: string) => {
        setIsLoading(true);
        setError('');

        try {
            await addLink(sourceNoteId, targetNoteId);
            onLinkAdded();
            onClose();
        } catch (err) {
            console.error('Failed to link note:', err);
            setError('Failed to link note. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

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

                        {/* Error Message */}
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <div className="flex items-center gap-2 text-red-500">
                                    <AlertCircle className="w-4 h-4" />
                                    <span>{error}</span>
                                </div>
                            </div>
                        )}

                        {/* Notes List */}
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {filteredNotes.length > 0 ? (
                                filteredNotes.map(note => (
                                    <div
                                        key={note.id}
                                        className="group relative p-3 rounded-lg bg-[var(--color-surface)] hover:bg-[var(--color-surface)]/80 transition-colors cursor-pointer border border-[var(--color-border)]"
                                        onClick={() => handleLinkNote(note.id)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`p-1.5 rounded-lg ${note.isIdea 
                                                ? 'bg-[var(--color-idea)]/10' 
                                                : 'bg-[var(--color-note)]/10'}`}
                                            >
                                                {note.isIdea ? (
                                                    <Lightbulb className="w-4 h-4 text-[var(--color-idea)]" />
                                                ) : (
                                                    <Type className="w-4 h-4 text-[var(--color-note)]" />
                                                )}
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
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}