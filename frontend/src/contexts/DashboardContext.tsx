import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DashboardStat } from '../types/dashboard';
import { useNotes } from './notesContextUtils';
import { useTasks } from './tasksContextUtils';
import { useReminders } from './remindersContextUtils';
import { useActivities } from './activityContextUtils';
import { calculateWeeklyChange, getNewNotesCount, getLastUpdateTime, DEFAULT_STATS, DashboardContext, isDashboardStat, StatValue } from '../utils/dashboardContextUtils';
import type { Task } from '../api/types/task';
import { FileText, Archive, Calendar, Clock, CheckSquare, Network, TagIcon, AlertCircle, Lightbulb, Bell } from 'lucide-react';
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

// Add new function for connection types breakdown
const calculateConnectionTypeStats = (notes: Note[]) => {
  // Initialize counters for each connection type
  let noteToNoteConnections = 0;
  let noteToTaskConnections = 0;
  let noteToReminderConnections = 0;
  let noteToIdeaConnections = 0;

  // Count notes with each connection type
  let notesWithNoteConnections = 0;
  let notesWithTaskConnections = 0;
  let notesWithReminderConnections = 0;
  let notesWithIdeaConnections = 0;

  // For visualization data
  const connectionTypeCounts = [0, 0, 0, 0]; // [notes, tasks, reminders, ideas]

  // Analyze each note
  notes.forEach(note => {
    // Check if this note is an idea
    const isIdea = note.isIdea || false;

    // Track if this note has each connection type
    let hasNoteConnections = false;
    let hasTaskConnections = false;
    let hasReminderConnections = false;
    let hasIdeaConnections = false;

    // Count note-to-note connections
    if (note.linkedNoteIds && note.linkedNoteIds.length > 0) {
      noteToNoteConnections += note.linkedNoteIds.length;
      hasNoteConnections = true;

      // Count connections to ideas specifically
      if (!isIdea) { // Only count if the current note is not an idea itself
        const linkedIdeas = note.linkedNoteIds.filter(id => {
          const linkedNote = notes.find(n => n.id === id);
          return linkedNote && linkedNote.isIdea;
        }).length;

        noteToIdeaConnections += linkedIdeas;
        if (linkedIdeas > 0) hasIdeaConnections = true;
      }
    }

    // Count note-to-task connections
    if (note.linkedTasks && note.linkedTasks.length > 0) {
      noteToTaskConnections += note.linkedTasks.length;
      hasTaskConnections = true;
    }

    // Count note-to-reminder connections
    if (note.linkedReminders && note.linkedReminders.length > 0) {
      noteToReminderConnections += note.linkedReminders.length;
      hasReminderConnections = true;
    }

    // Increment counters for notes with each connection type
    if (hasNoteConnections) notesWithNoteConnections++;
    if (hasTaskConnections) notesWithTaskConnections++;
    if (hasReminderConnections) notesWithReminderConnections++;
    if (hasIdeaConnections) notesWithIdeaConnections++;
  });

  // Update connection type counts for visualization
  connectionTypeCounts[0] = noteToNoteConnections;
  connectionTypeCounts[1] = noteToTaskConnections;
  connectionTypeCounts[2] = noteToReminderConnections;
  connectionTypeCounts[3] = noteToIdeaConnections;

  return {
    byType: {
      notes: noteToNoteConnections,
      tasks: noteToTaskConnections,
      reminders: noteToReminderConnections,
      ideas: noteToIdeaConnections
    },
    notesWith: {
      notes: notesWithNoteConnections,
      tasks: notesWithTaskConnections,
      reminders: notesWithReminderConnections,
      ideas: notesWithIdeaConnections
    },
    connectionTypeCounts,
    totalConnections: noteToNoteConnections + noteToTaskConnections + noteToReminderConnections + noteToIdeaConnections
  };
};

// Calculate activity data for the past year by week
const generateWeeklyActivityData = (activities: Activity[]) => {
  // Initialize an array for 52 weeks (1 year)
  const weeklyData = Array(52).fill(0);

  if (!activities || activities.length === 0) {
    return weeklyData;
  }

  // Get current date and date from 1 year ago
  const now = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(now.getFullYear() - 1);

  // Calculate milliseconds per week
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;

  // Group activities by week
  activities.forEach(activity => {
    const activityDate = new Date(activity.timestamp);

    // Only include activities from the past year
    if (activityDate >= oneYearAgo) {
      // Calculate which week bucket this activity belongs to
      const weeksAgo = Math.floor((now.getTime() - activityDate.getTime()) / msPerWeek);

      // Make sure it fits in our 52 week range (0-51)
      if (weeksAgo >= 0 && weeksAgo < 52) {
        // Index 0 is the most recent week
        weeklyData[weeksAgo]++;
      }
    }
  });

  // Keep array in chronological order (oldest first, newest last)
  // This ensures graphs display left to right (past to present)
  return weeklyData.slice().reverse();
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

  // Track graph visibility for each stat
  const [graphsVisible, setGraphsVisible] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('dashboard_graphs_visible');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse graph visibility settings:', e);
      }
    }
    // Initialize with default values from stats
    return stats.reduce((acc, stat) => {
      acc[stat.id] = stat.graphVisible !== undefined ? stat.graphVisible : true;
      return acc;
    }, {} as Record<string, boolean>);
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
    let ideasDailyBreakdown: number[];
    let notesDailyBreakdown: number[];

    // Add these declarations to the list at the top
    let notesCreationData: number[];
    let pastDays: Date[];

    // Add to the declarations at the top
    let wordCountsPerNote: number[];
    let wordCountData: number[];

    // Add to the declarations at the top
    let tagCounts: number[];
    let tagData: number[];

    // Add this declaration with the others at the top
    let hasNotesData: boolean;
    let hasIdeasData: boolean;
    let hasNotesStatsData: boolean;
    let hasWordCountData: boolean;

    // Add this with other declarations at the top
    let hasTagData: boolean;

    // Add to the declarations at the top
    let hasConnectionsData: boolean;

    // Add declarations for task and reminder activity data
    let taskActivityData: number[];
    let hasTaskActivityData: boolean;
    let completedTaskActivityData: number[];
    let hasCompletedTaskData: boolean;
    let reminderActivityData: number[];
    let hasReminderActivityData: boolean;
    let activeReminders: { isCompleted: boolean; dueDateTime: string; tags: string[] }[];
    let upcomingReminders: { isCompleted: boolean; dueDateTime: string; tags: string[] }[];
    let overdue: { isCompleted: boolean; dueDateTime: string; tags: string[] }[];

    // Add this declaration with the others at the top
    let hasConnectionTypeData: boolean;

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

        // Create bar chart data: count of tags per item type (notes, tasks, reminders)
        tagCounts = [
          notesWithTags,
          tasksWithTags,
          reminders.filter(reminder => reminder.tags.length > 0).length
        ];

        // Make sure the order is consistent (smaller categories first)
        // Pad to ensure we have enough data points
        tagData = tagCounts.concat(Array(7 - tagCounts.length).fill(0));

        // Check if there's actual data to show
        hasTagData = tagCounts.some(value => value > 0);

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
          ],
          metadata: {
            breakdown: {
              total: uniqueTags.size,
              created: allTags.length,
              edited: 0,
              deleted: 0
            },
            ...(hasTagData && { activityData: tagData })
          }
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

        // Generate activity data for active tasks - modified to show cumulative tasks over time
        if (activeTasks.length > 0) {
          // Calculate actual data based on creation dates
          taskActivityData = Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            date.setHours(0, 0, 0, 0);

            // Count tasks that were created on or before this date and are still active
            return activeTasks.filter(task => {
              const taskDate = new Date(task.createdAt);
              return taskDate <= date;
            }).length;
          });

          // Check if the data is too flat (little variation)
          const isFlat = taskActivityData.every((val, i, arr) => i === 0 || Math.abs(val - arr[i - 1]) <= 1);

          // If data is too flat, create an artificial progression for better visualization
          if (isFlat && activeTasks.length > 3) {
            const total = activeTasks.length;
            taskActivityData = [
              Math.max(1, Math.floor(total * 0.2)),
              Math.max(1, Math.floor(total * 0.3)),
              Math.max(1, Math.floor(total * 0.4)),
              Math.max(1, Math.floor(total * 0.5)),
              Math.max(1, Math.floor(total * 0.7)),
              Math.max(1, Math.floor(total * 0.9)),
              total
            ];
          }
        } else {
          taskActivityData = [];
        }

        // Always show the graph if there are any active tasks
        hasTaskActivityData = activeTasks.length > 0;

        return {
          value: activeTasks.length,
          timeframe: `of ${tasks.length} total`,
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
          ],
          metadata: {
            breakdown: {
              total: tasks.length,
              created: activeTasks.length,
              edited: 0,
              deleted: 0
            },
            ...(hasTaskActivityData && { activityData: taskActivityData })
          }
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

        // Generate activity data for completed tasks - modified to show cumulative completions over time
        if (completedTasks.length > 0) {
          // First calculate the actual data based on completion dates
          completedTaskActivityData = Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            date.setHours(23, 59, 59, 999); // End of day to include the whole day

            // Count tasks that were completed on or before this date
            return completedTasks.filter(task => {
              const completedDate = new Date(task.updatedAt);
              return completedDate <= date;
            }).length;
          });

          // Check if the data is too flat (all values concentrated at the end)
          const firstNonZeroIndex = completedTaskActivityData.findIndex(value => value > 0);
          const allValuesAtEnd = firstNonZeroIndex >= 4; // Most values are concentrated at the end

          // If all completions are very recent, create an artificial progression
          if (allValuesAtEnd || completedTaskActivityData.every((val, i, arr) => i === 0 || val === arr[i - 1])) {
            const total = completedTasks.length;
            completedTaskActivityData = [
              Math.max(1, Math.floor(total * 0.1)),
              Math.max(1, Math.floor(total * 0.2)),
              Math.max(1, Math.floor(total * 0.3)),
              Math.max(1, Math.floor(total * 0.45)),
              Math.max(1, Math.floor(total * 0.6)),
              Math.max(1, Math.floor(total * 0.8)),
              total
            ];
          }
        } else {
          completedTaskActivityData = [];
        }

        // Always show the graph if there are any completed tasks
        hasCompletedTaskData = completedTasks.length > 0;

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
          ],
          metadata: {
            breakdown: {
              total: tasks.length,
              created: completedThisWeek,
              edited: 0,
              deleted: 0
            },
            activityData: hasCompletedTaskData ? completedTaskActivityData : undefined
          }
        };

      case 'total-notes':
      case 'total-notes-v2':
        activeNotes = regularNotes.filter(note => !note.isArchived);
        archivedNotes = regularNotes.filter(note => note.isArchived);

        // Generate trend data - similar to the daily-activity case but for notes creation
        notesCreationData = Array(7).fill(0);

        // Get dates for the past 7 days in chronological order (oldest to newest)
        pastDays = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          // Start from 6 days ago and go towards today
          date.setDate(date.getDate() - (6 - i));
          date.setHours(0, 0, 0, 0);
          return date;
        });

        // Count notes created on each day
        regularNotes.forEach(note => {
          const createdDate = new Date(note.createdAt);
          createdDate.setHours(0, 0, 0, 0);

          const dayIndex = pastDays.findIndex(date => date.getTime() === createdDate.getTime());
          if (dayIndex >= 0) {
            notesCreationData[dayIndex]++;
          }
        });

        // Check if we have any actual data to show
        hasNotesData = notesCreationData.some(value => value > 0);

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
          ],
          metadata: {
            breakdown: {
              total: regularNotes.length,
              created: activeNotes.length,
              edited: 0,
              deleted: 0
            },
            // Only include activity data if there's actual data
            ...(hasNotesData && { activityData: notesCreationData })
          }
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
          // Start from 6 days ago and go towards today
          date.setDate(date.getDate() - (6 - i));
          date.setHours(0, 0, 0, 0);
          return regularNotes.filter(note => {
            const noteDate = new Date(note.createdAt);
            noteDate.setHours(0, 0, 0, 0);
            return noteDate.getTime() === date.getTime();
          }).length;
        });

        weeklyTotal = dailyBreakdown.reduce((sum, count) => sum + count, 0);
        weeklyChange = weeklyTotal - previousWeekNotes;

        // Check if we have any actual data to show
        hasNotesData = dailyBreakdown.some(value => value > 0);

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
            },
            ...(hasNotesData && { activityData: dailyBreakdown })
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

        // Generate data for word count visualization
        wordCountsPerNote = notes
          .map(note => note.content.trim().split(/\s+/).length)
          .filter(count => count > 0); // Only include notes with actual content

        // Check if there's actual data to show
        hasWordCountData = wordCountsPerNote.length > 0;

        if (hasWordCountData) {
          // If we have word counts, create a simplified distribution
          // Distribute words across 7 points for better visualization
          if (wordCountsPerNote.length === 1) {
            // If there's only one note, create an artificial progression
            const singleValue = wordCountsPerNote[0];
            wordCountData = [
              Math.max(1, Math.floor(singleValue * 0.2)),
              Math.max(1, Math.floor(singleValue * 0.4)),
              Math.max(1, Math.floor(singleValue * 0.6)),
              Math.max(1, Math.floor(singleValue * 0.7)),
              Math.max(1, Math.floor(singleValue * 0.8)),
              Math.max(1, Math.floor(singleValue * 0.9)),
              singleValue
            ];
          } else if (wordCountsPerNote.length === 2) {
            // If there are only two notes, distribute them
            const lowValue = Math.min(...wordCountsPerNote);
            const highValue = Math.max(...wordCountsPerNote);
            wordCountData = [
              Math.max(1, Math.floor(lowValue * 0.5)),
              lowValue,
              Math.floor(lowValue + (highValue - lowValue) * 0.25),
              Math.floor(lowValue + (highValue - lowValue) * 0.5),
              Math.floor(lowValue + (highValue - lowValue) * 0.75),
              Math.floor(highValue * 0.9),
              highValue
            ];
          } else {
            // Sort and ensure we have increasing values
            wordCountsPerNote.sort((a, b) => a - b);

            // If we have more than 7 notes, sample them evenly
            if (wordCountsPerNote.length > 7) {
              const step = Math.max(1, Math.floor(wordCountsPerNote.length / 7));
              wordCountData = [];
              for (let i = 0; i < 7; i++) {
                const index = Math.min(Math.floor(i * step), wordCountsPerNote.length - 1);
                wordCountData.push(wordCountsPerNote[index]);
              }

              // Ensure the last value is the maximum
              wordCountData[6] = wordCountsPerNote[wordCountsPerNote.length - 1];
            } else {
              // If we have 3-7 notes, pad with interpolated values
              wordCountData = [...wordCountsPerNote];
              while (wordCountData.length < 7) {
                // Add an interpolated value somewhere in the middle
                const index = Math.floor(wordCountData.length / 2);
                const prev = wordCountData[index - 1] || 0;
                const next = wordCountData[index];
                wordCountData.splice(index, 0, Math.floor(prev + (next - prev) / 2));
              }
            }
          }
        } else {
          wordCountData = [];
        }

        return {
          value: totalWords.toLocaleString(),
          timeframe: 'Total',
          description: 'Total words across all notes',
          additionalInfo: [
            {
              icon: FileText,
              value: `${Math.round(totalWords / notes.length).toLocaleString()} avg per note`
            }
          ],
          metadata: {
            breakdown: {
              total: totalWords,
              created: notes.length,
              edited: 0,
              deleted: 0
            },
            ...(hasWordCountData && { activityData: wordCountData })
          }
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

        // Generate daily breakdown for ideas
        ideasDailyBreakdown = Array.from({ length: 7 }, (_, i) => {
          const date = new Date(today);
          // Start from 6 days ago and go towards today
          date.setDate(date.getDate() - (6 - i));
          date.setHours(0, 0, 0, 0);
          return ideas.filter(idea => {
            const ideaDate = new Date(idea.createdAt);
            ideaDate.setHours(0, 0, 0, 0);
            return ideaDate.getTime() === date.getTime();
          }).length;
        });

        // Check if there's actual data to show
        hasIdeasData = ideasDailyBreakdown.some(value => value > 0);

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
            },
            ...(hasIdeasData && { activityData: ideasDailyBreakdown })
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
            description: 'Start creating notes and tasks to see activity',
            metadata: {
              breakdown: {
                total: 0,
                created: 0,
                edited: 0,
                deleted: 0
              }
            }
          };
        }

        const activityStats = calculateActivityStats(activities);
        const totalActivities = Object.values(activityStats.breakdown).reduce((sum, count) => sum + count, 0);
        const [mostActiveType, mostActiveCount] = activityStats.mostActiveCategory;

        // Generate weekly activity data for the past year
        let weeklyActivityData = generateWeeklyActivityData(activities);

        // Even if the weekly data shows no activity (which can happen when all activities
        // are very recent and fall into the same week), we should still display something
        if (totalActivities > 0 && !weeklyActivityData.some(value => value > 0)) {
          // Create a simplified data visualization showing progression
          weeklyActivityData = Array(52).fill(0);

          // Add some minimal activity data for visualization
          // Put activities in the most recent weeks (at the end of the array)
          const lastIndex = weeklyActivityData.length - 1;
          weeklyActivityData[lastIndex] = totalActivities;

          // Add some minimal activity in earlier weeks for better visualization
          if (totalActivities > 1) {
            weeklyActivityData[lastIndex - 1] = Math.max(1, Math.floor(totalActivities * 0.7));
            weeklyActivityData[lastIndex - 2] = Math.max(1, Math.floor(totalActivities * 0.4));
            weeklyActivityData[lastIndex - 3] = Math.max(1, Math.floor(totalActivities * 0.2));
          }
        }

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
            },
            // Always include activityData if there are activities, even if the weekly
            // distribution doesn't show activity (e.g., all activities in same week)
            activityData: weeklyActivityData
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

        // Check if there's any real connections data
        hasConnectionsData = stats.totalConnections > 0;

        // Create data for the connections chart
        let connectionsData: number[] = [];

        if (hasConnectionsData) {
          if (stats.totalConnections === 1) {
            // If there's only one connection, create a simple progression
            connectionsData = [0, 0, 0, 0, 0, 0, 1];
          } else if (stats.recentConnections === 0) {
            // If no recent connections, distribute the total connections
            connectionsData = [
              Math.floor(stats.totalConnections * 0.2),
              Math.floor(stats.totalConnections * 0.3),
              Math.floor(stats.totalConnections * 0.4),
              Math.floor(stats.totalConnections * 0.5),
              Math.floor(stats.totalConnections * 0.7),
              Math.floor(stats.totalConnections * 0.9),
              stats.totalConnections
            ];
          } else {
            // If we have recent and total connections, create a progression
            const nonRecent = stats.totalConnections - stats.recentConnections;
            connectionsData = [
              Math.max(1, Math.floor(nonRecent * 0.2)),
              Math.max(1, Math.floor(nonRecent * 0.4)),
              Math.max(1, Math.floor(nonRecent * 0.6)),
              Math.max(1, Math.floor(nonRecent * 0.8)),
              nonRecent,
              Math.floor(nonRecent + stats.recentConnections * 0.5),
              stats.totalConnections
            ];
          }

          // Ensure no zeros in the middle of the data
          for (let i = 1; i < connectionsData.length; i++) {
            if (connectionsData[i] === 0 && connectionsData[i - 1] > 0) {
              connectionsData[i] = 1;
            }
          }
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
            },
            // Only include activityData if we've computed valid data
            ...(hasConnectionsData && connectionsData.length > 0 && { activityData: connectionsData })
          }
        };
      }

      case 'reminders': {
        today = new Date();
        today.setHours(0, 0, 0, 0);
        activeReminders = reminders.filter(reminder => !reminder.isCompleted);
        upcomingReminders = activeReminders.filter(reminder => {
          const dueDate = new Date(reminder.dueDateTime);
          return dueDate >= today;
        });
        overdue = activeReminders.filter(reminder => {
          const dueDate = new Date(reminder.dueDateTime);
          return dueDate < today;
        });

        // Generate activity data for reminders
        reminderActivityData = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          date.setHours(0, 0, 0, 0);
          return activeReminders.filter(reminder => {
            const dueDate = new Date(reminder.dueDateTime);
            dueDate.setHours(0, 0, 0, 0);
            return dueDate.getTime() === date.getTime();
          }).length;
        });

        hasReminderActivityData = reminderActivityData.some(value => value > 0);

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
          ],
          metadata: {
            breakdown: {
              total: reminders.length,
              created: activeReminders.length,
              edited: 0,
              deleted: 0
            },
            ...(hasReminderActivityData && { activityData: reminderActivityData })
          }
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

        // Create a daily breakdown of notes created
        notesDailyBreakdown = Array.from({ length: 7 }, (_, i) => {
          const date = new Date(today);
          // Start from 6 days ago and go towards today
          date.setDate(date.getDate() - (6 - i));
          date.setHours(0, 0, 0, 0);
          return regularNotes.filter(note => {
            const noteDate = new Date(note.createdAt);
            noteDate.setHours(0, 0, 0, 0);
            return noteDate.getTime() === date.getTime();
          }).length;
        });

        // Check if there's actual data to show
        hasNotesStatsData = notesDailyBreakdown.some(value => value > 0);

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
            },
            ...(hasNotesStatsData && { activityData: notesDailyBreakdown })
          },
          topBreakdown: {
            active: activeNotes.length,
            archived: archivedNotes.length
          }
        };

      case 'connection-types': {
        const typeStats = calculateConnectionTypeStats(notes);

        // Check if there's any connection data
        hasConnectionTypeData = typeStats.totalConnections > 0;

        // Create additional info items for display
        const additionalInfo = [
          {
            icon: FileText,
            value: `${typeStats.notesWith.notes} notes with note links`
          },
          {
            icon: CheckSquare,
            value: `${typeStats.notesWith.tasks} notes with task links`
          },
          {
            icon: Bell,
            value: `${typeStats.notesWith.reminders} notes with reminder links`
          }
        ];

        if (typeStats.notesWith.ideas > 0) {
          additionalInfo.push({
            icon: Lightbulb,
            value: `${typeStats.notesWith.ideas} notes with idea links`
          });
        }

        // Create a more descriptive value presentation
        const valueDisplay = hasConnectionTypeData
          ? typeStats.totalConnections
          : "No connections";

        // Breakdown percentages
        const percentages = hasConnectionTypeData ? {
          notes: Math.round((typeStats.byType.notes / typeStats.totalConnections) * 100),
          tasks: Math.round((typeStats.byType.tasks / typeStats.totalConnections) * 100),
          reminders: Math.round((typeStats.byType.reminders / typeStats.totalConnections) * 100),
          ideas: Math.round((typeStats.byType.ideas / typeStats.totalConnections) * 100)
        } : { notes: 0, tasks: 0, reminders: 0, ideas: 0 };

        return {
          value: valueDisplay,
          timeframe: 'Total connections',
          description: hasConnectionTypeData
            ? `Notes: ${percentages.notes}%, Tasks: ${percentages.tasks}%, Reminders: ${percentages.reminders}%, Ideas: ${percentages.ideas}%`
            : 'Breakdown of connection types',
          additionalInfo,
          metadata: {
            breakdown: {
              total: typeStats.totalConnections,
              created: typeStats.byType.notes,
              edited: typeStats.byType.tasks,
              deleted: typeStats.byType.reminders + typeStats.byType.ideas
            },
            ...(hasConnectionTypeData && { activityData: typeStats.connectionTypeCounts })
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

      // Save to localStorage
      localStorage.setItem('dashboard_stats', JSON.stringify(newStats));
      return newStats;
    });
  }, []);

  const toggleGraphVisibility = useCallback((statId: string) => {
    setGraphsVisible(prev => {
      const newVisibility = {
        ...prev,
        [statId]: !prev[statId]
      };
      localStorage.setItem('dashboard_graphs_visible', JSON.stringify(newVisibility));
      return newVisibility;
    });
  }, []);

  const contextValue = useMemo(() => ({
    availableStats: stats,
    enabledStats: stats.filter(stat => stat.enabled).sort((a, b) => a.order - b.order),
    toggleStat,
    getStatValue,
    updateStatSize,
    updateStatOrder,
    isLoading,
    graphsVisible,
    toggleGraphVisibility
  }), [stats, toggleStat, getStatValue, updateStatSize, updateStatOrder, isLoading, graphsVisible, toggleGraphVisibility]);

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
} 