import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Activity, activityService } from '../api/services/activityService';
import { useAuth } from './AuthContext';

interface ActivityContextType {
  activities: Activity[];
  isLoading: boolean;
  error: string | null;
  fetchActivities: () => Promise<void>;
  createActivity: (activityData: Omit<Activity, 'id' | 'timestamp'>) => Promise<void>;
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

export const ActivityProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading: authLoading } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch activities
  const fetchActivities = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const response = await activityService.getActivities();
      setActivities(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch activities');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Function to create a new activity
  const createActivityHandler = useCallback(async (activityData: Omit<Activity, 'id' | 'timestamp'>) => {
    try {
      const response = await activityService.createActivity(activityData);
      setActivities(prev => [response.data, ...prev]);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create activity');
      throw err;
    }
  }, []);

  // Fetch activities when the user is authenticated
  useEffect(() => {
    if (user) {
      fetchActivities();
    } else {
      setActivities([]);
    }
  }, [user, fetchActivities]);

  return (
    <ActivityContext.Provider value={{ activities, isLoading, error, fetchActivities, createActivity: createActivityHandler }}>
      {children}
    </ActivityContext.Provider>
  );
};

export const useActivities = (): ActivityContextType => {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error('useActivities must be used within an ActivityProvider');
  }
  return context;
};