import { Note } from '../features/notes/types/note';
import {
  format,
  parse,
  startOfWeek,
  startOfMonth,
  startOfDay,
  endOfDay,
  addDays,
  addMonths,
  subDays,
  parseISO,
  isAfter,
  isBefore,
  isWithinInterval,
} from 'date-fns';

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

// ============================================
// Date Parsing Helpers
// ============================================

/**
 * Format a Date as yyyy-MM-dd in local time
 */
function formatDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Parse a yyyy-MM-dd string as local date
 */
function parseDateKey(dateStr: string): Date {
  return parse(dateStr, 'yyyy-MM-dd', new Date());
}

/**
 * Format date for chart display (e.g., "Nov 30")
 */
function formatChartLabel(date: Date): string {
  return format(date, 'MMM d');
}

/**
 * Format month for chart display (e.g., "Nov 2025")
 */
function formatMonthLabel(date: Date): string {
  return format(date, 'MMM yyyy');
}

/**
 * Get month key for grouping (e.g., "2025-11")
 */
function getMonthKey(date: Date): string {
  return format(date, 'yyyy-MM');
}

// ============================================
// Dashboard Statistics
// ============================================

/**
 * Calculate dashboard statistics from notes array
 */
export function calculateStats(notes: Note[]): DashboardStats {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 0 }); // Sunday
  const monthStart = startOfMonth(now);

  let notesCreatedThisWeek = 0;
  let notesCreatedThisMonth = 0;
  let notesUpdatedThisWeek = 0;

  notes.forEach((note) => {
    const createdAt = parseISO(note.createdAt);
    const updatedAt = parseISO(note.updatedAt);

    if (!isBefore(createdAt, weekStart)) {
      notesCreatedThisWeek++;
    }
    if (!isBefore(createdAt, monthStart)) {
      notesCreatedThisMonth++;
    }
    if (!isBefore(updatedAt, weekStart)) {
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

// ============================================
// Chart Data Generation
// ============================================

/**
 * Group notes by date for chart data (last N days)
 * For longer ranges (>90 days), groups by week or month for better readability
 */
export function getChartData(notes: Note[], days: number = 30): ChartDataPoint[] {
  const now = new Date();
  const rangeStart = startOfDay(subDays(now, days));

  // Determine grouping strategy based on time range
  const groupByWeek = days >= 90 && days <= 180;
  const groupByMonth = days > 180;

  if (groupByMonth) {
    return getMonthlyChartData(notes, rangeStart, now);
  } else if (groupByWeek) {
    return getWeeklyChartData(notes, rangeStart, now);
  } else {
    return getDailyChartData(notes, rangeStart, now, days);
  }
}

function getMonthlyChartData(notes: Note[], rangeStart: Date, now: Date): ChartDataPoint[] {
  const dataMap = new Map<string, number>();
  
  // Initialize all months with 0 count
  let currentMonth = startOfMonth(rangeStart);
  while (!isAfter(currentMonth, now)) {
    dataMap.set(getMonthKey(currentMonth), 0);
    currentMonth = addMonths(currentMonth, 1);
  }

  // Count notes created per month
  notes.forEach((note) => {
    const createdAt = parseISO(note.createdAt);
    if (!isBefore(createdAt, rangeStart)) {
      const monthKey = getMonthKey(createdAt);
      const currentCount = dataMap.get(monthKey) || 0;
      dataMap.set(monthKey, currentCount + 1);
    }
  });

  // Convert to array and format dates
  return Array.from(dataMap.entries())
    .map(([monthKey, count]) => {
      const dateObj = parse(monthKey, 'yyyy-MM', new Date());
      return {
        date: formatMonthLabel(dateObj),
        count,
        sortKey: monthKey,
      };
    })
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(({ date, count }) => ({ date, count }));
}

function getWeeklyChartData(notes: Note[], rangeStart: Date, now: Date): ChartDataPoint[] {
  const dataMap = new Map<string, number>();
  
  // Initialize all weeks with 0 count
  let currentWeek = startOfWeek(rangeStart, { weekStartsOn: 0 });
  while (!isAfter(currentWeek, now)) {
    dataMap.set(formatDateKey(currentWeek), 0);
    currentWeek = addDays(currentWeek, 7);
  }

  // Count notes created per week
  notes.forEach((note) => {
    const createdAt = parseISO(note.createdAt);
    if (!isBefore(createdAt, rangeStart)) {
      const weekStart = startOfWeek(createdAt, { weekStartsOn: 0 });
      const weekKey = formatDateKey(weekStart);
      const currentCount = dataMap.get(weekKey) || 0;
      dataMap.set(weekKey, currentCount + 1);
    }
  });

  // Convert to array and format dates
  return Array.from(dataMap.entries())
    .map(([weekKey, count]) => {
      const dateObj = parseDateKey(weekKey);
      return {
        date: formatChartLabel(dateObj),
        count,
        sortKey: weekKey,
      };
    })
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(({ date, count }) => ({ date, count }));
}

function getDailyChartData(notes: Note[], rangeStart: Date, now: Date, days: number): ChartDataPoint[] {
  const dataMap = new Map<string, number>();
  
  // Extend range by 1 day to account for timezone differences
  const rangeEnd = endOfDay(addDays(now, 1));
  
  // Initialize all days in the range with 0 counts
  for (let i = 0; i < days; i++) {
    const date = addDays(rangeStart, i);
    dataMap.set(formatDateKey(date), 0);
  }

  // Count notes created per day
  notes.forEach((note) => {
    const createdAt = parseISO(note.createdAt);
    if (isWithinInterval(createdAt, { start: rangeStart, end: rangeEnd })) {
      const dateKey = formatDateKey(createdAt);
      if (dataMap.has(dateKey)) {
        dataMap.set(dateKey, (dataMap.get(dateKey) || 0) + 1);
      }
    }
  });

  // Convert to array and format dates
  return Array.from(dataMap.entries())
    .map(([dateKey, count]) => {
      const dateObj = parseDateKey(dateKey);
      return {
        date: formatChartLabel(dateObj),
        count,
        sortKey: dateKey,
      };
    })
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(({ date, count }) => ({ date, count }));
}

/**
 * Get recent notes sorted by updatedAt (most recent first)
 */
export function getRecentNotes(notes: Note[], limit: number = 5): Note[] {
  return [...notes]
    .sort((a, b) => {
      const dateA = parseISO(a.updatedAt);
      const dateB = parseISO(b.updatedAt);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, limit);
}

// ============================================
// Chat Usage Chart Data
// ============================================

export interface ChatUsageDataPoint {
  date: string;
  ragChats: number;
  regularChats: number;
  agentChats: number;
  imageGenChats: number;
}

interface ChatCounts {
  ragChats: number;
  regularChats: number;
  agentChats: number;
  imageGenChats: number;
}

const emptyCounts = (): ChatCounts => ({
  ragChats: 0,
  regularChats: 0,
  agentChats: 0,
  imageGenChats: 0,
});

/**
 * Process daily conversation counts for chart display
 * Groups by week or month for longer ranges, similar to getChartData
 */
export function getChatUsageChartData(
  dailyRagCounts: Record<string, number>,
  dailyNonRagCounts: Record<string, number>,
  dailyAgentCounts: Record<string, number>,
  dailyImageGenCounts: Record<string, number>,
  days: number = 30
): ChatUsageDataPoint[] {
  const now = new Date();
  const rangeStart = startOfDay(subDays(now, days));

  // Determine grouping strategy based on time range
  const groupByWeek = days >= 90 && days <= 180;
  const groupByMonth = days > 180;

  if (groupByMonth) {
    return getMonthlyChatData(dailyRagCounts, dailyNonRagCounts, dailyAgentCounts, dailyImageGenCounts, rangeStart, now);
  } else if (groupByWeek) {
    return getWeeklyChatData(dailyRagCounts, dailyNonRagCounts, dailyAgentCounts, dailyImageGenCounts, rangeStart, now);
  } else {
    return getDailyChatData(dailyRagCounts, dailyNonRagCounts, dailyAgentCounts, dailyImageGenCounts, rangeStart, now, days);
  }
}

function getMonthlyChatData(
  dailyRagCounts: Record<string, number>,
  dailyNonRagCounts: Record<string, number>,
  dailyAgentCounts: Record<string, number>,
  dailyImageGenCounts: Record<string, number>,
  rangeStart: Date,
  now: Date
): ChatUsageDataPoint[] {
  const dataMap = new Map<string, ChatCounts>();
  
  // Initialize all months
  let currentMonth = startOfMonth(rangeStart);
  while (!isAfter(currentMonth, now)) {
    dataMap.set(getMonthKey(currentMonth), emptyCounts());
    currentMonth = addMonths(currentMonth, 1);
  }

  // Aggregate counts per month
  const aggregateCounts = (
    dailyCounts: Record<string, number>,
    field: keyof ChatCounts
  ) => {
    Object.entries(dailyCounts).forEach(([dateStr, count]) => {
      const date = parseDateKey(dateStr);
      if (!isBefore(date, rangeStart)) {
        const monthKey = getMonthKey(date);
        const current = dataMap.get(monthKey) || emptyCounts();
        dataMap.set(monthKey, { ...current, [field]: current[field] + count });
      }
    });
  };

  aggregateCounts(dailyRagCounts, 'ragChats');
  aggregateCounts(dailyNonRagCounts, 'regularChats');
  aggregateCounts(dailyAgentCounts, 'agentChats');
  aggregateCounts(dailyImageGenCounts, 'imageGenChats');

  // Convert to array
  return Array.from(dataMap.entries())
    .map(([monthKey, counts]) => {
      const dateObj = parse(monthKey, 'yyyy-MM', new Date());
      return {
        date: formatMonthLabel(dateObj),
        ...counts,
        sortKey: monthKey,
      };
    })
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(({ date, ragChats, regularChats, agentChats, imageGenChats }) => ({
      date,
      ragChats,
      regularChats,
      agentChats,
      imageGenChats,
    }));
}

function getWeeklyChatData(
  dailyRagCounts: Record<string, number>,
  dailyNonRagCounts: Record<string, number>,
  dailyAgentCounts: Record<string, number>,
  dailyImageGenCounts: Record<string, number>,
  rangeStart: Date,
  now: Date
): ChatUsageDataPoint[] {
  const dataMap = new Map<string, ChatCounts>();
  
  // Initialize all weeks
  let currentWeek = startOfWeek(rangeStart, { weekStartsOn: 0 });
  while (!isAfter(currentWeek, now)) {
    dataMap.set(formatDateKey(currentWeek), emptyCounts());
    currentWeek = addDays(currentWeek, 7);
  }

  // Helper to get week key
  const getWeekKey = (date: Date): string => 
    formatDateKey(startOfWeek(date, { weekStartsOn: 0 }));

  // Aggregate counts per week
  const aggregateCounts = (
    dailyCounts: Record<string, number>,
    field: keyof ChatCounts
  ) => {
    Object.entries(dailyCounts).forEach(([dateStr, count]) => {
      const date = parseDateKey(dateStr);
      if (!isBefore(date, rangeStart)) {
        const weekKey = getWeekKey(date);
        const current = dataMap.get(weekKey) || emptyCounts();
        dataMap.set(weekKey, { ...current, [field]: current[field] + count });
      }
    });
  };

  aggregateCounts(dailyRagCounts, 'ragChats');
  aggregateCounts(dailyNonRagCounts, 'regularChats');
  aggregateCounts(dailyAgentCounts, 'agentChats');
  aggregateCounts(dailyImageGenCounts, 'imageGenChats');

  // Convert to array
  return Array.from(dataMap.entries())
    .map(([weekKey, counts]) => {
      const dateObj = parseDateKey(weekKey);
      return {
        date: formatChartLabel(dateObj),
        ...counts,
        sortKey: weekKey,
      };
    })
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(({ date, ragChats, regularChats, agentChats, imageGenChats }) => ({
      date,
      ragChats,
      regularChats,
      agentChats,
      imageGenChats,
    }));
}

function getDailyChatData(
  dailyRagCounts: Record<string, number>,
  dailyNonRagCounts: Record<string, number>,
  dailyAgentCounts: Record<string, number>,
  dailyImageGenCounts: Record<string, number>,
  rangeStart: Date,
  now: Date,
  days: number
): ChatUsageDataPoint[] {
  const dataMap = new Map<string, ChatCounts>();
  
  // Extend range by 1 day to account for timezone differences
  const rangeEnd = endOfDay(addDays(now, 1));
  
  // Collect all backend date strings
  const allBackendDates = new Set<string>();
  [dailyRagCounts, dailyNonRagCounts, dailyAgentCounts, dailyImageGenCounts].forEach(counts => {
    Object.keys(counts).forEach(dateStr => allBackendDates.add(dateStr));
  });
  
  // Initialize all days in the range
  for (let i = 0; i < days; i++) {
    const date = addDays(rangeStart, i);
    dataMap.set(formatDateKey(date), emptyCounts());
  }
  
  // Initialize any backend dates in range
  allBackendDates.forEach(dateStr => {
    const backendDate = parseDateKey(dateStr);
    if (isWithinInterval(backendDate, { start: rangeStart, end: rangeEnd })) {
      const dateKey = formatDateKey(backendDate);
      if (!dataMap.has(dateKey)) {
        dataMap.set(dateKey, emptyCounts());
      }
    }
  });

  // Fill in counts from backend data
  const fillCounts = (
    dailyCounts: Record<string, number>,
    field: keyof ChatCounts
  ) => {
    Object.entries(dailyCounts).forEach(([dateStr, count]) => {
      const backendDate = parseDateKey(dateStr);
      if (isWithinInterval(backendDate, { start: rangeStart, end: rangeEnd })) {
        const dateKey = formatDateKey(backendDate);
        const current = dataMap.get(dateKey);
        if (current) {
          dataMap.set(dateKey, { ...current, [field]: current[field] + count });
        }
      }
    });
  };

  fillCounts(dailyRagCounts, 'ragChats');
  fillCounts(dailyNonRagCounts, 'regularChats');
  fillCounts(dailyAgentCounts, 'agentChats');
  fillCounts(dailyImageGenCounts, 'imageGenChats');

  // Convert to array
  return Array.from(dataMap.entries())
    .map(([dateKey, counts]) => {
      const dateObj = parseDateKey(dateKey);
      return {
        date: formatChartLabel(dateObj),
        ...counts,
        sortKey: dateKey,
      };
    })
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(({ date, ragChats, regularChats, agentChats, imageGenChats }) => ({
      date,
      ragChats,
      regularChats,
      agentChats,
      imageGenChats,
    }));
}
