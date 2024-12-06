import { Link2, Plus, Type, Lightbulb, X } from 'lucide-react';
import { LinkedItem } from '../../../../api/types/reminder';

interface LinkedItemsPanelProps {
  readonly linkedItems: LinkedItem[];
  readonly onShowAddLink: () => void;
  readonly onUnlink: (itemId: string) => void;
}

export function LinkedItemsPanel({
  linkedItems,
  onShowAddLink,
  onUnlink
}: LinkedItemsPanelProps) {
  return (
    <div className="border-l border-gray-200/30 dark:border-[#1C1C1E] flex flex-col min-h-0">
      <div className="shrink-0 px-4 py-3 border-b border-gray-200/30 dark:border-[#1C1C1E] bg-white dark:bg-[#111111] backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Linked Items
            </h3>
          </div>
          <button
            type="button"
            onClick={onShowAddLink}
            className="flex items-center gap-1.5 px-2 py-1 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Link Item
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white dark:bg-[#111111]">
        {linkedItems.length > 0 ? (
          linkedItems.map(item => (
            <div
              key={item.id}
              className="group relative p-3 rounded-lg bg-white dark:bg-[#1C1C1E] hover:bg-gray-50 dark:hover:bg-[#2C2C2E] transition-colors border border-gray-200/50 dark:border-[#2C2C2E]"
            >
              <div className="flex items-start gap-3">
                {item.type === 'idea' ? (
                  <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                    <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                ) : (
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Type className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h6 className="font-medium text-gray-900 dark:text-white truncate">
                    {item.title}
                  </h6>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {item.type === 'idea' ? 'Idea' : 'Note'}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onUnlink(item.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 rounded transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Link2 className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No linked items yet
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Click "Link Item" to connect with notes or ideas
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 