import React, { useState } from 'react';
import { 
  FileText, 
  CheckSquare, 
  Lightbulb, 
  Bell, 
  Tag, 
  Settings,
  Star,
  Link2,
  Pencil,
  Plus,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { Activity, useActivities } from '../../../contexts/ActivityContext';
import { formatTimeAgo } from './utils';

interface ActivityItemProps {
  activity: Activity;
}

export function ActivityItem({ activity }: ActivityItemProps) {
  const { undoActivity } = useActivities();
  const [isUndoing, setIsUndoing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getIcon = () => {
    // Item type icons
    const itemIcons: Record<string, React.ReactNode> = {
      note: <FileText className="w-4 h-4" />,
      task: <CheckSquare className="w-4 h-4" />,
      idea: <Lightbulb className="w-4 h-4" />,
      reminder: <Bell className="w-4 h-4" />,
      tag: <Tag className="w-4 h-4" />,
      settings: <Settings className="w-4 h-4" />
    };

    // Action type icons
    const actionIcons: Record<string, React.ReactNode> = {
      create: <Plus className="w-4 h-4" />,
      edit: <Pencil className="w-4 h-4" />,
      delete: <Trash2 className="w-4 h-4" />,
      complete: <CheckSquare className="w-4 h-4" />,
      link: <Link2 className="w-4 h-4" />,
      favorite: <Star className="w-4 h-4" />
    };

    return actionIcons[activity.actionType] || itemIcons[activity.itemType];
  };

  const getIconBackground = () => {
    const colors: Record<string, string> = {
      create: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
      edit: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
      delete: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
      complete: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
      link: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
      favorite: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
    };

    return colors[activity.actionType] || 'bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400';
  };

  const handleUndo = async () => {
    try {
      setIsUndoing(true);
      setError(null);
      await undoActivity(activity.id);
    } catch (err) {
      setError('Failed to undo action');
    } finally {
      setIsUndoing(false);
    }
  };

  return (
    <div className="group bg-white dark:bg-dark-card rounded-lg p-4 hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-black/10 transition-all duration-200">
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

          {error && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          {activity.undoable && (
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleUndo}
                disabled={isUndoing}
                className="flex items-center gap-1.5 px-2 py-1 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isUndoing ? 'Undoing...' : 'Undo'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}