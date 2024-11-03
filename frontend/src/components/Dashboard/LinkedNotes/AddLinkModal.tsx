import React, { useState } from 'react';
import { X, Search, Link2, Lightbulb, FileText } from 'lucide-react';
import { useNotes } from '../../../contexts/NotesContext';

interface AddLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceNoteId: string;
  onLinkAdded?: () => void;
}

export function AddLinkModal({ isOpen, onClose, sourceNoteId, onLinkAdded }: AddLinkModalProps) {
  const { notes, addLink } = useNotes();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<'all' | 'notes' | 'ideas'>('all');

  if (!isOpen) return null;

  const sourceNote = notes.find(note => note.id === sourceNoteId);
  if (!sourceNote) return null;

  const isSourceIdea = sourceNote.tags.includes('idea');

  const filteredItems = notes.filter(note => 
    note.id !== sourceNoteId && // Don't show the source note
    !sourceNote?.linkedNoteIds?.includes(note.id) && // Don't show already linked notes
    (selectedType === 'all' || 
     (selectedType === 'ideas' && note.tags.includes('idea')) ||
     (selectedType === 'notes' && !note.tags.includes('idea'))) &&
    (note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
     note.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAddLink = async (targetNoteId: string) => {
    try {
      setIsLoading(true);
      await addLink(sourceNoteId, targetNoteId);
      onLinkAdded?.();
      onClose();
    } catch (error) {
      console.error('Failed to add link:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg glass-morphism rounded-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Link to Note or Idea
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
            {/* Search and Filter Controls */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                  disabled={isLoading}
                />
              </div>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as 'all' | 'notes' | 'ideas')}
                className="px-3 py-2 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                disabled={isLoading}
              >
                <option value="all">All Items</option>
                <option value="notes">Notes Only</option>
                <option value="ideas">Ideas Only</option>
              </select>
            </div>

            {/* Items List */}
            <div className="max-h-60 overflow-y-auto">
              {filteredItems.map(item => {
                const isIdea = item.tags.includes('idea');
                return (
                  <button
                    key={item.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddLink(item.id);
                    }}
                    disabled={isLoading}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-dark-hover rounded-lg transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className={`p-1.5 rounded-lg ${
                      isIdea 
                        ? 'bg-amber-100 dark:bg-amber-900/30' 
                        : 'bg-blue-100 dark:bg-blue-900/30'
                    }`}>
                      {isIdea ? (
                        <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      ) : (
                        <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {item.title}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                        {item.content}
                      </p>
                    </div>
                  </button>
                );
              })}

              {filteredItems.length === 0 && (
                <p className="text-center py-4 text-gray-500 dark:text-gray-400">
                  No items available to link
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}