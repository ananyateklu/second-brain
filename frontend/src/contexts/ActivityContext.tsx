import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { activityService, Activity } from '../api/services/activityService';

interface ActivityContextType {
  activities: Activity[];
  addActivity: (activity: Omit<Activity, 'id' | 'timestamp'>) => Promise<void>;
  clearActivities: () => void;
  getActivitiesByItemId: (itemId: string) => Activity[];
}

const ActivityContext = createContext<ActivityContextType | null>(null);

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const [activities, setActivities] = useState<Activity[]>([]);

  const fetchActivities = useCallback(async () => {
    try {
      const response = await activityService.getActivities();
      setActivities(response.data);
    } catch (err) {
      console.error('Failed to fetch activities:', err);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const addActivity = useCallback(async (activity: Omit<Activity, 'id' | 'timestamp'>) => {
    try {
      const response = await activityService.createActivity(activity);
      const newActivity = response.data;
      setActivities(prev => [newActivity, ...prev]);
    } catch (err) {
      console.error('Failed to add activity:', err);
    }
  }, []);

  const clearActivities = useCallback(() => {
    setActivities([]);
  }, []);

  const getActivitiesByItemId = useCallback((itemId: string) => {
    return activities.filter(activity => activity.itemId === itemId);
  }, [activities]);

  return (
    <ActivityContext.Provider value={{
      activities,
      addActivity,
      clearActivities,
      getActivitiesByItemId
    }}>
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivities() {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error('useActivities must be used within an ActivityProvider');
  }
  return context;
}