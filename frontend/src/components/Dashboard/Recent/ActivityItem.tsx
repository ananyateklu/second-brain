import React from 'react';
import {
  FileText,
  Lightbulb,
  CheckSquare,
  Bell,
  Pencil,
  Plus,
  Trash2,
  Star,
  Archive,
  Pin,
} from 'lucide-react';
import { Activity } from '../../../contexts/ActivityContext';
import { formatTimeAgo } from './utils';
import { Link } from 'react-router-dom';

interface ActivityItemProps {
  activity: Activity;
  onClick?: () => void;
}

const itemTypeIcons: Record<string, React.ElementType> = {
  note: FileText,
  task: CheckSquare,
  idea: Lightbulb,
  reminder: Bell,
  // Add more item types if needed
};

const actionTypeIcons: Record<string, React.ElementType> = {
  create: Plus,
  edit: Pencil,
  delete: Trash2,
  archive: Archive,
  unarchive: Archive,
  favorite: Star,
  unfavorite: Star,
  pin: Pin,
  unpin: Pin,
  // Add more action types if needed
};

const itemTypeColors: Record<string, string> = {
  note: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  task: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  idea: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  reminder: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  // Add more item types if needed
};

export function ActivityItem({ activity, onClick }: ActivityItemProps) {
  const ItemTypeIcon = itemTypeIcons[activity.itemType] || FileText;
  const ActionTypeIcon = actionTypeIcons[activity.actionType] || Pencil;
  const itemTypeColorClass = itemTypeColors[activity.itemType] || 'bg-gray-100 text-gray-600';

  // Build the link to the item if routes are set up
  let itemLink = '#';
  switch (activity.itemType) {
    case 'note':
      itemLink = `/notes/${activity.itemId}`;
      break;
    case 'task':
      itemLink = `/tasks/${activity.itemId}`;
      break;
    case 'idea':
      itemLink = `/ideas/${activity.itemId}`;
      break;
    case 'reminder':
      itemLink = `/reminders/${activity.itemId}`;
      break;
    default:
      break;
  }

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
        {/* Item Type Icon */}
        <div className={`p-2 rounded-lg ${itemTypeColorClass}`}>
          <ItemTypeIcon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Activity Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              {/* Item Title */}
              <h4 className="text-base font-medium text-gray-900 dark:text-white flex items-center gap-1">
                <Link to={itemLink} className="hover:underline">
                  {activity.itemTitle}
                </Link>
              </h4>
              {/* Activity Description */}
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                <span className="flex items-center gap-1">
                  {/* Action Icon */}
                  <ActionTypeIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  {activity.description}
                </span>
              </p>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {formatTimeAgo(activity.timestamp)}
            </span>
          </div>

          {/* Metadata */}
          {activity.metadata && (
            <div className="mt-3 text-sm text-gray-700 dark:text-gray-300">
              {/* Display due date for tasks */}
              {activity.metadata.dueDate && (
                <div>
                  Due Date:{' '}
                  {new Date(activity.metadata.dueDate).toLocaleDateString()}
                </div>
              )}
              {/* Display tags */}
              {activity.metadata.tags && activity.metadata.tags.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {activity.metadata.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}