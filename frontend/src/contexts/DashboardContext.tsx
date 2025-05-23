import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DashboardStat } from '../types/dashboard';
import { useNotes } from './notesContextUtils';
import { useTasks } from './tasksContextUtils';
import { useReminders } from './remindersContextUtils';
import { useActivities } from './activityContextUtils';
import { useIdeas } from './ideasContextUtils';
import { DEFAULT_STATS, DashboardContext, isDashboardStat } from '../utils/dashboardContextUtils';
import preferencesService from '../services/api/preferences.service';
import { getStatById } from '../utils/dashboard/statsRegistry';

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const { notes, isLoading: notesLoading } = useNotes();
  const { tasks } = useTasks();
  const { reminders } = useReminders();
  const { activities } = useActivities();
  const { state: { ideas } } = useIdeas();
  const [isLoading, setIsLoading] = useState(true);

  // Define stats state
  const [stats, setStats] = useState<DashboardStat[]>(() => {
    // Start with default stats (will be overridden by API data when loaded)
    return DEFAULT_STATS;
  });

  // Load preferences from API
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        // Try to get dashboard stats from API
        const dashboardStatsPreference = await preferencesService.getPreferenceByType('dashboard_stats');
        if (dashboardStatsPreference) {
          try {
            const parsedStats = JSON.parse(dashboardStatsPreference.value);
            if (Array.isArray(parsedStats) && parsedStats.every(isDashboardStat)) {
              setStats(parsedStats);
            }
          } catch (e) {
            console.error('Failed to parse dashboard stats:', e);
          }
        }
      } catch (error: unknown) {
        // If preference not found, it's okay - we'll create it on first save
        console.log('Preferences not found, will create on first save:',
          error instanceof Error ? error.message : 'Unknown error');
      }
    };

    loadPreferences();
  }, []);

  // Update loading state when both notes and tasks are ready
  useEffect(() => {
    if (!notesLoading && (notes.length > 0 || tasks.length > 0 || ideas.length > 0)) {
      setIsLoading(false);
    }
  }, [notes, tasks, ideas, notesLoading]);

  const getStatValue = useCallback((statId: string) => {
    return getStatById(statId, {
      notes,
      tasks,
      reminders,
      activities,
      ideas,
      isLoading
    });
  }, [notes, tasks, reminders, activities, ideas, isLoading]);

  const toggleStat = useCallback((statId: string) => {
    setStats(prevStats => {
      const newStats = prevStats.map(stat => {
        if (stat.id === statId) {
          return { ...stat, enabled: !stat.enabled };
        }
        return stat;
      });

      // Save to backend API instead of localStorage
      preferencesService.savePreference({
        preferenceType: 'dashboard_stats',
        value: JSON.stringify(newStats)
      }).catch(err => console.error('Failed to save dashboard stats:', err));

      return newStats;
    });
  }, []);

  const updateStatSize = useCallback((statId: string, size: 'small' | 'medium' | 'large') => {
    setStats(prevStats => {
      const newStats = prevStats.map(stat => {
        if (stat.id === statId) {
          return { ...stat, size };
        }
        return stat;
      });

      // Save to backend API instead of localStorage
      preferencesService.savePreference({
        preferenceType: 'dashboard_stats',
        value: JSON.stringify(newStats)
      }).catch(err => console.error('Failed to save dashboard stats:', err));

      return newStats;
    });
  }, []);

  // Add update stat order function
  const updateStatOrder = useCallback((statId: string, newOrder: number) => {
    setStats(prevStats => {
      // Find the stat to reorder
      const statToUpdate = prevStats.find(stat => stat.id === statId);
      if (!statToUpdate) return prevStats;

      const oldOrder = statToUpdate.order;

      // Create new stats array with updated orders
      const newStats = prevStats.map(stat => {
        if (stat.id === statId) {
          // Update the stat being moved
          return { ...stat, order: newOrder };
        } else if (newOrder > oldOrder && stat.order > oldOrder && stat.order <= newOrder) {
          // Shift stats down if moving a stat to a later position
          return { ...stat, order: stat.order - 1 };
        } else if (newOrder < oldOrder && stat.order >= newOrder && stat.order < oldOrder) {
          // Shift stats up if moving a stat to an earlier position
          return { ...stat, order: stat.order + 1 };
        }
        return stat;
      });

      // Save to backend API instead of localStorage
      preferencesService.savePreference({
        preferenceType: 'dashboard_stats',
        value: JSON.stringify(newStats)
      }).catch(err => console.error('Failed to save dashboard stats:', err));

      return newStats;
    });
  }, []);

  const toggleGraphVisibility = useCallback((statId: string) => {
    setStats(prevStats => {
      const newStats = prevStats.map(stat => {
        if (stat.id === statId) {
          return { ...stat, graphVisible: !stat.graphVisible };
        }
        return stat;
      });

      // Save to backend API
      preferencesService.savePreference({
        preferenceType: 'dashboard_stats',
        value: JSON.stringify(newStats)
      }).catch(err => console.error('Failed to save dashboard stats:', err));

      return newStats;
    });
  }, []);

  // Function to reset all dashboard stats to default values
  const resetStats = useCallback(async () => {
    try {
      // Reset stats to defaults
      setStats(DEFAULT_STATS);

      // Save default stats to backend
      await preferencesService.savePreference({
        preferenceType: 'dashboard_stats',
        value: JSON.stringify(DEFAULT_STATS)
      });

      return true;
    } catch (error) {
      console.error('Failed to reset dashboard stats:', error);
      return false;
    }
  }, []);

  const contextValue = useMemo(() => ({
    availableStats: stats,
    enabledStats: stats.filter(stat => stat.enabled).sort((a, b) => a.order - b.order),
    toggleStat,
    getStatValue,
    updateStatSize,
    updateStatOrder,
    isLoading,
    toggleGraphVisibility,
    resetStats
  }), [
    stats,
    toggleStat,
    getStatValue,
    updateStatSize,
    updateStatOrder,
    isLoading,
    toggleGraphVisibility,
    resetStats
  ]);

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
} 