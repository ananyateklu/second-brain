import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DashboardStat } from '../types/dashboard';
import { useNotes } from './notesContextUtils';
import { useTasks } from './tasksContextUtils';
import { useReminders } from './remindersContextUtils';
import { useActivities } from './activityContextUtils';
import { calculateWeeklyChange, getNewNotesCount, getLastUpdateTime, DEFAULT_STATS, DashboardContext, isDashboardStat, StatValue } from '../utils/dashboardContextUtils';
import type { Task } from '../api/types/task';
import { FileText, Archive, Calendar, Clock, CheckSquare, Network, TagIcon, AlertCircle } from 'lucide-react';
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
  if (!activities || activities.length === 0) {
    return {
      breakdown: {},
      mostActiveCategory: ['none', 0]
    };
  }

  const activityBreakdown: Record<string, number> = {};
  activities.forEach(activity => {
    const type = activity.itemType.toLowerCase();
    activityBreakdown[type] = (activityBreakdown[type] || 0) + 1;
  });

  const entries = Object.entries(activityBreakdown);
  const sortedEntries = entries.length > 0 ? [...entries].sort(([, a]: [string, number], [, b]: [string, number]) => b - a) : [];
  return {
    breakdown: activityBreakdown,
    mostActiveCategory: sortedEntries.length > 0 ? sortedEntries[0] : ['none', 0]
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
    let notesCreatedToday: number;
    let notesCreatedThisWeek: number;
    let notesWithLinks: number;
    let recentlyEditedNotes: number;
    
    // New declarations for new-notes case
    let notesToday: number;
    let notesYesterday: number;
    let previousWeekNotes: number;
    let weeklyTotal: number;
    let weeklyChange: number;
    let yesterday: Date;
    let twoWeeksAgo: Date;
    let dailyBreakdown: number[];

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
      case 'total-notes-v2':
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
        weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        // Calculate notes created today
        yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        
        twoWeeksAgo = new Date(weekAgo);
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 7);
        
        notesToday = regularNotes.filter(note => {
          const noteDate = new Date(note.createdAt);
          noteDate.setHours(0, 0, 0, 0);
          const todayDate = new Date(today);
          todayDate.setHours(0, 0, 0, 0);
          return noteDate.getTime() === todayDate.getTime();
        }).length;
        
        notesYesterday = regularNotes.filter(note => {
          const noteDate = new Date(note.createdAt);
          noteDate.setHours(0, 0, 0, 0);
          return noteDate.getTime() === yesterday.getTime();
        }).length;
        
        previousWeekNotes = regularNotes.filter(note => {
          const noteDate = new Date(note.createdAt);
          return noteDate >= twoWeeksAgo && noteDate < weekAgo;
        }).length;
        
        dailyBreakdown = Array.from({ length: 7 }, (_, i) => {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          date.setHours(0, 0, 0, 0);
          return regularNotes.filter(note => {
            const noteDate = new Date(note.createdAt);
            noteDate.setHours(0, 0, 0, 0);
            return noteDate.getTime() === date.getTime();
          }).length;
        });
        
        weeklyTotal = dailyBreakdown.reduce((sum, count) => sum + count, 0);
        weeklyChange = weeklyTotal - previousWeekNotes;

        return {
          value: newRegularNotes,
          change: weeklyChange,
          timeframe: 'This week',
          description: 'New notes created in the last 7 days',
          additionalInfo: [
            {
              icon: FileText,
              value: `${notesToday} today`
            },
            {
              icon: Clock,
              value: `${notesYesterday} yesterday`
            }
          ],
          metadata: {
            breakdown: {
              total: weeklyTotal,
              created: weeklyTotal,
              edited: 0,
              deleted: 0
            }
          }
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
        today = new Date();
        today.setHours(0, 0, 0, 0);
        weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const ideasCreatedToday = ideas.filter(idea => {
          const createdDate = new Date(idea.createdAt);
          createdDate.setHours(0, 0, 0, 0);
          return createdDate.getTime() === today.getTime();
        }).length;

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

        // Calculate recently edited ideas
        const recentlyEditedIdeas = ideas.filter(idea => {
          const updatedDate = new Date(idea.updatedAt);
          return updatedDate >= weekAgo && new Date(idea.createdAt) < weekAgo;
        }).length;

        // Calculate active and archived ideas
        const activeIdeas = ideas.filter(idea => !idea.isArchived).length;
        const archivedIdeas = ideas.filter(idea => idea.isArchived).length;

        return {
          value: totalIdeas,
          change: ideasCreatedToday,
          timeframe: 'Total Ideas',
          description: 'Overview of your ideas',
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
              edited: recentlyEditedIdeas,
              deleted: 0
            }
          },
          topBreakdown: {
            active: activeIdeas,
            archived: archivedIdeas
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
        if (!activities || activities.length === 0) {
          return {
            value: '0',
            timeframe: 'No activity yet',
            description: 'Start creating notes and tasks to see activity'
          };
        }
        
        const activityStats = calculateActivityStats(activities);
        const totalActivities = Object.values(activityStats.breakdown).reduce((sum, count) => sum + count, 0);
        const [mostActiveType, mostActiveCount] = activityStats.mostActiveCategory;

        return {
          value: totalActivities.toString(),
          timeframe: 'Total activities',
          description: `Most active: ${mostActiveType} (${mostActiveCount})`,
          metadata: {
            breakdown: {
              total: totalActivities,
              created: activityStats.breakdown['created'] || 0,
              edited: activityStats.breakdown['edited'] || 0,
              deleted: activityStats.breakdown['deleted'] || 0
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

      case 'reminders': {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const activeReminders = reminders.filter(reminder => !reminder.isCompleted);
        const upcomingReminders = activeReminders.filter(reminder => {
          const dueDate = new Date(reminder.dueDateTime);
          return dueDate >= today;
        });
        const overdue = activeReminders.filter(reminder => {
          const dueDate = new Date(reminder.dueDateTime);
          return dueDate < today;
        });

        return {
          value: activeReminders.length,
          timeframe: 'Active reminders',
          description: 'Upcoming and overdue reminders',
          additionalInfo: [
            {
              icon: Clock,
              value: `${upcomingReminders.length} upcoming`
            },
            {
              icon: AlertCircle,
              value: `${overdue.length} overdue`
            }
          ]
        };
      }

      case 'notes-stats':
        today = new Date();
        today.setHours(0, 0, 0, 0);
        weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        notesCreatedToday = regularNotes.filter(note => {
          const createdDate = new Date(note.createdAt);
          createdDate.setHours(0, 0, 0, 0);
          return createdDate.getTime() === today.getTime();
        }).length;

        notesCreatedThisWeek = regularNotes.filter(note => {
          const createdDate = new Date(note.createdAt);
          return createdDate >= weekAgo;
        }).length;

        notesWithTags = regularNotes.filter(note => note.tags.length > 0).length;
        notesWithLinks = regularNotes.filter(note => 
          (note.linkedNoteIds?.length || 0) > 0 || 
          (note.linkedTasks?.length ?? 0) > 0 || 
          (note.linkedReminders?.length || 0) > 0
        ).length;

        recentlyEditedNotes = regularNotes.filter(note => {
          const updatedDate = new Date(note.updatedAt);
          return updatedDate >= weekAgo && new Date(note.createdAt) < weekAgo;
        }).length;

        activeNotes = regularNotes.filter(note => !note.isArchived);
        archivedNotes = regularNotes.filter(note => note.isArchived);

        return {
          value: regularNotes.length.toString(),
          change: notesCreatedToday,
          timeframe: 'Total Notes',
          description: 'Overview of your notes',
          additionalInfo: [
            {
              icon: Clock,
              value: `${notesCreatedThisWeek} this week`
            },
            {
              icon: Network,
              value: `${notesWithLinks} linked`
            },
            {
              icon: TagIcon,
              value: `${notesWithTags} tagged`
            }
          ],
          metadata: {
            breakdown: {
              total: regularNotes.length,
              created: notesCreatedThisWeek,
              edited: recentlyEditedNotes,
              deleted: 0
            }
          },
          topBreakdown: {
            active: activeNotes.length,
            archived: archivedNotes.length
          }
        };

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

  const contextValue = useMemo(() => ({
    availableStats: stats,
    enabledStats: stats.filter(stat => stat.enabled).sort((a, b) => a.order - b.order),
    toggleStat,
    reorderStats,
    getStatValue,
    updateStatSize,
    isLoading
  }), [stats, toggleStat, reorderStats, getStatValue, updateStatSize, isLoading]);

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
} 