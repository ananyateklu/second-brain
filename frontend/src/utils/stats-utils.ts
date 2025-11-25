import { Note } from '../features/notes/types/note';

export interface ChartDataPoint {
  date: string;
  count: number;
}

export interface DashboardStats {
  totalNotes: number;
  notesCreatedThisWeek: number;
  notesCreatedThisMonth: number;
  notesUpdatedThisWeek: number;
}

/**
 * Calculate dashboard statistics from notes array
 */
export function calculateStats(notes: Note[]): DashboardStats {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  startOfMonth.setHours(0, 0, 0, 0);

  let notesCreatedThisWeek = 0;
  let notesCreatedThisMonth = 0;
  let notesUpdatedThisWeek = 0;

  notes.forEach((note) => {
    const createdAt = new Date(note.createdAt);
    const updatedAt = new Date(note.updatedAt);

    if (createdAt >= startOfWeek) {
      notesCreatedThisWeek++;
    }
    if (createdAt >= startOfMonth) {
      notesCreatedThisMonth++;
    }
    if (updatedAt >= startOfWeek) {
      notesUpdatedThisWeek++;
    }
  });

  return {
    totalNotes: notes.length,
    notesCreatedThisWeek,
    notesCreatedThisMonth,
    notesUpdatedThisWeek,
  };
}

/**
 * Group notes by date for chart data (last N days)
 * For longer ranges (>90 days), groups by week or month for better readability
 */
export function getChartData(notes: Note[], days: number = 30): ChartDataPoint[] {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  // Determine grouping strategy based on time range
  const groupByWeek = days >= 90 && days <= 180;
  const groupByMonth = days > 180;

  if (groupByMonth) {
    // Group by month for ranges > 180 days
    const dataMap = new Map<string, number>();
    
    // Initialize all months with 0 count
    const currentMonth = new Date(startDate);
    while (currentMonth <= now) {
      const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
      dataMap.set(monthKey, 0);
      currentMonth.setMonth(currentMonth.getMonth() + 1);
    }

    // Count notes created per month
    notes.forEach((note) => {
      const createdAt = new Date(note.createdAt);
      if (createdAt >= startDate) {
        const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
        const currentCount = dataMap.get(monthKey) || 0;
        dataMap.set(monthKey, currentCount + 1);
      }
    });

    // Convert to array and format dates
    const chartData: ChartDataPoint[] = Array.from(dataMap.entries())
      .map(([monthKey, count]) => {
        const [year, month] = monthKey.split('-');
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
        return {
          date: dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          count,
          sortKey: monthKey,
        };
      })
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(({ date, count }) => ({ date, count }));

    return chartData;
  } else if (groupByWeek) {
    // Group by week for ranges > 90 days and <= 180 days
    const dataMap = new Map<string, number>();
    
    // Initialize all weeks with 0 count
    const currentWeek = new Date(startDate);
    // Move to start of week (Sunday)
    const dayOfWeek = currentWeek.getDay();
    currentWeek.setDate(currentWeek.getDate() - dayOfWeek);
    currentWeek.setHours(0, 0, 0, 0);
    
    while (currentWeek <= now) {
      const weekKey = currentWeek.toISOString().split('T')[0];
      dataMap.set(weekKey, 0);
      currentWeek.setDate(currentWeek.getDate() + 7);
    }

    // Count notes created per week
    notes.forEach((note) => {
      const createdAt = new Date(note.createdAt);
      if (createdAt >= startDate) {
        // Find the start of the week for this note
        const noteDate = new Date(createdAt);
        const noteDayOfWeek = noteDate.getDay();
        noteDate.setDate(noteDate.getDate() - noteDayOfWeek);
        noteDate.setHours(0, 0, 0, 0);
        const weekKey = noteDate.toISOString().split('T')[0];
        const currentCount = dataMap.get(weekKey) || 0;
        dataMap.set(weekKey, currentCount + 1);
      }
    });

    // Convert to array and format dates
    const chartData: ChartDataPoint[] = Array.from(dataMap.entries())
      .map(([weekKey, count]) => {
        const dateObj = new Date(weekKey);
        return {
          date: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count,
          sortKey: weekKey,
        };
      })
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(({ date, count }) => ({ date, count }));

    return chartData;
  } else {
    // Daily grouping for ranges <= 90 days
    const dataMap = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      dataMap.set(dateKey, 0);
    }

    // Count notes created per day
    notes.forEach((note) => {
      const createdAt = new Date(note.createdAt);
      if (createdAt >= startDate) {
        const dateKey = createdAt.toISOString().split('T')[0];
        const currentCount = dataMap.get(dateKey) || 0;
        dataMap.set(dateKey, currentCount + 1);
      }
    });

    // Convert to array and format dates
    const chartData: ChartDataPoint[] = Array.from(dataMap.entries())
      .map(([date, count]) => {
        const dateObj = new Date(date);
        return {
          date: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count,
          sortKey: date,
        };
      })
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(({ date, count }) => ({ date, count }));

    return chartData;
  }
}

/**
 * Get recent notes sorted by updatedAt (most recent first)
 */
export function getRecentNotes(notes: Note[], limit: number = 5): Note[] {
  return [...notes]
    .sort((a, b) => {
      const dateA = new Date(a.updatedAt);
      const dateB = new Date(b.updatedAt);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, limit);
}

export interface ChatUsageDataPoint {
  date: string;
  ragChats: number;
  regularChats: number;
  agentChats: number;
}

/**
 * Process daily conversation counts for chart display
 * Groups by week or month for longer ranges, similar to getChartData
 */
export function getChatUsageChartData(
  dailyRagCounts: Record<string, number>,
  dailyNonRagCounts: Record<string, number>,
  dailyAgentCounts: Record<string, number>,
  days: number = 30
): ChatUsageDataPoint[] {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  // Determine grouping strategy based on time range
  const groupByWeek = days >= 90 && days <= 180;
  const groupByMonth = days > 180;

  if (groupByMonth) {
    // Group by month for ranges > 180 days
    const dataMap = new Map<string, { ragChats: number; regularChats: number; agentChats: number }>();
    
    // Initialize all months with 0 counts
    const currentMonth = new Date(startDate);
    while (currentMonth <= now) {
      const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
      dataMap.set(monthKey, { ragChats: 0, regularChats: 0, agentChats: 0 });
      currentMonth.setMonth(currentMonth.getMonth() + 1);
    }

    // Helper function to parse date string (yyyy-MM-dd) to local date at midnight
    const parseDateString = (dateStr: string): Date => {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      date.setHours(0, 0, 0, 0);
      return date;
    };

    // Aggregate counts per month
    Object.entries(dailyRagCounts).forEach(([dateStr, count]) => {
      const date = parseDateString(dateStr);
      if (date >= startDate) {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const current = dataMap.get(monthKey) || { ragChats: 0, regularChats: 0, agentChats: 0 };
        dataMap.set(monthKey, { ...current, ragChats: current.ragChats + count });
      }
    });

    Object.entries(dailyNonRagCounts).forEach(([dateStr, count]) => {
      const date = parseDateString(dateStr);
      if (date >= startDate) {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const current = dataMap.get(monthKey) || { ragChats: 0, regularChats: 0, agentChats: 0 };
        dataMap.set(monthKey, { ...current, regularChats: current.regularChats + count });
      }
    });

    Object.entries(dailyAgentCounts).forEach(([dateStr, count]) => {
      const date = parseDateString(dateStr);
      if (date >= startDate) {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const current = dataMap.get(monthKey) || { ragChats: 0, regularChats: 0, agentChats: 0 };
        dataMap.set(monthKey, { ...current, agentChats: current.agentChats + count });
      }
    });

    // Convert to array and format dates
    return Array.from(dataMap.entries())
      .map(([monthKey, counts]) => {
        const [year, month] = monthKey.split('-');
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
        return {
          date: dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          ragChats: counts.ragChats,
          regularChats: counts.regularChats,
          agentChats: counts.agentChats,
          sortKey: monthKey,
        } as ChatUsageDataPoint & { sortKey: string };
      })
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(({ date, ragChats, regularChats, agentChats }): ChatUsageDataPoint => ({ date, ragChats, regularChats, agentChats }));
  } else if (groupByWeek) {
    // Group by week for ranges >= 90 days and <= 180 days
    const dataMap = new Map<string, { ragChats: number; regularChats: number; agentChats: number }>();
    
    // Initialize all weeks with 0 counts
    const currentWeek = new Date(startDate);
    const dayOfWeek = currentWeek.getDay();
    currentWeek.setDate(currentWeek.getDate() - dayOfWeek);
    currentWeek.setHours(0, 0, 0, 0);
    
    while (currentWeek <= now) {
      const weekKey = currentWeek.toISOString().split('T')[0];
      dataMap.set(weekKey, { ragChats: 0, regularChats: 0, agentChats: 0 });
      currentWeek.setDate(currentWeek.getDate() + 7);
    }

    // Helper function to parse date string (yyyy-MM-dd) to local date at midnight
    const parseDateString = (dateStr: string): Date => {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      date.setHours(0, 0, 0, 0);
      return date;
    };

    // Aggregate counts per week
    Object.entries(dailyRagCounts).forEach(([dateStr, count]) => {
      const date = parseDateString(dateStr);
      if (date >= startDate) {
        const noteDate = new Date(date);
        const noteDayOfWeek = noteDate.getDay();
        noteDate.setDate(noteDate.getDate() - noteDayOfWeek);
        noteDate.setHours(0, 0, 0, 0);
        const weekKey = noteDate.toISOString().split('T')[0];
        const current = dataMap.get(weekKey) || { ragChats: 0, regularChats: 0, agentChats: 0 };
        dataMap.set(weekKey, { ...current, ragChats: current.ragChats + count });
      }
    });

    Object.entries(dailyNonRagCounts).forEach(([dateStr, count]) => {
      const date = parseDateString(dateStr);
      if (date >= startDate) {
        const noteDate = new Date(date);
        const noteDayOfWeek = noteDate.getDay();
        noteDate.setDate(noteDate.getDate() - noteDayOfWeek);
        noteDate.setHours(0, 0, 0, 0);
        const weekKey = noteDate.toISOString().split('T')[0];
        const current = dataMap.get(weekKey) || { ragChats: 0, regularChats: 0, agentChats: 0 };
        dataMap.set(weekKey, { ...current, regularChats: current.regularChats + count });
      }
    });

    Object.entries(dailyAgentCounts).forEach(([dateStr, count]) => {
      const date = parseDateString(dateStr);
      if (date >= startDate) {
        const noteDate = new Date(date);
        const noteDayOfWeek = noteDate.getDay();
        noteDate.setDate(noteDate.getDate() - noteDayOfWeek);
        noteDate.setHours(0, 0, 0, 0);
        const weekKey = noteDate.toISOString().split('T')[0];
        const current = dataMap.get(weekKey) || { ragChats: 0, regularChats: 0, agentChats: 0 };
        dataMap.set(weekKey, { ...current, agentChats: current.agentChats + count });
      }
    });

    // Convert to array and format dates
    return Array.from(dataMap.entries())
      .map(([weekKey, counts]) => {
        const dateObj = new Date(weekKey);
        return {
          date: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          ragChats: counts.ragChats,
          regularChats: counts.regularChats,
          agentChats: counts.agentChats,
          sortKey: weekKey,
        } as ChatUsageDataPoint & { sortKey: string };
      })
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(({ date, ragChats, regularChats, agentChats }): ChatUsageDataPoint => ({ date, ragChats, regularChats, agentChats }));
  } else {
    // Daily grouping for ranges <= 90 days
    const dataMap = new Map<string, { ragChats: number; regularChats: number; agentChats: number }>();
    
    // Helper function to format date as yyyy-MM-dd (local time, not UTC)
    const formatDateKey = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Helper function to parse date string (yyyy-MM-dd) - treat as local date
    const parseDateString = (dateStr: string): Date => {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      date.setHours(0, 0, 0, 0);
      return date;
    };
    
    // Collect all backend date strings first to ensure we include them all
    const allBackendDates = new Set<string>();
    Object.keys(dailyRagCounts).forEach(dateStr => allBackendDates.add(dateStr));
    Object.keys(dailyNonRagCounts).forEach(dateStr => allBackendDates.add(dateStr));
    Object.keys(dailyAgentCounts).forEach(dateStr => allBackendDates.add(dateStr));
    
    // Initialize all days in the range with 0 counts
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateKey = formatDateKey(date);
      dataMap.set(dateKey, { ragChats: 0, regularChats: 0, agentChats: 0 });
    }
    
    // Also initialize any backend dates that might be in range but not in our local range
    // (handles timezone edge cases)
    allBackendDates.forEach(dateStr => {
      const backendDate = parseDateString(dateStr);
      if (backendDate >= startDate && backendDate <= now) {
        const dateKey = formatDateKey(backendDate);
        if (!dataMap.has(dateKey)) {
          dataMap.set(dateKey, { ragChats: 0, regularChats: 0, agentChats: 0 });
        }
      }
    });

    // Fill in actual counts from backend data
    Object.entries(dailyRagCounts).forEach(([dateStr, count]) => {
      const backendDate = parseDateString(dateStr);
      if (backendDate >= startDate && backendDate <= now) {
        // Use local date key format for consistency
        const dateKey = formatDateKey(backendDate);
        const current = dataMap.get(dateKey);
        if (current) {
          dataMap.set(dateKey, { ...current, ragChats: current.ragChats + count });
        }
      }
    });

    Object.entries(dailyNonRagCounts).forEach(([dateStr, count]) => {
      const backendDate = parseDateString(dateStr);
      if (backendDate >= startDate && backendDate <= now) {
        // Use local date key format for consistency
        const dateKey = formatDateKey(backendDate);
        const current = dataMap.get(dateKey);
        if (current) {
          dataMap.set(dateKey, { ...current, regularChats: current.regularChats + count });
        }
      }
    });

    Object.entries(dailyAgentCounts).forEach(([dateStr, count]) => {
      const backendDate = parseDateString(dateStr);
      if (backendDate >= startDate && backendDate <= now) {
        // Use local date key format for consistency
        const dateKey = formatDateKey(backendDate);
        const current = dataMap.get(dateKey);
        if (current) {
          dataMap.set(dateKey, { ...current, agentChats: current.agentChats + count });
        }
      }
    });

    // Convert to array and format dates
    return Array.from(dataMap.entries())
      .map(([dateKey, counts]) => {
        const dateObj = new Date(dateKey);
        return {
          date: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          ragChats: counts.ragChats,
          regularChats: counts.regularChats,
          agentChats: counts.agentChats,
          sortKey: dateKey,
        } as ChatUsageDataPoint & { sortKey: string };
      })
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(({ date, ragChats, regularChats, agentChats }): ChatUsageDataPoint => ({ date, ragChats, regularChats, agentChats }));
  }
}

