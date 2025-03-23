import { useState } from 'react';
import { Search, X, Lightbulb, Type, CheckCircle } from 'lucide-react';
import { useNotes } from '../../../../contexts/notesContextUtils';
import { useTasks } from '../../../../contexts/tasksContextUtils';

interface AddLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTaskId: string;
  onLinkAdded?: (linkedItemId: string, itemType: string) => Promise<void>;
}

export function AddLinkModal({ isOpen, onClose, currentTaskId, onLinkAdded }: AddLinkModalProps) {
  const { notes } = useNotes();
  const { tasks, addTaskLink } = useTasks();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<'all' | 'notes' | 'ideas'>('all');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentTask = tasks.find(task => task.id === currentTaskId);
  if (!currentTask) return null;

  const alreadyLinkedIds = currentTask.linkedItems.map(item => item.id);

  const filteredItems = notes.filter(note =>
    !alreadyLinkedIds.includes(note.id) && // Don't show already linked items
    (selectedType === 'all' ||
      (selectedType === 'ideas' && note.isIdea) ||
      (selectedType === 'notes' && !note.isIdea)) &&
    (note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAddLink = async (linkedItemId: string) => {
    try {
      setIsLoading(true);
      setSuccessMessage(null);

      const itemTitle = notes.find(n => n.id === linkedItemId)?.title || 'Item';
      const itemType = notes.find(n => n.id === linkedItemId)?.isIdea ? 'idea' : 'note';

      if (onLinkAdded) {
        // If parent component provided a callback, use it
        await onLinkAdded(linkedItemId, itemType);
      } else {
        // Otherwise, handle directly
        await addTaskLink({
          taskId: currentTaskId,
          linkedItemId,
          itemType
        });
      }

      // Show success message instead of closing
      setSuccessMessage(`Successfully linked ${itemType} "${itemTitle}"`);

      // Clear message after 3 seconds, but DON'T close the modal
      setTimeout(() => {
        // Only clear the message if it's still the same one we set
        setSuccessMessage(current =>
          current === `Successfully linked ${itemType} "${itemTitle}"` ? null : current
        );
      }, 3000);
    } catch (error) {
      console.error('Failed to add link:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white dark:bg-[#111111] rounded-xl shadow-2xl overflow-hidden border border-gray-200/30 dark:border-[#1C1C1E]">
        <div className="flex items-center justify-between p-4 border-b border-gray-200/30 dark:border-[#1C1C1E]">
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
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#1C1C1E] border border-gray-200/50 dark:border-[#2C2C2E] rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-transparent transition-colors text-gray-700 dark:text-gray-300"
                  disabled={isLoading}
                />
              </div>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as 'all' | 'notes' | 'ideas')}
                className="px-3 py-2 bg-white dark:bg-[#1C1C1E] border border-gray-200/50 dark:border-[#2C2C2E] rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-transparent transition-colors text-gray-700 dark:text-gray-300"
                disabled={isLoading}
              >
                <option value="all">All Items</option>
                <option value="notes">Notes Only</option>
                <option value="ideas">Ideas Only</option>
              </select>
            </div>

            <div className="max-h-60 overflow-y-auto">
              {filteredItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleAddLink(item.id)}
                  disabled={isLoading}
                  className="w-full flex items-center gap-3 p-3 bg-white dark:bg-[#1C1C1E] hover:bg-gray-50 dark:hover:bg-[#2C2C2E] rounded-lg transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200/50 dark:border-[#2C2C2E] mb-2"
                >
                  <div className={`p-1.5 rounded-lg ${item.isIdea
                    ? 'bg-amber-100 dark:bg-amber-900/30'
                    : 'bg-blue-100 dark:bg-blue-900/30'
                    }`}>
                    {item.isIdea ? (
                      <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <Type className="w-4 h-4 text-blue-600 dark:text-blue-400" />
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
              ))}

              {filteredItems.length === 0 && (
                <p className="text-center py-4 text-gray-500 dark:text-gray-400">
                  No items available to link
                </p>
              )}
            </div>
          </div>

          {/* Success message */}
          {successMessage && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg">
              <CheckCircle className="w-5 h-5" />
              <p className="text-sm">{successMessage}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 