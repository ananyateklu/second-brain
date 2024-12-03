import { createContext, useContext } from 'react';
import { Activity } from '../api/services/activityService';

export interface ActivityContextType {
  activities: Activity[];
  isLoading: boolean;
  error: string | null;
  fetchActivities: () => Promise<void>;
  createActivity: (activityData: Omit<Activity, 'id' | 'timestamp'>) => Promise<void>;
}

export const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

export function useActivities(): ActivityContextType {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error('useActivities must be used within an ActivityProvider');
  }
  return context;
} 