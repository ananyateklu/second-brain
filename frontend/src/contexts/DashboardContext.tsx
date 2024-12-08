import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DashboardStat } from '../types/dashboard';
import { useNotes } from './notesContextUtils';
import { useTasks } from './tasksContextUtils';
import { useReminders } from './remindersContextUtils';
import { useActivities } from './activityContextUtils';
import { calculateWeeklyChange, getNewNotesCount, getLastUpdateTime, DEFAULT_STATS, DashboardContext, isDashboardStat, StatValue } from '../utils/dashboardContextUtils';
import type { Task } from '../api/types/task';
import { FileText, Archive, Calendar, Clock, CheckSquare, Network, TagIcon } from 'lucide-react';
import { Note } from '../types/note';
import { Activity } from '../api/services/activityService';

// Extract these functions outside the component
const calculateConnectionStats = (notes: Note[]) => {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const totalConnections = notes.reduce((acc, note) => {
    const linkedNoteCount = note.linkedNoteIds?.length || 0;
    const linkedTaskCount = note.linkedTasks?.length ?? 0;
    const linkedReminderCount = note.linkedReminders?.length || 0;
    return acc + linkedNoteCount + linkedTaskCount + linkedReminderCount;
  }, 0);

  const notesWithConnections = notes.filter(note => {
    const hasLinkedNotes = (note.linkedNoteIds?.length || 0) > 0;
    const hasLinkedTasks = (note.linkedTasks?.length ?? 0) > 0;
    const hasLinkedReminders = (note.linkedReminders?.length || 0) > 0;
    return hasLinkedNotes || hasLinkedTasks || hasLinkedReminders;
  }).length;

  const recentConnections = notes.reduce((acc, note) => {
    const recentLinks = note.linkedNoteIds?.filter(id => {
      const linkedNote = notes.find(n => n.id === id);
      return linkedNote && new Date(linkedNote.updatedAt) >= weekAgo;
    }).length || 0;
    return acc + recentLinks;
  }, 0);

  const mostConnected = notes.reduce((max, note) => {
    const connections = (note.linkedNoteIds?.length || 0) + 
                      (note.linkedTasks?.length ?? 0) + 
                      (note.linkedReminders?.length || 0);
    return connections > max.connections ? { note, connections } : max;
  }, { note: null as Note | null, connections: 0 });

  return { totalConnections, notesWithConnections, recentConnections, mostConnected };
};

const calculateActivityStats = (activities: Activity[]) => {
  const activityBreakdown: Record<string, number> = {};
  activities.forEach(activity => {
    const type = activity.itemType.toLowerCase();
    activityBreakdown[type] = (activityBreakdown[type] || 0) + 1;
  });

  return {
    breakdown: activityBreakdown,
    mostActiveCategory: Object.entries(activityBreakdown).sort(([, a], [, b]) => b - a)[0]
  };
};

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const { notes, isLoading: notesLoading } = useNotes();
  const { tasks } = useTasks();
  const { reminders } = useReminders();
  const { activities } = useActivities();
  const [isLoading, setIsLoading] = useState(true);

  // Define stats state
  const [stats, setStats] = useState<DashboardStat[]>(() => {
    const saved = localStorage.getItem('dashboard_stats');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every(isDashboardStat)) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse dashboard stats:', e);
      }
    }
    return DEFAULT_STATS;
  });

  // Update loading state when both notes and tasks are ready
  useEffect(() => {
    if (!notesLoading && (notes.length > 0 || tasks.length > 0)) {
      setIsLoading(false);
    }
  }, [notes, tasks, notesLoading]);

  // Add debug logs
  useEffect(() => {
    console.log('Dashboard state:', {
      notesLoading,
      notesCount: notes.length,
      tasksCount: tasks.length,
      isLoading
    });
  }, [notes, tasks, notesLoading, isLoading]);

  const getStatValue = useCallback((statId: string): StatValue => {
    // Keep these declarations
    let allTags: string[];
    let uniqueTags: Set<string>;
    let newRegularNotes: number;
    let today: Date;
    let activeTasks: Task[];
    let completedTasks: Task[];
    let dueSoonTasks: number;
    let activeNotes: Note[];
    let archivedNotes: Note[];
    let todayNotes: number;
    let totalWords: number;
    let threeDaysFromNow: Date;
    let notesWithTags: number;
    let tasksWithTags: number;
    let lastUpdateTime: string;
    let recentlyUpdated: number;
    let completedToday: number;
    let completedThisWeek: number;
    let weekAgo: Date;
    let sharedWithTasks: number;
    let sharedWithReminders: number;

    // If still loading, return placeholder values
    if (isLoading || notesLoading) {
      return {
        value: '-',
        timeframe: 'Loading...'
      };
    }

    // Filter regular notes and ideas
    const regularNotes = notes.filter(note => !note.isIdea);
    const ideas = notes.filter(note => note.isIdea);

    switch (statId) {
      case 'categories':
        allTags = [
          ...regularNotes.flatMap(note => note.tags),
          ...tasks.flatMap((task: Task) => task.tags),
          ...reminders.flatMap((reminder: { tags: string[] }) => reminder.tags)
        ];
        uniqueTags = new Set(allTags);
        notesWithTags = regularNotes.filter(note => note.tags.length > 0).length;
        tasksWithTags = tasks.filter(task => task.tags.length > 0).length;

        return {
          value: uniqueTags.size,
          timeframe: 'Total Categories',
          description: 'Tags across all items',
          additionalInfo: [
            {
              icon: FileText,
              value: `${notesWithTags} notes tagged`
            },
            {
              icon: CheckSquare,
              value: `${tasksWithTags} tasks tagged`
            }
          ]
        };

      case 'active-tasks':
        activeTasks = tasks.filter((task: Task) => task.status.toLowerCase() !== 'completed');
        completedTasks = tasks.filter((task: Task) => task.status.toLowerCase() === 'completed');
        today = new Date();
        threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(today.getDate() + 3);
        dueSoonTasks = activeTasks.filter(task => {
          if (!task.dueDate) return false;
          const dueDate = new Date(task.dueDate);
          return dueDate >= today && dueDate <= threeDaysFromNow;
        }).length;

        return {
          value: `${activeTasks.length} of ${tasks.length}`,
          timeframe: 'Current',
          description: 'Tasks currently in progress',
          additionalInfo: [
            {
              icon: Clock,
              value: `${dueSoonTasks} due soon`
            },
            {
              icon: CheckSquare,
              value: `${completedTasks.length} completed`
            }
          ]
        };

      case 'completed-tasks':
        today = new Date();
        today.setHours(0, 0, 0, 0);
        completedTasks = tasks.filter((task: Task) => task.status.toLowerCase() === 'completed');
        weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        weekAgo.setHours(0, 0, 0, 0);

        completedToday = completedTasks.filter(task => {
          const completedDate = new Date(task.updatedAt);
          completedDate.setHours(0, 0, 0, 0);
          return completedDate.getTime() === today.getTime();
        }).length;

        completedThisWeek = completedTasks.filter(task => {
          const completedDate = new Date(task.updatedAt);
          return completedDate >= weekAgo;
        }).length;

        return {
          value: `${completedTasks.length} of ${tasks.length}`,
          timeframe: 'Total',
          description: 'Tasks marked as completed',
          additionalInfo: [
            {
              icon: Clock,
              value: `${completedToday} today`
            },
            {
              icon: Calendar,
              value: `${completedThisWeek} this week`
            }
          ]
        };

      case 'total-notes':
        activeNotes = regularNotes.filter(note => !note.isArchived);
        archivedNotes = regularNotes.filter(note => note.isArchived);
        return {
          value: regularNotes.length,
          change: calculateWeeklyChange(regularNotes, 'created'),
          timeframe: 'This week',
          description: 'Notes in your second brain',
          additionalInfo: [
            {
              icon: FileText,
              value: `${activeNotes.length} active`
            },
            {
              icon: Archive,
              value: `${archivedNotes.length} archived`
            }
          ]
        };

      case 'new-notes':
        newRegularNotes = getNewNotesCount(regularNotes);
        today = new Date();
        today.setHours(0, 0, 0, 0);
        todayNotes = regularNotes.filter(note => new Date(note.createdAt) >= today).length;

        return {
          value: newRegularNotes,
          change: calculateWeeklyChange(regularNotes, 'created'),
          timeframe: 'vs last week',
          description: 'Notes created in the last 7 days',
          additionalInfo: [
            {
              icon: Calendar,
              value: `${todayNotes} today`
            }
          ]
        };

      case 'last-update':
        lastUpdateTime = getLastUpdateTime(notes);
        recentlyUpdated = notes.filter(note => {
          const updateDate = new Date(note.updatedAt);
          const hourAgo = new Date();
          hourAgo.setHours(hourAgo.getHours() - 1);
          return updateDate >= hourAgo;
        }).length;

        return {
          value: lastUpdateTime,
          timeframe: 'Last activity',
          description: 'Recent updates to your notes',
          additionalInfo: [
            {
              icon: Clock,
              value: `${recentlyUpdated} in last hour`
            }
          ]
        };

      case 'word-count':
        totalWords = notes.reduce((total, note) => {
          const wordCount = note.content.trim().split(/\s+/).length;
          return total + wordCount;
        }, 0);

        return {
          value: totalWords.toLocaleString(),
          timeframe: 'Total',
          description: 'Total words across all notes',
          additionalInfo: [
            {
              icon: FileText,
              value: `${Math.round(totalWords / notes.length).toLocaleString()} avg per note`
            }
          ]
        };

      case 'ideas-count': {
        const totalIdeas = ideas.length;
        weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const newIdeasThisWeek = ideas.filter(idea => {
          const createdDate = new Date(idea.createdAt);
          return createdDate >= weekAgo;
        }).length;

        // Get ideas with linked tasks or reminders
        const ideasWithLinks = ideas.filter(idea => 
          (idea.linkedTasks && idea.linkedTasks.length > 0) || 
          (idea.linkedReminders && idea.linkedReminders.length > 0)
        ).length;

        // Get ideas with tags
        const ideasWithTags = ideas.filter(idea => idea.tags?.length > 0).length;

        // Calculate recent activity
        const recentlyUpdatedIdeas = ideas.filter(idea => {
          const updatedDate = new Date(idea.updatedAt);
          return updatedDate >= weekAgo;
        }).length;

        return {
          value: totalIdeas,
          change: newIdeasThisWeek,
          timeframe: 'Total',
          description: 'Captured ideas',
          additionalInfo: [
            {
              icon: Clock,
              value: `${newIdeasThisWeek} this week`
            },
            {
              icon: Network,
              value: `${ideasWithLinks} linked`
            },
            {
              icon: TagIcon,
              value: `${ideasWithTags} tagged`
            }
          ],
          metadata: {
            breakdown: {
              total: totalIdeas,
              created: newIdeasThisWeek,
              edited: recentlyUpdatedIdeas,
              deleted: 0
            }
          }
        };
      }

      case 'completed':
        today = new Date();
        today.setHours(0, 0, 0, 0);
        completedTasks = tasks.filter((task: Task) => task.status === 'Completed');
        weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        completedToday = completedTasks.filter(task => {
          const completedDate = new Date(task.updatedAt);
          return completedDate >= today;
        }).length;

        completedThisWeek = completedTasks.filter(task => {
          const completedDate = new Date(task.updatedAt);
          return completedDate >= weekAgo;
        }).length;

        return {
          value: completedTasks.length,
          timeframe: 'Total',
          description: 'Tasks marked as done',
          additionalInfo: [
            {
              icon: Clock,
              value: `${completedToday} today`
            },
            {
              icon: Calendar,
              value: `${completedThisWeek} this week`
            }
          ]
        };

      case 'daily-activity': {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        weekAgo.setHours(0, 0, 0, 0);

        const todayActivities = activities.filter(activity => 
          new Date(activity.timestamp) >= today
        );

        const weekActivities = activities.filter(activity => 
          new Date(activity.timestamp) >= weekAgo
        );

        const stats = calculateActivityStats(weekActivities);

        const activityChange = weekActivities.length - stats.breakdown[stats.mostActiveCategory[0]];

        return {
          value: todayActivities.length,
          change: activityChange,
          timeframe: 'Today',
          description: 'Your activity across all items',
          additionalInfo: [
            {
              icon: Calendar,
              value: `${weekActivities.length} this week`
            },
            stats.mostActiveCategory && {
              icon: FileText,
              value: `${stats.mostActiveCategory[0]}: ${stats.mostActiveCategory[1]}`
            }
          ].filter(Boolean),
          metadata: {
            breakdown: {
              total: weekActivities.length,
              created: weekActivities.filter(a => a.actionType.toLowerCase() === 'create').length,
              edited: weekActivities.filter(a => a.actionType.toLowerCase() === 'edit').length,
              deleted: weekActivities.filter(a => a.actionType.toLowerCase() === 'delete').length
            }
          }
        };
      }

      case 'shared-notes':
        sharedWithTasks = notes.filter(note => note.linkedTasks && note.linkedTasks.length > 0).length;
        sharedWithReminders = notes.filter(note => note.linkedReminders && note.linkedReminders.length > 0).length;

        return {
          value: sharedWithTasks + sharedWithReminders,
          timeframe: 'Total',
          description: 'Notes linked with tasks or reminders',
          additionalInfo: [
            {
              icon: CheckSquare,
              value: `${sharedWithTasks} with tasks`
            },
            {
              icon: Clock,
              value: `${sharedWithReminders} with reminders`
            }
          ]
        };

      case 'connections': {
        const stats = calculateConnectionStats(notes);
        const additionalInfo = [
          {
            icon: FileText,
            value: `${stats.notesWithConnections} connected notes`
          }
        ];

        if (stats.mostConnected.note) {
          additionalInfo.push({
            icon: Network,
            value: `${stats.mostConnected.connections} max links`
          });
        }

        return {
          value: stats.totalConnections,
          change: stats.recentConnections,
          timeframe: 'Total connections',
          description: 'Links between notes, tasks & reminders',
          additionalInfo,
          metadata: {
            breakdown: {
              total: stats.totalConnections,
              created: stats.recentConnections,
              edited: 0,
              deleted: 0
            }
          }
        };
      }

      default:
        return { value: 0 };
    }
  }, [isLoading, notesLoading, notes, tasks, reminders, activities]);

  const toggleStat = useCallback((statId: string) => {
    setStats(prevStats => {
      const newStats = prevStats.map(stat => {
        if (stat.id === statId) {
          return { ...stat, enabled: !stat.enabled };
        }
        return stat;
      });
      localStorage.setItem('dashboard_stats', JSON.stringify(newStats));
      return newStats;
    });
  }, []);

  const updateStatsOrder = (prevStats: DashboardStat[], reorderedStats: DashboardStat[]) => {
    return prevStats.map(stat => {
      if (!stat.enabled) return stat;
      const newIndex = reorderedStats.findIndex(s => s.id === stat.id);
      return { ...stat, order: newIndex };
    });
  };

  const reorderStats = useCallback((startIndex: number, endIndex: number, newOrder?: DashboardStat[]) => {
    if (newOrder) {
      setStats(newOrder);
      localStorage.setItem('dashboard_stats', JSON.stringify(newOrder));
      return;
    }

    setStats(prevStats => {
      const enabledStats = prevStats.filter(stat => stat.enabled);
      const reorderedStats = Array.from(enabledStats);
      const [removed] = reorderedStats.splice(startIndex, 1);
      reorderedStats.splice(endIndex, 0, removed);

      const newStats = updateStatsOrder(prevStats, reorderedStats);
      localStorage.setItem('dashboard_stats', JSON.stringify(newStats));
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
      localStorage.setItem('dashboard_stats', JSON.stringify(newStats));
      return newStats;
    });
  }, []);

  return (
    <DashboardContext.Provider value={useMemo(() => ({
      availableStats: stats,
      enabledStats: stats.filter(stat => stat.enabled).sort((a, b) => a.order - b.order),
      toggleStat,
      reorderStats,
      getStatValue,
      updateStatSize,
      isLoading
    }), [stats, toggleStat, reorderStats, getStatValue, updateStatSize, isLoading])}>
      {children}
    </DashboardContext.Provider>
  );
} 