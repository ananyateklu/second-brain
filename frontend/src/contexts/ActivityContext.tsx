import React, { useState, useEffect, useCallback } from 'react';
import { ActivityContext } from './activityContextUtils';
import { Activity, activityService } from '../api/services/activityService';
import { useAuth } from '../hooks/useAuth';

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
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
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to fetch activities');
      } else {
        setError('Failed to fetch activities');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Function to create a new activity
  const createActivityHandler = useCallback(async (activityData: Omit<Activity, 'id' | 'timestamp'>) => {
    try {
      const response = await activityService.createActivity(activityData);
      setActivities(prev => [response.data, ...prev]);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to create activity');
      } else {
        setError('Failed to create activity');
      }
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
}