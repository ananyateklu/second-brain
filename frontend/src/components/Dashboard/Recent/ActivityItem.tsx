import React from 'react';
import { 
  FileText, 
  Lightbulb, 
  Star,
  Archive,
  Trash2,
  Pencil,
  Plus,
  Pin,
  Link2
} from 'lucide-react';
import { Activity } from '../../../contexts/ActivityContext';
import { formatTimeAgo } from './utils';

interface ActivityItemProps {
  activity: Activity;
  onClick?: () => void;
}

export function ActivityItem({ activity, onClick }: ActivityItemProps) {
  const getIcon = () => {
    const icons: Record<string, React.ReactNode> = {
      create: <Plus className="w-4 h-4" />,
      edit: <Pencil className="w-4 h-4" />,
      archive: <Archive className="w-4 h-4" />,
      unarchive: <Archive className="w-4 h-4" />,
      delete: <Trash2 className="w-4 h-4" />,
      favorite: <Star className="w-4 h-4" fill="currentColor" />,
      unfavorite: <Star className="w-4 h-4" />,
      pin: <Pin className="w-4 h-4" />,
      unpin: <Pin className="w-4 h-4" />
    };

    return icons[activity.actionType] || (
      activity.itemType === 'idea' ? (
        <Lightbulb className="w-4 h-4" />
      ) : (
        <FileText className="w-4 h-4" />
      )
    );
  };

  const getIconBackground = () => {
    const colors: Record<string, string> = {
      create: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
      edit: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
      archive: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
      unarchive: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
      delete: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
      favorite: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
      unfavorite: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
      pin: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
      unpin: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
    };

    return colors[activity.actionType] || (
      activity.itemType === 'idea'
        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
    );
  };

  return (
    <div 
      onClick={onClick}
      className={`
        group bg-white dark:bg-dark-card rounded-lg p-4 
        hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-black/10 
        transition-all duration-200
        ${onClick ? 'cursor-pointer' : ''}
      `}
    >
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-lg ${getIconBackground()}`}>
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-base font-medium text-gray-900 dark:text-white">
                {activity.itemTitle}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {activity.description}
              </p>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {formatTimeAgo(activity.timestamp)}
            </span>
          </div>

          {activity.metadata?.tags && activity.metadata.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {activity.metadata.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}