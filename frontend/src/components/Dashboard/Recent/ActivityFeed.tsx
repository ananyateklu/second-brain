import { Activity } from '../../../services/api/activities.service';
import { ActivityItem } from './ActivityItem';
import { groupActivitiesByDate } from './utils';
import { History } from 'lucide-react';

interface ActivityFeedProps {
  activities: Activity[];
  filters: {
    actionTypes: string[];
    itemTypes: string[];
    dateRange: 'all' | 'today' | 'week' | 'month';
  };
  searchQuery: string;
  onActivityClick: (activity: Activity) => void;
}

export function ActivityFeed({ activities, filters, searchQuery, onActivityClick }: ActivityFeedProps) {
  const filteredActivities = activities.filter(activity => {
    // Search filter
    const matchesSearch = activity.itemTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.description.toLowerCase().includes(searchQuery.toLowerCase());

    // Action type filter
    const matchesActionType = filters.actionTypes.length === 0 ||
      filters.actionTypes.includes(activity.actionType);

    // Item type filter
    const matchesItemType = filters.itemTypes.length === 0 ||
      filters.itemTypes.includes(activity.itemType);

    // Date range filter
    let matchesDateRange = true;
    const activityDate = new Date(activity.timestamp);
    const now = new Date();

    if (filters.dateRange !== 'all') {
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      switch (filters.dateRange) {
        case 'today':
          matchesDateRange = activityDate >= startOfDay;
          break;
        case 'week':
          matchesDateRange = activityDate >= startOfWeek;
          break;
        case 'month':
          matchesDateRange = activityDate >= startOfMonth;
          break;
      }
    }

    return matchesSearch && matchesActionType && matchesItemType && matchesDateRange;
  });

  const groupedActivities = groupActivitiesByDate(filteredActivities);

  if (filteredActivities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <History className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mb-4" />
        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50 mb-2">
          No activities found
        </h3>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-md">
          {searchQuery || filters.actionTypes.length > 0 || filters.itemTypes.length > 0
            ? "No activities match your search criteria. Try adjusting your filters."
            : "Start creating and managing your notes to see activity here."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {Object.entries(groupedActivities).map(([date, activities]) => (
        <div key={date}>
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4">
            {date}
          </h3>
          <div className="space-y-4">
            {activities.map(activity => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                onClick={() => onActivityClick(activity)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}