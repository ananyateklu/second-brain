import React, { createContext, useContext, useState, useCallback } from 'react';

export interface Activity {
  id: string;
  timestamp: string;
  actionType: 'create' | 'edit' | 'delete' | 'complete' | 'incomplete' | 'link' | 'unlink' | 'tag' | 'favorite' | 'settings';
  itemType: 'note' | 'task' | 'idea' | 'reminder' | 'tag' | 'settings';
  itemId: string;
  itemTitle: string;
  description: string;
  undoable: boolean;
  metadata?: Record<string, any>;
}

interface ActivityContextType {
  activities: Activity[];
  addActivity: (activity: Omit<Activity, 'id' | 'timestamp'>) => void;
  undoActivity: (activityId: string) => Promise<void>;
  clearActivities: () => void;
}

const ActivityContext = createContext<ActivityContextType | null>(null);

// Sample initial activities for demonstration
const INITIAL_ACTIVITIES: Activity[] = [
  {
    id: '1',
    timestamp: new Date().toISOString(),
    actionType: 'create',
    itemType: 'note',
    itemId: '123',
    itemTitle: 'Project Planning Notes',
    description: 'Created a new note for project planning',
    undoable: true
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    actionType: 'edit',
    itemType: 'task',
    itemId: '456',
    itemTitle: 'Review Documentation',
    description: 'Updated task deadline',
    undoable: true
  }
];

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const [activities, setActivities] = useState<Activity[]>(INITIAL_ACTIVITIES);

  const addActivity = useCallback((activity: Omit<Activity, 'id' | 'timestamp'>) => {
    const newActivity: Activity = {
      ...activity,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };
    setActivities(prev => [newActivity, ...prev]);
  }, []);

  const undoActivity = useCallback(async (activityId: string) => {
    const activity = activities.find(a => a.id === activityId);
    if (!activity || !activity.undoable) {
      throw new Error('Activity cannot be undone');
    }

    // Here you would implement the actual undo logic based on the activity type
    // For now, we'll just remove the activity from the list
    setActivities(prev => prev.filter(a => a.id !== activityId));
  }, [activities]);

  const clearActivities = useCallback(() => {
    setActivities([]);
  }, []);

  return (
    <ActivityContext.Provider value={{
      activities,
      addActivity,
      undoActivity,
      clearActivities
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