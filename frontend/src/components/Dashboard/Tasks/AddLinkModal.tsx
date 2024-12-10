import { useState } from 'react';
import { X, Search, Lightbulb, FileText } from 'lucide-react';
import { useNotes } from '../../../contexts/notesContextUtils';
import { useTasks } from '../../../contexts/tasksContextUtils';

interface AddLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string | null;
  onLinkAdded?: () => void;
}

export function AddLinkModal({ isOpen, onClose, taskId, onLinkAdded }: AddLinkModalProps) {
  const { notes } = useNotes();
  const { tasks, addTaskLink } = useTasks();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'notes' | 'ideas'>('all');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !taskId) return null;

  const task = tasks.find(t => t.id === taskId);
  if (!task) return null;

  const filteredItems = notes.filter(item => {
    const isIdea = item.tags.includes('idea');
    const isAlreadyLinked = task.linkedItems.some(linkedItem => 
      linkedItem.id === item.id && linkedItem.type === (isIdea ? 'idea' : 'note')
    );

    return !isAlreadyLinked && // Don't show already linked items
      (selectedType === 'all' ||
        (selectedType === 'ideas' && isIdea) ||
        (selectedType === 'notes' && !isIdea)) &&
      (item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.content.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const handleAddLink = async (itemId: string) => {
    setIsLoading(true);
    try {
      const note = notes.find(n => n.id === itemId);
      if (!note) return;
      
      const isIdea = note.tags.includes('idea');
      await addTaskLink({
        taskId,
        linkedItemId: itemId,
        itemType: isIdea ? 'idea' : 'note',
        description: ''
      });
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
                onChange={(e) => setSelectedType(e.target.value as typeof selectedType)}
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
                    onClick={() => handleAddLink(item.id)}
                    disabled={isLoading}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-dark-hover rounded-lg transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className={`p-1.5 rounded-lg ${isIdea
                        ? 'bg-[var(--color-idea)]/10'
                        : 'bg-[var(--color-note)]/10'
                      }`}>
                      {isIdea ? (
                        <Lightbulb className="w-4 h-4 text-[var(--color-idea)]" />
                      ) : (
                        <FileText className="w-4 h-4 text-[var(--color-note)]" />
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