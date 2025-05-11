import { useState } from 'react';
import { X, Search, Type, Lightbulb } from 'lucide-react';
import { useNotes } from '../../../../contexts/notesContextUtils';
import { useIdeas } from '../../../../contexts/ideasContextUtils';

interface AddLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLink: (itemId: string, itemType: 'note' | 'idea') => void;
  existingLinkedItemIds: string[];
}

export function AddLinkModal({
  isOpen,
  onClose,
  onAddLink,
  existingLinkedItemIds
}: AddLinkModalProps) {
  const { notes } = useNotes();
  const { state: { ideas } } = useIdeas();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'notes' | 'ideas'>('notes');

  if (!isOpen) return null;

  // Filter notes (showing only non-deleted notes)
  const filteredNotes = selectedTab === 'notes'
    ? notes
      .filter(note =>
        !note.isDeleted &&
        (note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          note.content.toLowerCase().includes(searchQuery.toLowerCase())) &&
        !existingLinkedItemIds.includes(note.id)
      )
    : [];

  // Filter ideas (showing only non-deleted ideas)
  const filteredIdeas = selectedTab === 'ideas'
    ? ideas
      .filter(idea =>
        !idea.isDeleted &&
        (idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          idea.content.toLowerCase().includes(searchQuery.toLowerCase())) &&
        !existingLinkedItemIds.includes(idea.id)
      )
    : [];

  // Combine filtered items based on the selected tab
  const filteredItems = selectedTab === 'notes' ? filteredNotes : filteredIdeas;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl glass-morphism rounded-xl">
        <div className="flex flex-col h-[32rem]">
          {/* Header */}
          <div className="shrink-0 px-6 py-4 border-b border-gray-200/30 dark:border-[#1C1C1E]">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Link Item
              </h3>
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search and Tabs */}
          <div className="shrink-0 p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-[#1C1C1E] border-none rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSelectedTab('notes')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${selectedTab === 'notes'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1C1C1E]'
                  }`}
              >
                <Type className="w-4 h-4" />
                Notes
              </button>
              <button
                onClick={() => setSelectedTab('ideas')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${selectedTab === 'ideas'
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1C1C1E]'
                  }`}
              >
                <Lightbulb className="w-4 h-4" />
                Ideas
              </button>
            </div>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Search className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-gray-500 dark:text-gray-400">
                  {searchQuery
                    ? "No matching items found"
                    : `No ${selectedTab} available to link`}
                </p>
              </div>
            ) : (
              filteredItems.map(item => (
                <button
                  key={item.id}
                  onClick={async () => {
                    await onAddLink(item.id, selectedTab === 'notes' ? 'note' : 'idea');
                    onClose();
                  }}
                  className="w-full p-3 flex items-start gap-3 rounded-lg hover:bg-gray-50 dark:hover:bg-[#1C1C1E] transition-colors text-left"
                >
                  {selectedTab === 'notes' ? (
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Type className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  ) : (
                    <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                      <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {item.title}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                      {item.content || 'No description'}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 