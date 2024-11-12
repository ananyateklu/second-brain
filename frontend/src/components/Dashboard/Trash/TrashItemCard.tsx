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
  Link2,
  Calendar
} from 'lucide-react';
import { TrashedItem } from '../../../contexts/TrashContext';
import { formatTimeAgo } from '../Recent/utils';

interface TrashItemCardProps {
  item: TrashedItem;
  isSelected: boolean;
  onSelect: () => void;
  showMetadata?: boolean;
}

export function TrashItemCard({ item, isSelected, onSelect, showMetadata }: TrashItemCardProps) {
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

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event from bubbling up to parent
    onSelect();
  };

  return (
    <div
      onClick={handleCheckboxClick}
      className={`bg-white/20 dark:bg-gray-800/20 border ${
        isSelected
          ? 'border-primary-400/50 dark:border-primary-400/50'
          : 'border-gray-200/30 dark:border-gray-700/30'
      } shadow-sm p-4 rounded-xl hover:border-primary-400/50 dark:hover:border-primary-400/50 transition-all duration-200`}
    >
      <div className="flex items-start gap-4">
        {/* Checkbox */}
        <div className="flex-shrink-0 pt-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {}} // React requires onChange
            className="w-4 h-4 text-primary-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 p-2 rounded-lg ${getIconBackground()}`}>
              {getIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-medium text-gray-900 dark:text-white truncate">
                  {item.title}
                </h3>
                <span className="flex-shrink-0 text-sm text-red-600 dark:text-red-400 whitespace-nowrap">
                  {daysUntilExpiration}d left
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Deleted {formatTimeAgo(item.deletedAt)}
              </p>
            </div>
          </div>

          {/* Description */}
          {item.content && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2 break-words">
              {item.content}
            </p>
          )}

          {/* Metadata */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {item.metadata?.isFavorite && (
              <div className="flex items-center gap-1.5 text-amber-500 dark:text-amber-400">
                <Star className="w-4 h-4" fill="currentColor" />
                <span>Favorite</span>
              </div>
            )}

            {item.metadata?.linkedItems && item.metadata.linkedItems.length > 0 && (
              <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <Link2 className="w-4 h-4" />
                <span>{item.metadata.linkedItems.length} linked</span>
              </div>
            )}

            {item.type === 'reminder' && item.metadata?.dueDate && (
              <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <Calendar className="w-4 h-4" />
                <span className="truncate">
                  {new Date(item.metadata.dueDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {/* Tags */}
          {item.metadata?.tags && item.metadata.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {item.metadata.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 max-w-full"
                >
                  <Tag className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{tag}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}