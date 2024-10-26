import React, { createContext, useContext, useState, useCallback } from 'react';

export interface Activity {
  id: string;
  timestamp: string;
  actionType: 'create' | 'edit' | 'archive' | 'unarchive' | 'delete' | 'favorite' | 'unfavorite' | 'pin' | 'unpin';
  itemType: 'note' | 'task' | 'idea' | 'reminder';
  itemId: string;
  itemTitle: string;
  description: string;
  metadata?: {
    previousTitle?: string;
    newTitle?: string;
    previousContent?: string;
    newContent?: string;
    tags?: string[];
  };
}

interface ActivityContextType {
  activities: Activity[];
  addActivity: (activity: Omit<Activity, 'id' | 'timestamp'>) => void;
  clearActivities: () => void;
  getActivitiesByItemId: (itemId: string) => Activity[];
}

const ActivityContext = createContext<ActivityContextType | null>(null);

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const [activities, setActivities] = useState<Activity[]>([]);

  const addActivity = useCallback((activity: Omit<Activity, 'id' | 'timestamp'>) => {
    const newActivity: Activity = {
      ...activity,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };
    setActivities(prev => [newActivity, ...prev]);
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