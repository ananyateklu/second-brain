import React from 'react';
import { Activity } from '../../../contexts/ActivityContext';
import { ActivityItem } from './ActivityItem';
import { groupActivitiesByDate } from './utils';

interface ActivityFeedProps {
  activities: Activity[];
  filters: {
    actionTypes: string[];
    itemTypes: string[];
    dateRange: 'all' | 'today' | 'week' | 'month';
  };
  searchQuery: string;
}

export function ActivityFeed({ activities, filters, searchQuery }: ActivityFeedProps) {
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
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          {searchQuery || filters.actionTypes.length > 0 || filters.itemTypes.length > 0
            ? "No activities match your search criteria"
            : "No recent activities"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {Object.entries(groupedActivities).map(([date, activities]) => (
        <div key={date}>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
            {date}
          </h3>
          <div className="space-y-4">
            {activities.map(activity => (
              <ActivityItem
                key={activity.id}
                activity={activity}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}