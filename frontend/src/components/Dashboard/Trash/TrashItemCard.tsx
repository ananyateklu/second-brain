import React from 'react';
import { 
  FileText, 
  CheckSquare, 
  Lightbulb, 
  Bell, 
  Tag,
  Star,
  RotateCcw,
  Trash2,
  Clock,
  Link2
} from 'lucide-react';
import { TrashedItem } from '../../../contexts/TrashContext';
import { formatTimeAgo } from '../Recent/utils';

interface TrashItemCardProps {
  item: TrashedItem;
  isSelected: boolean;
  onSelect: () => void;
}

export function TrashItemCard({ item, isSelected, onSelect }: TrashItemCardProps) {
  const getIcon = () => {
    const icons: Record<string, React.ReactNode> = {
      note: <FileText className="w-4 h-4" />,
      task: <CheckSquare className="w-4 h-4" />,
      idea: <Lightbulb className="w-4 h-4" />,
      reminder: <Bell className="w-4 h-4" />,
      tag: <Tag className="w-4 h-4" />
    };
    return icons[item.type];
  };

  const getIconBackground = () => {
    const colors: Record<string, string> = {
      note: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
      task: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
      idea: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
      reminder: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
      tag: 'bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400'
    };
    return colors[item.type];
  };

  const daysUntilExpiration = Math.ceil(
    (new Date(item.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className={`
      group relative bg-white dark:bg-dark-card rounded-lg border-2 transition-all duration-200
      ${isSelected 
        ? 'border-primary-500 dark:border-primary-400' 
        : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'
      }
    `}>
      <div className="absolute top-4 left-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="w-4 h-4 text-primary-600 bg-white dark:bg-dark-bg border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500"
        />
      </div>

      <div className="p-6 pt-12">
        <div className="flex items-start justify-between gap-4">
          <div className={`p-2 rounded-lg ${getIconBackground()}`}>
            {getIcon()}
          </div>

          <div className="flex items-center gap-2">
            {item.metadata?.isFavorite && (
              <Star className="w-4 h-4 text-amber-500 dark:text-amber-400" fill="currentColor" />
            )}
            {item.metadata?.linkedItems && item.metadata.linkedItems.length > 0 && (
              <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                <Link2 className="w-4 h-4" />
                <span className="text-xs">{item.metadata.linkedItems.length}</span>
              </div>
            )}
          </div>
        </div>

        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
          {item.title}
        </h3>

        {item.content && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {item.content}
          </p>
        )}

        {item.metadata?.tags && item.metadata.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {item.metadata.tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full text-xs"
              >
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
              <Clock className="w-4 h-4" />
              <span>Deleted {formatTimeAgo(item.deletedAt)}</span>
            </div>
            <span className="text-red-600 dark:text-red-400">
              {daysUntilExpiration}d left
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}